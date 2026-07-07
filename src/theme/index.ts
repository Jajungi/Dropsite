import { Platform, StyleSheet } from 'react-native';

/** 크림/틸 팔레트 + Portfolio 대시보드 레이아웃 토큰 */
export const colors = {
  primary: '#3A756C',
  primaryDark: '#2F5F57',
  primaryLight: '#E8F4F1',
  accent: '#4A8A80',
  accentLight: '#F0FAF8',
  background: '#F3F8F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F6FAF8',
  surfaceElevated: '#FFFFFF',
  surfaceGlass: '#FFFFFF',
  text: '#2A3D45',
  textSecondary: '#5A6B72',
  textMuted: '#9AA5AA',
  textLight: '#FFFFFF',
  textOnNeon: '#FFFFFF',
  border: '#E6EBE9',
  borderSubtle: '#EEF2F0',
  borderStrong: '#D4DCD9',
  divider: '#E9EBF0',
  success: '#3A9E7A',
  warning: '#E8A04A',
  error: '#E05A68',
  info: '#3A756C',
  navHover: '#E8F4F1',
  navActive: '#2F5F57',
  searchShadow: 'rgba(136, 148, 171, 0.2)',
  wave1: '#D4E8E2',
  wave2: '#E4F0EC',
  wave3: '#F0F7F5',
  courtFloor: '#3D7560',
  courtFloorLight: '#4A9070',
  courtLine: 'rgba(255,255,255,0.9)',
  courtEmpty: '#C8F7DC',
  courtReserved: '#DCE8C0',
  courtPlaying: '#D5DEFF',
  courtFinished: '#E8EDF0',
  centerCourt: '#DCE8C0',
  chunkyShadow: 'rgba(42, 61, 69, 0.1)',
  overlay: 'rgba(42, 61, 69, 0.35)',
  tabBar: '#FFFFFF',
  gymFloor: 'transparent',
  neon: '#3A756C',
};

export const fonts = {
  mono: 'SpaceMono_700Bold',
  monoRegular: 'SpaceMono_400Regular',
  display: 'DMSans_600SemiBold',
  serif: 'PlayfairDisplay_600SemiBold',
  serifRegular: 'PlayfairDisplay_400Regular',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_600SemiBold',
  score: 'DMSans_600SemiBold',
};

export const spacing = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  xxl: 56,
};

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 30,
  panel: 32,
  squish: 20,
  blob: 30,
  full: 9999,
};

export const shadows = {
  none: {},
  sm: Platform.select({
    web: { boxShadow: '0 2px 6px rgba(136,148,171,0.2), 0 12px 16px -12px rgba(71,82,107,0.1)' } as object,
    default: {
      shadowColor: '#8894AB',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    },
  }) ?? {},
  md: Platform.select({
    web: { boxShadow: '0 4px 12px rgba(136,148,171,0.22), 0 20px 24px -20px rgba(71,82,107,0.12)' } as object,
    default: {
      shadowColor: '#8894AB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 4,
    },
  }) ?? {},
  glow: Platform.select({
    web: { boxShadow: '0 4px 14px rgba(58, 117, 108, 0.22)' } as object,
    default: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 4,
    },
  }) ?? {},
  neon: {},
};

export const typography = {
  h1: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  score: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  scoreSm: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  small: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export const glass = StyleSheet.create({
  panel: { backgroundColor: colors.surface },
  sheet: { backgroundColor: colors.surfaceElevated },
});

export const squishSpring = {
  pressIn: { damping: 18, stiffness: 320, mass: 0.5 },
  pressOut: { damping: 16, stiffness: 260, mass: 0.55 },
};
