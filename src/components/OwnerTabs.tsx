// Owner shell's floating "v2" tab bar — reference: screens/user/screen-home.png (bottom nav).
// Exactly four tabs (Home · Adopt · Volunteer · You) — no Inbox. A detached, rounded, shadowed
// bar rather than the old edge-to-edge strip; the active tab gets a tinted pill behind its icon.
// This is a single native-stack app (no bottom-tab navigator), so each owner-shell screen renders
// this bar itself and tab presses just `navigate()` to the corresponding stack route.
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { RootStackParamList } from "../navigation/types";
import { AdoptIcon, HomeIcon, ProfileIcon, VolunteerIcon } from "./AppIcons";

export type OwnerTab = "home" | "adopt" | "volunteer" | "profile";

type OwnerTabsProps = {
  active: OwnerTab;
};

const tabs: Array<{ key: OwnerTab; label: string }> = [
  { key: "home", label: "Home" },
  { key: "adopt", label: "Adopt" },
  { key: "volunteer", label: "Volunteer" },
  { key: "profile", label: "You" }
];

const colors = {
  teal: "#1C6B6B",
  tealDark: "#14504F",
  soft: "#E7F0EE",
  inactive: "#C9CEC7",
  muted: "#5F5E5A"
};

export function OwnerTabs({ active }: OwnerTabsProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const color = isActive ? colors.teal : colors.inactive;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.75}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              // A screen-reader user needs to know WHICH tab they are on, not just
              // which ones exist — selected state is half of what a tab bar means.
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                if (isActive) return;
                // The Volunteer tab opens the Kawang-Gawa hub (US-V8) rather than the old
                // "volunteer" placeholder route, which stays registered but unreachable from here.
                if (tab.key === "volunteer") {
                  navigation.navigate("kawanggawa");
                  return;
                }
                navigation.navigate(tab.key);
              }}
            >
              <View style={[styles.iconSlot, isActive && styles.iconSlotActive]}>{renderIcon(tab.key, color)}</View>
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function renderIcon(tab: OwnerTab, color: string) {
  if (tab === "home") return <HomeIcon color={color} size={24} />;
  if (tab === "adopt") return <AdoptIcon color={color} size={24} />;
  if (tab === "volunteer") return <VolunteerIcon color={color} size={24} />;
  return <ProfileIcon color={color} size={24} />;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24
  },
  bar: {
    height: 84,
    borderRadius: 30,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F3A5F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  iconSlot: {
    width: 44,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  iconSlotActive: {
    backgroundColor: colors.soft
  },
  tabText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600"
  },
  activeTabText: {
    color: colors.tealDark,
    fontWeight: "800"
  }
});
