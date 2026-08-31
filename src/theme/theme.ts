export const colors = {
  background: '#1b140c',
  surface: '#251b10',
  surfaceRaised: '#2d2113',
  textPrimary: '#f0e6d5',
  textSecondary: '#c2ad8c',
  accent: '#c9a06a',
  positive: '#8ec78a',
  negative: '#d98865',
  hairline: 'rgba(240, 230, 213, 0.14)',
  hairlineStrong: 'rgba(240, 230, 213, 0.22)',
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
