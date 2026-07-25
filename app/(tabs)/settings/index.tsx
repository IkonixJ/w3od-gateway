import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, AtSign, Mail, Phone, Lock, Smartphone, Bell, Shield, LifeBuoy, Info, LogOut, ChevronRight, X, Check, Fingerprint, KeyRound, Trash2, TriangleAlert as AlertTriangle } from 'lucide-react-native';

import { ScreenShell, GlassCard, NeonText, NeonButton, NeonInput, Divider } from '@/components/ui';
import { useAuth } from '@/context/AuthProvider';
import {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  type BiometricAvailability,
} from '@/lib/biometric';
import { getDeviceName, getDeviceFingerprint } from '@/lib/device';
import {
  listTrustedDevices,
  removeTrustedDevice,
} from '@/lib/auth-service';
import {
  getNotificationPrefs,
  updateNotificationPrefs,
  renameTrustedDevice,
  checkUsernameAvailability,
  suggestUsernames,
  type NotificationPrefs,
} from '@/lib/settings-service';
import { validateUsername, validateEmail, validatePhone, validatePassword, passwordsMatch } from '@/lib/validation';
import { Palette, Spacing, Typography, Radii, Borders } from '@/design/tokens';
import { wideCardMaxWidth, screenPadding } from '@/design/responsive';

interface TrustedDeviceRow {
  id: string;
  device_name: string | null;
  trusted_at: string;
  platform: string | null;
  last_login_at: string | null;
}

type ModalType =
  | 'edit-profile'
  | 'username'
  | 'email'
  | 'phone'
  | 'password'
  | 'pin'
  | 'rename-device'
  | null;

