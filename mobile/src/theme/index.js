import { Platform } from 'react-native';

export const C = {
  // Backgrounds & Surfaces
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  card: '#FFFFFF',

  // Primary Royal Blue Brand
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#DBEAFE',
  primarySoft: '#EFF6FF',
  soft: '#EFF6FF',

  // Secondary & Accents (Cohesive Royal Blue / Deep Slate)
  accent: '#2563EB',
  accentSoft: '#EFF6FF',
  navy: '#0B132B',
  navySoft: '#1E293B',

  // Typography Colors
  ink: '#0F172A',
  inkSoft: '#334155',
  inkSecondary: '#475569',
  muted: '#64748B',
  subtle: '#94A3B8',

  // Borders
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Semantic Status Colors
  good: '#16A34A',
  goodSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',

  // Utilities
  white: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.65)',
};

// Editorial, non-pastel gradients with restrained contrast
export const gradients = {
  hero: ['#0B132B', '#1E293B', '#1E3A8A'],
  primary: ['#2563EB', '#1D4ED8'],
  fresh: ['#1E40AF', '#2563EB', '#3B82F6'],
  soft: ['#F8FAFC', '#EFF6FF'],
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 48,
};

// Moderate, professional radii (no oversized bubble shapes)
export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
};

export const type = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  section: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headline: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
  bodyStrong: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  subhead: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  caption: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
};

// Robust cross-platform shadow definitions for iOS & Android
export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
    default: {
      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
    },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },
    android: {
      elevation: 4,
    },
    default: {
      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
    },
  }),
  button: Platform.select({
    ios: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
    default: {
      boxShadow: '0 3px 8px rgba(37, 99, 235, 0.22)',
    },
  }),
};

export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
};

export const layout = {
  screenPadding: spacing.md,
  maxContent: 760,
  touchTarget: 48,
};
