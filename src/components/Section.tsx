import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { spacing } from "../theme/spacing";
import { AppText } from "./AppText";

type SectionProps = {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Section({ title, children, style }: SectionProps) {
  return (
    <View style={[styles.section, style]}>
      {!!title && (
        <AppText variant="label800_13" style={styles.title}>
          {title}
        </AppText>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.s24
  },
  title: {
    marginBottom: spacing.s12
  }
});
