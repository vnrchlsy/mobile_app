import { ReactNode } from "react";
import { StyleProp, Text, TextStyle } from "react-native";

import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type AppTextProps = {
  variant: keyof typeof typography;
  color?: string;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  textAlign?: TextStyle["textAlign"];
};

export function AppText({ variant, color = colors.ink, children, style, numberOfLines, textAlign }: AppTextProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[typography[variant], { color, textAlign }, style]}>
      {children}
    </Text>
  );
}
