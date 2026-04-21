// HealthySteps Dark Vivid Color System
export const Colors = {
  // Primary — Vivid Emerald
  primary: '#34D399',
  primaryLight: '#6EE7B7',
  primaryFaded: 'rgba(52, 211, 153, 0.18)',

  // Secondary — Vivid Blue
  secondary: '#60A5FA',
  secondaryFaded: 'rgba(96, 165, 250, 0.18)',

  // Backgrounds
  background: '#111827',       // Less navy, deep charcoal
  backgroundLight: '#1F2937',  // More neutral surface
  surface: '#1F2937',
  backgroundCard: '#243044',   // Elevated card background
  backgroundInput: '#2D3B4E',  // Elevated input background
  backgroundElevated: '#2A3A4F', // Modal/Bottom sheet background

  // Text
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textInverse: '#111827',

  // Status
  success: '#34D399',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Mood Colors (scale 1-5) — Vivid
  mood1: '#F87171', // Red
  mood2: '#FB923C', // Orange
  mood3: '#94A3B8', // Muted Slate
  mood4: '#60A5FA', // Blue
  mood5: '#34D399', // Emerald

  // Borders & Shadows
  border: '#3D4F63',
  borderLight: '#4B6280',
  divider: 'rgba(255, 255, 255, 0.05)',
  cardShadow: 'rgba(0, 0, 0, 0.4)',

  // Gradients
  gradientPrimary: ['#34D399', '#60A5FA'] as [string, string],
  gradientCard: ['#243044', '#2D3B4E'] as [string, string],

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 30,
  hero: 36,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};


