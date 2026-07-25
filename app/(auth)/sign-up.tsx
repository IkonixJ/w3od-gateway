import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  AtSign,
  Mail,
  Phone,
  Lock,
  Ticket,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react-native';

import {
  ScreenShell,
  GlassCard,
  NeonButton,
  NeonText,
  NeonInput,
  Badge,
} from '@/components/ui';
import { W3ODLogo } from '@/components/brand/W3ODLogo';
import { useAuth } from '@/context/AuthProvider';
import {
  validateEmail,
  validatePhone,
  validateUsername,
  validatePassword,
  passwordsMatch,
  validateInviteCode,
} from '@/lib/validation';
import { checkUsernameTaken } from '@/lib/auth-service';
import { Palette, Typography, Spacing } from '@/design/tokens';
import { logoHeaderSize, cardMaxWidth, screenPadding, responsive } from '@/design/responsive';

const STEPS = ['Account', 'Profile', 'Security'] as const;
type Step = (typeof STEPS)[number];

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, loading } = useAuth();

  // Step 1: Account
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Step 2: Profile
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');

  // Step 3: Security
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [step, setStep] = useState<Step>('Account');
  const [error, setError] = useState<string | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const stepIndex = STEPS.indexOf(step);

  const checkUsername = useCallback(async (name: string) => {
    if (!validateUsername(name)) {
      setUsernameAvailable(null);
      return;
    }
    setUsernameChecking(true);
    const taken = await checkUsernameTaken(name);
    setUsernameAvailable(!taken);
    setUsernameChecking(false);
  }, []);

  const handleNext = async () => {
    setError(null);

    if (step === 'Account') {
      if (!validateEmail(email)) return setError('Please enter a valid email address.');
      if (!validateInviteCode(inviteCode)) return setError('Please enter a valid invite code.');
      setStep('Profile');
      return;
    }

    if (step === 'Profile') {
      if (!fullName.trim()) return setError('Please enter your full name.');
      if (!validateUsername(username)) return setError('Username must be 3-20 characters (letters, numbers, underscore).');
      if (usernameAvailable === false) return setError('That username is already taken.');
      if (!validatePhone(phone)) return setError('Please enter a valid phone number.');
      setStep('Security');
      return;
    }

    if (step === 'Security') {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) return setError(pwCheck.errors.join('. ') + '.');
      if (!passwordsMatch(password, confirmPassword)) return setError('Passwords do not match.');

      const { error } = await signUp({
        fullName: fullName.trim(),
        username: username.trim(),
        email,
        phone: phone.trim(),
        password,
        inviteCode: inviteCode.trim(),
      });

      if (error) return setError(error);

      // Navigate to verify-email screen
      router.push('/(auth)/verify-email' as never);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'Profile') setStep('Account');
    else if (step === 'Security') setStep('Profile');
    else router.back();
  };

  return (
    <ScreenShell variant="aurora" safeArea={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <W3ODLogo size={logoHeaderSize} showText={false} glowIntensity="medium" />
            <NeonText variant="display" weight="bold" tone="magenta" style={styles.title}>
              CREATE IDENTITY
            </NeonText>
          </View>

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            {STEPS.map((s, i) => (
              <View key={s} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: i <= stepIndex ? Palette.neonCyan : 'transparent',
                      borderColor: i <= stepIndex ? Palette.neonCyan : 'rgba(255,255,255,0.15)',
                    },
                  ]}
                >
                  {i < stepIndex ? (
                    <Check color={Palette.bg950} size={14} strokeWidth={3} />
                  ) : (
                    <Text style={[styles.stepNumber, { color: i <= stepIndex ? Palette.bg950 : Palette.textTertiary }]}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                {i < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: i < stepIndex ? Palette.neonCyan : 'rgba(255,255,255,0.1)' },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          <GlassCard tone="magenta" gradientBorder padding={Spacing['6']} style={styles.card}>
            <NeonText variant="heading" weight="semiBold" tone="magenta" style={styles.stepTitle}>
              STEP {stepIndex + 1}: {step.toUpperCase()}
            </NeonText>

            {step === 'Account' && (
              <View style={styles.fields}>
                <NeonInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="agent@w3od.io"
                  keyboardType="email-address"
                  leftIcon={<Mail color={Palette.textTertiary} size={18} />}
                  tone="magenta"
                />
                <NeonInput
                  label="Invite Code"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholder="W3OD-FOUNDERS"
                  leftIcon={<Ticket color={Palette.textTertiary} size={18} />}
                  tone="magenta"
                  style={styles.field}
                />
                <View style={styles.inviteHint}>
                  <NeonText variant="body" tone="muted" style={styles.hintText}>
                    Registration requires a valid invite code.
                  </NeonText>
                </View>
              </View>
            )}

            {step === 'Profile' && (
              <View style={styles.fields}>
                <NeonInput
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Jane Doe"
                  leftIcon={<User color={Palette.textTertiary} size={18} />}
                  tone="magenta"
                />
                <View style={styles.field}>
                  <NeonInput
                    label="Username"
                    value={username}
                    onChangeText={(v) => {
                      setUsername(v);
                      setUsernameAvailable(null);
                      checkUsername(v);
                    }}
                    placeholder="cyber_agent"
                    leftIcon={<AtSign color={Palette.textTertiary} size={18} />}
                    tone="magenta"
                  />
                  {usernameChecking && (
                    <NeonText variant="body" tone="muted" style={styles.hintText}>
                      Checking availability...
                    </NeonText>
                  )}
                  {!usernameChecking && usernameAvailable === true && validateUsername(username) && (
                    <View style={styles.usernameAvailable}>
                      <Check color={Palette.success} size={14} />
                      <NeonText variant="body" tone="success" style={styles.hintText}>
                        @{username} is available
                      </NeonText>
                    </View>
                  )}
                  {!usernameChecking && usernameAvailable === false && (
                    <NeonText variant="body" tone="rose" style={styles.hintText}>
                      @{username} is already taken
                    </NeonText>
                  )}
                </View>
                <NeonInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 555 000 0000"
                  keyboardType="phone-pad"
                  leftIcon={<Phone color={Palette.textTertiary} size={18} />}
                  tone="magenta"
                  style={styles.field}
                />
              </View>
            )}

            {step === 'Security' && (
              <View style={styles.fields}>
                <NeonInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                  secureTextEntry
                  leftIcon={<Lock color={Palette.textTertiary} size={18} />}
                  tone="magenta"
                />
                <PasswordRules password={password} />
                <NeonInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  secureTextEntry
                  leftIcon={<Lock color={Palette.textTertiary} size={18} />}
                  tone="magenta"
                  error={confirmPassword.length > 0 && !passwordsMatch(password, confirmPassword) ? 'Passwords do not match' : null}
                  style={styles.field}
                />
              </View>
            )}

            {error && (
              <View style={styles.errorBox}>
                <NeonText variant="body" weight="medium" tone="rose">
                  {error}
                </NeonText>
              </View>
            )}

            <View style={styles.buttonRow}>
              <NeonButton variant="ghost" onPress={handleBack} leftIcon={<ArrowLeft color={Palette.neonCyan} size={16} />}>
                Back
              </NeonButton>
              <View style={styles.flex1}>
                <NeonButton
                  variant="magenta"
                  fullWidth
                  loading={loading}
                  onPress={handleNext}
                  rightIcon={stepIndex < 2 ? <ArrowRight color="#1A0017" size={16} /> : undefined}
                >
                  {stepIndex < 2 ? 'Continue' : 'Register'}
                </NeonButton>
              </View>
            </View>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function PasswordRules({ password }: { password: string }) {
  const rules = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
  ];

  return (
    <View style={styles.rulesBox}>
      {rules.map((rule) => (
        <View key={rule.label} style={styles.ruleRow}>
          <View
            style={[
              styles.ruleDot,
              { backgroundColor: rule.met ? Palette.success : 'rgba(255,255,255,0.1)' },
            ]}
          >
            {rule.met && <Check color={Palette.bg950} size={10} strokeWidth={3} />}
          </View>
          <NeonText
            variant="body"
            tone={rule.met ? 'success' : 'muted'}
            style={styles.ruleText}
          >
            {rule.label}
          </NeonText>
        </View>
      ))}
    </View>
  );
}

import { Text } from 'react-native';

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: screenPadding,
    gap: Spacing['5'],
  },
  header: {
    alignItems: 'center',
    gap: Spacing['3'],
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    letterSpacing: Typography.letterSpacings.display,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontFamily: Typography.families.headingSemiBold,
    fontSize: 12,
  },
  stepLine: {
    width: 40,
    height: 2,
  },
  card: {
    maxWidth: cardMaxWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing['4'],
  },
  stepTitle: {
    fontSize: Typography.sizes.sm,
    letterSpacing: Typography.letterSpacings.wide,
  },
  fields: {
    gap: Spacing['2'],
  },
  field: {
    marginTop: Spacing['2'],
  },
  inviteHint: {
    marginTop: Spacing['2'],
  },
  hintText: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing['1'],
  },
  usernameAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    marginTop: Spacing['1'],
  },
  rulesBox: {
    marginTop: Spacing['2'],
    gap: Spacing['2'],
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  ruleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleText: {
    fontSize: Typography.sizes.xs,
  },
  errorBox: {
    backgroundColor: 'rgba(255,45,111,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,111,0.3)',
    borderRadius: 10,
    padding: Spacing['3'],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
  flex1: {
    flex: 1,
  },
});
