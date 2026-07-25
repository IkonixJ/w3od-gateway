import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Responsive breakpoint helpers
export const isSmallScreen = SCREEN_W < 380;
export const isTablet = SCREEN_W >= 768;

// Scale a value relative to screen width, clamped to min/max
export function responsive(base: number, min: number, max: number): number {
  const ratio = SCREEN_W / 375; // iPhone width as design baseline
  return Math.max(min, Math.min(max, base * ratio));
}

// Padding that adapts to screen width
export const screenPadding = isTablet ? 48 : 24;
export const cardMaxWidth = 480;
export const wideCardMaxWidth = 680;

// Logo sizes
export const logoHeroSize = responsive(120, 80, 180);
export const logoHeaderSize = responsive(64, 48, 88);

export { SCREEN_W, SCREEN_H };
