import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, History, LogOut, Smartphone, CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, KeyRound, Fingerprint, Lock, Globe } from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, Badge, NeonButton, Divider } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { getDeviceFingerprint, getDeviceName } from '@/lib/device';
import { listTrustedDevices, removeTrustedDevice } from '@/lib/auth-service';
import {
  getLoginHistory,
  getSecurityEvents,
  signOutAllDevices,
  type LoginHistoryEntry,
  type SecurityEventEntry,
} from '@/lib/settings-service';
import { Palette, Spacing, Typography, Radii } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

interface TrustedDeviceRow {
  id: string;
  device_name: string | null;
  trusted_at: string;
  platform: string | null;
  last_login_at: string | null;
}

const EVENT_ICONS: Record<string, typeof Shield> = {
  password_changed: KeyRound,
  pin_changed: Lock,
  email_changed: Globe,
  biometric_enabled: Fingerprint,
  biometric_disabled: Fingerprint,
  device_trusted: Smartphone,
  device_removed: Smartphone,
  sign_out_all: LogOut,
  account_deletion_requested: AlertTriangle,
  account_deletion_cancelled: CheckCircle2,
};

export default function SecurityScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEventEntry[]>([]);
  const [devices, setDevices] = useState<TrustedDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    const [history, events, deviceData] = await Promise.all([
      getLoginHistory(20, 0),
      getSecurityEvents(20, 0),
      listTrustedDevices(profile.id),
    ]);
    setLoginHistory(history);
    setSecurityEvents(events);
    setDevices((deviceData as unknown as TrustedDeviceRow[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSignOutAll = async () => {
    Alert.alert(
      'Sign Out All Devices',
      'This will sign you out from all other devices. You will stay signed in on this device only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            const fp = await getDeviceFingerprint();
            await signOutAllDevices(fp);
            await loadData();
            setSigningOut(false);
            Alert.alert('Done', 'You have been signed out from all other devices.');
          },
        },
      ]
    );
  };

  const handleRemoveDevice = (deviceId: string) => {
    Alert.alert('Remove Device', 'This device will need verification on next login.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeTrustedDevice(profile!.id, deviceId);
          await loadData();
        },
      },
    ]);
  };

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.neonMagenta} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonMagenta} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="magenta" style={styles.title}>SECURITY</NeonText>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator size="large" color={Palette.neonMagenta} /></View>
        ) : (
          <>
            {/* Active Sessions */}
            <SectionTitle title="Active Sessions" tone="magenta" />
            <GlassCard tone="magenta" padding={Spacing['5']} style={styles.sectionCard}>
              <View style={styles.sessionsSummary}>
                <View style={styles.sessionSummaryItem}>
                  <Text style={styles.sessionSummaryValue}>{devices.length}</Text>
                  <Text style={styles.sessionSummaryLabel}>TRUSTED DEVICES</Text>
                </View>
              </View>
              <Divider tone="white" />
              {devices.map((device, idx) => {
                const isCurrent = device.device_name === getDeviceName();
                return (
                  <View key={device.id}>
                    {idx > 0 && <Divider tone="white" />}
                    <View style={styles.deviceRow}>
                      <View style={styles.deviceIconWrap}>
                        <Smartphone color={isCurrent ? Palette.neonLime : Palette.neonMagenta} size={18} />
                      </View>
                      <View style={styles.deviceMeta}>
                        <View style={styles.deviceNameRow}>
                          <NeonText variant="body" weight="semiBold" tone={isCurrent ? 'lime' : 'magenta'}>
                            {device.device_name ?? 'Unknown Device'}
                          </NeonText>
                          {isCurrent && <Badge tone="lime" dot>CURRENT</Badge>}
                        </View>
                        <NeonText variant="body" tone="muted" style={styles.deviceSub}>
                          {device.platform ?? 'web'} · Added {new Date(device.trusted_at).toLocaleDateString()}
                          {device.last_login_at ? ` · Last: ${new Date(device.last_login_at).toLocaleDateString()}` : ''}
                        </NeonText>
                      </View>
                      {!isCurrent && (
                        <Pressable onPress={() => handleRemoveDevice(device.id)} hitSlop={10}>
                          <LogOut color={Palette.neonRose} size={16} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
              {devices.length > 1 && (
                <>
                  <Divider tone="white" />
                  <NeonButton variant="danger" fullWidth loading={signingOut} onPress={handleSignOutAll} leftIcon={<LogOut color="#fff" size={16} />}>
                    Sign Out From All Other Devices
                  </NeonButton>
                </>
              )}
            </GlassCard>

            {/* Login History */}
            <SectionTitle title="Login History" tone="cyan" />
            <GlassCard tone="cyan" padding={Spacing['5']} style={styles.sectionCard}>
              {loginHistory.length === 0 ? (
                <NeonText variant="body" tone="muted" style={styles.emptyText}>No login history yet.</NeonText>
              ) : (
                loginHistory.slice(0, 10).map((entry, idx) => (
                  <View key={entry.id}>
                    {idx > 0 && <Divider tone="white" />}
                    <View style={styles.historyRow}>
                      <View style={[styles.historyIconWrap, { backgroundColor: entry.success ? 'rgba(0,255,156,0.1)' : 'rgba(255,45,111,0.1)' }]}>
                        {entry.success ? <CheckCircle2 color={Palette.neonLime} size={16} /> : <XCircle color={Palette.neonRose} size={16} />}
                      </View>
                      <View style={styles.historyMeta}>
                        <NeonText variant="body" weight="semiBold" tone={entry.success ? 'lime' : 'rose'}>
                          {entry.success ? 'Successful Login' : 'Failed Login'}
                        </NeonText>
                        <NeonText variant="body" tone="muted" style={styles.historySub}>
                          {entry.device_name ?? 'Unknown'} · {entry.platform ?? 'web'}
                          {entry.ip_address ? ` · ${entry.ip_address}` : ''}
                        </NeonText>
                      </View>
                      <NeonText variant="body" tone="muted" style={styles.historyTime}>
                        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </NeonText>
                    </View>
                  </View>
                ))
              )}
            </GlassCard>

            {/* Security Events */}
            <SectionTitle title="Recent Security Events" tone="amber" />
            <GlassCard tone="amber" padding={Spacing['5']} style={styles.sectionCard}>
              {securityEvents.length === 0 ? (
                <NeonText variant="body" tone="muted" style={styles.emptyText}>No security events recorded.</NeonText>
              ) : (
                securityEvents.slice(0, 10).map((event, idx) => {
                  const Icon = EVENT_ICONS[event.event_type] ?? Shield;
                  return (
                    <View key={event.id}>
                      {idx > 0 && <Divider tone="white" />}
                      <View style={styles.eventRow}>
                        <View style={styles.eventIconWrap}>
                          <Icon color={Palette.neonAmber} size={16} />
                        </View>
                        <View style={styles.eventMeta}>
                          <NeonText variant="body" weight="semiBold" tone="amber">{event.description}</NeonText>
                          <NeonText variant="body" tone="muted" style={styles.eventSub}>
                            {event.event_type.replace(/_/g, ' ').toUpperCase()}
                          </NeonText>
                        </View>
                        <NeonText variant="body" tone="muted" style={styles.eventTime}>
                          {new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </NeonText>
                      </View>
                    </View>
                  );
                })
              )}
            </GlassCard>

            {/* Quick Actions */}
            <SectionTitle title="Actions" tone="rose" />
            <GlassCard tone="none" padding={Spacing['5']} style={styles.dangerCard}>
              <Pressable onPress={() => signOut()} style={styles.signOutRow}>
                <LogOut color={Palette.neonRose} size={20} />
                <NeonText variant="body" weight="semiBold" tone="rose">Sign Out</NeonText>
              </Pressable>
            </GlassCard>
          </>
        )}

        <View style={styles.footerSpace} />
      </ScrollView>
    </ScreenShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ title, tone }: { title: string; tone: 'cyan' | 'magenta' | 'amber' | 'rose' }) {
  const color = tone === 'cyan' ? Palette.neonCyan : tone === 'magenta' ? Palette.neonMagenta : tone === 'amber' ? Palette.neonAmber : Palette.neonRose;
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleAccent, { backgroundColor: color }]} />
      <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.sectionTitleText}>{title.toUpperCase()}</NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['5'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['12'] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  sectionCard: { gap: 0, width: '100%' },
  dangerCard: { gap: 0, width: '100%', borderWidth: 1, borderColor: 'rgba(255,45,111,0.2)' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  sectionTitleAccent: { width: 3, height: 18, borderRadius: 2 },
  sectionTitleText: { fontSize: Typography.sizes.md, letterSpacing: Typography.letterSpacings.wide },
  sessionsSummary: { paddingVertical: Spacing['3'] },
  sessionSummaryItem: { alignItems: 'center', gap: 2 },
  sessionSummaryValue: { fontFamily: Typography.families.display, fontSize: Typography.sizes['2xl'], color: Palette.neonMagenta },
  sessionSummaryLabel: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, color: Palette.textTertiary, letterSpacing: Typography.letterSpacings.wide },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  deviceIconWrap: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: Palette.glass300, alignItems: 'center', justifyContent: 'center' },
  deviceMeta: { flex: 1, gap: 2 },
  deviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  deviceSub: { fontSize: Typography.sizes.xs },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  historyIconWrap: { width: 36, height: 36, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  historyMeta: { flex: 1, gap: 2 },
  historySub: { fontSize: Typography.sizes.xs },
  historyTime: { fontSize: Typography.sizes.xs },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  eventIconWrap: { width: 36, height: 36, borderRadius: Radii.md, backgroundColor: 'rgba(255,184,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  eventMeta: { flex: 1, gap: 2 },
  eventSub: { fontSize: Typography.sizes.xs },
  eventTime: { fontSize: Typography.sizes.xs },
  emptyText: { fontSize: Typography.sizes.sm, lineHeight: 20, textAlign: 'center', paddingVertical: Spacing['4'] },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  footerSpace: { height: Spacing['8'] },
});
