import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { Palette, Typography, Spacing } from '@/design/tokens';

type SectionHeaderTone = 'cyan' | 'blue' | 'purple' | 'magenta' | 'lime' | 'amber' | 'muted';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  tone?: SectionHeaderTone;
  right?: ReactNode;
}

const TITLE_COLOR: Record<SectionHeaderTone, string> = {
  cyan: Palette.neonCyan,
  blue: Palette.electricBlue,
  purple: Palette.purpleGlow,
  magenta: Palette.neonMagenta,
  lime: Palette.neonLime,
  amber: Palette.neonAmber,
  muted: Palette.textSecondary,
};

export function SectionHeader({ title, subtitle, tone = 'cyan', right }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textBox}>
        <View style={styles.row}>
          <View style={[styles.accent, { backgroundColor: TITLE_COLOR[tone] }]} />
          <Text style={[styles.title, { color: TITLE_COLOR[tone] }]}>{title}</Text>
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.rightBox}>{right}</View>}
    </View>
  );
}

import { Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing['4'],
  },
  textBox: {
    flex: 1,
    gap: Spacing['1'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  accent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  title: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.lg,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: Typography.families.bodyRegular,
    fontSize: Typography.sizes.sm,
    color: Palette.textTertiary,
    letterSpacing: 0.3,
  },
  rightBox: {
    alignItems: 'flex-end',
  },
});
