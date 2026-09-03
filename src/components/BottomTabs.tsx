import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AdoptIcon, HomeIcon, ProfileIcon, VolunteerIcon } from "./AppIcons";

export type TabKey = "home" | "adopt" | "volunteer" | "profile";

type BottomTabsProps = {
  active: TabKey;
  onTabPress?: (tab: TabKey) => void;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "home", label: "Home" },
  { key: "adopt", label: "Adopt" },
  { key: "volunteer", label: "Volunteer" },
  { key: "profile", label: "You" }
];

const colors = {
  teal: "#1C7876",
  inactive: "#CAD2CF",
  muted: "#62615C"
};

export function BottomTabs({ active, onTabPress }: BottomTabsProps) {
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const color = isActive ? colors.teal : colors.inactive;
        return (
          <TouchableOpacity
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

function renderIcon(tab: TabKey, color: string) {
  if (tab === "home") return <HomeIcon color={color} />;
  if (tab === "adopt") return <AdoptIcon color={color} />;
  if (tab === "volunteer") return <VolunteerIcon color={color} />;
  return <ProfileIcon color={color} />;
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
    width: 72,
    alignItems: "center"
  },
  iconSlot: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center"
  },
  tabText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12
  },
  activeTabText: {
    color: colors.teal,
    fontWeight: "800"
  }
});
