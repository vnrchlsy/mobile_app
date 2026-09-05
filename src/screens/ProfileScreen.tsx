// US-X3/X4 — the "You" tab. Reference: screens/user/screen-profile.png.
// Fetches /me on focus (avatar, name, email, Verified Member status). City has no GET endpoint
// (only PUT /me/location — see accounts/views.py MeLocationView) so the last-picked city is cached
// in AuthContext/SecureStore by LocationPickerScreen and read from there instead of /me.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { Me } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { OwnerTabs } from "../components/OwnerTabs";
import { LocationPinIcon, UserBadgeIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";

type Props = NativeStackScreenProps<RootStackParamList, "profile">;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileScreen({ navigation }: Props) {
  // The status bar is real now (App.tsx), so the first thing on screen has to start below
  // it. This block used to pad 20pt, which was right while the bar was hidden and
  // put the screen title under the clock once it was not.
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { city, signOut } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

  // US-R1 · named so the same function serves the focus refetch AND the retry button.
  const load = useCallback(() => {
      // US-R1 · keep the RESULT. Discarding it left `me` null, and `approvedMember` below is
      // `me?.capabilities.some(...) ?? false` — so a failed /me showed a Verified Member
      // their own account as unverified, with a blank name and no photo. The account was
      // fine; only the request had failed.
      api.get("/me").then((r) => {
        setRes({ ok: r.ok, status: r.status });
        if (r.ok) setMe(r.data);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus, not on every api identity change
    }, []);
  useFocusEffect(load);

  const pendingMember = me?.capabilities.some((c) => c.capability === "rescuer" && c.status === "pending") ?? false;
  const approvedMember = me?.capabilities.some((c) => c.capability === "rescuer" && c.status === "approved") ?? false;

  function startEdit() {
    setSaveError(undefined);
    setDraftName(me?.display_name ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    const name = draftName.trim();
    if (!name || saving) return;
    setSaving(true);
    setSaveError(undefined);
    try {
      const res = await api.patch("/me", { display_name: name });
      if (res.ok) {
        setMe(res.data);
        setEditing(false);
      } else {
        setSaveError(res.data?.error?.message ?? "Couldn't save that name. Try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await signOut();
    // Single stack (see RootNavigator) — signing out doesn't cross a stack boundary on its own,
    // so land the user back on welcome explicitly rather than stranding them on a gated screen.
    navigation.reset({ index: 0, routes: [{ name: "welcome" }] });
  }

  // US-R1 · when the load FAILED and we have nothing, say so instead of rendering the
  // `?? ` fallbacks below as fact. Those fallbacks are correct defaults for a shelter that
  // genuinely has no listings yet; they are a lie for one whose request didn't arrive.
  // (Full per-panel treatment for partial failure is US-R5's decision — this is only the
  // "don't state something false" half.)
  if (!me && loadState(res).kind !== "ready" && loadState(res).kind !== "empty") {
    return (
      <View style={styles.screen}>
        <LoadStateView state={loadState(res)} onRetry={load} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            {me?.photo_url ? (
              <Image source={{ uri: me.photo_url } as ImageSourcePropType} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initialsOf(me?.display_name ?? "")}</Text>
            )}
          </View>

          {editing ? (
            <View style={styles.editBlock}>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                autoCapitalize="words"
                autoFocus
                style={styles.nameInput}
              />
              {!!saveError && <Text style={styles.saveError}>{saveError}</Text>}
              <View style={styles.editActions}>
                <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={() => setEditing(false)} disabled={saving}>
                  <Text style={styles.editCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.85} onPress={saveEdit} disabled={saving}>
                  <Text style={styles.editSave}>{saving ? "Saving…" : "Save"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.name}>{me?.display_name ?? ""}</Text>
              <Text style={styles.email}>{me?.email ?? ""}</Text>
              <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={startEdit} style={styles.editLinkWrap}>
                <Text style={styles.editLink}>Edit profile</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.cityChip}
            onPress={() => navigation.navigate("locationPicker")}
          >
            <LocationPinIcon color={colors.teal} size={16} />
            <Text style={styles.cityChipText}>{city ?? "Set your city"}</Text>
            <Text style={styles.cityChipChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={pendingMember || approvedMember ? 1 : 0.85}
          style={styles.verifyCard}
          onPress={pendingMember || approvedMember ? undefined : () => navigation.navigate("memberUpgrade")}
          disabled={pendingMember || approvedMember}
        >
          <View style={styles.verifyIcon}>
            <UserBadgeIcon color={colors.teal} />
          </View>
          <View style={styles.verifyCopy}>
            <Text style={styles.verifyTitle}>
              {approvedMember ? "Verified Member" : pendingMember ? "Verified Member" : "Get Verified"}
            </Text>
            <Text style={styles.verifyText}>
              {approvedMember
                ? "You're verified."
                : pendingMember
                  ? "Documents in review."
                  : "Verify to adopt & rescue strays."}
            </Text>
          </View>
          {!approvedMember && !pendingMember && (
            <View style={styles.verifyButton}>
              <Text style={styles.verifyButtonText}>Start</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.accountCard}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.accountRow, styles.accountRowDivided]}
            onPress={() => navigation.navigate("myPets")}
          >
            <Text style={styles.accountRowLabel}>My pets</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.accountRow, styles.accountRowDivided]}
            onPress={() => navigation.navigate("impact")}
          >
            <Text style={styles.accountRowLabel}>My impact</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            style={[styles.accountRow, styles.accountRowDivided]}
            onPress={() => navigation.navigate("settings")}
          >
            {/* US-N5 · the only route to Settings — and through it to the §12.6 data
                rights. Before Sprint 7 the designed screen had no entry point at all. */}
            <Text style={styles.accountRowLabel}>Settings</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75} style={styles.accountRow} onPress={handleLogout}>
            <Text style={styles.accountRowLabel}>Log out</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <OwnerTabs active="profile" />
    </View>
  );
}

const colors = {
  ink: "#12213A",
  teal: "#1C6B6B",
  tealDark: "#14504F",
  page: "#F4F5F2",
  border: "#E3E1D9",
  muted: "#5F5E5A",
  soft: "#E7F0EE",
  danger: "#B23B3B"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  content: {
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 156
  },
  pageTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5
  },
  card: {
    marginTop: 18,
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
    overflow: "hidden"
  },
  avatarImage: {
    width: 84,
    height: 84
  },
  avatarInitials: {
    color: colors.teal,
    fontSize: 28,
    fontWeight: "800"
  },
  name: {
    marginTop: 16,
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  email: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 13
  },
  editLinkWrap: {
    marginTop: 10
  },
  editLink: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "800"
  },
  editBlock: {
    marginTop: 16,
    width: "100%",
    alignItems: "center"
  },
  nameInput: {
    width: "100%",
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    backgroundColor: "#FFFFFF",
    textAlign: "center"
  },
  saveError: {
    marginTop: 8,
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700"
  },
  editActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 22
  },
  editCancel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  editSave: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "800"
  },
  cityChip: {
    marginTop: 18,
    height: 40,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    backgroundColor: colors.soft
  },
  cityChipText: {
    color: colors.tealDark,
    fontSize: 13,
    fontWeight: "700"
  },
  cityChipChevron: {
    marginLeft: 2,
    color: colors.teal,
    fontSize: 15,
    fontWeight: "800"
  },
  verifyCard: {
    minHeight: 84,
    marginTop: 18,
    borderRadius: 15,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.soft
  },
  verifyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  verifyCopy: {
    flex: 1,
    marginLeft: 14
  },
  verifyTitle: {
    color: colors.tealDark,
    fontSize: 15,
    fontWeight: "800"
  },
  verifyText: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 12
  },
  verifyButton: {
    height: 38,
    minWidth: 68,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.teal
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  accountCard: {
    marginTop: 18,
    borderRadius: 15,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  accountRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  accountRowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  accountRowLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  accountRowChevron: {
    color: "#B9B5AA",
    fontSize: 22,
    lineHeight: 22
  }
});
