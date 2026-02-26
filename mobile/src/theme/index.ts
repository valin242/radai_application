import { colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';

export { colors, typography, spacing, borderRadius };

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
};

export type Theme = typeof theme;
