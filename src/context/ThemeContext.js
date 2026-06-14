import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

const THEME_KEY = '@habit_tracker_theme';

export const COLORS = {
  light: {
    background: '#F8F9FC',
    card: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#6E6E73',
    border: '#E5E5EA',
    primary: '#4F46E5', // Sleek indigo
    primaryLight: '#EEF2F6',
    accent: '#10B981', // Emerald green
    danger: '#EF4444', // Red
    statusBar: 'dark-content',
    shadow: 'rgba(0, 0, 0, 0.04)',
    divider: '#F2F2F7',
    tabActive: '#4F46E5',
    tabInactive: '#9CA3AF',
  },
  dark: {
    background: '#0B0F19', // Deep dark slate
    card: '#161E2E', // Slightly lighter slate
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#2A3447',
    primary: '#6366F1', // Indigo glow
    primaryLight: '#1E293B',
    accent: '#34D399',
    danger: '#F87171',
    statusBar: 'light-content',
    shadow: 'rgba(0, 0, 0, 0.25)',
    divider: '#1F2937',
    tabActive: '#6366F1',
    tabInactive: '#6B7280',
  },
};

// Curated colors list for selection in AddHabitScreen
export const HABIT_COLORS = [
  { id: 'indigo', hex: '#6366F1', label: 'Indigo' },
  { id: 'rose', hex: '#EC4899', label: 'Rose' },
  { id: 'orange', hex: '#F97316', label: 'Sunset' },
  { id: 'emerald', hex: '#10B981', label: 'Emerald' },
  { id: 'violet', hex: '#8B5CF6', label: 'Violet' },
  { id: 'sky', hex: '#0EA5E9', label: 'Sky' },
  { id: 'amber', hex: '#F59E0B', label: 'Amber' },
  { id: 'crimson', hex: '#EF4444', label: 'Crimson' },
];

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const deviceScheme = useDeviceColorScheme();
  const [themeMode, setThemeMode] = useState('light'); // Default to light, then check storage / system

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (savedTheme) {
          setThemeMode(savedTheme);
        } else if (deviceScheme) {
          setThemeMode(deviceScheme);
        }
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    };
    loadTheme();
  }, [deviceScheme]);

  const toggleTheme = async () => {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    try {
      await AsyncStorage.setItem(THEME_KEY, nextTheme);
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
  };

  const isDark = themeMode === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
