// Simple PIN hashing for client-side storage.
// In production, PIN hashing should be done server-side via an edge function.
// This uses a salted SHA-256 hash stored in the pin_hash column.

const PIN_SALT = 'w3od_gateway_pin_salt_v1';

export async function hashPin(pin: string): Promise<string> {
  // Use Web Crypto API (available in browser and React Native polyfill)
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + PIN_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === storedHash;
}
