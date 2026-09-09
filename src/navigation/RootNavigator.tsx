import { NativeStackScreenProps, createNativeStackNavigator } from "@react-navigation/native-stack";
import { Alert, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { NOT_CONFIGURED_MESSAGE, SocialProvider, signInWithProvider } from "../auth/socialAuth";
import { AccountTypeScreen } from "../screens/AccountTypeScreen";
import { AdoptScreen } from "../screens/AdoptScreen";
import { DonateScreen } from "../screens/DonateScreen";
import { DonatePledgeScreen } from "../screens/DonatePledgeScreen";
import { MyDonationsScreen } from "../screens/MyDonationsScreen";
import { ShelterNeedsScreen } from "../screens/ShelterNeedsScreen";
import { NeedFormScreen } from "../screens/NeedFormScreen";
import { NeedPledgesScreen } from "../screens/NeedPledgesScreen";
import { ImpactScreen } from "../screens/ImpactScreen";
import { DeleteAccountScreen } from "../screens/DeleteAccountScreen";
import { ExportDataScreen } from "../screens/ExportDataScreen";
import { SettingsPrivacyScreen } from "../screens/SettingsPrivacyScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { BadgeComparisonScreen } from "../screens/BadgeComparisonScreen";
import { StoriesScreen } from "../screens/StoriesScreen";
import { StoryComposeScreen } from "../screens/StoryComposeScreen";
import { StoryDetailScreen } from "../screens/StoryDetailScreen";
import { ReportMatchesScreen } from "../screens/ReportMatchesScreen";
import { MatchDetailScreen } from "../screens/MatchDetailScreen";
import { DonationQrScreen } from "../screens/DonationQrScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { HomeGuestScreen } from "../screens/HomeGuestScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LocationPickerScreen } from "../screens/LocationPickerScreen";
import { MemberSubmittedScreen } from "../screens/MemberSubmittedScreen";
import { MemberUpgradeScreen } from "../screens/MemberUpgradeScreen";
import { MemberVerifyScreen } from "../screens/MemberVerifyScreen";
import { OtpLockedScreen } from "../screens/OtpLockedScreen";
import { OtpScreen } from "../screens/OtpScreen";
import { PasswordChangedScreen } from "../screens/PasswordChangedScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ResetOtpScreen } from "../screens/ResetOtpScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { ShelterContactScreen } from "../screens/ShelterContactScreen";
import { ShelterDashboardScreen } from "../screens/ShelterDashboardScreen";
import { ShelterPhoneVerifyScreen } from "../screens/ShelterPhoneVerifyScreen";
import { ShelterProfileScreen } from "../screens/ShelterProfileScreen";
import { ShelterSetupScreen } from "../screens/ShelterSetupScreen";
import { ShelterTierScreen } from "../screens/ShelterTierScreen";
import { ShelterVolunteerActivityScreen } from "../screens/ShelterVolunteerActivityScreen";
import { ShelterVolunteerAttendanceScreen } from "../screens/ShelterVolunteerAttendanceScreen";
import { ShelterVolunteerCalendarScreen } from "../screens/ShelterVolunteerCalendarScreen";
import { ShelterVolunteerCancelScreen } from "../screens/ShelterVolunteerCancelScreen";
import { ShelterVolunteerCreateScreen } from "../screens/ShelterVolunteerCreateScreen";
import { ShelterVolunteerDetailScreen } from "../screens/ShelterVolunteerDetailScreen";
import { ShelterVolunteerEditScreen } from "../screens/ShelterVolunteerEditScreen";
import { ShelterVolunteerRequestsScreen } from "../screens/ShelterVolunteerRequestsScreen";
import { ShelterVolunteerScreen } from "../screens/ShelterVolunteerScreen";
import { ShelterVerifyNgoScreen } from "../screens/ShelterVerifyNgoScreen";
import { ShelterVerifyScreen } from "../screens/ShelterVerifyScreen";
import { SigninScreen } from "../screens/SigninScreen";
import { SignupScreen } from "../screens/SignupScreen";
import { SignupSuccessScreen } from "../screens/SignupSuccessScreen";
import { MyReportsScreen } from "../screens/MyReportsScreen";
import { AdjustPinScreen } from "../screens/AdjustPinScreen";
import { ReportContentScreen } from "../screens/ReportContentScreen";
import { ReportDetailScreen } from "../screens/ReportDetailScreen";
import { ReportSentScreen } from "../screens/ReportSentScreen";
import { ReportStrayScreen } from "../screens/ReportStrayScreen";
import { RescueMapScreen } from "../screens/RescueMapScreen";
import { RescueOfferScreen } from "../screens/RescueOfferScreen";
import { RescueOfferSentScreen } from "../screens/RescueOfferSentScreen";
import { MyOffersScreen } from "../screens/MyOffersScreen";
import { MyRescuesScreen } from "../screens/MyRescuesScreen";
import { RescueUpdateScreen } from "../screens/RescueUpdateScreen";
import { RescueListScreen } from "../screens/RescueListScreen";
import { RescueListedScreen } from "../screens/RescueListedScreen";
import { RescuePlaceScreen } from "../screens/RescuePlaceScreen";
import { RescuePlaceConfirmScreen } from "../screens/RescuePlaceConfirmScreen";
import { RescuePlaceSentScreen } from "../screens/RescuePlaceSentScreen";
import { PlaceRequestScreen } from "../screens/PlaceRequestScreen";
import { PlaceAcceptedScreen } from "../screens/PlaceAcceptedScreen";
import { MyPetsScreen } from "../screens/MyPetsScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ListingDetailScreen } from "../screens/ListingDetailScreen";
import { ListingFormScreen } from "../screens/ListingFormScreen";
import { MyInquiriesScreen } from "../screens/MyInquiriesScreen";
import { VerifyPhoneScreen } from "../screens/VerifyPhoneScreen";
import { VerifyDocumentsScreen } from "../screens/VerifyDocumentsScreen";
import { VerifyResubmitScreen } from "../screens/VerifyResubmitScreen";
import { KawangGawaScreen } from "../screens/KawangGawaScreen";
import { KawangGawaDetailScreen } from "../screens/KawangGawaDetailScreen";
import { KawangGawaRequestedScreen } from "../screens/KawangGawaRequestedScreen";
import { KawangGawaScheduleScreen } from "../screens/KawangGawaScheduleScreen";
import { KawangGawaCheckinScreen } from "../screens/KawangGawaCheckinScreen";
import { KawangGawaHistoryScreen } from "../screens/KawangGawaHistoryScreen";
import { KawangGawaCancelScreen } from "../screens/KawangGawaCancelScreen";
import { WaiverScreen } from "../screens/WaiverScreen";
import { RootStackParamList } from "./types";
import { WelcomeScreen } from "../WelcomeScreen";
// screen imports are added as tasks land; start with the ones that exist.

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { tokens, isReady } = useAuth();
  if (!isReady) return null; // hold render until secure-store hydration completes

  // Single stack (not two conditional stacks): the US-A1 flow crosses what used to be the
  // auth/app boundary — otp calls setTokens() mid-flow, then still needs to navigate on to
  // signupSuccess before landing on home. A token-gated two-stack navigator would yank the
  // user straight to the app stack the instant setTokens() resolves, stranding signupSuccess.
  // `initialRouteName` still respects a returning, already-authenticated user.
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={tokens ? "home" : "welcome"}>
      <Stack.Screen name="welcome" component={WelcomeRoute} />
      <Stack.Screen name="accountType" component={AccountTypeScreen} />
      <Stack.Screen name="signup" component={SignupScreen} />
      <Stack.Screen name="otp" component={OtpScreen} />
      <Stack.Screen name="otpLocked" component={OtpLockedScreen} />
      <Stack.Screen name="signupSuccess" component={SignupSuccessScreen} />
      <Stack.Screen name="signin" component={SigninScreen} />
      <Stack.Screen name="forgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="resetOtp" component={ResetOtpScreen} />
      <Stack.Screen name="resetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="passwordChanged" component={PasswordChangedScreen} />
      <Stack.Screen name="support" component={PlaceholderSupport} />
      <Stack.Screen name="home" component={HomeScreen} />
      <Stack.Screen name="homeGuest" component={HomeGuestScreen} />
      <Stack.Screen name="adopt" component={AdoptScreen} />
      <Stack.Screen name="profile" component={ProfileScreen} />
      <Stack.Screen name="locationPicker" component={LocationPickerScreen} />
      <Stack.Screen name="memberUpgrade" component={MemberUpgradeScreen} />
      <Stack.Screen name="memberVerify" component={MemberVerifyScreen} />
      <Stack.Screen name="memberSubmitted" component={MemberSubmittedScreen} />
      <Stack.Screen name="shelterTier" component={ShelterTierScreen} />
      <Stack.Screen name="shelterSetup" component={ShelterSetupScreen} />
      <Stack.Screen name="shelterContact" component={ShelterContactScreen} />
      <Stack.Screen name="shelterPhoneVerify" component={ShelterPhoneVerifyScreen} />
      <Stack.Screen name="shelterVerify" component={ShelterVerifyScreen} />
      <Stack.Screen name="shelterVerifyNgo" component={ShelterVerifyNgoScreen} />
      <Stack.Screen name="shelterDashboard" component={ShelterDashboardScreen} />
      <Stack.Screen name="shelterProfile" component={ShelterProfileScreen} />
      <Stack.Screen name="verifyDocuments" component={VerifyDocumentsScreen} />
      <Stack.Screen name="verifyResubmit" component={VerifyResubmitScreen} />
      <Stack.Screen name="reportStray" component={ReportStrayScreen} />
      <Stack.Screen name="adjustPin" component={AdjustPinScreen} />
      <Stack.Screen name="reportSent" component={ReportSentScreen} />
      <Stack.Screen name="myReports" component={MyReportsScreen} />
      <Stack.Screen name="rescueMap" component={RescueMapScreen} />
      <Stack.Screen name="reportDetail" component={ReportDetailScreen} />
      <Stack.Screen name="rescueOffer" component={RescueOfferScreen} />
      <Stack.Screen name="rescueOfferSent" component={RescueOfferSentScreen} />
      <Stack.Screen name="myOffers" component={MyOffersScreen} />
      <Stack.Screen name="myRescues" component={MyRescuesScreen} />
      <Stack.Screen name="rescueUpdate" component={RescueUpdateScreen} />
      {/* US-H1 — list an adoption from a safe rescue case. */}
      <Stack.Screen name="rescueList" component={RescueListScreen} />
      <Stack.Screen name="rescueListed" component={RescueListedScreen} />
      {/* US-H2 — place an animal directly with a known verified member/shelter, no public listing. */}
      <Stack.Screen name="rescuePlace" component={RescuePlaceScreen} />
      <Stack.Screen name="rescuePlaceConfirm" component={RescuePlaceConfirmScreen} />
      <Stack.Screen name="rescuePlaceSent" component={RescuePlaceSentScreen} />
      {/* US-H3 — the recipient of a direct placement accepts or declines it. */}
      <Stack.Screen name="placeRequest" component={PlaceRequestScreen} />
      <Stack.Screen name="placeAccepted" component={PlaceAcceptedScreen} />
      {/* US-H3 — the recipient's own pets. */}
      <Stack.Screen name="myPets" component={MyPetsScreen} />
      <Stack.Screen name="notifications" component={NotificationsScreen} />
      <Stack.Screen name="listingDetail" component={ListingDetailScreen} />
      <Stack.Screen name="listingForm" component={ListingFormScreen} />
      <Stack.Screen name="myInquiries" component={MyInquiriesScreen} />
      <Stack.Screen name="verifyPhone" component={VerifyPhoneScreen} />
      <Stack.Screen name="donationQr" component={DonationQrScreen} />
      <Stack.Screen name="donate" component={DonateScreen} />
      <Stack.Screen name="donatePledge" component={DonatePledgeScreen} />
      <Stack.Screen name="myDonations" component={MyDonationsScreen} />
      <Stack.Screen name="shelterNeeds" component={ShelterNeedsScreen} />
      <Stack.Screen name="needForm" component={NeedFormScreen} />
      <Stack.Screen name="needPledges" component={NeedPledgesScreen} />
      <Stack.Screen name="settings" component={SettingsScreen} />
      <Stack.Screen name="settingsPrivacy" component={SettingsPrivacyScreen} />
      <Stack.Screen name="deleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="exportData" component={ExportDataScreen} />
      <Stack.Screen name="impact" component={ImpactScreen} />
      <Stack.Screen name="badgeComparison" component={BadgeComparisonScreen} />
      <Stack.Screen name="stories" component={StoriesScreen} />
      <Stack.Screen name="storyCompose" component={StoryComposeScreen} />
      <Stack.Screen name="storyDetail" component={StoryDetailScreen} />
      <Stack.Screen name="reportMatches" component={ReportMatchesScreen} />
      <Stack.Screen name="matchDetail" component={MatchDetailScreen} />
      <Stack.Screen name="reportContent" component={ReportContentScreen} />
      {/* US-V8 — the real hub + shift detail/waiver (Task 4), schedule (Task 5),
          check-in/out (Task 6), history (Task 7), and the cancel flow (Task 8). */}
      <Stack.Screen name="kawanggawa" component={KawangGawaScreen} />
      <Stack.Screen name="kawanggawaDetail" component={KawangGawaDetailScreen} />
      <Stack.Screen name="waiver" component={WaiverScreen} />
      <Stack.Screen name="kawanggawaRequested" component={KawangGawaRequestedScreen} />
      <Stack.Screen name="kawanggawaSchedule" component={KawangGawaScheduleScreen} />
      <Stack.Screen name="kawanggawaCheckin" component={KawangGawaCheckinScreen} />
      <Stack.Screen name="kawanggawaHistory" component={KawangGawaHistoryScreen} />
      <Stack.Screen name="kawanggawaCancel" component={KawangGawaCancelScreen} />
      {/* US-V9 — the shelter side of Kawang-Gawa: the manage list (Task 5, real), the
          activity hub + calendar (Task 6, real), create/edit (Task 7, real), requests
          (Task 8, real), attendance/detail (Task 9, real), and cancel — naming the blast
          radius before it fires (Task 10, real). All nine screens are now real. */}
      <Stack.Screen name="shelterVolunteer" component={ShelterVolunteerScreen} />
      <Stack.Screen name="shelterVolunteerCreate" component={ShelterVolunteerCreateScreen} />
      <Stack.Screen name="shelterVolunteerActivity" component={ShelterVolunteerActivityScreen} />
      <Stack.Screen name="shelterVolunteerRequests" component={ShelterVolunteerRequestsScreen} />
      <Stack.Screen name="shelterVolunteerAttendance" component={ShelterVolunteerAttendanceScreen} />
      <Stack.Screen name="shelterVolunteerDetail" component={ShelterVolunteerDetailScreen} />
      <Stack.Screen name="shelterVolunteerCalendar" component={ShelterVolunteerCalendarScreen} />
      <Stack.Screen name="shelterVolunteerEdit" component={ShelterVolunteerEditScreen} />
      <Stack.Screen name="shelterVolunteerCancel" component={ShelterVolunteerCancelScreen} />
    </Stack.Navigator>
  );
}

