import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { setStatusBarStyle } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { UserBadgeIcon } from "./components/AppIcons";
import { BottomTabs, TabKey } from "./components/BottomTabs";
import { TopStatus } from "./components/TopStatus";
import { TAP_SLOP } from "./touch";

const paw = require("../assets/paw-white.png") as ImageSourcePropType;

type ProfileScreenProps = {
  onAddPet: () => void;
  onSettings: () => void;
  onStartRescuer: () => void;
  onOpenPet?: () => void;
  onTabPress?: (tab: TabKey) => void;
};

type PetRowProps = {
  name: string;
  details: string;
};

type PetRowViewProps = PetRowProps & {
  onPress?: () => void;
};

const pets: PetRowProps[] = [
  { name: "Milo", details: "Aspin · 2 yrs · Male" },
  { name: "Luna", details: "Puspin · 1 yr · Female" }
];

export function ProfileScreen({ onAddPet, onSettings, onStartRescuer, onOpenPet, onTabPress }: ProfileScreenProps) {
  // Dark header strip — see the note in WelcomeScreen on why this is focus-scoped rather
  // than a rendered <StatusBar>: the declarative form is last-mounted-wins, which left white
  // glyphs on the next screen's cream background.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#1C7876", "#12524C"]} style={styles.hero}>
        <TopStatus />
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.initialsCircle}>
          <Text style={styles.initials}>AR</Text>
        </View>
        <Text style={styles.name}>Ana Reyes</Text>
        <Text style={styles.location}>Fur Parent · Marikina City</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <Stat value="2" label="Pets" />
          <View style={styles.statDivider} />
          <Stat value="5" label="Rescues" />
          <View style={styles.statDivider} />
          <Stat value="₱1,250" label="Donated" />
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.rescuerCard} onPress={onStartRescuer}>
          <UserBadgeIcon color="#1C7876" />
          <View style={styles.rescuerCopy}>
            <Text style={styles.rescuerTitle}>Become a rescuer</Text>
            <Text style={styles.rescuerText}>Rescue & post adoptions.</Text>
          </View>
          <View style={styles.startButton}>
            <Text style={styles.startText}>Start</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My pets</Text>
          <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} onPress={onAddPet}>
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>

        {pets.map((pet) => (
          <PetRow key={pet.name} {...pet} onPress={onOpenPet} />
        ))}

        <View style={styles.settingsBlock}>
          <SettingsRow label="Account settings" onPress={onSettings} />
          <View style={styles.settingsDivider} />
          <SettingsRow label="Help & support" />
        </View>
      </ScrollView>

      <BottomTabs active="profile" onTabPress={onTabPress} />
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PetRow({ name, details, onPress }: PetRowViewProps) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.petRow}>
      <View style={styles.petAvatar}>
        <Image source={paw} resizeMode="contain" style={styles.petPaw} />
      </View>
      <View style={styles.petCopy}>
        <Text style={styles.petName}>{name}</Text>
        <Text style={styles.petDetails}>{details}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function SettingsRow({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.settingsRow}>
      <Text style={styles.settingsLabel}>{label}</Text>
      <Text style={styles.settingsChevron}>›</Text>
    </TouchableOpacity>
  );
}

const colors = {
  ink: "#1F3A5F",
  teal: "#1C7876",
  page: "#F7F7F4",
  border: "#E3E1D9",
  muted: "#62615C",
  paleTeal: "#E5F0EE"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  hero: {
    height: 286,
    alignItems: "center"
  },
  headerTitle: {
    marginTop: -4,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  initialsCircle: {
    width: 90,
    height: 90,
    marginTop: 29,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  initials: {
    color: colors.teal,
    fontSize: 31,
    fontWeight: "800"
  },
  name: {
    marginTop: 13,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800"
  },
  location: {
    marginTop: 10,
    color: "#D4ECE7",
    fontSize: 12
  },
  content: {
    paddingHorizontal: 26,
    paddingBottom: 142
  },
  statsCard: {
    height: 86,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#FFFFFF"
  },
  statItem: {
    flex: 1,
    alignItems: "center"
  },
  statValue: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  statLabel: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 11
  },
  statDivider: {
    width: 1,
    height: 46,
    backgroundColor: colors.border
  },
  rescuerCard: {
    height: 72,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 14,
    backgroundColor: "#EAF6F4"
  },
  rescuerCopy: {
    flex: 1,
    marginLeft: 12
  },
  rescuerTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  rescuerText: {
    marginTop: 7,
    color: colors.muted,
    fontSize: 10
  },
  startButton: {
    width: 74,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  startText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  sectionHeader: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  addText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "800"
  },
  petRow: {
    height: 64,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF"
  },
  petAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paleTeal
  },
  petPaw: {
    width: 23,
    height: 23,
    tintColor: colors.teal
  },
  petCopy: {
    flex: 1,
    marginLeft: 14
  },
  petName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  petDetails: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 11
  },
  chevron: {
    color: "#B9B5AA",
    fontSize: 27,
    lineHeight: 27
  },
  settingsBlock: {
    marginTop: 28
  },
  settingsRow: {
    height: 48,
    alignItems: "center",
    flexDirection: "row"
  },
  settingsLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  settingsChevron: {
    color: "#B9B5AA",
    fontSize: 27,
    lineHeight: 27
  },
  settingsDivider: {
    height: 1,
    backgroundColor: colors.border
  }
});
