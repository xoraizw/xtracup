export const colors = {
  background: '#1b140c',
  surface: '#251b10',
  surfaceRaised: '#2d2113',
  textPrimary: '#f0e6d5',
  textSecondary: '#c2ad8c',
  accent: '#c9a06a',
  accentSoft: 'rgba(201, 160, 106, 0.16)',
  onAccent: '#1b140c',
  positive: '#8ec78a',
  positiveSoft: 'rgba(142, 199, 138, 0.16)',
  negative: '#d98865',
  negativeSoft: 'rgba(217, 136, 101, 0.16)',
  hairline: 'rgba(240, 230, 213, 0.14)',
  hairlineStrong: 'rgba(240, 230, 213, 0.22)',
  // Text sitting directly on a photo (under a dark scrim gradient) or any
  // other photographic surface — always near-white regardless of theme,
  // since the scrim itself (not the page background) sets the contrast
  // ground. Distinct from `onAccent` (button-label color, which flips with
  // the theme) even though the two happened to share a value under the
  // light theme.
  onPhoto: '#ffffff',
} as const;

// Sora (display) + Plus Jakarta Sans (UI/body) — a warm, rounded modern
// pairing. `mono`/`monoBold` are kept as aliases onto Jakarta weights so
// existing call sites (tab labels, stat captions) don't all need renaming;
// numeric data (prices, stats) still gets tabular-nums via the numeric style
// helper below rather than a true monospace face.
export const fonts = {
  display: 'Sora_700Bold',
  displayMedium: 'Sora_600SemiBold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  mono: 'PlusJakartaSans_500Medium',
  monoBold: 'PlusJakartaSans_700Bold',
} as const;

export const radii = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const monoLabel = {
  fontFamily: fonts.mono,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
};

// Light theme needs elevation shadows to separate surfaces (the dark theme
// got away with hairline borders alone). `card` is the default resting
// elevation; `raised` is for floating chrome (sheets, floating tab bar,
// buttons) that should read as sitting above everything else.
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;
