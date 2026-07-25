import { Wallet, Zap, Award, ShieldCheck } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { GlassCard, NeonText, Badge, StatCard } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { Palette, Spacing, Typography } from '@/design/tokens';

export default function DashboardScreen() {
  const { profile } = useAuth();

  return (
    <PlaceholderScreen
      icon={<Wallet color={Palette.neonCyan} size={28} />}
      title="DASHBOARD"
      subtitle="Your W3OD command center"
      tone="cyan"
      badge="MEMBER"
    >
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
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
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
});
