import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Info,
  Shield,
  Zap,
  Users,
  Globe,
  Github,
  Mail,
  Lock,
  Server,
  Code,
} from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, Badge, Divider } from '@/components/ui';
import { Palette, Spacing, Typography, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

const APP_VERSION = '1.0.0';
const APP_BUILD = '2026.07';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonCyan} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>ABOUT</NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Logo / Brand */}
        <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.sectionCard}>
          <View style={styles.brandWrap}>
            <View style={styles.brandIconWrap}>
              <Zap color={Palette.neonCyan} size={36} />
            </View>
            <NeonText variant="display" weight="bold" tone="cyan" style={styles.brandName}>
              W3OD GATEWAY
            </NeonText>
            <View style={styles.versionRow}>
              <Badge tone="cyan">v{APP_VERSION}</Badge>
              <Badge tone="muted">Build {APP_BUILD}</Badge>
            </View>
            <NeonText variant="body" tone="muted" style={styles.brandTagline}>
              The decentralized community gateway for Web3 rewards, campaigns, and social engagement.
            </NeonText>
          </View>
        </GlassCard>

        {/* Features */}
        <SectionTitle title="Features" tone="cyan" />
        <GlassCard tone="cyan" padding={Spacing['5']} style={styles.sectionCard}>
          <FeatureRow icon={<Zap color={Palette.neonCyan} size={18} />} title="W3OD Wallet" subtitle="Send, receive, and redeem W3OD Balance" />
          <Divider tone="white" />
          <FeatureRow icon={<Users color={Palette.neonMagenta} size={18} />} title="Community" subtitle="Chat, groups, and member directory" />
          <Divider tone="white" />
          <FeatureRow icon={<Server color={Palette.neonAmber} size={18} />} title="Campaigns" subtitle="Complete tasks and earn rewards" />
          <Divider tone="white" />
          <FeatureRow icon={<Globe color={Palette.neonLime} size={18} />} title="Events" subtitle="RSVP, check in, and earn rewards" />
          <Divider tone="white" />
          <FeatureRow icon={<Shield color={Palette.neonCyan} size={18} />} title="Security" subtitle="PIN, biometrics, trusted devices" />
        </GlassCard>

        {/* Tech Stack */}
        <SectionTitle title="Technology" tone="magenta" />
        <GlassCard tone="magenta" padding={Spacing['5']} style={styles.sectionCard}>
          <FeatureRow icon={<Code color={Palette.neonMagenta} size={18} />} title="React Native + Expo" subtitle="Cross-platform mobile framework" />
          <Divider tone="white" />
          <FeatureRow icon={<Server color={Palette.neonMagenta} size={18} />} title="Supabase" subtitle="PostgreSQL, Auth, and Edge Functions" />
          <Divider tone="white" />
          <FeatureRow icon={<Lock color={Palette.neonMagenta} size={18} />} title="Row Level Security" subtitle="Database-level access control" />
        </GlassCard>

        {/* Privacy & Security */}
        <SectionTitle title="Privacy" tone="amber" />
        <GlassCard tone="amber" padding={Spacing['5']} style={styles.sectionCard}>
          <NeonText variant="body" tone="muted" style={styles.privacyText}>
            W3OD Gateway takes your privacy seriously. All personal data is encrypted at rest and in transit.
            Your transaction PIN is hashed using SHA-256 with a salt. Biometric data never leaves your device.
            Account deletion gives you a 30-day grace period to recover your data.
          </NeonText>
          <NeonText variant="body" tone="muted" style={styles.privacyText}>
            We use Supabase Row Level Security (RLS) to ensure each user can only access their own data.
            Admin actions are logged in an audit trail.
          </NeonText>
        </GlassCard>

        {/* Links */}
        <SectionTitle title="Connect" tone="cyan" />
        <GlassCard tone="cyan" padding={Spacing['5']} style={styles.sectionCard}>
          <FeatureRow icon={<Mail color={Palette.neonCyan} size={18} />} title="Support" subtitle="support@w3od.gateway" />
          <Divider tone="white" />
          <FeatureRow icon={<Info color={Palette.neonCyan} size={18} />} title="Documentation" subtitle="Help center and guides" />
        </GlassCard>

        {/* Footer */}
        <View style={styles.footer}>
          <NeonText variant="body" tone="muted" style={styles.footerText}>
            Made with care for the Web3 community.
          </NeonText>
          <NeonText variant="body" tone="muted" style={styles.footerCopy}>
            (c) 2026 W3OD Gateway. All rights reserved.
          </NeonText>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ title, tone }: { title: string; tone: 'cyan' | 'magenta' | 'amber' }) {
  const color = tone === 'cyan' ? Palette.neonCyan : tone === 'magenta' ? Palette.neonMagenta : Palette.neonAmber;
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleAccent, { backgroundColor: color }]} />
      <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.sectionTitleText}>{title.toUpperCase()}</NeonText>
    </View>
  );
}

function FeatureRow({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>{icon}</View>
      <View style={styles.featureMeta}>
        <NeonText variant="body" weight="semiBold" tone="cyan">{title}</NeonText>
        <NeonText variant="body" tone="muted" style={styles.featureSub}>{subtitle}</NeonText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['5'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  sectionCard: { gap: 0, width: '100%' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  sectionTitleAccent: { width: 3, height: 18, borderRadius: 2 },
  sectionTitleText: { fontSize: Typography.sizes.md, letterSpacing: Typography.letterSpacings.wide },
  // Brand
  brandWrap: { alignItems: 'center', gap: Spacing['3'] },
  brandIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,240,255,0.1)', borderWidth: 2, borderColor: 'rgba(0,240,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  versionRow: { flexDirection: 'row', gap: Spacing['2'] },
  brandTagline: { fontSize: Typography.sizes.sm, lineHeight: 20, textAlign: 'center', paddingHorizontal: Spacing['4'] },
  // Features
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  featureIconWrap: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: Palette.glass300, alignItems: 'center', justifyContent: 'center' },
  featureMeta: { flex: 1, gap: 2 },
  featureSub: { fontSize: Typography.sizes.xs },
  // Privacy
  privacyText: { fontSize: Typography.sizes.sm, lineHeight: 22 },
  // Footer
  footer: { alignItems: 'center', gap: Spacing['1'], paddingVertical: Spacing['4'] },
  footerText: { fontSize: Typography.sizes.xs },
  footerCopy: { fontSize: Typography.sizes.xs },
  footerSpace: { height: Spacing['8'] },
});
