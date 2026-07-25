import { User, LogOut, ShieldCheck, Award, Zap } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { GlassCard, NeonText, Badge, NeonButton, Avatar, StatCard } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { Palette, Spacing, Typography, Radii } from '@/design/tokens';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  return (
    <PlaceholderScreen
      icon={<User color={Palette.neonCyan} size={28} />}
      title="PROFILE"
      subtitle="Your identity and reputation"
      tone="cyan"
      badge={(profile?.role ?? 'member').toUpperCase()}
    >
      <View style={styles.profileRow}>
        <Avatar
          uri={profile?.avatar_url ?? null}
          displayName={profile?.display_name ?? null}
          size="lg"
        />
        <View style={styles.profileMeta}>
          <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.name}>
            {profile?.display_name ?? 'Unregistered Agent'}
          </NeonText>
          <NeonText variant="body" tone="muted" style={styles.email}>
            {profile?.email ?? '—'}
          </NeonText>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="XP"
          value={profile?.xp ?? 0}
          icon={<Zap color={Palette.neonCyan} size={16} />}
          tone="cyan"
        />
        <StatCard
          label="Reputation"
          value={profile?.reputation ?? 0}
          icon={<Award color={Palette.neonMagenta} size={16} />}
          tone="magenta"
        />
      </View>

      <View style={styles.kycRow}>
        <ShieldCheck
          color={profile?.kyc_status === 'verified' ? Palette.neonLime : Palette.neonAmber}
          size={16}
        />
        <Badge tone={profile?.kyc_status === 'verified' ? 'lime' : 'amber'}>
          KYC: {(profile?.kyc_status ?? 'none').toUpperCase()}
        </Badge>
      </View>

      <View style={styles.actions}>
        <NeonButton
          variant="outline"
          fullWidth
          onPress={() => signOut()}
          leftIcon={<LogOut color={Palette.neonCyan} size={16} />}
        >
          Sign Out
        </NeonButton>
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['4'],
    marginTop: Spacing['5'],
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: Typography.sizes.lg,
  },
  email: {
    fontSize: Typography.sizes.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['5'],
  },
  kycRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    marginTop: Spacing['4'],
  },
  actions: {
    marginTop: Spacing['6'],
  },
});