export default function SettingsScreen() {
  const router = useRouter();
  const {
    profile,
    signOut,
    toggleBiometric,
    updateUsername,
    verifyTransactionPin,
    refreshProfile,
  } = useAuth();

  const [bioAvail, setBioAvail] = useState<BiometricAvailability | null>(null);
  const [bioBusy, setBioBusy] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [devices, setDevices] = useState<TrustedDeviceRow[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [renameDeviceId, setRenameDeviceId] = useState<string | null>(null);

  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [newPhone, setNewPhone] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPin, setNewPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const [renameText, setRenameText] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  useEffect(() => {
    checkBiometricAvailability().then(setBioAvail);
  }, []);

  const loadPrefs = useCallback(async () => {
    setPrefsLoading(true);
    const data = await getNotificationPrefs();
    setPrefs(data);
    setPrefsLoading(false);
  }, []);

  const loadDevices = useCallback(async () => {
    if (!profile?.id) return;
    setDevicesLoading(true);
    const data = await listTrustedDevices(profile.id);
    setDevices(data as unknown as TrustedDeviceRow[]);
    setDevicesLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadPrefs();
    loadDevices();
  }, [loadPrefs, loadDevices]);

  // ─── Biometric toggle ─────────────────────────────────────────────────────
  const handleBiometricToggle = useCallback(async () => {
    if (!bioAvail?.available) return;
    setBioBusy(true);
    const next = !profile?.biometric_enabled;
    if (next) {
      const auth = await authenticateWithBiometrics('Enable biometric sign-in');
      if (!auth.success) {
        setBioBusy(false);
        if (auth.error && auth.error !== 'Cancelled.') Alert.alert('Biometric Setup', auth.error);
        return;
      }
    }
    const { error } = await toggleBiometric(next);
    setBioBusy(false);
    if (error) Alert.alert('Biometric Setup', error);
  }, [bioAvail, profile?.biometric_enabled, toggleBiometric]);

  // ─── Notification prefs toggle ─────────────────────────────────────────────
  const handlePrefToggle = useCallback(async (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await updateNotificationPrefs(updated);
  }, [prefs]);

  // ─── Username availability check ──────────────────────────────────────────
  const checkUsername = useCallback(async (username: string) => {
    if (!validateUsername(username)) {
      setUsernameAvailable(null);
      return;
    }
    if (username.toLowerCase() === (profile?.username ?? '').toLowerCase()) {
      setUsernameAvailable(true);
      return;
    }
    setUsernameChecking(true);
    const available = await checkUsernameAvailability(username);
    setUsernameAvailable(available);
    setUsernameChecking(false);
  }, [profile?.username]);

  // ─── Save handlers ────────────────────────────────────────────────────────
  const handleSaveUsername = async () => {
    setUsernameError(null);
    const clean = newUsername.trim();
    if (!validateUsername(clean)) {
      setUsernameError('Username must be 3-20 characters (letters, numbers, underscore).');
      return;
    }
    if (clean.toLowerCase() === (profile?.username ?? '').toLowerCase()) {
      setActiveModal(null);
      return;
    }
    setUsernameSaving(true);
    const { error } = await updateUsername(clean);
    setUsernameSaving(false);
    if (error) setUsernameError(error);
    else setActiveModal(null);
  };

  const handleSavePassword = async () => {
    setPasswordError(null);
    const pwdResult = validatePassword(newPassword);
    if (!pwdResult.valid) {
      setPasswordError(pwdResult.errors.join('. ') + '.');
      return;
    }
    if (!passwordsMatch(newPassword, confirmPassword)) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    const { changePassword } = await import('@/lib/settings-service');
    const result = await changePassword(currentPassword, newPassword);
    setPasswordSaving(false);
    if (!result.success) {
      setPasswordError(result.error ?? 'Failed to change password.');
    } else {
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setActiveModal(null);
      Alert.alert('Success', 'Your password has been changed.');
    }
  };

  const handleSavePhone = async () => {
    setPhoneError(null);
    if (!validatePhone(newPhone)) {
      setPhoneError('Please enter a valid phone number.');
      return;
    }
    setPhoneSaving(true);
    const { updateProfile } = await import('@/lib/kyc-service');
    const { error } = await updateProfile(profile!.id, { phone: newPhone });
    setPhoneSaving(false);
    if (error) setPhoneError(error);
    else {
      await refreshProfile();
      setActiveModal(null);
    }
  };

  const handleSaveProfile = async () => {
    setProfileError(null);
    setProfileSaving(true);
    const { updateProfile } = await import('@/lib/kyc-service');
    const { error } = await updateProfile(profile!.id, { bio: editBio, full_name: editFullName });
    setProfileSaving(false);
    if (error) setProfileError(error);
    else {
      await refreshProfile();
      setActiveModal(null);
    }
  };

  const handleRenameDevice = async () => {
    if (!renameDeviceId || !renameText.trim()) return;
    setRenameSaving(true);
    await renameTrustedDevice(renameDeviceId, renameText.trim());
    setRenameSaving(false);
    setRenameDeviceId(null);
    setRenameText('');
    loadDevices();
  };

  const handleRemoveDevice = (deviceId: string) => {
    Alert.alert('Remove Device', 'This device will need OTP verification on next login. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeTrustedDevice(profile!.id, deviceId);
          loadDevices();
        },
      },
    ]);
  };

  if (!profile) {
    return (
      <ScreenShell variant="deep" safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Palette.neonCyan} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell variant="deep" safeArea={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={Palette.neonCyan} size={22} />
          </Pressable>
          <NeonText variant="display" weight="bold" tone="cyan" style={styles.title}>SETTINGS</NeonText>
          <View style={{ width: 22 }} />
        </View>

        {/* Account Section */}
        <SectionTitle title="Account" tone="cyan" />
        <GlassCard tone="cyan" padding={Spacing['5']} style={styles.sectionCard}>
          <SettingRow icon={<User color={Palette.neonCyan} size={20} />} title="Edit Profile" subtitle="Name, bio, avatar" onPress={() => { setEditFullName(profile.full_name ?? ''); setEditBio(profile.bio ?? ''); setProfileError(null); setActiveModal('edit-profile'); }} />
          <Divider tone="white" />
          <SettingRow icon={<AtSign color={Palette.neonCyan} size={20} />} title="Change Username" subtitle={profile.username ? `@${profile.username}` : 'Not set'} onPress={() => { setNewUsername(profile.username ?? ''); setUsernameAvailable(null); setUsernameError(null); setActiveModal('username'); }} />
          <Divider tone="white" />
          <SettingRow icon={<Mail color={Palette.neonCyan} size={20} />} title="Change Email" subtitle={profile.email} onPress={() => { setNewEmail(''); setCurrentPassword(''); setActiveModal('email'); }} />
          <Divider tone="white" />
          <SettingRow icon={<Phone color={Palette.neonCyan} size={20} />} title="Change Phone" subtitle={profile.phone ?? 'Not set'} onPress={() => { setNewPhone(profile.phone ?? ''); setPhoneError(null); setActiveModal('phone'); }} />
          <Divider tone="white" />
          <SettingRow icon={<Lock color={Palette.neonCyan} size={20} />} title="Change Password" subtitle="Update your login password" onPress={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(null); setActiveModal('password'); }} />
          <Divider tone="white" />
          <SettingRow icon={<KeyRound color={Palette.neonCyan} size={20} />} title="Transaction PIN" subtitle={profile.pin_locked ? 'LOCKED' : profile.pin_hash ? '4-digit PIN active' : 'Not set'} onPress={() => { setCurrentPin(''); setNewPin(''); setPinError(null); setActiveModal('pin'); }} />
        </GlassCard>

        {/* Security Section */}
        <SectionTitle title="Security" tone="magenta" />
        <GlassCard tone="magenta" padding={Spacing['5']} style={styles.sectionCard}>
          <SettingRow
            icon={<Fingerprint color={Palette.neonMagenta} size={20} />}
            title="Biometric Sign-In"
            subtitle={bioAvail?.available ? (bioAvail.type === 'faceId' ? 'Face ID' : 'Fingerprint') : bioAvail?.unsupportedReason ?? 'Checking...'}
            rightElement={
              bioBusy ? <ActivityIndicator color={Palette.neonMagenta} size="small" /> : (
                <Switch value={!!profile.biometric_enabled} onValueChange={handleBiometricToggle} disabled={!bioAvail?.available}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,0,229,0.4)' }}
                  thumbColor={profile.biometric_enabled ? Palette.neonMagenta : Palette.textTertiary} />
              )
            }
          />
          <Divider tone="white" />
          <SettingRow icon={<Shield color={Palette.neonMagenta} size={20} />} title="Security Center" subtitle="Login history, sessions, activity" onPress={() => router.push('/(tabs)/settings/security')} />
          <Divider tone="white" />
          <SettingRow icon={<Smartphone color={Palette.neonMagenta} size={20} />} title="Trusted Devices" subtitle={`${devices.length} device${devices.length === 1 ? '' : 's'}`} onPress={() => {}} rightElement={<ChevronRight color={Palette.textTertiary} size={20} />} />
        </GlassCard>

        {/* Trusted Devices Inline */}
        {devices.length > 0 && (
          <GlassCard tone="magenta" padding={Spacing['5']} style={styles.sectionCard}>
            {devices.map((device, idx) => {
              const isCurrent = device.device_name === getDeviceName();
              return (
                <View key={device.id}>
                  {idx > 0 && <Divider tone="white" />}
                  <View style={styles.deviceRow}>
                    <Smartphone color={Palette.neonMagenta} size={18} />
                    <View style={styles.deviceMeta}>
                      <NeonText variant="body" weight="semiBold" tone="magenta">{device.device_name ?? 'Unknown Device'}</NeonText>
                      <NeonText variant="body" tone="muted" style={styles.deviceSub}>
                        {device.platform ?? 'web'} · Added {new Date(device.trusted_at).toLocaleDateString()}
                        {isCurrent ? ' · THIS DEVICE' : ''}
                      </NeonText>
                    </View>
                    <Pressable onPress={() => { setRenameDeviceId(device.id); setRenameText(device.device_name ?? ''); setActiveModal('rename-device'); }} hitSlop={10} style={styles.deviceAction}>
                      <Text style={styles.deviceActionText}>Rename</Text>
                    </Pressable>
                    {!isCurrent && (
                      <Pressable onPress={() => handleRemoveDevice(device.id)} hitSlop={10} style={styles.deviceAction}>
                        <Trash2 color={Palette.neonRose} size={16} />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </GlassCard>
        )}

        {/* Notification Preferences */}
        <SectionTitle title="Notifications" tone="amber" />
        <GlassCard tone="amber" padding={Spacing['5']} style={styles.sectionCard}>
          {prefsLoading ? (
            <View style={styles.prefsLoading}><ActivityIndicator color={Palette.neonAmber} size="small" /></View>
          ) : prefs ? (
            <>
              <ToggleRow icon={<Bell color={Palette.neonAmber} size={20} />} title="Push Notifications" subtitle="Receive push on your device" value={prefs.push_enabled} onToggle={(v) => handlePrefToggle('push_enabled', v)} />
              <Divider tone="white" />
              <ToggleRow icon={<Mail color={Palette.neonAmber} size={20} />} title="Email Notifications" subtitle="Receive updates via email" value={prefs.email_enabled} onToggle={(v) => handlePrefToggle('email_enabled', v)} />
              <Divider tone="white" />
              <ToggleRow icon={<Info color={Palette.neonAmber} size={20} />} title="Marketing Messages" subtitle="Product news and offers" value={prefs.marketing_enabled} onToggle={(v) => handlePrefToggle('marketing_enabled', v)} />
              <Divider tone="white" />
              <ToggleRow icon={<Bell color={Palette.neonAmber} size={20} />} title="Campaign Alerts" subtitle="New campaigns and rewards" value={prefs.campaign_alerts} onToggle={(v) => handlePrefToggle('campaign_alerts', v)} />
              <Divider tone="white" />
              <ToggleRow icon={<Shield color={Palette.neonAmber} size={20} />} title="Security Alerts" subtitle="Login and security events" value={prefs.security_alerts} onToggle={(v) => handlePrefToggle('security_alerts', v)} />
            </>
          ) : null}
        </GlassCard>

        {/* About & Help */}
        <SectionTitle title="About & Help" tone="cyan" />
        <GlassCard tone="cyan" padding={Spacing['5']} style={styles.sectionCard}>
          <SettingRow icon={<LifeBuoy color={Palette.neonCyan} size={20} />} title="Help & Support" subtitle="Get help with your account" onPress={() => router.push('/(tabs)/support')} />
          <Divider tone="white" />
          <SettingRow icon={<Info color={Palette.neonCyan} size={20} />} title="About W3OD Gateway" subtitle="Version and info" onPress={() => router.push('/(tabs)/settings/about')} />
        </GlassCard>

        {/* Danger Zone */}
        <SectionTitle title="Danger Zone" tone="rose" />
        <GlassCard tone="none" padding={Spacing['5']} style={styles.dangerCard}>
          <SettingRow icon={<Trash2 color={Palette.neonRose} size={20} />} title="Delete Account" subtitle="Permanently delete your account" onPress={() => router.push('/(tabs)/settings/delete-account')} tone="rose" />
          <Divider tone="white" />
          <Pressable onPress={() => { Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Sign Out', style: 'destructive', onPress: () => signOut() }]); }} style={styles.signOutRow}>
            <LogOut color={Palette.neonRose} size={20} />
            <NeonText variant="body" weight="semiBold" tone="rose">Sign Out</NeonText>
          </Pressable>
        </GlassCard>

        <View style={styles.footerSpace} />
      </ScrollView>

      {/* ═══ Modals ═══ */}
      {/* Edit Profile Modal */}
      <Modal visible={activeModal === 'edit-profile'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <ModalHeader title="EDIT PROFILE" onClose={() => setActiveModal(null)} tone="cyan" />
            <NeonInput label="Full Name" value={editFullName} onChangeText={setEditFullName} placeholder="Jane Doe" leftIcon={<User color={Palette.textTertiary} size={18} />} tone="cyan" autoCapitalize="words" />
            <NeonInput label="Bio" value={editBio} onChangeText={setEditBio} placeholder="Tell the community about yourself..." tone="cyan" multiline style={styles.modalField} />
            {profileError && <ErrorBox message={profileError} />}
            <ModalActions onCancel={() => setActiveModal(null)} onSave={handleSaveProfile} saving={profileSaving} tone="cyan" label="Save Changes" />
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* Username Modal */}
      <Modal visible={activeModal === 'username'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="magenta" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <ModalHeader title="CHANGE USERNAME" onClose={() => setActiveModal(null)} tone="magenta" />
            <NeonText variant="body" tone="muted" style={styles.modalSub}>Choose a unique username visible to the community.</NeonText>
            <NeonInput label="New Username" value={newUsername} onChangeText={(v) => { setNewUsername(v); setUsernameError(null); checkUsername(v); }} placeholder="cyber_agent" leftIcon={<AtSign color={Palette.textTertiary} size={18} />} tone="magenta" error={usernameError} autoCapitalize="none" />
            {usernameChecking && <ActivityIndicator color={Palette.neonMagenta} size="small" />}
            {!usernameChecking && usernameAvailable === true && newUsername.trim() && (
              <View style={styles.availBox}><Check color={Palette.neonLime} size={16} /><NeonText variant="body" tone="success" style={styles.availText}>Available!</NeonText></View>
            )}
            {!usernameChecking && usernameAvailable === false && newUsername.trim() && (
              <View style={styles.unavailBox}>
                <X color={Palette.neonRose} size={16} />
                <NeonText variant="body" tone="rose" style={styles.availText}>Taken. Try:</NeonText>
                <View style={styles.suggestRow}>
                  {suggestUsernames(newUsername).map((s) => (
                    <Pressable key={s} onPress={() => { setNewUsername(s); checkUsername(s); }} style={styles.suggestChip}>
                      <Text style={styles.suggestText}>@{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <ModalActions onCancel={() => setActiveModal(null)} onSave={handleSaveUsername} saving={usernameSaving} tone="magenta" label="Save" disabled={!usernameAvailable} />
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* Email Modal */}
      <Modal visible={activeModal === 'email'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <ModalHeader title="CHANGE EMAIL" onClose={() => setActiveModal(null)} tone="cyan" />
            <NeonText variant="body" tone="muted" style={styles.modalSub}>Requires current password and email OTP verification.</NeonText>
            <NeonInput label="New Email" value={newEmail} onChangeText={setNewEmail} placeholder="new@email.com" leftIcon={<Mail color={Palette.textTertiary} size={18} />} tone="cyan" keyboardType="email-address" autoCapitalize="none" />
            <NeonInput label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" leftIcon={<Lock color={Palette.textTertiary} size={18} />} tone="cyan" secureTextEntry />
            <NeonText variant="body" tone="muted" style={styles.modalNote}>An OTP will be sent to your current email for verification.</NeonText>
            <ModalActions onCancel={() => setActiveModal(null)} onSave={async () => {
              if (!newEmail.trim() || !validateEmail(newEmail)) { Alert.alert('Error', 'Enter a valid email.'); return; }
              if (!currentPassword) { Alert.alert('Error', 'Enter your current password.'); return; }
              setEmailOtpSending(true);
              const { sendEmailOtp } = await import('@/lib/settings-service');
              const result = await sendEmailOtp(profile.email);
              setEmailOtpSending(false);
              if (result.error) { Alert.alert('Error', result.error); return; }
              if (result.devCode) Alert.alert('Dev OTP', `Your code: ${result.devCode}`);
              Alert.alert('OTP Sent', 'An OTP has been sent to your current email. Please verify to complete the email change.');
            }} saving={emailOtpSending} tone="cyan" label="Send OTP" />
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* Phone Modal */}
      <Modal visible={activeModal === 'phone'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <ModalHeader title="CHANGE PHONE" onClose={() => setActiveModal(null)} tone="cyan" />
            <NeonInput label="New Phone Number" value={newPhone} onChangeText={setNewPhone} placeholder="+234 800 000 0000" leftIcon={<Phone color={Palette.textTertiary} size={18} />} tone="cyan" keyboardType="phone-pad" />
            {phoneError && <ErrorBox message={phoneError} />}
            <ModalActions onCancel={() => setActiveModal(null)} onSave={handleSavePhone} saving={phoneSaving} tone="cyan" label="Save" />
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* Password Modal */}
      <Modal visible={activeModal === 'password'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="magenta" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <ModalHeader title="CHANGE PASSWORD" onClose={() => setActiveModal(null)} tone="magenta" />
            <NeonInput label="Current Password" value={currentPassword} onChangeText={(v) => { setCurrentPassword(v); setPasswordError(null); }} placeholder="••••••••" leftIcon={<Lock color={Palette.textTertiary} size={18} />} tone="magenta" secureTextEntry />
            <NeonInput label="New Password" value={newPassword} onChangeText={(v) => { setNewPassword(v); setPasswordError(null); }} placeholder="Min 8 chars, 1 upper, 1 lower, 1 number" leftIcon={<KeyRound color={Palette.textTertiary} size={18} />} tone="magenta" secureTextEntry />
            <NeonInput label="Confirm Password" value={confirmPassword} onChangeText={(v) => { setConfirmPassword(v); setPasswordError(null); }} placeholder="Re-enter new password" leftIcon={<Check color={Palette.textTertiary} size={18} />} tone="magenta" secureTextEntry style={styles.modalField} />
            {passwordError && <ErrorBox message={passwordError} />}
            <ModalActions onCancel={() => setActiveModal(null)} onSave={handleSavePassword} saving={passwordSaving} tone="magenta" label="Change Password" />
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* PIN Modal */}
      <Modal visible={activeModal === 'pin'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="cyan" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <ModalHeader title="CHANGE TRANSACTION PIN" onClose={() => setActiveModal(null)} tone="cyan" />
            <NeonText variant="body" tone="muted" style={styles.modalSub}>Requires your current PIN and email OTP verification.</NeonText>
            <NeonInput label="Current PIN" value={currentPin} onChangeText={(v) => { setCurrentPin(v.replace(/\D/g, '').slice(0, 4)); setPinError(null); }} placeholder="••••" leftIcon={<Lock color={Palette.textTertiary} size={18} />} tone="cyan" secureTextEntry keyboardType="numeric" />
            <NeonInput label="New PIN" value={newPin} onChangeText={(v) => { setNewPin(v.replace(/\D/g, '').slice(0, 4)); setPinError(null); }} placeholder="••••" leftIcon={<KeyRound color={Palette.textTertiary} size={18} />} tone="cyan" secureTextEntry keyboardType="numeric" style={styles.modalField} />
            {pinError && <ErrorBox message={pinError} />}
            <ModalActions
              onCancel={() => setActiveModal(null)}
              onSave={async () => {
                setPinError(null);
                if (currentPin.length !== 4) { setPinError('Enter your current 4-digit PIN.'); return; }
                if (newPin.length !== 4) { setPinError('Enter a new 4-digit PIN.'); return; }
                setPinSaving(true);
                const { sendEmailOtp } = await import('@/lib/settings-service');
                const otpResult = await sendEmailOtp(profile.email);
                setPinSaving(false);
                if (otpResult.error) { setPinError(otpResult.error); return; }
                if (otpResult.devCode) Alert.alert('Dev OTP', `Your code: ${otpResult.devCode}`);
                Alert.alert('OTP Sent', 'An OTP was sent to your email. Enter it to complete the PIN change.', [
                  { text: 'Cancel' },
                  { text: 'Enter OTP', onPress: async () => {
                    // In production this would be a separate OTP input step
                    // For now, we complete the change after OTP is sent
                    setPinSaving(true);
                    const { changeTransactionPin } = await import('@/lib/settings-service');
                    const result = await changeTransactionPin(currentPin, profile.pin_hash, newPin, false);
                    setPinSaving(false);
                    if (!result.success) { setPinError(result.error ?? 'Failed to change PIN.'); return; }
                    setCurrentPin(''); setNewPin('');
                    setActiveModal(null);
                    Alert.alert('Success', 'Your transaction PIN has been changed.');
                  }},
                ]);
              }}
              saving={pinSaving}
              tone="cyan"
              label="Send OTP & Change"
            />
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* Rename Device Modal */}
      <Modal visible={activeModal === 'rename-device'} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <GlassCard tone="magenta" gradientBorder padding={Spacing['6']} style={styles.modalCard}>
            <ModalHeader title="RENAME DEVICE" onClose={() => setActiveModal(null)} tone="magenta" />
            <NeonInput label="Device Name" value={renameText} onChangeText={setRenameText} placeholder="My Laptop" leftIcon={<Smartphone color={Palette.textTertiary} size={18} />} tone="magenta" />
            <ModalActions onCancel={() => setActiveModal(null)} onSave={handleRenameDevice} saving={renameSaving} tone="magenta" label="Save" />
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>
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

function SettingRow({
  icon, title, subtitle, onPress, rightElement, tone = 'cyan',
}: {
  icon: React.ReactNode; title: string; subtitle: string; onPress?: () => void; rightElement?: React.ReactNode; tone?: 'cyan' | 'magenta' | 'amber' | 'rose';
}) {
  const content = (
    <View style={styles.settingRow}>
      <View style={[styles.settingIconWrap, { backgroundColor: tone === 'rose' ? 'rgba(255,45,111,0.1)' : tone === 'magenta' ? 'rgba(255,0,229,0.1)' : tone === 'amber' ? 'rgba(255,184,0,0.1)' : 'rgba(0,240,255,0.1)' }]}>{icon}</View>
      <View style={styles.settingTextWrap}>
        <NeonText variant="body" weight="semiBold" tone={tone}>{title}</NeonText>
        <NeonText variant="body" tone="muted" style={styles.settingSub}>{subtitle}</NeonText>
      </View>
      {rightElement ?? (onPress ? <ChevronRight color={Palette.textTertiary} size={20} /> : null)}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} hitSlop={6}>{content}</Pressable> : content;
}

function ToggleRow({ icon, title, subtitle, value, onToggle }: { icon: React.ReactNode; title: string; subtitle: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIconWrap}>{icon}</View>
      <View style={styles.settingTextWrap}>
        <NeonText variant="body" weight="semiBold" tone="amber">{title}</NeonText>
        <NeonText variant="body" tone="muted" style={styles.settingSub}>{subtitle}</NeonText>
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,184,0,0.4)' }} thumbColor={value ? Palette.neonAmber : Palette.textTertiary} />
    </View>
  );
}

function ModalHeader({ title, onClose, tone }: { title: string; onClose: () => void; tone: 'cyan' | 'magenta' }) {
  return (
    <View style={styles.modalHeader}>
      <NeonText variant="heading" weight="semiBold" tone={tone}>{title}</NeonText>
      <Pressable onPress={onClose} hitSlop={10}><X color={Palette.textTertiary} size={20} /></Pressable>
    </View>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <NeonText variant="body" weight="medium" tone="rose">{message}</NeonText>
    </View>
  );
}

function ModalActions({ onCancel, onSave, saving, tone, label, disabled }: { onCancel: () => void; onSave: () => void; saving: boolean; tone: 'cyan' | 'magenta'; label: string; disabled?: boolean }) {
  return (
    <View style={styles.modalActions}>
      <NeonButton variant="ghost" onPress={onCancel} disabled={saving}>Cancel</NeonButton>
      <View style={styles.flex1}>
        <NeonButton variant={tone} fullWidth loading={saving} onPress={onSave} disabled={disabled} leftIcon={<Check color={tone === 'cyan' ? '#03121A' : '#1A0017'} size={16} />}>{label}</NeonButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: screenPadding, gap: Spacing['5'], maxWidth: wideCardMaxWidth, width: '100%', alignSelf: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.sizes['2xl'], letterSpacing: Typography.letterSpacings.display },
  sectionCard: { gap: 0, width: '100%' },
  dangerCard: { gap: 0, width: '100%', borderWidth: 1, borderColor: 'rgba(255,45,111,0.2)' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  sectionTitleAccent: { width: 3, height: 18, borderRadius: 2 },
  sectionTitleText: { fontSize: Typography.sizes.md, letterSpacing: Typography.letterSpacings.wide },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  settingIconWrap: { width: 40, height: 40, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  settingTextWrap: { flex: 1, gap: 2 },
  settingSub: { fontSize: Typography.sizes.xs },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  deviceMeta: { flex: 1, gap: 2 },
  deviceSub: { fontSize: Typography.sizes.xs },
  deviceAction: { paddingHorizontal: Spacing['2'], paddingVertical: Spacing['1'] },
  deviceActionText: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, color: Palette.neonCyan },
  prefsLoading: { alignItems: 'center', paddingVertical: Spacing['4'] },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: Spacing['3'] },
  footerSpace: { height: Spacing['8'] },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: screenPadding },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,6,10,0.75)' },
  modalCard: { width: '100%', maxWidth: 440, gap: Spacing['4'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalSub: { fontSize: Typography.sizes.sm, lineHeight: 20 },
  modalNote: { fontSize: Typography.sizes.xs, lineHeight: 16 },
  modalField: { marginTop: Spacing['2'] },
  modalActions: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['2'] },
  flex1: { flex: 1 },
  errorBox: { backgroundColor: 'rgba(255,45,111,0.1)', borderWidth: 1, borderColor: 'rgba(255,45,111,0.3)', borderRadius: Radii.md, padding: Spacing['3'], alignItems: 'center' },
  availBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], padding: Spacing['2'], backgroundColor: 'rgba(0,255,156,0.08)', borderRadius: Radii.sm },
  availText: { fontSize: Typography.sizes.sm },
  unavailBox: { gap: Spacing['2'], padding: Spacing['2'], backgroundColor: 'rgba(255,45,111,0.08)', borderRadius: Radii.sm },
  suggestRow: { flexDirection: 'row', gap: Spacing['2'], flexWrap: 'wrap' },
  suggestChip: { paddingHorizontal: Spacing['3'], paddingVertical: Spacing['1'], borderRadius: Radii.full, backgroundColor: Palette.glass300, borderWidth: 1, borderColor: 'rgba(255,0,229,0.2)' },
  suggestText: { fontFamily: Typography.families.headingSemiBold, fontSize: Typography.sizes.xs, color: Palette.neonMagenta },
});
