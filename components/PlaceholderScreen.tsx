import { type ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

import { ScreenShell, GlassCard, NeonText, Badge, SectionHeader } from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding, responsive } from '@/design/responsive';

type Tone = 'cyan' | 'blue' | 'purple' | 'magenta' | 'lime' | 'amber';

interface PlaceholderScreenProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  tone: Tone;
  badge?: string;
  children?: ReactNode;
}

const TONE_RGB: Record<Tone, string> = {
  cyan: '0,240,255',
  blue: '30,144,255',
  purple: '138,43,226',
  magenta: '255,0,229',
  lime: '182,255,0',
  amber: '255,184,0',
};

export function PlaceholderScreen({
  icon,
  title,
  subtitle,
  tone,
  badge,
  children,
}: PlaceholderScreenProps) {
  const rgb = TONE_RGB[tone];

  return (
    <ScreenShell variant="deep">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.iconWrap,
              {
                borderColor: `rgba(${rgb},0.4)`,
                backgroundColor: `rgba(${rgb},0.08)`,
              },
            ]}
          >
            {icon}
          </View>
          <View style={styles.titleRow}>
            <NeonText variant="display" weight="bold" tone={tone} style={styles.title}>
              {title}
            </NeonText>
            {badge && <Badge tone={tone}>{badge}</Badge>}
          </View>
          <NeonText variant="heading" weight="medium" tone="muted" style={styles.subtitle}>
            {subtitle}
          </NeonText>
        </View>

        <GlassCard
          tone={tone}
          gradientBorder
          padding={Spacing['6']}
          style={styles.card}
        >
          <SectionHeader
            title="MODULE ONLINE"
            subtitle="Foundation ready — feature implementation pending"
            tone={tone}
          />
          <View style={styles.bodyBox}>
            <NeonText variant="body" tone="muted" style={styles.body}>
              This module is wired into the W3OD Gateway foundation. Navigation, theming,
              authentication, and the database layer are all active and ready to extend.
              Feature implementation will be added in subsequent prompts.
            </NeonText>
          </View>
          <View style={styles.logoRow}>
            <W3ODLogo size={responsive(56, 44, 72)} showText={false} glowIntensity="low" />
            <NeonText variant="heading" weight="medium" tone="muted" style={styles.logoText}>
              W3OD Gateway
            </NeonText>
          </View>
          {children}
        </GlassCard>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['6'],
  },
  header: {
    gap: Spacing['3'],
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    flexWrap: 'wrap',
  },
  title: {
    fontSize: Typography.sizes['xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  card: {
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing['4'],
  },
  bodyBox: {
    marginTop: Spacing['2'],
  },
  body: {
    fontSize: Typography.sizes.base,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    marginTop: Spacing['4'],
    paddingTop: Spacing['4'],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  logoText: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
  },
});
