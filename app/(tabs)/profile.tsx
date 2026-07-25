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
  ShieldAlert,
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
  Camera,
  Edit3,
  Save,
  Calendar,
  Hash,
  Trophy,
  IdCard,
  LifeBuoy,
  Settings as SettingsIcon,
  type LucideIcon,
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
import { getLevelInfo, getRankColor } from '@/lib/wallet';
import { getMyWallet } from '@/lib/wallet-service';
import {
  uploadAvatar,
  updateAvatarUrl,
  updateProfile,
  kycStatusLabel,
  kycStatusTone,
  formatDate,
} from '@/lib/kyc-service';
import { Palette, Spacing, Typography, Radii, Borders } from '@/design/tokens';
import { pickFile, fileToDataUrl, canUploadFiles } from '@/lib/file-utils';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';
import type { Wallet } from '@/types/wallet';

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
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [devices, setDevices] = useState<TrustedDeviceRow[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const levelInfo = getLevelInfo(profile?.xp ?? 0);
  const rankColor = getRankColor(levelInfo.level);

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

  useEffect(() => {
    getMyWallet().then(setWallet);
  }, []);

  // ─── Biometrics toggle ─────────────────────────────────────────────────────
  const handleBiometricToggle = useCallback(async () => {
    if (!bioAvail?.available) return;
    setBioBusy(true);
    const next = !profile?.biometric_enabled;

    if (next) {
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

  // ─── Edit profile (bio, full name, phone) ──────────────────────────────────
  const [editBio, setEditBio] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const openEditProfileModal = () => {
    setEditBio(profile?.bio ?? '');
    setEditFullName(profile?.full_name ?? '');
    setEditPhone(profile?.phone ?? '');
    setProfileError(null);
    setEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setProfileSaving(true);
    setProfileError(null);
    const { error } = await updateProfile(profile.id, {
      bio: editBio,
      full_name: editFullName,
      phone: editPhone,
    });
    setProfileSaving(false);
    if (error) {
      setProfileError(error);
    } else {
      await refreshProfile();
      setEditProfileModal(false);
    }
  };

  // ─── Avatar upload (web file picker) ───────────────────────────────────────
  const handleAvatarPress = async () => {
    if (!profile?.id) return;
    if (!canUploadFiles()) {
      Alert.alert('Upload Unavailable', 'File upload is only available on web. Please use a browser to upload files.');
      return;
    }
    const file = await pickFile('image/png,image/jpeg,image/jpg,image/webp');
    if (!file) return;
    setAvatarUploading(true);
    const dataUrl = await fileToDataUrl(file.uri);
    const { url, error } = await uploadAvatar(profile.id, dataUrl, file.type);
    if (error || !url) {
      setAvatarUploading(false);
      Alert.alert('Upload Failed', error ?? 'Could not upload image.');
      return;
    }
    await updateAvatarUrl(profile.id, url);
    await refreshProfile();
    setAvatarUploading(false);
  };

  // ─── PIN verification ──────────────────────────────────────────────────────
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

  const kycTone = kycStatusTone(profile.kyc_status);
  const initials = (profile.display_name ?? profile.username ?? '?')
    .split(/[ _-]+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ScreenShell variant="deep">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Identity Card ─────────────────────────────────────────────── */}
        <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.card}>
          {/* Avatar with upload overlay */}
          <View style={styles.identityRow}>
            <Pressable onPress={handleAvatarPress} disabled={avatarUploading} style={styles.avatarWrap}>
              <Avatar uri={profile.avatar_url} displayName={profile.display_name} size="xl" />
              <View style={styles.avatarCameraBtn}>
                {avatarUploading ? (
                  <ActivityIndicator color={Palette.neonCyan} size={12} />
                ) : (
                  <Camera color={Palette.bg950} size={14} strokeWidth={2.5} />
                )}
              </View>
            </Pressable>
            <View style={styles.identityMeta}>
              <View style={styles.nameRow}>
                <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.displayName}>
                  {profile.full_name ?? profile.display_name ?? 'Unregistered Agent'}
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
              <View style={styles.badgeRow}>
                <Badge
                  tone={profile.role === 'admin' ? 'rose' : profile.role === 'moderator' ? 'amber' : 'cyan'}
                  style={styles.roleBadge}
                >
                  {profile.role.toUpperCase()}
                </Badge>
                <Badge tone={kycTone}>
                  KYC: {kycStatusLabel(profile.kyc_status).toUpperCase()}
                </Badge>
              </View>
            </View>
          </View>

          {/* Bio */}
          {profile.bio ? (
            <View style={styles.bioBox}>
              <NeonText variant="body" tone="muted" style={styles.bioText}>
                {profile.bio}
              </NeonText>
            </View>
          ) : null}

          <Pressable onPress={openEditProfileModal} style={styles.editProfileBtn}>
            <Edit3 color={Palette.neonCyan} size={15} />
            <NeonText variant="body" weight="semiBold" tone="cyan" style={styles.editProfileText}>
              Edit Profile
            </NeonText>
          </Pressable>

          {/* Info grid */}
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
            <InfoChip
              icon={<Hash color={Palette.textTertiary} size={14} />}
              label="W3OD Account"
              value={wallet?.account_number ?? '—'}
            />
            <InfoChip
              icon={<Calendar color={Palette.textTertiary} size={14} />}
              label="Member Since"
              value={formatDate(profile.created_at)}
            />
          </View>
        </GlassCard>

        {/* ─── Level + XP + Rank ─────────────────────────────────────────── */}
        <GlassCard tone="cyan" gradientBorder padding={Spacing['5']} style={styles.sectionCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelIconWrap}>
              <Trophy color={rankColor as string} size={18} />
            </View>
            <View style={styles.levelMeta}>
              <NeonText variant="heading" weight="semiBold" tone="cyan" style={styles.levelRank}>
                {levelInfo.rank}
              </NeonText>
              <NeonText variant="body" tone="muted" style={styles.levelSub}>
                Level {levelInfo.level} · {levelInfo.xpIntoLevel}/{levelInfo.xpForNext} XP
              </NeonText>
            </View>
          </View>
          {/* XP progress bar */}
          <View style={styles.xpBarTrack}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${Math.round(levelInfo.progress * 100)}%`, backgroundColor: rankColor as string },
              ]}
            />
          </View>
          <View style={styles.xpRow}>
            <NeonText variant="body" tone="muted" style={styles.xpLabel}>
              {profile.xp.toLocaleString()} XP TOTAL
            </NeonText>
            <NeonText variant="body" tone="muted" style={styles.xpLabel}>
              {Math.round(levelInfo.progress * 100)}%
            </NeonText>
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

        {/* ─── Verification status ───────────────────────────────────────── */}
        <SectionTitle title="Verification" tone="cyan" />
        <GlassCard tone="cyan" padding={Spacing['5']} style={styles.sectionCard}>
          <SettingRow
            icon={<ShieldCheck color={Palette.neonCyan} size={20} />}
            title="KYC Verification"
            subtitle={kycStatusLabel(profile.kyc_status)}
            rightElement={
              <Pressable onPress={() => router.push('/(tabs)/kyc')} hitSlop={10}>
                <View style={styles.kycActionRow}>
                  <NeonText variant="body" weight="semiBold" tone={kycTone}>
                    {profile.kyc_status === 'verified' ? 'View' : 'Verify'}
                  </NeonText>
                  <ChevronRight color={Palette.textTertiary} size={20} />
                </View>
              </Pressable>
            }
          />
          <Divider tone="white" />
          <SettingRow
            icon={<Mail color={Palette.neonCyan} size={20} />}
            title="Email Verification"
            subtitle={profile.email_verified ? 'Verified' : 'Pending'}
            rightElement={
              <Badge tone={profile.email_verified ? 'lime' : 'amber'}>
                {profile.email_verified ? 'VERIFIED' : 'PENDING'}
              </Badge>
            }
          />
        </GlassCard>

        {/* ─── Badges ────────────────────────────────────────────────────── */}
        <SectionTitle title="Badges" tone="amber" />
        <GlassCard tone="amber" padding={Spacing['5']} style={styles.sectionCard}>
          <View style={styles.badgesRow}>
            <BadgeTile icon={Award} label="Founders" rarity="legendary" color={Palette.neonAmber} />
            <BadgeTile icon={Zap} label="Early Adopter" rarity="rare" color={Palette.neonCyan} />
            <BadgeTile icon={ShieldCheck} label="Verified" rarity="epic" color={Palette.neonLime} earned={profile.kyc_status === 'verified'} />
          </View>
          <NeonText variant="body" tone="muted" style={styles.badgesHint}>
            Earn more badges by completing campaigns, events, and community challenges.
          </NeonText>
        </GlassCard>

        {/* ─── Settings & Support ───────────────────────────────────────── */}
        <SectionTitle title="Settings & Support" tone="cyan" />
        <GlassCard tone="cyan" padding={Spacing['5']} style={styles.sectionCard}>
          <SettingRow
            icon={<SettingsIcon color={Palette.neonCyan} size={20} />}
            title="Settings"
            subtitle="Account, security, notifications"
            rightElement={
              <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={10}>
                <ChevronRight color={Palette.textTertiary} size={20} />
              </Pressable>
            }
          />
          <Divider tone="white" />
          <SettingRow
            icon={<LifeBuoy color={Palette.neonCyan} size={20} />}
            title="Support Center"
            subtitle="Get help with your account"
            rightElement={
              <Pressable onPress={() => router.push('/(tabs)/support')} hitSlop={10}>
                <ChevronRight color={Palette.textTertiary} size={20} />
              </Pressable>
            }
          />
        </GlassCard>

        {/* ─── Security Settings ─────────────────────────────────────────── */}
        <SectionTitle title="Security" tone="cyan" />

        <GlassCard tone="cyan" padding={Spacing['5']} style={styles.sectionCard}>
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

      {/* ─── Edit Profile Modal ─────────────────────────────────────────── */}
      <Modal visible={editProfileModal} transparent animationType="fade" onRequestClose={() => setEditProfileModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'web' ? undefined : 'padding'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <NeonText variant="heading" weight="semiBold" tone="cyan">
                EDIT PROFILE
              </NeonText>
              <Pressable onPress={() => setEditProfileModal(false)} hitSlop={10}>
                <X color={Palette.textTertiary} size={20} />
              </Pressable>
            </View>
            <NeonInput
              label="Full Name"
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="Jane Doe"
              leftIcon={<User color={Palette.textTertiary} size={18} />}
              tone="cyan"
              autoCapitalize="words"
            />
            <NeonInput
              label="Phone Number"
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+234 800 000 0000"
              leftIcon={<Phone color={Palette.textTertiary} size={18} />}
              tone="cyan"
              keyboardType="phone-pad"
              style={styles.modalField}
            />
            <NeonInput
              label="Bio"
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell the community about yourself..."
              tone="cyan"
              multiline
              style={styles.modalField}
            />
            {profileError && (
              <View style={styles.profileErrorBox}>
                <NeonText variant="body" weight="medium" tone="rose">
                  {profileError}
                </NeonText>
              </View>
            )}
            <View style={styles.modalActions}>
              <NeonButton variant="ghost" onPress={() => setEditProfileModal(false)}>
                Cancel
              </NeonButton>
              <View style={styles.flex1}>
                <NeonButton
                  variant="cyan"
                  fullWidth
                  loading={profileSaving}
                  onPress={handleSaveProfile}
                  leftIcon={<Save color="#03121A" size={16} />}
                >
                  Save Changes
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

function BadgeTile({
  icon: Icon,
  label,
  rarity,
  color,
  earned = true,
}: {
  icon: LucideIcon;
  label: string;
  rarity: string;
  color: string;
  earned?: boolean;
}) {
  return (
    <View style={[styles.badgeTile, { opacity: earned ? 1 : 0.3 }]}>
      <View style={[styles.badgeTileIcon, { backgroundColor: `${color}20`, borderColor: color }]}>
        <Icon color={color} size={22} />
      </View>
      <NeonText variant="body" weight="semiBold" tone="amber" style={styles.badgeTileLabel}>
        {label}
      </NeonText>
      <NeonText variant="body" tone="muted" style={styles.badgeTileRarity}>
        {rarity.toUpperCase()}
      </NeonText>
    </View>
  );
}

function SectionTitle({ title, tone }: { title: string; tone: 'cyan' | 'magenta' | 'amber' }) {
  const color =
    tone === 'cyan' ? Palette.neonCyan : tone === 'magenta' ? Palette.neonMagenta : Palette.neonAmber;
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
  avatarWrap: {
    position: 'relative',
  },
  avatarCameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Palette.bg950,
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
    marginTop: Spacing['1'],
  },
  roleBadge: {
    marginTop: 0,
  },
  bioBox: {
    backgroundColor: Palette.glass300,
    borderRadius: Radii.md,
    padding: Spacing['3'],
  },
  bioText: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    alignSelf: 'flex-start',
    paddingVertical: Spacing['2'],
    paddingHorizontal: Spacing['3'],
    backgroundColor: 'rgba(0,240,255,0.08)',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
  },
  editProfileText: {
    fontSize: Typography.sizes.sm,
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
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  levelIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Palette.glass300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelMeta: {
    flex: 1,
    gap: 2,
  },
  levelRank: {
    fontSize: Typography.sizes.md,
  },
  levelSub: {
    fontSize: Typography.sizes.xs,
  },
  xpBarTrack: {
    height: 8,
    backgroundColor: Palette.glass300,
    borderRadius: Radii.full,
    overflow: 'hidden',
    marginTop: Spacing['3'],
  },
  xpBarFill: {
    height: '100%',
    borderRadius: Radii.full,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing['2'],
  },
  xpLabel: {
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
    maxWidth: wideCardMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  kycActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing['2'],
  },
  badgeTile: {
    alignItems: 'center',
    gap: Spacing['2'],
    flex: 1,
  },
  badgeTileIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTileLabel: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
  },
  badgeTileRarity: {
    fontSize: 10,
  },
  badgesHint: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: Spacing['3'],
    lineHeight: 16,
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
  modalField: {
    marginTop: Spacing['2'],
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
  profileErrorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: Radii.md,
    padding: Spacing['3'],
    alignItems: 'center',
  },
});
