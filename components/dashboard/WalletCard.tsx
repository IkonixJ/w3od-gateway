import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Eye, EyeOff, Zap, TrendingUp, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { GlassCard, NeonText } from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import {
  Palette,
  Typography,
  Spacing,
  Radii,
  Animation,
  Gradients,
} from '@/design/tokens';
import { formatBalance, getRankColor, type LevelInfo } from '@/lib/wallet';

interface WalletCardProps {
  balance: number;
  xp: number;
  levelInfo: LevelInfo;
}

export function WalletCard({ balance, xp, levelInfo }: WalletCardProps) {
  const [hidden, setHidden] = useState(false);
  const toggle = useCallback(() => setHidden((h) => !h), []);

  // Ambient pulse for the W3OD token glyph
  const pulse = useSharedValue(0);
  pulse.value = withDelay(
    400,
    withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
  );
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.3,
    transform: [{ scale: 1 + pulse.value * 0.08 }],
  }));

  // Progress bar fill animation
  const progress = useSharedValue(0);
  progress.value = withSpring(levelInfo.progress, {
    damping: 18,
    stiffness: 120,
  });
  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%`,
  }));

  const rankColor = getRankColor(levelInfo.level);

  return (
    <GlassCard tone="cyan" gradientBorder padding={0} style={styles.card}>
      <LinearGradient
        colors={['rgba(0,240,255,0.06)', 'rgba(138,43,226,0.04)', 'rgba(5,6,10,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sheen}
      />

      <View style={styles.body}>
        {/* Balance header */}
        <View style={styles.headerRow}>
          <View style={styles.balanceLabel}>
            <NeonText variant="body" weight="semiBold" tone="muted" style={styles.labelText}>
              W3OD BALANCE
            </NeonText>
            <Animated.View style={[styles.tokenGlow, pulseStyle]}>
              <W3ODLogo size={16} showText={false} glowIntensity="low" />
            </Animated.View>
          </View>
          <Pressable onPress={toggle} hitSlop={12} style={styles.eyeBtn}>
            {hidden ? (
              <EyeOff color={Palette.textTertiary} size={18} />
            ) : (
              <Eye color={Palette.neonCyan} size={18} />
            )}
          </Pressable>
        </View>

        {/* Balance value */}
        <View style={styles.balanceRow}>
          <Text style={styles.balanceValue}>{formatBalance(balance, hidden)}</Text>
          {!hidden && <Text style={styles.balanceUnit}>W3OD</Text>}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* XP / Level / Rank */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <View style={styles.statHeader}>
              <Zap color={Palette.neonCyan} size={13} />
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <Text style={styles.statValue}>{xp.toLocaleString()}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBlock}>
            <View style={styles.statHeader}>
              <TrendingUp color={rankColor} size={13} />
              <Text style={[styles.statLabel, { color: rankColor }]}>LEVEL</Text>
            </View>
            <Text style={styles.statValue}>{levelInfo.level}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBlock}>
            <View style={styles.statHeader}>
              <ChevronRight color={rankColor} size={13} />
              <Text style={[styles.statLabel, { color: rankColor }]}>RANK</Text>
            </View>
            <Text style={[styles.rankValue, { color: rankColor }]}>{levelInfo.rank}</Text>
          </View>
        </View>

        {/* Progress to next level */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>
              {levelInfo.xpIntoLevel} / {levelInfo.xpForNext} XP
            </Text>
            <Text style={styles.progressNext}>LV {levelInfo.level + 1}</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: Palette.neonCyan },
                progressStyle,
              ]}
            />
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  body: {
    padding: Spacing['5'],
    gap: Spacing['4'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  labelText: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  tokenGlow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing['2'],
  },
  balanceValue: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes['4xl'],
    color: Palette.textPrimary,
    textShadowColor: Palette.neonCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    letterSpacing: -1,
  },
  balanceUnit: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.base,
    color: Palette.neonCyan,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 10,
    color: Palette.textTertiary,
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes.lg,
    color: Palette.textPrimary,
  },
  rankValue: {
    fontFamily: Typography.families.headingBold,
    fontSize: Typography.sizes.base,
  },
  progressSection: {
    gap: Spacing['2'],
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.textTertiary,
  },
  progressNext: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: Typography.sizes.xs,
    color: Palette.neonCyan,
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    shadowColor: Palette.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 2,
  },
});
