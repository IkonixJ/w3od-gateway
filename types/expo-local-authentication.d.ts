// Minimal type declarations for expo-local-authentication.
// The real package provides full types; this shim lets TypeScript compile
// in environments where the native module is not installed (e.g. web-only
// Bolt preview). At runtime the module is dynamically imported inside a
// Platform.OS !== 'web' guard and a try/catch, so the web bundle never
// evaluates it and a missing native module degrades to "unavailable".

declare module 'expo-local-authentication' {
  export interface AuthenticationOptions {
    promptMessage?: string;
    fallbackLabel?: string;
    cancelLabel?: string;
    disableDeviceFallback?: boolean;
  }
  export interface AuthenticationResult {
    success: boolean;
    error?: string;
  }
  export async function hasHardwareAsync(): Promise<boolean>;
  export async function isEnrolledAsync(): Promise<boolean>;
  export async function supportedAuthenticationTypesAsync(): Promise<number[]>;
  export async function authenticateAsync(
    options?: AuthenticationOptions
  ): Promise<AuthenticationResult>;
}
