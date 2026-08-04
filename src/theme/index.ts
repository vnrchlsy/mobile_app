export { colors } from "./colors";
export { typography } from "./typography";
export { spacing } from "./spacing";
export { radii } from "./radii";

import { colors } from "./colors";
import { radii } from "./radii";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const theme = { colors, typography, spacing, radii } as const;
