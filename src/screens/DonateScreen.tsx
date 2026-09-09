// US-Q2 · the public donate surface. GET /shelters/{accountId}/donation-qr — a two-key
// gate (org approved AND the QR reviewer-verified), so a 404 here just means "nothing to
// show yet," not an error. Payments happen off-platform in the payment app itself —
// Kupkop never touches the money (decision: donations stay off-platform QR by design).
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { LoadStateView } from "../components/LoadStateView";
import { loadState } from "../net";
import { needProgressLabel } from "../community";
import { RootStackParamList } from "../navigation/types";
import { TAP_SLOP } from "../touch";

const colors = {
  ink: "#12213A", teal: "#1C6B6B", page: "#F4F5F2", muted: "#5F5E5A", white: "#FFFFFF",
  line: "#E3E1D9", soft: "#E7F0EF"
};

const PROVIDER_LABEL: Record<string, string> = { gcash: "GCash", maya: "Maya" };

type DonationQr = { provider: string; account_name: string; qr_image_url: string };
type Need = {
  need_id: string; title: string; category: string;
  quantity_needed: number; quantity_received: number; status: string;
};
type Props = NativeStackScreenProps<RootStackParamList, "donate">;

export function DonateScreen({ navigation, route }: Props) {
  const api = useApi();
  const { accountId, orgName } = route.params;
  const [qrs, setQrs] = useState<DonationQr[] | null>(null);
  // US-R2 · PRIMARY: this screen exists to show the QR. `needs` below is SECONDARY and
  // degrades on its own rather than taking the screen.
  const [res, setRes] = useState<{ ok: boolean; status: number } | null>(null);

  const [needs, setNeeds] = useState<Need[] | null>(null);

  useEffect(() => {
    setRes(null);
    // ⚠️ was `setQrs(r.ok ? ... : [])` — so a failed request rendered "Donations aren't
    // available for this org yet.", a false statement about a shelter that could cost it a
    // donation.
    api.get(`/shelters/${accountId}/donation-qr`).then((r) => {
      setRes({ ok: r.ok, status: r.status });
      if (r.ok) setQrs(r.data.donation_qrs);
    });
    // US-W2 · the shelter's open wishlist, shown beside the QR block (both live on Donate).
    api.get(`/shelters/${accountId}/needs?status=open`).then((r) => {
      setNeeds(r.ok ? r.data.results : []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once for this accountId
  }, [accountId]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn.back" onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Donate</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.orgName}>{orgName}</Text>
        <Text style={styles.offPlatformNote}>
          Donations happen in your payment app — Kupkop never touches the money.
        </Text>

        {loadState(res, qrs?.length).kind !== "ready" ? (
          <LoadStateView
            state={loadState(res, qrs?.length)}
            emptyTitle="Donations aren't available for this org yet."
          />
        ) : qrs && qrs.length > 0 ? (
          qrs.map((qr) => (
            <View key={qr.provider} style={styles.qrCard}>
              <Text style={styles.provider}>{PROVIDER_LABEL[qr.provider] ?? qr.provider}</Text>
              <Image source={{ uri: qr.qr_image_url }} style={styles.qrImage} resizeMode="contain" />
              <Text style={styles.accountName}>{qr.account_name}</Text>
            </View>
          ))
        ) : null}

        {needs && needs.length > 0 ? (
          <View style={styles.wishlist}>
            <Text style={styles.sectionTitle}>Wishlist</Text>
            <Text style={styles.sectionNote}>
              Pledge to bring what {orgName} needs. They confirm once it arrives.
            </Text>
            {needs.map((need) => (
              <View key={need.need_id} style={styles.needCard}>
                <Text style={styles.needTitle}>{need.title}</Text>
                <Text style={styles.needMeta}>
                  {need.category} · {needProgressLabel(need.quantity_received, need.quantity_needed)}
                </Text>
                <TouchableOpacity hitSlop={TAP_SLOP} style={styles.pledgeBtn}
                  onPress={() => navigation.navigate("donatePledge", {
                    needId: need.need_id, needTitle: need.title, shelterName: orgName
                  })}>
                  <Text style={styles.pledgeLabel}>Pledge</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity hitSlop={TAP_SLOP} style={styles.myDonationsRow}
          onPress={() => navigation.navigate("myDonations")}>
          <Text style={styles.myDonationsLabel}>My donations ›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const card = {
  backgroundColor: colors.white, shadowColor: "#1F3A5F", shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 7, elevation: 2
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  header: { paddingTop: 58, paddingHorizontal: 26, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 16 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...card },
  backGlyph: { color: colors.ink, fontSize: 30, fontWeight: "800", marginTop: -4 },
  title: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingTop: 12, paddingBottom: 60 },
  orgName: { color: colors.ink, fontSize: 26, fontWeight: "800" },
  offPlatformNote: { marginTop: 8, marginBottom: 20, color: colors.muted, fontSize: 14, lineHeight: 20 },
  qrCard: { marginBottom: 18, padding: 20, borderRadius: 22, alignItems: "center", ...card },
  provider: { color: colors.teal, fontSize: 16, fontWeight: "800" },
  qrImage: { marginTop: 14, width: 220, height: 220, borderRadius: 12, backgroundColor: colors.line },
  accountName: { marginTop: 14, color: colors.ink, fontSize: 15, fontWeight: "600" },
  empty: { marginTop: 40, color: colors.muted, fontSize: 16, textAlign: "center" },
  wishlist: { marginTop: 28 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  sectionNote: { marginTop: 6, marginBottom: 14, color: colors.muted, fontSize: 14, lineHeight: 20 },
  needCard: { marginBottom: 12, padding: 18, borderRadius: 22, ...card },
  needTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  needMeta: { marginTop: 6, color: colors.muted, fontSize: 14, textTransform: "capitalize" },
  pledgeBtn: { marginTop: 14, alignSelf: "flex-start", paddingHorizontal: 22, paddingVertical: 11, borderRadius: 16, backgroundColor: colors.teal },
  pledgeLabel: { color: colors.white, fontSize: 15, fontWeight: "700" },
  myDonationsRow: { marginTop: 26, alignItems: "center" },
  myDonationsLabel: { color: colors.teal, fontSize: 16, fontWeight: "700" }
});
