import { Platform } from 'react-native';

// Generate a device fingerprint based on platform + user-agent + screen.
// This is a simple hash — not cryptographically strong, but sufficient
// for trusted-device identification. In production, use expo-application
// or expo-secure-store for a persistent device ID.
export async function getDeviceFingerprint(): Promise<string> {
  const factors: string[] = [];

  factors.push(Platform.OS);
  factors.push(String(Platform.Version));

  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    factors.push(navigator.userAgent || 'unknown');
    factors.push(String(navigator.language || ''));
    factors.push(String(screen.width || 0));
    factors.push(String(screen.height || 0));
    factors.push(String(screen.colorDepth || 0));
    factors.push(String(new Date().getTimezoneOffset()));
  } else {
    // On native, add screen dimensions and timezone for more entropy
    try {
      const { width, height } = await getNativeScreenSize();
      factors.push(`${width}x${height}`);
    } catch {
      // Screen dimensions unavailable — skip
    }
    try {
      const tz = await getNativeTimezone();
      factors.push(tz);
    } catch {
      // Timezone unavailable — skip
    }
  }

  const raw = factors.join('|');
  return simpleHash(raw);
}

async function getNativeScreenSize(): Promise<{ width: number; height: number }> {
  // Dynamic import so web never evaluates this module
  const { Dimensions } = await import('react-native');
  const { width, height } = Dimensions.get('window');
  return { width, height };
}

async function getNativeTimezone(): Promise<string> {
  // Use Intl if available (works on both native and web)
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function getDeviceName(): string {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (ua.includes('Mac')) return 'macOS Browser';
    if (ua.includes('Windows')) return 'Windows Browser';
    if (ua.includes('Linux')) return 'Linux Browser';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Browser';
    if (ua.includes('Android')) return 'Android Browser';
    return 'Web Browser';
  }
  return `${Platform.OS} ${Platform.Version}`;
}

// Simple deterministic hash (djb2) — not cryptographic, just for fingerprinting.
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
