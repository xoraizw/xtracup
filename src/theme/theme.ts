export const colors = {
  background: '#FBF6EF',
  surface: '#FFFFFF',
  surfaceRaised: '#F5EEE3',
  textPrimary: '#2B1E12',
  textSecondary: '#8A7A66',
  accent: '#C9863F',
  accentSoft: '#F3E3CC',
  onAccent: '#FFFFFF',
  positive: '#4C9A6A',
  positiveSoft: '#E1F1E7',
  negative: '#D9584B',
  negativeSoft: '#FBE7E4',
  hairline: 'rgba(43, 30, 18, 0.10)',
  hairlineStrong: 'rgba(43, 30, 18, 0.18)',
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
    shadowColor: '#3A2A16',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#3A2A16',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;
