import { type ReactNode } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react-native';

import { NeonText } from './NeonText';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';

type SectionHeaderTone = 'cyan' | 'blue' | 'purple' | 'magenta' | 'lime' | 'amber' | 'muted' | 'rose';

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
  rose: Palette.neonRose,
};

export function SectionHeader({ title, subtitle, tone = 'cyan', right }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textBox}>
        <View style={styles.row}>
          <View style={[styles.accent, { backgroundColor: TITLE_COLOR[tone] }]} />
          <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.title}>
            {title.toUpperCase()}
          </NeonText>
        </View>
        {subtitle && <NeonText variant="body" tone="muted" style={styles.subtitle}>{subtitle}</NeonText>}
      </View>
      {right && <View style={styles.rightBox}>{right}</View>}
    </View>
  );
}

// ─── Loading State ───────────────────────────────────────────────────────────

export function LoadingState({ label = 'Loading...', color = Palette.neonCyan }: { label?: string; color?: string }) {
  return (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="large" color={color} />
      <NeonText variant="body" tone="muted" style={styles.stateLabel}>{label}</NeonText>
    </View>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

export function ErrorState({ message, onRetry, tone = 'cyan' }: { message: string; onRetry?: () => void; tone?: SectionHeaderTone }) {
  const color = TITLE_COLOR[tone];
  return (
    <View style={styles.stateContainer}>
      <View style={[styles.stateIconWrap, { backgroundColor: `${color}15` }]}>
        <AlertCircle color={color} size={28} />
      </View>
      <NeonText variant="body" weight="semiBold" tone={tone} style={styles.stateTitle}>Something went wrong</NeonText>
      <NeonText variant="body" tone="muted" style={styles.stateMessage}>{message}</NeonText>
      {onRetry && (
        <Pressable onPress={onRetry} style={[styles.retryButton, { borderColor: `${color}40` }]}>
          <RefreshCw color={color} size={16} />
          <NeonText variant="body" weight="medium" tone={tone} style={styles.retryText}>Try Again</NeonText>
        </Pressable>
      )}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ title, message, icon, tone = 'cyan' }: { title: string; message?: string; icon?: ReactNode; tone?: SectionHeaderTone }) {
  const color = TITLE_COLOR[tone];
  return (
    <View style={styles.stateContainer}>
      <View style={[styles.stateIconWrap, { backgroundColor: `${color}15` }]}>
        {icon ?? <Inbox color={color} size={28} />}
      </View>
      <NeonText variant="body" weight="semiBold" tone={tone} style={styles.stateTitle}>{title}</NeonText>
      {message && <NeonText variant="body" tone="muted" style={styles.stateMessage}>{message}</NeonText>}
    </View>
  );
}

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
    fontSize: Typography.sizes.md,
    letterSpacing: Typography.letterSpacings.wide,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: 0.3,
  },
  rightBox: {
    alignItems: 'flex-end',
  },
  // State components
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['8'],
    paddingHorizontal: Spacing['4'],
    gap: Spacing['3'],
  },
  stateIconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
  },
  stateLabel: {
    fontSize: Typography.sizes.sm,
  },
  stateMessage: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['2'],
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing['2'],
  },
  retryText: {
    fontSize: Typography.sizes.sm,
  },
});
