import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { BatteryIcon } from "./AppIcons";

type TopStatusProps = {
  variant?: "light" | "dark";
};

export function TopStatus({ variant = "dark" }: TopStatusProps) {
  const color = variant === "light" ? colors.white : colors.ink;
  return (
    <View style={styles.statusBar}>
      <Text style={[styles.time, { color }]}>9:41</Text>
      <View style={styles.batteryWrap}>
        <BatteryIcon color={color} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBar: {
    height: 52
  },
  time: {
    position: "absolute",
    left: 31,
    top: 17,
    fontSize: 14,
    fontWeight: "800"
  },
  batteryWrap: {
    position: "absolute",
    right: 26,
    top: 20
  }
});