function WelcomeRoute({ navigation }: NativeStackScreenProps<RootStackParamList, "welcome">) {
  // US-A2. This handler was MISSING until 2026-08-06: WelcomeScreen rendered a "Continue with
  // Google" button and nothing was ever passed for it, so tapping it did nothing at all —
  // silently. Now it either starts the provider flow or explains why it can't.
  async function onSocial(provider: SocialProvider) {
    const res = await signInWithProvider(provider);
    if (res.ok) {
      navigation.navigate("accountType", { social: res.identity });
      return;
    }
    if (res.reason === "cancelled") return;
    Alert.alert(
      res.reason === "not_configured" ? "Not available yet" : "Sign-in failed",
      res.reason === "not_configured" ? NOT_CONFIGURED_MESSAGE : "Please try again."
    );
  }

  return (
    <WelcomeScreen
      onGetStarted={() => navigation.navigate("accountType")}
      onLogin={() => navigation.navigate("signin")}
      onBrowseGuest={() => navigation.navigate("homeGuest")}
      onContinueWithGoogle={() => onSocial("google")}
    />
  );
}

// Minimal stand-in so passwordChanged's "Need help?" link has somewhere to go and typechecks
// end-to-end. A real contact-support flow (ticket form, FAQ, etc.) is out of scope for M6.
function PlaceholderSupport() {
  return (
    <View style={styles.lockedScreen}>
      <Text style={styles.lockedTitle}>Contact support</Text>
      <Text style={styles.lockedBody}>Support is coming soon. Email hello@kupkop.ph for now.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#F7F7F4"
  },
  lockedTitle: {
    color: "#1F3A5F",
    fontSize: 20,
    fontWeight: "800"
  },
  lockedBody: {
    marginTop: 10,
    color: "#62615C",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20
  }
});
