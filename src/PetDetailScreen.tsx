import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { TopStatus } from "./components/TopStatus";
import { TAP_SLOP } from "./touch";

const paw = require("../assets/paw-white.png") as ImageSourcePropType;

type PetDetailScreenProps = {
  onBack: () => void;
};

const healthItems = ["Vaccinated", "Neutered", "Dewormed"];

export function PetDetailScreen({ onBack }: PetDetailScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TopStatus />
        <TouchableOpacity activeOpacity={0.75} onPress={onBack} style={styles.backButton} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.photoCard}>
          <View style={styles.availablePill}>
            <View style={styles.availableDot} />
            <Text style={styles.availableText}>Available</Text>
          </View>
          <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75} style={styles.favoriteButton}>
            <Text style={styles.favoriteText}>♥</Text>
          </TouchableOpacity>
          <Image source={paw} resizeMode="contain" style={styles.heroPaw} />
        </View>

        <Text style={styles.petName}>Milo</Text>
        <Text style={styles.petMeta}>Aspin (Asong Pinoy) · 2 yrs · Male · Medium</Text>

        <TouchableOpacity activeOpacity={0.82} style={styles.shelterCard}>
          <View style={styles.shelterIcon}>
            <View style={styles.buildingGrid}>
              {Array.from({ length: 9 }).map((_, index) => (
                <View key={index} style={styles.windowDot} />
              ))}
            </View>
          </View>
          <View style={styles.shelterCopy}>
            <View style={styles.shelterNameRow}>
              <Text style={styles.shelterName}>PAWS Manila</Text>
              <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓</Text></View>
            </View>
            <Text style={styles.shelterMeta}>Marikina City · 2 km away</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>About Milo</Text>
        <Text style={styles.aboutText}>Friendly, house-trained aspin who loves morning walks and belly rubs. Great with kids and other dogs. Looking for a calm forever home.</Text>

        <Text style={styles.sectionTitle}>Health</Text>
        <View style={styles.healthRow}>
          {healthItems.map((item) => (
            <View key={item} style={styles.healthPill}>
              <Text style={styles.check}>✓</Text>
              <Text style={styles.healthText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.feeRow}>
          <View>
            <Text style={styles.feeLabel}>Adoption fee</Text>
            <Text style={styles.feeValue}>Free</Text>
          </View>
          <Text style={styles.visitText}>Home visit required</Text>
        </View>

        <TouchableOpacity activeOpacity={0.85} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Start adoption</Text>
        </TouchableOpacity>
        <TouchableOpacity hitSlop={TAP_SLOP} activeOpacity={0.75}>
          <Text style={styles.callLink}>Have a question? Call the shelter</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const colors = {
  ink: "#1F3A5F",
  teal: "#1C7876",
  page: "#F7F7F4",
  border: "#E3E1D9",
  muted: "#62615C",
  paleTeal: "#E5F0EE",
  chip: "#E7F5DC",
  green: "#2F681D"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  header: {
    height: 83
  },
  backButton: {
    position: "absolute",
    left: 25,
    top: 45,
    width: 42,
    height: 42,
    zIndex: 10,
    justifyContent: "center"
  },
  backText: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 34
  },
  content: {
    paddingHorizontal: 26,
    paddingBottom: 36
  },
  photoCard: {
    height: 204,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDEAE6"
  },
  availablePill: {
    position: "absolute",
    left: 16,
    top: 18,
    height: 29,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF"
  },
  availableDot: {
    width: 7,
    height: 7,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: colors.green
  },
  availableText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "800"
  },
  favoriteButton: {
    position: "absolute",
    right: 13,
    top: 13,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  favoriteText: {
    color: "#CBD4D1",
    fontSize: 19,
    fontWeight: "900"
  },
  heroPaw: {
    width: 60,
    height: 60,
    tintColor: colors.teal,
    transform: [{ translateY: -4 }]
  },
  petName: {
    marginTop: 18,
    color: colors.ink,
    fontSize: 26,
    fontWeight: "800"
  },
  petMeta: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12
  },
  shelterCard: {
    height: 66,
    marginTop: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF"
  },
  shelterIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paleTeal
  },
  buildingGrid: {
    width: 22,
    height: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2
  },
  windowDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: colors.teal
  },
  shelterCopy: {
    flex: 1,
    marginLeft: 14
  },
  shelterNameRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  shelterName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    marginLeft: 8,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  verifiedText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900"
  },
  shelterMeta: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 11
  },
  chevron: {
    color: "#B9B5AA",
    fontSize: 27,
    lineHeight: 27
  },
  sectionTitle: {
    marginTop: 18,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  aboutText: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19
  },
  healthRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  healthPill: {
    minWidth: 96,
    height: 30,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: colors.chip
  },
  check: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 18
  },
  healthText: {
    marginLeft: 7,
    color: colors.green,
    fontSize: 11,
    fontWeight: "800"
  },
  feeRow: {
    marginTop: 31,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 14
  },
  feeLabel: {
    color: colors.muted,
    fontSize: 12
  },
  feeValue: {
    marginTop: 3,
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  visitText: {
    color: colors.muted,
    fontSize: 10
  },
  primaryButton: {
    height: 51,
    marginTop: 28,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  callLink: {
    marginTop: 13,
    color: colors.teal,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  }
});
