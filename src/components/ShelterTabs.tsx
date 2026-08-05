import { Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { theme } from "../theme";
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

export function ShelterTabs({ active, onTabPress }: ShelterTabsProps) {
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const color = isActive ? theme.colors.teal : theme.colors.inactive;
        return (
          <TouchableOpacity key={tab.key} activeOpacity={0.75} style={styles.tabItem} onPress={() => onTabPress?.(tab.key)}>
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
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: theme.spacing.s12,
    backgroundColor: theme.colors.page
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
    ...theme.typography.heading900_20,
    lineHeight: 24
  },
  tabText: {
    marginTop: theme.spacing.s2,
    color: theme.colors.muted,
    ...theme.typography.micro400_9
  },
  activeTabText: {
    color: theme.colors.teal,
    ...theme.typography.micro800_9
  }
});
