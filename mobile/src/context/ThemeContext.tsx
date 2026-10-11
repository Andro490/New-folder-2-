import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Color Tokens ──────────────────────────────────────────────
export const lightTheme = {
  mode: 'light' as const,
  bg: '#FDF8EC',
  bgSecondary: '#f1ede3',
  card: '#0f172a',
  cardText: '#ffffff',
  cardSub: '#94a3b8',
  surface: '#ffffff',
  surfaceBorder: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#6b7280',
  accent: '#22c55e',
  headerBg: '#0a1930',
  headerText: '#ffffff',
  statusBar: 'light' as 'light' | 'dark',
  switchTrack: { false: '#374151', true: '#22c55e' },
};

export const darkTheme = {
  mode: 'dark' as const,
  bg: '#050B20',
  bgSecondary: '#0a1226',
  card: '#1e293b',
  cardText: '#ffffff',
  cardSub: '#94a3b8',
  surface: '#1e293b',
  surfaceBorder: '#334155',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  accent: '#22c55e',
  headerBg: '#0a1930',
  headerText: '#ffffff',
  statusBar: 'light' as 'light' | 'dark',
  switchTrack: { false: '#374151', true: '#22c55e' },
};

export type Theme = typeof lightTheme | typeof darkTheme;

// ── Context ───────────────────────────────────────────────────
interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

// ── Provider ──────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('appTheme').then((v) => {
      if (v === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('appTheme', next ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? darkTheme : lightTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useTheme() {
  return useContext(ThemeContext);
}
