import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";

import { colors } from "../theme/colors";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type IconProps = {
  color: string;
  size?: number;
};

export function HomeIcon({ color, size = 28 }: IconProps) {
  return (
    <View style={[styles.iconBox, { width: size, height: size }]}> 
      <View style={[styles.homeRoof, { borderBottomColor: color, left: size * 0.12, top: size * 0.12 }]} />
      <View
        style={[
          styles.homeBody,
          {
            width: size * 0.56,
            height: size * 0.44,
            left: size * 0.22,
            top: size * 0.42,
            backgroundColor: color
          }
        ]}
      />
    </View>
  );
}

export function AdoptIcon({ color, size = 28 }: IconProps) {
  return (
    <View style={[styles.iconBox, { width: size, height: size }]}> 
      <Image
        source={paw}
        resizeMode="contain"
        style={{ width: size * 0.8, height: size * 0.8, tintColor: color, transform: [{ translateY: -size * 0.04 }] }}
      />
    </View>
  );
}

export function VolunteerIcon({ color, size = 28 }: IconProps) {
  return (
    <View style={[styles.iconBox, { width: size, height: size }]}> 
      <View style={[styles.handPalm, { borderColor: color, width: size * 0.46, height: size * 0.34, top: size * 0.48 }]} />
      <View style={[styles.handFinger, { backgroundColor: color, left: size * 0.22, height: size * 0.48 }]} />
      <View style={[styles.handFinger, { backgroundColor: color, left: size * 0.38, height: size * 0.55 }]} />
      <View style={[styles.handFinger, { backgroundColor: color, left: size * 0.54, height: size * 0.47 }]} />
    </View>
  );
}

export function ProfileIcon({ color, size = 28 }: IconProps) {
  return (
    <View style={[styles.iconBox, { width: size, height: size }]}> 
      <View
        style={[
          styles.profileHead,
          {
            width: size * 0.34,
            height: size * 0.34,
            borderRadius: size * 0.17,
            top: size * 0.12,
            backgroundColor: color
          }
        ]}
      />
      <View
        style={[
          styles.profileBody,
          {
            width: size * 0.66,
            height: size * 0.34,
            borderTopLeftRadius: size * 0.33,
            borderTopRightRadius: size * 0.33,
            top: size * 0.54,
            backgroundColor: color
          }
        ]}
      />
    </View>
  );
}

export function BatteryIcon({ color }: { color: string }) {
  return (
    <View style={[styles.battery, { borderColor: color }]}> 
      <View style={[styles.batteryDot, { backgroundColor: color }]} />
      <View style={[styles.batteryDot, { backgroundColor: color }]} />
    </View>
  );
}

export function BellIcon({ color }: { color: string }) {
  return (
    <View style={styles.bellWrap}>
      <View style={[styles.bellDome, { borderColor: color }]} />
      <View style={[styles.bellBase, { backgroundColor: color }]} />
      <View style={[styles.bellClapper, { backgroundColor: color }]} />
    </View>
  );
}

export function UserBadgeIcon({ color }: { color: string }) {
  return (
    <View style={[styles.userBadge, { backgroundColor: color }]}> 
      <View style={styles.userBadgeHead} />
      <View style={styles.userBadgeBody} />
    </View>
  );
}

export function ClockIcon({ color, size = 38 }: { color: string; size?: number }) {
  return (
    <View style={[styles.clock, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
      <View
        style={[
          styles.clockHandTall,
          { backgroundColor: color, height: size * 0.29, transform: [{ translateY: -size * 0.08 }] }
        ]}
      />
      <View
        style={[
          styles.clockHandWide,
          { backgroundColor: color, width: size * 0.24, marginTop: -size * 0.12, marginLeft: size * 0.16 }
        ]}
      />
    </View>
  );
}

export function LocationPinIcon({ color, size = 20 }: IconProps) {
  return (
    <View style={[styles.iconBox, { width: size, height: size }]}>
      <View
        style={[
          styles.pinHead,
          { width: size * 0.62, height: size * 0.62, borderRadius: size * 0.31, borderColor: color, top: 0 }
        ]}
      />
      <View
        style={[
          styles.pinPoint,
          {
            borderLeftWidth: size * 0.16,
            borderRightWidth: size * 0.16,
            borderTopWidth: size * 0.2,
            borderTopColor: color,
            top: size * 0.5
          }
        ]}
      />
    </View>
  );
}

export function CheckIcon({ color = colors.white, size = 14 }: { color?: string; size?: number }) {
  return (
    <View style={[styles.iconBox, { width: size, height: size }]}>
      <View
        style={[
          styles.checkShort,
          { backgroundColor: color, width: size * 0.36, left: size * 0.08, top: size * 0.46 }
        ]}
      />
      <View
        style={[styles.checkLong, { backgroundColor: color, width: size * 0.64, left: size * 0.26, top: size * 0.34 }]}
      />
    </View>
  );
}

export function DocumentIcon({ color }: { color: string }) {
  return (
    <View style={[styles.document, { borderColor: color }]}> 
      <View style={[styles.documentFold, { borderLeftColor: color, borderBottomColor: color }]} />
      <View style={[styles.documentLine, { backgroundColor: color, marginTop: 9 }]} />
      <View style={[styles.documentLine, { backgroundColor: color, width: 10 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    alignItems: "center",
    justifyContent: "center"
  },
  homeRoof: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent"
  },
  homeBody: {
    position: "absolute",
    borderRadius: 4
  },
  handPalm: {
    position: "absolute",
    borderWidth: 3,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12
  },
  handFinger: {
    position: "absolute",
    bottom: 8,
    width: 5,
    borderRadius: 3
  },
  profileHead: {
    position: "absolute"
  },
  profileBody: {
    position: "absolute"
  },
  battery: {
    width: 29,
    height: 14,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 4
  },
  batteryDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  bellWrap: {
    width: 26,
    height: 27,
    alignItems: "center",
    justifyContent: "center"
  },
  bellDome: {
    width: 15,
    height: 15,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8
  },
  bellBase: {
    width: 22,
    height: 2,
    marginTop: -1,
    borderRadius: 1
  },
  bellClapper: {
    width: 5,
    height: 5,
    marginTop: 2,
    borderRadius: 3
  },
  userBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  userBadgeHead: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white
  },
  userBadgeBody: {
    width: 25,
    height: 14,
    marginTop: 4,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    backgroundColor: colors.white
  },
  document: {
    width: 21,
    height: 27,
    borderWidth: 2,
    borderRadius: 2
  },
  documentFold: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderBottomWidth: 8,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent"
  },
  documentLine: {
    height: 2,
    width: 12,
    marginLeft: 4,
    marginTop: 5,
    borderRadius: 1
  },
  clock: {
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center"
  },
  clockHandTall: {
    width: 3,
    borderRadius: 2
  },
  clockHandWide: {
    height: 3,
    borderRadius: 2
  },
  pinHead: {
    position: "absolute",
    borderWidth: 2
  },
  pinPoint: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent"
  },
  checkShort: {
    position: "absolute",
    height: 2.4,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }]
  },
  checkLong: {
    position: "absolute",
    height: 2.4,
    borderRadius: 2,
    transform: [{ rotate: "-45deg" }]
  }
});
