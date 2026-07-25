import { View, StyleSheet } from 'react-native';

import { Palette, Spacing } from '@/design/tokens';

interface DividerProps {
  tone?: 'cyan' | 'white' | 'muted';
  width?: number;
  vertical?: boolean;
}

const DIVIDER_COLOR = {
  cyan: 'rgba(0,240,255,0.18)',
  white: 'rgba(255,255,255,0.08)',
  muted: 'rgba(255,255,255,0.04)',
};

export function Divider({ tone = 'cyan', width = 1, vertical = false }: DividerProps) {
  if (vertical) {
    return <View style={[styles.vertical, { width, backgroundColor: DIVIDER_COLOR[tone] }]} />;
  }
  return <View style={[styles.horizontal, { height: width, backgroundColor: DIVIDER_COLOR[tone] }]} />;
}

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
    marginVertical: Spacing['2'],
  },
  vertical: {
    height: '100%',
    marginHorizontal: Spacing['2'],
  },
});
