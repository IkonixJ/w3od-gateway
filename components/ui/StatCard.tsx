import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { GlassCard } from './GlassCard';
import { NeonText } from './NeonText';
import { Palette, Typography, Spacing } from '@/design/tokens';

type StatTone = 'cyan' | 'magenta' | 'lime' | 'amber' | 'purple';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: StatTone;
  delta?: string;
}

export function StatCard({ label, value, icon, tone = 'cyan', delta }: StatCardProps) {
  return (
    <GlassCard tone={tone} padding={Spacing['4']} style={styles.card}>
      <View style={styles.topRow}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        {delta && (
          <View style={styles.deltaBox}>
            <Text style={styles.delta}>{delta}</Text>
          </View>
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value}
      </Text>
    </GlassCard>
  );
}

import { Text } from 'react-native';

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: Spacing['2'],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2'],
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaBox: {
    paddingHorizontal: Spacing['2'],
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: Palette.successSubtle,
  },
  delta: {
    fontFamily: Typography.families.bodySemiBold,
    fontSize: Typography.sizes.xs,
    color: Palette.success,
  },
  label: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
    color: Palette.textTertiary,
  },
  value: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes['2xl'],
    color: Palette.textPrimary,
  },
});
