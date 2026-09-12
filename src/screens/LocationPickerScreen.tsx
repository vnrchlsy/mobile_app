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
import { colors, elevation, radii, spacing, typography } from "../theme";
import { ScreenHeader } from "../components/ui";

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
      <ScreenHeader title="Your location" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city or barangay"
            placeholderTextColor={colors.muted}
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
                    <LocationPinIcon color={selected ? colors.teal : colors.muted} size={18} />
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
  backButton: {
    position: "absolute",
    left: 26,
    bottom: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    ...elevation.soft
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 60
  },
  searchBar: {
    height: 50,
    marginTop: 6,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 10,
    backgroundColor: colors.white,
    ...elevation.soft
  },
  searchIcon: {
    color: colors.muted,
    ...typography.subtitle,
    fontWeight: "700"
  },
  searchInput: {
    flex: 1,
    height: "100%",
    color: colors.ink,
    ...typography.meta,
    fontWeight: "600"
  },
  formError: {
    marginTop: 12,
    color: colors.danger,
    ...typography.meta,
    fontWeight: "700"
  },
  groupBlock: {
    marginTop: 22
  },
  sectionLabel: {
    marginBottom: 10,
    color: colors.muted,
    ...typography.label
  },
  groupCard: {
    borderRadius: radii.card,
    backgroundColor: colors.white,
    ...elevation.soft
  },
  cityRow: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12
  },
  cityRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  cityName: {
    flex: 1,
    color: colors.ink,
    ...typography.strong,
    fontWeight: "700"
  },
  cityNameSelected: {
    color: colors.tealDark
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    marginTop: 30,
    color: colors.muted,
    ...typography.meta,
    textAlign: "center"
  },
  footnote: {
    marginTop: 26,
    color: colors.muted,
    ...typography.caption, fontWeight: "600",
    textAlign: "center",
    lineHeight: 16
  }
});
