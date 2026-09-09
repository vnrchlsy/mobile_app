import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";

const paw = require("../../assets/paw-white.png") as ImageSourcePropType;

type IconProps = {
  color: string;
  size?: number;
};

export function HomeIcon({ color, size = 28 }: IconProps) {
  // Roof + body as ONE mass: the roof's base overlaps the body's top by 2% of the box, so the
  // two read as a house rather than a triangle hovering over a brick.
  //
  // Every dimension is a fraction of `size`. The previous version hardcoded an 11px triangle
  // against a body that DID scale, so at the 24px used in the tab bar the roof overhung a body
  // half its width — the "blobby" look was that mismatch, not the idea of the glyph.
  return (
    <View style={[styles.iconBox, { width: size, height: size }]}>
      <View
        style={[
          styles.homeRoof,
          {
            borderLeftWidth: size * 0.42,
            borderRightWidth: size * 0.42,
            borderBottomWidth: size * 0.34,
            borderBottomColor: color,
            left: size * 0.08,
            top: size * 0.18
          }
        ]}
      />
      <View
        style={[
          styles.homeBody,
          {
            width: size * 0.52,
            height: size * 0.32,
            left: size * 0.24,
            top: size * 0.50,
            borderRadius: size * 0.06,
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
  // A heart, for the Kawang-Gawa (volunteering) tab.
  //
  // ⚠️ THIS REPLACES A RAISED HAND, deliberately. The hand was a bordered palm under three
  // separate finger bars — four elements, two of them 5px wide with a hardcoded 8px offset
  // that did not scale. At the 24px the tab bar renders, those bars merged into one smudge and
  // the glyph read as an unidentifiable shield. A heart survives 24px because it is one
  // silhouette, and it is already the brand's own second mark (the paw's pad is a heart).
  //
  // Standard construction: a square rotated 45° with a circle centred on each of its two upper
  // edges, so the lobes meet the square's sides exactly and no seam shows.
  const square = size * 0.5;
  const lobe = size * 0.5;
  return (
    <View style={[styles.iconBox, { width: size, height: size }]}>
      <View
        style={{
          position: "absolute",
          width: square,
          height: square,
          left: size * 0.25,
          top: size * 0.29,
          backgroundColor: color,
          borderBottomLeftRadius: size * 0.06,
          transform: [{ rotate: "45deg" }]
        }}
      />
      {[0.073, 0.427].map((left) => (
        <View
          key={left}
          style={{
            position: "absolute",
            width: lobe,
            height: lobe,
            left: size * left,
            top: size * 0.113,
            borderRadius: lobe / 2,
            backgroundColor: color
          }}
        />
      ))}
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

export function LockIcon({ color, size = 16 }: { color: string; size?: number }) {
  // Shackle + body, matching the stroke weight of the rest of the set (gen-screens.js
  // `lockIcon`). Used on gated rows — the design system forbids emoji glyphs.
  const bodyW = size, bodyH = size * 0.62, shackle = size * 0.52;
  return (
    <View style={{ width: bodyW, height: size * 1.1, alignItems: "center", justifyContent: "flex-end" }}>
      <View
        style={{
          position: "absolute",
          top: 0,
          width: shackle,
          height: shackle,
          borderWidth: size * 0.12,
          borderColor: color,
          borderBottomWidth: 0,
          borderTopLeftRadius: shackle / 2,
          borderTopRightRadius: shackle / 2
        }}
      />
      <View style={{ width: bodyW, height: bodyH, borderRadius: size * 0.16, backgroundColor: color }} />
    </View>
  );
}

export function AlertIcon({ color, size = 38 }: { color: string; size?: number }) {
  // Circle with an exclamation mark — the not-submitted / needs-action state, matching the
  // stroke weight of the other glyphs in this set (see gen-screens.js `alertIcon`).
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: size * 0.08,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <View
        style={{
          width: size * 0.09,
          height: size * 0.3,
          borderRadius: size * 0.05,
          backgroundColor: color,
          marginTop: -size * 0.02
        }}
      />
      <View
        style={{ width: size * 0.1, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: color, marginTop: size * 0.05 }}
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

export function CheckIcon({ color = "#FFFFFF", size = 14 }: { color?: string; size?: number }) {
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

export function XIcon({ color, size = 28 }: IconProps) {
  // Two crossed bars, matching the stroke weight of the other glyphs in this set — the
  // "declined" counterpart to CheckIcon's checkmark. No emoji glyphs in this design system.
  const barW = size * 0.62;
  const barH = Math.max(2, size * 0.1);
  return (
    <View style={[styles.iconBox, { width: size, height: size }]}>
      <View
        style={[
          styles.xBar,
          { backgroundColor: color, width: barW, height: barH, top: size / 2 - barH / 2, left: (size - barW) / 2, transform: [{ rotate: "45deg" }] }
        ]}
      />
      <View
        style={[
          styles.xBar,
          { backgroundColor: color, width: barW, height: barH, top: size / 2 - barH / 2, left: (size - barW) / 2, transform: [{ rotate: "-45deg" }] }
        ]}
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
    // Border widths are supplied by the caller so the roof scales with `size` — see HomeIcon.
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent"
  },
  homeBody: {
    position: "absolute",
    borderRadius: 4
  },
  profileHead: {
    position: "absolute"
  },
  profileBody: {
    position: "absolute"
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
    backgroundColor: "#FFFFFF"
  },
  userBadgeBody: {
    width: 25,
    height: 14,
    marginTop: 4,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    backgroundColor: "#FFFFFF"
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
  },
  xBar: {
    position: "absolute",
    borderRadius: 2
  }
});
