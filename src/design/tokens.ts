/**
 * Design tokens v3 — the Kapar purple identity (per the approved mockups).
 *
 * Deep violet primary carries CTAs, ratings, icons and kapar amounts;
 * lavender washes carry reassurance cards and soft chips; semantic colors
 * are reserved for calendar/booking states: green = available, amber =
 * limited, red = booked/error. One bold sans (Manrope, Cyrillic-complete)
 * at heavy weights carries all hierarchy.
 */

export const brand = {
  ink: '#1E1B2E',
  paper: '#FFFFFF',
  violet: '#5B21B6',
  violetDeep: '#4C1D95',
  violetBright: '#8B5CF6',
  lavender: '#F0EDFA',
  lavenderDeep: '#E4DEF7',
  haze: '#F8F7FC',
  chip: '#1E1B2E',
  green: '#16A34A',
  greenSoft: '#E8F7EE',
  amber: '#D97706',
  amberSoft: '#FBF0DC',
  red: '#DC2626',
  redSoft: '#FCE9E9',
} as const;

/** 4pt base grid. Use spacing(n) instead of raw numbers everywhere. */
export const spacing = (n: number): number => n * 4;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

/** Bold-sans hierarchy: weight and size carry structure, not typeface changes. */
export const typeScale = {
  display: { fontFamily: fontFamily.extraBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  title: { fontFamily: fontFamily.extraBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  heading: { fontFamily: fontFamily.extraBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  subheading: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontFamily: fontFamily.bold, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  bodySmStrong: { fontFamily: fontFamily.bold, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamily.semiBold, fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: fontFamily.semiBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
  price: { fontFamily: fontFamily.extraBold, fontSize: 16, lineHeight: 20 },
  priceHero: { fontFamily: fontFamily.extraBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

export const shadow = {
  card: {
    shadowColor: '#3B2E6E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  raised: {
    shadowColor: '#3B2E6E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export const duration = {
  fast: 140,
  base: 220,
  slow: 360,
} as const;
