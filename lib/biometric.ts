import { Platform } from 'react-native';

// W3OD Gateway biometric authentication utility.
//
// On native (iOS/Android) we use expo-haptics + the platform biometric
// prompt via LocalAuthentication. On web, biometrics are not available, so
// we expose a graceful fallback that reports unsupported + a dev bypass.
//
// This module is deliberately web-safe: it only touches native APIs inside
// Platform.OS !== 'web' guards so the web bundle never imports native code.

export type BiometricType = 'faceId' | 'fingerprint' | 'none';

export interface BiometricAvailability {
  available: boolean;
  type: BiometricType;
  enrolled: boolean;
  unsupportedReason?: string;
}

export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  if (Platform.OS === 'web') {
    return {
      available: false,
      type: 'none',
      enrolled: false,
      unsupportedReason: 'Biometrics are only available on the W3OD mobile app.',
    };
  }

  try {
    // Dynamic import so web never evaluates this module.
    const LocalAuth = await import('expo-local-authentication');
    const compatible = await LocalAuth.hasHardwareAsync();
    if (!compatible) {
      return { available: false, type: 'none', enrolled: false, unsupportedReason: 'No biometric hardware detected.' };
    }
    const enrolled = await LocalAuth.isEnrolledAsync();
    if (!enrolled) {
      return { available: false, type: 'none', enrolled: false, unsupportedReason: 'No biometric enrolled on this device.' };
    }
    const types = await LocalAuth.supportedAuthenticationTypesAsync();
    // 1 = fingerprint, 2 = faceId, 3 = iris
    const type: BiometricType = types.includes(2) ? 'faceId' : 'fingerprint';
    return { available: true, type, enrolled: true };
  } catch {
    return {
      available: false,
      type: 'none',
      enrolled: false,
      unsupportedReason: 'Biometric authentication could not be initialized.',
    };
  }
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export async function authenticateWithBiometrics(
  reason = 'Authenticate to continue'
): Promise<BiometricAuthResult> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Biometrics are only available on the W3OD mobile app.' };
  }

  try {
    const LocalAuth = await import('expo-local-authentication');
    const result = await LocalAuth.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (result.success) return { success: true };
    return {
      success: false,
      error: result.error === 'user_cancel' ? 'Cancelled.' : 'Authentication failed.',
    };
  } catch {
    return { success: false, error: 'Biometric authentication unavailable.' };
  }
}
