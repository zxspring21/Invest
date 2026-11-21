import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Custom colors
const colors = {
  primary: '#1976d2',
  primaryVariant: '#1565c0',
  secondary: '#757575',
  secondaryVariant: '#616161',
  surface: '#ffffff',
  background: '#f5f5f5',
  error: '#f44336',
  onPrimary: '#ffffff',
  onSecondary: '#ffffff',
  onSurface: '#000000',
  onBackground: '#000000',
  onError: '#ffffff',
  // Trading specific colors
  success: '#4caf50',
  warning: '#ff9800',
  info: '#2196f3',
  // Dark theme colors
  dark: {
    primary: '#90caf9',
    primaryVariant: '#64b5f6',
    secondary: '#bdbdbd',
    secondaryVariant: '#9e9e9e',
    surface: '#1e1e1e',
    background: '#121212',
    error: '#f44336',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onSurface: '#ffffff',
    onBackground: '#ffffff',
    onError: '#ffffff',
  },
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryVariant,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryVariant,
    surface: colors.surface,
    background: colors.background,
    error: colors.error,
    onPrimary: colors.onPrimary,
    onSecondary: colors.onSecondary,
    onSurface: colors.onSurface,
    onBackground: colors.onBackground,
    onError: colors.onError,
    // Custom colors
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
  },
  roundness: 8,
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.dark.primary,
    primaryContainer: colors.dark.primaryVariant,
    secondary: colors.dark.secondary,
    secondaryContainer: colors.dark.secondaryVariant,
    surface: colors.dark.surface,
    background: colors.dark.background,
    error: colors.dark.error,
    onPrimary: colors.dark.onPrimary,
    onSecondary: colors.dark.onSecondary,
    onSurface: colors.dark.onSurface,
    onBackground: colors.dark.onBackground,
    onError: colors.dark.onError,
    // Custom colors
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
  },
  roundness: 8,
};

// Default theme (light)
export const theme = lightTheme;

// Export colors for use in components
export { colors };
