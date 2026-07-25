import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  LogOut,
  ShieldCheck,
  Award,
  Zap,
  Fingerprint,
  Lock,
  Smartphone,
  AtSign,
  Check,
  X,
  ChevronRight,
  Mail,
  Phone,
  Trash2,
  RotateCw,
} from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, Badge, NeonButton, NeonInput, Avatar, StatCard, Divider } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import { validateUsername } from '@/lib/validation';
import { listTrustedDevices, removeTrustedDevice } from '@/lib/auth-service';
import {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  type BiometricAvailability,
} from '@/lib/biometric';
import { getDeviceName } from '@/lib/device';
import { Palette, Spacing, Typography, Radii, Borders } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

interface TrustedDeviceRow {
  id: string;
  device_name: string | null;
  trusted_at: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile,
    signOut,
    toggleBiometric,
    updateUsername,
    verifyTransactionPin,
    refreshProfile,
    deviceFingerprint,
  } = useAuth();

  const [bioAvail, setBioAvail] = useState<BiometricAvailability | null>(null);
  const [bioBusy, setBioBusy] = useState(false);
  const [usernameModal, setUsernameModal] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [devices, setDevices] = useState<TrustedDeviceRow[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);

  useEffect(() => {
    checkBiometricAvailability().then(setBioAvail);
  }, []);

  const loadDevices = useCallback(async () => {
    if (!profile?.id) return;
    setDevicesLoading(true);
    const rows = await listTrustedDevices(profile.id);
    setDevices(rows);
    setDevicesLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // ─── Biometrics toggle ─────────────────────────────────────────────────────
  const handleBiometricToggle = useCallback(async () => {
    if (!bioAvail?.available) return;
    setBioBusy(true);
    const next = !profile?.biometric_enabled;

    if (next) {
      // Enabling — verify the user's biometric first
      const auth = await authenticateWithBiometrics('Enable biometric sign-in');
      if (!auth.success) {
        setBioBusy(false);
        if (auth.error && auth.error !== 'Cancelled.') {
          Alert.alert('Biometric Setup', auth.error);
        }
        return;
      }
    }

    const { error } = await toggleBiometric(next);
    setBioBusy(false);
    if (error) {
      Alert.alert('Biometric Setup', error);
    }
  }, [bioAvail, profile?.biometric_enabled, toggleBiometric]);

  // ─── Username change ───────────────────────────────────────────────────────
  const [newUsername, setNewUsername] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const openUsernameModal = () => {
    setNewUsername(profile?.username ?? '');
    setUsernameError(null);
    setUsernameModal(true);
  };

  const handleSaveUsername = async () => {
    setUsernameError(null);
    const clean = newUsername.trim();
    if (!validateUsername(clean)) {
      setUsernameError('Username must be 3-20 characters (letters, numbers, underscore).');
      return;
    }
    if (clean.toLowerCase() === (profile?.username ?? '').toLowerCase()) {
      setUsernameModal(false);
      return;
    }
    setUsernameSaving(true);
    const { error } = await updateUsername(clean);
    setUsernameSaving(false);
    if (error) {
      setUsernameError(error);
    } else {
      setUsernameModal(false);
    }
  };

  // ─── PIN verification (for sensitive actions demo) ────────────────────────
  const [pinEntry, setPinEntry] = useState('');
  const [pinResult, setPinResult] = useState<string | null>(null);

  const handlePinTest = async () => {
    setPinResult(null);
    if (pinEntry.length !== 4) {
      setPinResult('Enter a 4-digit PIN.');
      return;
    }
    const { valid, locked } = await verifyTransactionPin(pinEntry);
    if (locked) {
      setPinResult('PIN locked. Reset required.');
    } else if (valid) {
      setPinResult('PIN verified. Action authorized.');
    } else {
      setPinResult('Incorrect PIN.');
    }
    setPinEntry('');
  };

  // ─── Trusted device removal ────────────────────────────────────────────────
  const handleRemoveDevice = async (deviceId: string) => {
    setRemoveBusyId(deviceId);
    await removeTrustedDevice(profile!.id, deviceId);
    await loadDevices();
    setRemoveBusyId(null);
  };

  if (!profile) {
    return (
      <ScreenShell variant="deep">
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonCyan} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell variant="deep">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Identity Card ─────────────────────────────────────────────── */}
        <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.card}>
          <View style={styles.identityRow}>
            <Avatar
              uri={profile.avatar_url}
              displayName={profile.display_name}
              size="xl"
            />
            <View style={styles.identityMeta}>
              <View style={styles.nameRow}>
                <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.displayName}>
                  {profile.display_name ?? 'Unregistered Agent'}
                </NeonText>
                {profile.email_verified && (
                  <ShieldCheck color={Palette.success} size={16} />
                )}
              </View>
              {profile.username && (
                <NeonText variant="body" weight="semiBold" tone="magenta" style={styles.username}>
                  @{profile.username}
                </NeonText>
              )}
              <Badge
                tone={profile.role === 'admin' ? 'rose' : profile.role === 'moderator' ? 'amber' : 'cyan'}
                style={styles.roleBadge}
              >
                {profile.role.toUpperCase()}
              </Badge>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <InfoChip
              icon={<Mail color={Palette.textTertiary} size={14} />}
              label="Email"
              value={profile.email}
            />
            <InfoChip
              icon={<AtSign color={Palette.textTertiary} size={14} />}
              label="Username"
              value={profile.username ? `@${profile.username}` : 'Not set'}
            />
            <InfoChip
              icon={<User color={Palette.textTertiary} size={14} />}
              label="Full Name"
              value={profile.full_name ?? 'Not set'}
            />
            <InfoChip
              icon={<Phone color={Palette.textTertiary} size={14} />}
              label="Phone"
              value={profile.phone ?? 'Not set'}
            />
          </View>
        </GlassCard>

        {/* ─── Stats ─────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            label="XP"
            value={profile.xp}
            icon={<Zap color={Palette.neonCyan} size={16} />}
            tone="cyan"
          />
          <StatCard
            label="Reputation"
            value={profile.reputation}
            icon={<Award color={Palette.neonMagenta} size={16} />}
            tone="magenta"
          />
        </View>

        <View style={styles.statusRow}>
          <ShieldCheck
            color={profile.kyc_status === 'verified' ? Palette.neonLime : Palette.neonAmber}
            size={16}
          />
          <Badge tone={profile.kyc_status === 'verified' ? 'lime' : 'amber'}>
            KYC: {profile.kyc_status.toUpperCase()}
          </Badge>
          <Badge tone={profile.email_verified ? 'lime' : 'amber'}>
            {profile.email_verified ? 'EMAIL VERIFIED' : 'EMAIL PENDING'}
          </Badge>
        </View>

        {/* ─── Security Settings ─────────────────────────────────────────── */}
        <SectionTitle title="Security" tone="cyan" />

        <GlassCard tone="cyan" padding={Spacing['5']} style={styles.sectionCard}>
          {/* Biometric toggle */}
          <SettingRow
            icon={<Fingerprint color={Palette.neonCyan} size={20} />}
            title="Biometric Sign-In"
            subtitle={
              bioAvail?.available
                ? bioAvail.type === 'faceId'
                  ? 'Face ID enabled on this device'
                  : 'Fingerprint enabled on this device'
                : bioAvail?.unsupportedReason ?? 'Checking availability…'
            }
            rightElement={
              bioBusy ? (
                <ActivityIndicator color={Palette.neonCyan} size="small" />
              ) : (
                <Switch
                  value={!!profile.biometric_enabled}
                  onValueChange={handleBiometricToggle}
                  disabled={!bioAvail?.available}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(0,240,255,0.4)' }}
                  thumbColor={profile.biometric_enabled ? Palette.neonCyan : Palette.textTertiary}
                />
              )
            }
          />

          <Divider tone="white" />

          {/* Username change */}
          <SettingRow
            icon={<AtSign color={Palette.neonCyan} size={20} />}
            title="Change Username"
            subtitle={profile.username ? `Current: @${profile.username}` : 'Set a username'}
            rightElement={
              <Pressable onPress={openUsernameModal} hitSlop={10}>
                <ChevronRight color={Palette.textTertiary} size={20} />
              </Pressable>
            }
          />

          <Divider tone="white" />

          {/* PIN status */}
          <SettingRow
            icon={<Lock color={Palette.neonCyan} size={20} />}
            title="Transaction PIN"
            subtitle={
              profile.pin_locked
                ? 'LOCKED — reset required'
                : profile.pin_hash
                ? '4-digit PIN active'
                : 'Not set'
            }
            rightElement={
              <Pressable
                onPress={() => {
                  setPinEntry('');
                  setPinResult(null);
                  setPinModal(true);
                }}
                hitSlop={10}
              >
                <ChevronRight color={Palette.textTertiary} size={20} />
              </Pressable>
            }
          />

          {profile.pin_locked && (
            <View style={styles.lockedNotice}>
              <NeonText variant="body" tone="rose" style={styles.lockedText}>
                Your PIN is locked after 3 failed attempts. Reset it from a trusted
                device or contact support.
              </NeonText>
            </View>
          )}
        </GlassCard>

        {/* ─── Trusted Devices ───────────────────────────────────────────── */}
        <SectionTitle title="Trusted Devices" tone="cyan" />

        <GlassCard tone="cyan" padding={Spacing['5']} style={styles.sectionCard}>
          {devicesLoading ? (
            <View style={styles.devicesLoading}>
              <ActivityIndicator color={Palette.neonCyan} size="small" />
            </View>
          ) : devices.length === 0 ? (
            <NeonText variant="body" tone="muted" style={styles.emptyText}>
              No trusted devices yet. New devices will appear here after verification.
            </NeonText>
          ) : (
            devices.map((device, idx) => {
              const isCurrent = device.device_name === getDeviceName();
              return (
                <View key={device.id}>
                  {idx > 0 && <Divider tone="white" />}
                  <View style={styles.deviceRow}>
                    <Smartphone color={Palette.neonCyan} size={18} />
                    <View style={styles.deviceMeta}>
                      <NeonText variant="body" weight="semiBold" tone="cyan">
                        {device.device_name ?? 'Unknown Device'}
                      </NeonText>
                      <NeonText variant="body" tone="muted" style={styles.deviceDate}>
                        Trusted {new Date(device.trusted_at).toLocaleDateString()}
                        {isCurrent ? '  ·  THIS DEVICE' : ''}
                      </NeonText>
                    </View>
                    {isCurrent ? (
                      <Badge tone="lime">CURRENT</Badge>
                    ) : (
                      <Pressable
                        onPress={() => handleRemoveDevice(device.id)}
                        disabled={removeBusyId === device.id}
                        hitSlop={10}
                      >
                        {removeBusyId === device.id ? (
                          <ActivityIndicator color={Palette.neonRose} size={16} />
                        ) : (
                          <Trash2 color={Palette.neonRose} size={18} />
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </GlassCard>

        {/* ─── Session ───────────────────────────────────────────────────── */}
        <SectionTitle title="Session" tone="magenta" />

        <GlassCard tone="magenta" padding={Spacing['5']} style={styles.sectionCard}>
          <SettingRow
            icon={<RotateCw color={Palette.neonMagenta} size={20} />}
            title="Reload Profile"
            subtitle="Sync your latest data"
            rightElement={
              <Pressable onPress={() => refreshProfile()} hitSlop={10}>
                <ChevronRight color={Palette.textTertiary} size={20} />
              </Pressable>
            }
          />
          <Divider tone="white" />
          <Pressable onPress={() => signOut()} style={styles.signOutRow}>
            <LogOut color={Palette.neonRose} size={20} />
            <NeonText variant="body" weight="semiBold" tone="rose">
              Sign Out
            </NeonText>
          </Pressable>
        </GlassCard>

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* ─── Username Change Modal ──────────────────────────────────────── */}
      <Modal visible={usernameModal} transparent animationType="fade" onRequestClose={() => setUsernameModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'web' ? undefined : 'padding'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop} />
          <GlassCard tone="magenta" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <NeonText variant="heading" weight="semiBold" tone="magenta">
                CHANGE USERNAME
              </NeonText>
              <Pressable onPress={() => setUsernameModal(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>
            <NeonText variant="body" tone="muted" style={styles.modalSub}>
              Your @ handle is visible to the community and can be changed if the
              new name is available.
            </NeonText>
            <NeonInput
              label="New Username"
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="cyber_agent"
              leftIcon={<AtSign color={Palette.textTertiary} size={18} />}
              tone="magenta"
              error={usernameError}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setUsernameModal(false)}>
                Cancel
              </NeonButton>
              <View style={styles.flex1}>
                <NeonButton
                  variant="magenta"
                  fullWidth
                  loading={usernameSaving}
                  onPress={handleSaveUsername}
                  leftIcon={<Check color="#1A0017" size={16} />}
                >
                  Save
                </NeonButton>
              </View>
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── PIN Verify Modal ────────────────────────────────────────────── */}
      <Modal visible={pinModal} transparent animationType="fade" onRequestClose={() => setPinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <NeonText variant="heading" weight="semiBold" tone="cyan">
                VERIFY PIN
              </NeonText>
              <Pressable onPress={() => setPinModal(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>
            <NeonText variant="body" tone="muted" style={styles.modalSub}>
              Enter your 4-digit transaction PIN. This is used for transfers,
              redemptions, and sensitive account actions.
            </NeonText>
            <NeonInput
              label="Transaction PIN"
              value={pinEntry}
              onChangeText={(v) => setPinEntry(v.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              secureTextEntry
              leftIcon={<Lock color={Palette.textTertiary} size={18} />}
              tone="cyan"
              keyboardType="numeric"
            />
            {pinResult && (
              <View
                style={[
                  styles.pinResultBox,
                  {
                    backgroundColor: pinResult.includes('verified')
                      ? Palette.successSubtle
                      : 'rgba(255,45,111,0.1)',
                    borderColor: pinResult.includes('verified')
                      ? 'rgba(0,255,156,0.3)'
                      : 'rgba(255,45,111,0.3)',
                  },
                ]}
              >
                <NeonText
                  variant="body"
                  tone={pinResult.includes('verified') ? 'success' : 'rose'}
                >
                  {pinResult}
                </NeonText>
              </View>
            )}
            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setPinModal(false)}>
                Close
              </NeonButton>
              <View style={styles.flex1}>
                <NeonButton
                  variant="cyan"
                  fullWidth
                  onPress={handlePinTest}
                  disabled={pinEntry.length !== 4}
                  leftIcon={<ShieldCheck color="#03121A" size={16} />}
                >
                  Verify
                </NeonButton>
              </View>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </ScreenShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoChip}>
      <View style={styles.infoIconWrap}>{icon}</View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function SectionTitle({ title, tone }: { title: string; tone: 'cyan' | 'magenta' }) {
  const color = tone === 'cyan' ? Palette.neonCyan : Palette.neonMagenta;
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTitleAccent, { backgroundColor: color }]} />
      <NeonText variant="heading" weight="semiBold" tone={tone} style={styles.sectionTitleText}>
        {title.toUpperCase()}
      </NeonText>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  rightElement,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIconWrap}>{icon}</View>
      <View style={styles.settingTextWrap}>
        <NeonText variant="body" weight="semiBold" tone="cyan">
          {title}
        </NeonText>
        <NeonText variant="body" tone="muted" style={styles.settingSub}>
          {subtitle}
        </NeonText>
      </View>
      {rightElement && <View style={styles.settingRight}>{rightElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: screenPadding,
    gap: Spacing['5'],
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing['5'],
  },
  sectionCard: {
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
    gap: 0,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['4'],
  },
  identityMeta: {
    flex: 1,
    gap: Spacing['1'],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  displayName: {
    fontSize: Typography.sizes.lg,
  },
  username: {
    fontSize: Typography.sizes.sm,
  },
  roleBadge: {
    marginTop: Spacing['1'],
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['3'],
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    flexBasis: '47%',
    flexGrow: 1,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
    gap: 1,
  },
  infoLabel: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.textTertiary,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontFamily: Typography.families.bodyRegular,
    fontSize: Typography.sizes.sm,
    color: Palette.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
    flexWrap: 'wrap',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitleAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionTitleText: {
    fontSize: Typography.sizes.md,
    letterSpacing: Typography.letterSpacings.wide,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  settingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextWrap: {
    flex: 1,
    gap: 2,
  },
  settingSub: {
    fontSize: Typography.sizes.xs,
  },
  settingRight: {
    alignItems: 'flex-end',
  },
  lockedNotice: {
    marginTop: Spacing['2'],
    padding: Spacing['3'],
    backgroundColor: 'rgba(255,45,111,0.08)',
    borderWidth: Borders.thin,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
  },
  lockedText: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  devicesLoading: {
    alignItems: 'center',
    paddingVertical: Spacing['4'],
  },
  emptyText: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  deviceMeta: {
    flex: 1,
    gap: 2,
  },
  deviceDate: {
    fontSize: Typography.sizes.xs,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  footerSpace: {
    height: Spacing['8'],
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: screenPadding,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5,6,10,0.75)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    gap: Spacing['4'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalSub: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  flex1: {
    flex: 1,
  },
  pinResultBox: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
});
