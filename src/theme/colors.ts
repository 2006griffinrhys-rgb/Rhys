export const colors = {
  background: "#071E46",
  backgroundElevated: "#0A2A60",
  surfaceElevated: "#0D316B",
  surface: "#103772",
  surfaceSoft: "#1A4584",
  card: "#133D7C",
  cardAlt: "#174488",
  cardSoft: "#184683",
  cardMuted: "#20446F",
  primary: "#6FA8FF",
  primarySoft: "#224D8D",
  primaryStrong: "#5A95F4",
  primaryBorder: "#4E84D8",
  primaryText: "#031633",
  accent: "#9EC2FF",
  textPrimary: "#F7FBFF",
  textSecondary: "#C9DCFF",
  textMuted: "#AFC6EE",
  textTertiary: "#90AFDE",
  muted: "#8FAEDC",
  success: "#47D89A",
  successSoft: "#123E33",
  warning: "#F8C666",
  warningSoft: "#4B3A11",
  danger: "#FF7C8B",
  dangerSoft: "#4D2233",
  info: "#7DB4FF",
  infoSoft: "#1A3B67",
  border: "#2E5A99",
  borderSubtle: "#335F9F",
  borderSoft: "#3B6DB3",
  overlay: "rgba(255,255,255,0.04)",
  shadow: "#020B1E",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;
