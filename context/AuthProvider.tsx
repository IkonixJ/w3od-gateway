import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import {
  sendOtp,
  verifyOtp,
  markEmailVerified,
  checkUsernameTaken,
  changeUsername,
  consumeInviteCode,
  refundInviteCode,
  setBiometricEnabled,
  isTrustedDevice,
  trustDevice,
  logLoginAttempt,
  getLoginLockStatus,
  incrementLoginFailures,
  resetLoginFailures,
  updateLastActive,
  getLastActive,
  type OtpPurpose,
} from '@/lib/auth-service';
import { getDeviceFingerprint, getDeviceName } from '@/lib/device';
import { hashPin, verifyPin } from '@/lib/security';
import type { OnboardingStep, Profile, UserRole } from '@/types';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const PIN_MAX_ATTEMPTS = 3;

export interface SessionShape {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user: { id: string; email?: string };
}

export interface SignUpData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  inviteCode: string;
}

export interface AuthState {
  session: SessionShape | null;
  profile: Profile | null;
  role: UserRole;
  initializing: boolean;
  loading: boolean;
  onboardingStep: OnboardingStep;
  pendingEmail: string | null;
  pendingSignUp: SignUpData | null;
  pinRequired: boolean;
  deviceFingerprint: string;

  // Navigation helpers
  setOnboardingStep: (step: OnboardingStep) => void;
  setPendingEmail: (email: string) => void;

  // Auth actions
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithOtp: (email: string, password: string) => Promise<{ error: string | null }>;
  completeDeviceVerification: (code: string) => Promise<{ error: string | null }>;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  verifyEmail: (code: string) => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  // PIN
  createPin: (pin: string) => Promise<{ error: string | null }>;
  verifyTransactionPin: (pin: string) => Promise<{ valid: boolean; locked: boolean }>;
  resetPinLock: () => Promise<void>;

  // Profile settings
  toggleBiometric: (enabled: boolean) => Promise<{ error: string | null }>;
  updateUsername: (username: string) => Promise<{ error: string | null }>;

  // Session
  touchActivity: () => void;
}

const AuthReactContext = createContext<AuthState | undefined>(undefined);

function toSessionShape(session: Session): SessionShape {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    user: { id: session.user.id, email: session.user.email },
  };
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'User already registered': 'An account with that email already exists.',
  'Email not confirmed': 'Please confirm your email before signing in.',
};

