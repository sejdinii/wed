/**
 * Design tokens v2 — travel-marketplace visual language (Viator-structured).
 *
 * White paper ground, near-black ink, a single confident green that carries
 * ratings, CTAs and confirmation; mint for reassurance banners; red strictly
 * for scarcity/urgency; gold reserved for kapar amounts. One bold sans
 * (Manrope, Cyrillic-complete) at heavy weights carries all hierarchy —
 * no display serif in v2.
 */

export const brand = {
  ink: '#131A16',
  paper: '#FFFFFF',
  green: '#0B7B4B',
  greenDark: '#0A6A41',
  greenBright: '#3EA574',
  mint: '#E4F2EA',
  mintInk: '#146A42',
  chip: '#121712',
  red: '#CC4433',
  redSoft: '#FAE8E5',
  amber: '#9A6E1C',
  amberSoft: '#F6ECD6',
  gold: '#A87F2F',
  goldSoft: '#F5EBD6',
} as const;

/** 4pt base grid. Use spacing(n) instead of raw numbers everywhere. */
export const spacing = (n: number): number => n * 4;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
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
    shadowColor: '#131A16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  raised: {
    shadowColor: '#131A16',
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
