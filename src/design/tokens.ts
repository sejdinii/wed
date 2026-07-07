/**
 * Design tokens — the single source of truth for the Kapar visual language.
 *
 * Brand direction: "ceremonial trust". Deep botanical green (stability, tradition),
 * warm gold (the kapar itself — a coin placed in trust), ivory paper surfaces.
 * Deliberately distinct from Booking.com blue and Airbnb coral.
 */

export const brand = {
  green900: '#0F1512',
  green800: '#14261B',
  green700: '#1E4D36',
  green600: '#2E6B4A',
  green500: '#3F8A61',
  green200: '#A9CDB6',
  green100: '#E4EEE7',
  gold700: '#7A5A1D',
  gold600: '#A87F2F',
  gold500: '#C6A15B',
  gold300: '#E3C685',
  gold100: '#F4EAD5',
  ivory: '#FAF7F2',
  paper: '#FFFFFF',
  ink: '#1B231E',
} as const;

/** 4pt base grid. Use spacing(n) instead of raw numbers everywhere. */
export const spacing = (n: number): number => n * 4;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Font families. Playfair Display (supports Cyrillic — mandatory for Macedonian)
 * carries the ceremonial/editorial voice on venue names and hero numbers.
 * Manrope (also Cyrillic-complete) is the workhorse UI sans.
 */
export const fontFamily = {
  display: 'PlayfairDisplay_700Bold',
  displayMedium: 'PlayfairDisplay_600SemiBold',
  sans: 'Manrope_500Medium',
  sansRegular: 'Manrope_400Regular',
  sansSemiBold: 'Manrope_600SemiBold',
  sansBold: 'Manrope_700Bold',
  sansExtraBold: 'Manrope_800ExtraBold',
} as const;

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

/**
 * Type scale tuned for dense booking UIs on small phones.
 * Display styles are reserved for venue names, kapar amounts and success moments.
 */
export const typeScale = {
  display: { fontFamily: fontFamily.display, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fontFamily.displayMedium, fontSize: 25, lineHeight: 31 },
  priceHero: { fontFamily: fontFamily.display, fontSize: 40, lineHeight: 46 },
  heading: { fontFamily: fontFamily.sansBold, fontSize: 20, lineHeight: 26 },
  subheading: { fontFamily: fontFamily.sansBold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.sansBold, fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 18 },
  bodySmStrong: { fontFamily: fontFamily.sansBold, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamily.sansSemiBold, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  caption: { fontFamily: fontFamily.sansSemiBold, fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

/** Elevation presets — kept subtle; premium apps whisper, they don't shout. */
export const shadow = {
  card: {
    shadowColor: '#141A16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  raised: {
    shadowColor: '#141A16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

/** Standard animation durations (ms) — fast enough to feel instant, slow enough to read. */
export const duration = {
  fast: 140,
  base: 220,
  slow: 360,
} as const;
