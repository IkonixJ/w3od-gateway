import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useThemeFonts } from '@/hooks/useThemeFonts';
import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { SplashScreen } from '@/components/brand/SplashScreen';
import { CyberBackground } from '@/components/ui/CyberBackground';
import { NeonText } from '@/components/ui/NeonText';
import { Palette, Typography } from '@/design/tokens';
import type { OnboardingStep } from '@/types';

const ONBOARDING_ROUTES: Partial<Record<OnboardingStep, string>> = {
  welcome: '/(auth)/welcome',
  'sign-up': '/(auth)/sign-up',
  'verify-email': '/(auth)/verify-email',
  'sign-in': '/(auth)/sign-in',
  'forgot-password': '/(auth)/forgot-password',
  'reset-password': '/(auth)/reset-password',
  'device-verify': '/(auth)/device-verify',
  'create-pin': '/(auth)/create-pin',
};

function RootNavigator() {
  const { initializing, session, profile, onboardingStep } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = segments.join('/');

    // Not signed in
    if (!session) {
      // If on a non-auth screen and not completing onboarding, go to welcome
      if (!inAuthGroup && onboardingStep !== 'splash') {
        const target = ONBOARDING_ROUTES[onboardingStep] ?? '/(auth)/welcome';
        router.replace(target as never);
      }
      return;
    }

    // Signed in — check onboarding completion
    if (session && profile) {
      // Email not verified → verify-email
      if (!profile.email_verified && onboardingStep !== 'verify-email') {
        if (!currentPath.includes('verify-email')) {
          router.replace('/(auth)/verify-email' as never);
        }
        return;
      }

      // PIN not set → create-pin
      if (!profile.pin_hash && onboardingStep !== 'create-pin') {
        if (!currentPath.includes('create-pin')) {
          router.replace('/(auth)/create-pin' as never);
        }
        return;
      }

      // Device verification needed
      if (onboardingStep === 'device-verify') {
        if (!currentPath.includes('device-verify')) {
          router.replace('/(auth)/device-verify' as never);
        }
        return;
      }

      // Onboarding complete → go to tabs
      if (inAuthGroup) {
        router.replace('/(tabs)' as never);
      }
    }
  }, [initializing, session, profile, onboardingStep, segments, router]);

  if (initializing) {
    return (
      <CyberBackground>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Palette.neonCyan} />
          <NeonText variant="display" weight="medium" tone="cyan" style={styles.loadingText}>
            INITIALIZING W3OD GATEWAY
          </NeonText>
        </View>
      </CyberBackground>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const { fontsLoaded, fontError } = useThemeFonts();
  const [splashDone, setSplashDone] = useState(false);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!splashDone) {
    return <SplashScreen duration={2800} onAnimationComplete={() => setSplashDone(true)} />;
  }

  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="light" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: Typography.sizes.md,
    letterSpacing: 3,
  },
});
