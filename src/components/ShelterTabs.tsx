import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { HomeIcon, ProfileIcon } from "./AppIcons";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

export type ShelterTabKey = "home" | "animals" | "donate" | "requests" | "profile";

type ShelterTabsProps = {
  active: ShelterTabKey;
  onTabPress?: (tab: ShelterTabKey) => void;
};

const tabs: Array<{ key: ShelterTabKey; label: string }> = [
  { key: "home", label: "Home" },
  { key: "animals", label: "Animals" },
  { key: "donate", label: "Donate" },
  { key: "requests", label: "Requests" },
  { key: "profile", label: "You" }
];

const colors = {
  teal: "#1C7876",
  inactive: "#CAD2CF",
  muted: "#62615C"
};

export function ShelterTabs({ active, onTabPress }: ShelterTabsProps) {
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const color = isActive ? colors.teal : colors.inactive;
        return (
          <TouchableOpacity
            testID={`tab.shelter.${tab.key}`}
            key={tab.key}
            activeOpacity={0.75}
            style={styles.tabItem}
            onPress={() => onTabPress?.(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            // A screen-reader user needs to know WHICH tab they are on, not just
            // which ones exist — selected state is half of what a tab bar means.
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.iconSlot}>{renderIcon(tab.key, color)}</View>
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function renderIcon(tab: ShelterTabKey, color: string) {
  if (tab === "home") return <HomeIcon color={color} size={24} />;
  if (tab === "animals") return <Image source={paw} resizeMode="contain" style={[styles.pawIcon, { tintColor: color }]} />;
  if (tab === "donate") return <Text style={[styles.symbolIcon, { color }]}>₱</Text>;
  if (tab === "requests") return <Text style={[styles.symbolIcon, { color }]}>✉</Text>;
  return <ProfileIcon color={color} size={24} />;
}

const styles = StyleSheet.create({
  tabs: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    borderTopWidth: 1,
    borderTopColor: "#E3E1D9",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    backgroundColor: "#F7F7F4"
  },
  tabItem: {
    width: 58,
    alignItems: "center"
  },
  iconSlot: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  pawIcon: {
    width: 22,
    height: 22,
    transform: [{ translateY: -1 }]
  },
  symbolIcon: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24
  },
  tabText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 9
  },
  activeTabText: {
    color: colors.teal,
    fontWeight: "800"
  }
});
