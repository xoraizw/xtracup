import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  darkColors,
  darkShadows,
  fonts,
  lightColors,
  lightShadows,
  radii,
  spacing,
  type ColorPalette,
  type ShadowPalette,
} from './theme';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'xtracup.themeMode';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ColorPalette;
  shadows: ShadowPalette;
  fonts: typeof fonts;
  radii: typeof radii;
  spacing: typeof spacing;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Customer-facing theme toggle (dark, matching the app's original look, or
// the light redesign) — persisted locally so it survives app restarts.
// Owner/staff screens intentionally don't read this; they keep importing
// `colors`/`shadows` straight from theme.ts and always stay dark.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') setModeState(saved);
      })
      .catch(() => {});
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };
  const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark');

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: mode === 'dark' ? darkColors : lightColors,
      shadows: mode === 'dark' ? darkShadows : lightShadows,
      fonts,
      radii,
      spacing,
      setMode,
      toggleMode,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
