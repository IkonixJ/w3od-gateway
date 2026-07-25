import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Zap, Users, Clock, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { GlassCard, NeonText, NeonButton } from '@/components/ui';
import { Palette, Typography, Spacing, Radii, Animation, Gradients } from '@/design/tokens';
import type { CampaignCard as CampaignCardData } from '@/types/dashboard';

interface CampaignCardProps {
  campaign: CampaignCardData;
  onParticipate?: (id: string) => void;
}

function formatDeadline(iso: string | null): string {
  if (!iso) return 'No deadline';
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(diff / 3600000);
  return `${hours}h left`;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CampaignCard({ campaign, onParticipate }: CampaignCardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(0.97, Animation.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, Animation.spring.gentle);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onParticipate?.(campaign.id)}
    >
      <Animated.View style={[animatedStyle]}>
        <GlassCard tone="lime" gradientBorder padding={0} style={styles.card}>
          {/* Banner */}
          <View style={styles.bannerWrap}>
            <Image source={{ uri: campaign.bannerUri }} style={styles.banner} />
            <LinearGradient
              colors={Gradients.glassDark}
              start={{ x: 0, y: 0.3 }}
              end={{ x: 0, y: 1 }}
              style={styles.bannerOverlay}
            />
            <View style={styles.deadlineChip}>
              <Clock color={Palette.neonAmber} size={12} />
              <Text style={styles.deadlineText}>{formatDeadline(campaign.deadline)}</Text>
            </View>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <NeonText variant="heading" weight="semiBold" tone="lime" style={styles.title} numberOfLines={1}>
              {campaign.title}
            </NeonText>

            <View style={styles.metaRow}>
              <View style={styles.rewardChip}>
                <Text style={styles.rewardValue}>{campaign.reward}</Text>
                <Text style={styles.rewardUnit}>W3OD</Text>
              </View>
              <View style={styles.xpChip}>
                <Zap color={Palette.neonCyan} size={13} />
                <Text style={styles.xpText}>+{campaign.xpReward} XP</Text>
              </View>
              <View style={styles.participantsChip}>
                <Users color={Palette.textTertiary} size={13} />
                <Text style={styles.participantsText}>
                  {campaign.participants.toLocaleString()}
                </Text>
              </View>
            </View>

            <NeonButton
              variant="ghost"
              size="sm"
              fullWidth
              rightIcon={<ArrowRight color={Palette.neonLime} size={15} />}
              onPress={() => onParticipate?.(campaign.id)}
            >
              Participate
            </NeonButton>
          </View>
        </GlassCard>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    overflow: 'hidden',
  },
  bannerWrap: {
    height: 120,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  deadlineChip: {
    position: 'absolute',
    top: Spacing['2'],
    right: Spacing['2'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing['2'],
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(5,6,10,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
  },
  deadlineText: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 10,
    color: Palette.neonAmber,
    letterSpacing: 0.5,
  },
  body: {
    padding: Spacing['4'],
    gap: Spacing['3'],
  },
  title: {
    fontSize: Typography.sizes.md,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    flexWrap: 'wrap',
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    paddingHorizontal: Spacing['2'],
    paddingVertical: 4,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(182,255,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(182,255,0,0.3)',
  },
  rewardValue: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes.base,
    color: Palette.neonLime,
  },
  rewardUnit: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 9,
    color: Palette.neonLime,
    letterSpacing: 0.5,
  },
  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing['2'],
    paddingVertical: 4,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(0,240,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
  },
  xpText: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 10,
    color: Palette.neonCyan,
    letterSpacing: 0.3,
  },
  participantsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsText: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: 10,
    color: Palette.textTertiary,
  },
});
