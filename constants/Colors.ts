// HealthySteps Color System — Green-Blue Health/Wellness Theme
export const Colors = {
  // Primary — Emerald Green
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  primaryFaded: 'rgba(16, 185, 129, 0.15)',

  // Secondary — Ocean Blue
  secondary: '#3B82F6',
  secondaryLight: '#60A5FA',
  secondaryDark: '#2563EB',
  secondaryFaded: 'rgba(59, 130, 246, 0.15)',

  // Accent — Teal
  accent: '#14B8A6',
  accentLight: '#2DD4BF',
  accentDark: '#0D9488',

  // Backgrounds
  background: '#0F172A',       // Dark navy
  backgroundLight: '#1E293B',  // Slightly lighter
  backgroundCard: '#1E293B',
  backgroundInput: '#334155',
  surface: '#1E293B',

  // Text
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Mood Colors (scale 1-5)
  mood1: '#EF4444', // Very Bad — Red
  mood2: '#F97316', // Bad — Orange
  mood3: '#F59E0B', // Okay — Yellow
  mood4: '#10B981', // Good — Green
  mood5: '#3B82F6', // Great — Blue

  // Borders & Dividers
  border: '#334155',
  borderLight: '#475569',
  divider: 'rgba(148, 163, 184, 0.12)',

  // Gradients (start, end)
  gradientPrimary: ['#10B981', '#3B82F6'] as [string, string],
  gradientDark: ['#0F172A', '#1E293B'] as [string, string],
  gradientCard: ['#1E293B', '#334155'] as [string, string],

  // Shadows
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // White/Black
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 34,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};
