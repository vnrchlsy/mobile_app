// US-X4 — location = city only (decision 11: no GPS/coordinate capture, ever). Reference:
// screens/user/screen-location-picker.png, minus the "Use my current location" row — that's the
// GPS entry point the decision rules out, so it's intentionally not built here.
// PUT /me/location { city } -> { city, barangay }; the picked city is cached in AuthContext
// (see AuthContext.tsx) since /me has no way to read it back.
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useApi } from "../api/useApi";
import { useAuth } from "../auth/AuthContext";
import { CheckIcon, LocationPinIcon } from "../components/AppIcons";
import { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radii } from "../theme/radii";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "locationPicker">;

type CityGroup = { section: string; cities: string[] };

const CITY_GROUPS: CityGroup[] = [
  {
    section: "Metro Manila",
    cities: [
      "Marikina City",
      "Quezon City",
      "Manila",
      "Pasig City",
      "Mandaluyong",
      "Makati",
      "Taguig",
      "Pasay",
      "Parañaque",
      "Las Piñas",
      "Muntinlupa",
      "Caloocan",
      "Malabon",
      "Navotas",
      "Valenzuela",
      "San Juan"
    ]
  },
  {
    section: "Other cities",
    cities: ["Cebu City", "Davao City", "Baguio City", "Iloilo City", "Cagayan de Oro"]
  }
];

export function LocationPickerScreen({ navigation }: Props) {
  const api = useApi();
  const { city: currentCity, setCity } = useAuth();
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITY_GROUPS;
    return CITY_GROUPS.map((g) => ({ ...g, cities: g.cities.filter((c) => c.toLowerCase().includes(q)) })).filter(
      (g) => g.cities.length > 0
    );
  }, [query]);

  async function selectCity(city: string) {
    if (saving) return;
    setSaving(city);
    setError(undefined);
    try {
      const res = await api.put("/me/location", { city });
      if (res.ok) {
        await setCity(res.data?.city ?? city);
        navigation.goBack();
      } else {
        setError(res.data?.error?.message ?? "Couldn't save that city. Try again.");
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your location</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city or barangay"
            placeholderTextColor={colors.neutralMuted}
            style={styles.searchInput}
            autoCapitalize="words"
          />
        </View>

        {!!error && <Text style={styles.formError}>{error}</Text>}

        {groups.map((group) => (
          <View key={group.section} style={styles.groupBlock}>
            <Text style={styles.sectionLabel}>{group.section.toUpperCase()}</Text>
            <View style={styles.groupCard}>
              {group.cities.map((city, index) => {
                const selected = city === currentCity;
                return (
                  <TouchableOpacity
                    key={city}
                    activeOpacity={0.75}
                    style={[styles.cityRow, index > 0 && styles.cityRowDivider]}
                    onPress={() => selectCity(city)}
                    disabled={!!saving}
                  >
                    <LocationPinIcon color={selected ? colors.teal : colors.neutralMuted} size={18} />
                    <Text style={[styles.cityName, selected && styles.cityNameSelected]}>{city}</Text>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <CheckIcon color={colors.white} size={12} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {groups.length === 0 && <Text style={styles.emptyText}>No cities match "{query}".</Text>}

        <Text style={styles.footnote}>Only your city is saved — used to show what's near you.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page
  },
  header: {
    height: 96,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: spacing.s12
  },
  backButton: {
    position: "absolute",
    left: 26,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21, // circle: half of width/height, intentionally not snapped
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  backText: {
    color: colors.inkStrong,
    ...typography.heading700_26,
    lineHeight: 28
  },
  headerTitle: {
    color: colors.inkStrong,
    ...typography.heading800_18
  },
  content: {
    paddingHorizontal: spacing.s24,
    paddingBottom: spacing.s56
  },
  searchBar: {
    height: 50,
    marginTop: spacing.s4,
    borderRadius: 25, // pill: half of height, intentionally not snapped
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.s16,
    gap: spacing.s8,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  searchIcon: {
    color: colors.neutralMuted,
    ...typography.heading700_17
  },
  searchInput: {
    flex: 1,
    height: "100%",
    color: colors.inkStrong,
    ...typography.label600_14
  },
  formError: {
    marginTop: spacing.s12,
    color: colors.danger,
    ...typography.label700_13
  },
  groupBlock: {
    marginTop: spacing.s20
  },
  sectionLabel: {
    marginBottom: spacing.s8,
    color: colors.neutralMuted,
    ...typography.label800_11,
    letterSpacing: 0.6
  },
  groupCard: {
    borderRadius: radii.r16,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  cityRow: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.s16,
    gap: spacing.s12
  },
  cityRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  cityName: {
    flex: 1,
    color: colors.inkStrong,
    ...typography.label700_15
  },
  cityNameSelected: {
    color: colors.tealDark
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12, // circle: half of width/height, intentionally not snapped
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  radioSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.teal
  },
  emptyText: {
    marginTop: spacing.s28,
    color: colors.muted,
    ...typography.body13,
    textAlign: "center"
  },
  footnote: {
    marginTop: spacing.s24,
    color: colors.neutralMuted,
    ...typography.body11,
    textAlign: "center",
    lineHeight: 16
  }
});
