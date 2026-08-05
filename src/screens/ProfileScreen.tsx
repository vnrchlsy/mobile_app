// US-X3/X4 — the "You" tab. Reference: screens/user/screen-profile.png.
// Fetches /me on focus (avatar, name, email, Verified Member status). City has no GET endpoint
// (only PUT /me/location — see accounts/views.py MeLocationView) so the last-picked city is cached
// in AuthContext/SecureStore by LocationPickerScreen and read from there instead of /me.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { Me } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { LocationPinIcon, UserBadgeIcon } from "../components/AppIcons";
import { OwnerTabs } from "../components/OwnerTabs";
import { ScreenContainer } from "../components/ScreenContainer";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "profile">;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileScreen({ navigation }: Props) {
  const api = useApi();
  const { city, signOut } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      api.get("/me").then((r) => r.ok && setMe(r.data));
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on focus, not on every api identity change
    }, [])
  );

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

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                <TouchableOpacity activeOpacity={0.75} onPress={() => setEditing(false)} disabled={saving}>
                  <Text style={styles.editCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} onPress={saveEdit} disabled={saving}>
                  <Text style={styles.editSave}>{saving ? "Saving…" : "Save"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.name}>{me?.display_name ?? ""}</Text>
              <Text style={styles.email}>{me?.email ?? ""}</Text>
              <TouchableOpacity activeOpacity={0.75} onPress={startEdit} style={styles.editLinkWrap}>
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
          <TouchableOpacity activeOpacity={0.75} style={styles.accountRow} onPress={handleLogout}>
            <Text style={styles.accountRowLabel}>Log out</Text>
            <Text style={styles.accountRowChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <OwnerTabs active="profile" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.s24,
    paddingTop: spacing.s20,
    // clears OwnerTabs' floating bar — not snapped to the spacing scale, see Migration Protocol step 2
    paddingBottom: 156
  },
  pageTitle: {
    color: colors.inkStrong,
    ...typography.heading800_28,
    letterSpacing: -0.5
  },
  card: {
    marginTop: spacing.s16,
    borderRadius: radii.r16,
    alignItems: "center",
    paddingVertical: spacing.s24,
    paddingHorizontal: spacing.s20,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: radii.r20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tealTint,
    overflow: "hidden"
  },
  avatarImage: {
    width: 84,
    height: 84
  },
  avatarInitials: {
    color: colors.teal,
    ...typography.heading800_28
  },
  name: {
    marginTop: spacing.s16,
    color: colors.inkStrong,
    ...typography.heading800_20
  },
  email: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body13
  },
  editLinkWrap: {
    marginTop: spacing.s8
  },
  editLink: {
    color: colors.teal,
    ...typography.label800_13
  },
  editBlock: {
    marginTop: spacing.s16,
    width: "100%",
    alignItems: "center"
  },
  nameInput: {
    width: "100%",
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.r12,
    paddingHorizontal: spacing.s12,
    color: colors.inkStrong,
    ...typography.label800_15,
    backgroundColor: colors.white,
    textAlign: "center"
  },
  saveError: {
    marginTop: spacing.s8,
    color: colors.danger,
    ...typography.label700_12
  },
  editActions: {
    marginTop: spacing.s12,
    flexDirection: "row",
    gap: spacing.s20
  },
  editCancel: {
    color: colors.muted,
    ...typography.label700_13
  },
  editSave: {
    color: colors.teal,
    ...typography.label800_13
  },
  cityChip: {
    marginTop: spacing.s16,
    height: 40,
    // pill: borderRadius = height / 2, kept literal per Migration Protocol step 3
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.s12,
    gap: spacing.s8,
    backgroundColor: colors.tealTint
  },
  cityChipText: {
    color: colors.tealDark,
    ...typography.label700_13
  },
  cityChipChevron: {
    marginLeft: spacing.s2,
    color: colors.teal,
    ...typography.label800_15
  },
  verifyCard: {
    minHeight: 84,
    marginTop: spacing.s16,
    borderRadius: radii.r16,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s12,
    backgroundColor: colors.tealTint
  },
  verifyIcon: {
    width: 48,
    height: 48,
    // circle: borderRadius = width / 2, kept literal per Migration Protocol step 3
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  verifyCopy: {
    flex: 1,
    marginLeft: spacing.s12
  },
  verifyTitle: {
    color: colors.tealDark,
    ...typography.label800_15
  },
  verifyText: {
    marginTop: spacing.s4,
    color: colors.muted,
    ...typography.body12
  },
  verifyButton: {
    height: 38,
    minWidth: 68,
    // pill: borderRadius = height / 2, kept literal per Migration Protocol step 3
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.s16,
    backgroundColor: colors.teal
  },
  verifyButtonText: {
    color: colors.white,
    ...typography.label800_13
  },
  accountCard: {
    marginTop: spacing.s16,
    borderRadius: radii.r16,
    paddingHorizontal: spacing.s16,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
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
  accountRowLabel: {
    color: colors.inkStrong,
    ...typography.label800_15
  },
  accountRowChevron: {
    color: colors.neutralMuted,
    ...typography.body22,
    lineHeight: 22
  }
});