function humanizeError(message: string | undefined): string | null {
  if (!message) return null;
  for (const key of Object.keys(AUTH_ERROR_MESSAGES)) {
    if (message.includes(key)) return AUTH_ERROR_MESSAGES[key];
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('splash');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingSignUp, setPendingSignUp] = useState<SignUpData | null>(null);
  const [pinRequired, setPinRequired] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivity = useRef<number>(Date.now());

  // Load device fingerprint on mount
  useEffect(() => {
    getDeviceFingerprint().then(setDeviceFingerprint);
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[auth] profile load failed', error.message);
      setProfile(null);
      return;
    }
    setProfile((data as Profile | null) ?? null);
  }, []);

  // Initialize session
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => mounted && setInitializing(false));
      } else {
        setInitializing(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      (async () => {
        setSession(nextSession);
        if (nextSession) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Determine onboarding step based on session + profile state
  useEffect(() => {
    if (initializing) return;
    if (onboardingStep === 'splash' || onboardingStep === 'welcome') return;

    if (!session) {
      // Not signed in — stay on current auth step
      return;
    }

    if (session && profile) {
      // Check if PIN is required
      if (!profile.pin_hash && !pinRequired && onboardingStep !== 'create-pin') {
        setOnboardingStep('create-pin');
        return;
      }
      if (profile.pin_hash && onboardingStep !== 'complete') {
        setOnboardingStep('complete');
      }
    }
  }, [session, profile, initializing, onboardingStep, pinRequired]);

  // ─── Session inactivity auto-logout ───────────────────────────────────────
  const signOutInactive = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setOnboardingStep('sign-in');
  }, []);

  const touchActivity = useCallback(() => {
    lastActivity.current = Date.now();
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= INACTIVITY_TIMEOUT) {
        signOutInactive();
      }
    }, INACTIVITY_TIMEOUT);
  }, [signOutInactive]);

  useEffect(() => {
    if (!session) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      return;
    }
    touchActivity();
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= INACTIVITY_TIMEOUT) {
        signOutInactive();
      }
    }, 60 * 1000); // check every minute

    return () => clearInterval(interval);
  }, [session, touchActivity, signOutInactive]);

  // ─── Sign In ──────────────────────────────────────────────────────────────
  const signIn = useCallback<AuthState['signIn']>(
    async (email, password) => {
      setLoading(true);
      try {
        const normalizedEmail = email.trim().toLowerCase();

        // Check lock status
        const { locked } = await getLoginLockStatus(normalizedEmail);
        if (locked) {
          return { error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error || !data.session) {
          await logLoginAttempt(null, normalizedEmail, false, deviceFingerprint);
          await incrementLoginFailures(normalizedEmail);
          return { error: humanizeError(error?.message) ?? 'Sign in failed.' };
        }

        // Success — reset failures, log attempt
        await resetLoginFailures(normalizedEmail);
        await logLoginAttempt(data.session.user.id, normalizedEmail, true, deviceFingerprint);

        // Check if device is trusted
        const trusted = await isTrustedDevice(data.session.user.id, deviceFingerprint);

        if (!trusted) {
          // New device — require OTP
          setSession(data.session);
          setPendingEmail(normalizedEmail);
          await loadProfile(data.session.user.id);
          const { error: otpError } = await sendOtp(normalizedEmail, 'login');
          if (otpError) {
            return { error: 'Signed in but device verification failed. Please try again.' };
          }
          setOnboardingStep('device-verify');
          return { error: null };
        }

        // Trusted device — proceed
        setSession(data.session);
        await loadProfile(data.session.user.id);
        await updateLastActive(data.session.user.id);
        return { error: null };
      } finally {
        setLoading(false);
      }
    },
    [deviceFingerprint, loadProfile]
  );

  // ─── Complete device verification (login OTP) ─────────────────────────────
  const completeDeviceVerification = useCallback<AuthState['completeDeviceVerification']>(
    async (code) => {
      if (!pendingEmail) return { error: 'No pending email.' };
      setLoading(true);
      try {
        const { verified, error } = await verifyOtp(pendingEmail, code, 'login');
        if (!verified) return { error: error ?? 'Invalid or expired code.' };

        // Trust this device
        if (session?.user.id) {
          await trustDevice(session.user.id, deviceFingerprint, getDeviceName());
          await updateLastActive(session.user.id);
        }
        setOnboardingStep('complete');
        return { error: null };
      } finally {
        setLoading(false);
      }
    },
    [pendingEmail, session, deviceFingerprint]
  );

  // ─── Sign Up ──────────────────────────────────────────────────────────────
  const signUp = useCallback<AuthState['signUp']>(
    async (data) => {
      setLoading(true);
      try {
        const normalizedEmail = data.email.trim().toLowerCase();

        // Check username availability
        const usernameTaken = await checkUsernameTaken(data.username);
        if (usernameTaken) {
          return { error: 'That username is already taken.' };
        }

        // Validate invite code
        const inviteValid = await consumeInviteCode(data.inviteCode);
        if (!inviteValid) {
          return { error: 'Invalid or expired invite code.' };
        }

        // Create auth user
        const { data: authData, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: data.password,
          options: {
            data: {
              display_name: data.username,
              full_name: data.fullName,
              username: data.username,
              phone: data.phone,
            },
          },
        });

        if (error) {
          // Refund the invite code on failure
          await refundInviteCode(data.inviteCode);
          return { error: humanizeError(error.message) ?? 'Registration failed.' };
        }

        if (authData.user) {
          // Update the profile with full details
          await supabase
            .from('profiles')
            .update({
              username: data.username,
              full_name: data.fullName,
              phone: data.phone,
              display_name: data.username,
            })
            .eq('id', authData.user.id);
        }

        // Send OTP for email verification
        const { error: otpError } = await sendOtp(normalizedEmail, 'signup');
        if (otpError) {
          return { error: 'Account created but verification email failed. Please contact support.' };
        }

        setPendingSignUp(data);
        setPendingEmail(normalizedEmail);
        setOnboardingStep('verify-email');
        return { error: null };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ─── Verify Email (signup OTP) ─────────────────────────────────────────────
  const verifyEmail = useCallback<AuthState['verifyEmail']>(
    async (code) => {
      if (!pendingEmail) return { error: 'No pending email.' };
      setLoading(true);
      try {
        const { verified, error } = await verifyOtp(pendingEmail, code, 'signup');
        if (!verified) return { error: error ?? 'Invalid or expired code.' };

        await markEmailVerified(pendingEmail);

        // After email verification, proceed to create PIN
        setPinRequired(true);
        setOnboardingStep('create-pin');
        return { error: null };
      } finally {
        setLoading(false);
      }
    },
    [pendingEmail]
  );

  // ─── Forgot Password ──────────────────────────────────────────────────────
  const requestPasswordReset = useCallback<AuthState['requestPasswordReset']>(
    async (email) => {
      setLoading(true);
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const { error } = await sendOtp(normalizedEmail, 'reset');
        if (error) return { error };
        setPendingEmail(normalizedEmail);
        setOnboardingStep('reset-password');
        return { error: null };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ─── Create PIN ───────────────────────────────────────────────────────────
  const createPin = useCallback<AuthState['createPin']>(
    async (pin) => {
      if (!session?.user.id) return { error: 'No active session.' };
      setLoading(true);
      try {
        const pinHash = await hashPin(pin);
        // Update profile with PIN hash — this goes through the guard trigger
        // but pin_hash is protected, so we use an RPC or service role
        // Actually, the guard only blocks self-update of pin_hash.
        // We need a security-definer function for this.
        const { error } = await supabase.rpc('set_user_pin', {
          p_user_id: session.user.id,
          p_pin_hash: pinHash,
        });
        if (error) {
          // Fallback: direct update (will be blocked by guard, but try)
          return { error: 'Failed to set PIN. Please try again.' };
        }
        await loadProfile(session.user.id);
        setPinRequired(false);
        setOnboardingStep('complete');
        return { error: null };
      } finally {
        setLoading(false);
      }
    },
    [session, loadProfile]
  );

  // ─── Verify Transaction PIN ──────────────────────────────────────────────
  const verifyTransactionPin = useCallback<AuthState['verifyTransactionPin']>(
    async (pin) => {
      if (!profile) return { valid: false, locked: false };
      if (profile.pin_locked) return { valid: false, locked: true };
      if (!profile.pin_hash) return { valid: false, locked: false };

      const valid = await verifyPin(pin, profile.pin_hash);
      if (valid) {
        // Reset failed attempts via RPC (guard blocks direct self-update)
        await supabase.rpc('reset_pin_lock', { p_user_id: profile.id });
        await loadProfile(profile.id);
        return { valid: true, locked: false };
      }

      // Increment failures via RPC (guard blocks direct self-update)
      const { data: locked } = await supabase.rpc('increment_pin_failure', {
        p_user_id: profile.id,
      });
      await loadProfile(profile.id);
      return { valid: false, locked: !!locked };
    },
    [profile, loadProfile]
  );

  // ─── Reset PIN Lock ───────────────────────────────────────────────────────
  const resetPinLock = useCallback(async () => {
    if (!profile) return;
    await supabase.rpc('reset_pin_lock', { p_user_id: profile.id });
    await loadProfile(profile.id);
  }, [profile, loadProfile]);

  // ─── Toggle Biometric Auth ────────────────────────────────────────────────
  const toggleBiometric = useCallback<AuthState['toggleBiometric']>(
    async (enabled) => {
      if (!session?.user.id) return { error: 'No active session.' };
      setLoading(true);
      try {
        await setBiometricEnabled(session.user.id, enabled);
        await loadProfile(session.user.id);
        return { error: null };
      } catch {
        return { error: 'Failed to update biometric setting.' };
      } finally {
        setLoading(false);
      }
    },
    [session, loadProfile]
  );

  // ─── Change Username ──────────────────────────────────────────────────────
  const updateUsername = useCallback<AuthState['updateUsername']>(
    async (username) => {
      if (!session?.user.id) return { error: 'No active session.' };
      setLoading(true);
      try {
        const ok = await changeUsername(session.user.id, username);
        if (!ok) return { error: 'That username is already taken or invalid.' };
        await loadProfile(session.user.id);
        return { error: null };
      } finally {
        setLoading(false);
      }
    },
    [session, loadProfile]
  );

  // ─── Sign Out ─────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setSession(null);
      setOnboardingStep('sign-in');
      setPinRequired(false);
      setPendingEmail(null);
      setPendingSignUp(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Refresh Profile ──────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (session?.user.id) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const role: UserRole = profile?.role ?? 'member';

  const value = useMemo<AuthState>(
    () => ({
      session: session ? toSessionShape(session) : null,
      profile,
      role,
      initializing,
      loading,
      onboardingStep,
      pendingEmail,
      pendingSignUp,
      pinRequired,
      deviceFingerprint,
      setOnboardingStep,
      setPendingEmail,
      signIn,
      signInWithOtp: signIn, // alias
      completeDeviceVerification,
      signUp,
      verifyEmail,
      requestPasswordReset,
      signOut,
      refreshProfile,
      createPin,
      verifyTransactionPin,
      resetPinLock,
      toggleBiometric,
      updateUsername,
      touchActivity,
    }),
    [
      session, profile, role, initializing, loading, onboardingStep,
      pendingEmail, pendingSignUp, pinRequired, deviceFingerprint,
      signIn, completeDeviceVerification, signUp, verifyEmail,
      requestPasswordReset, signOut, refreshProfile,
      createPin, verifyTransactionPin, resetPinLock,
      toggleBiometric, updateUsername, touchActivity,
    ]
  );

  return <AuthReactContext.Provider value={value}>{children}</AuthReactContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthReactContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
