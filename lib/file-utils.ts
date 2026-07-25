// Cross-platform file utilities for React Native + Web.
// Uses Platform guards so native never touches web-only DOM APIs.

import { Platform } from 'react-native';

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

// Convert a file URI to a base64 data URL.
// On web, uses FileReader. On native, returns the URI directly (Supabase handles file:// URIs).
export async function fileToDataUrl(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  // On native, return the URI — Supabase storage client accepts file:// URIs directly
  return uri;
}

// Pick a file from the device. On web, uses a hidden <input>. On native, returns null
// (native file picking requires expo-document-picker which is not installed —
// the caller should guard with Platform.OS and show an appropriate message).
export async function pickFile(accept = 'image/*'): Promise<PickedFile | null> {
  if (Platform.OS !== 'web') {
    // Native file picking would require expo-document-picker
    // For now, return null — callers should handle this gracefully
    return null;
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        uri: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
        size: file.size,
      });
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

// Copy text to clipboard. Uses navigator.clipboard on web, no-op on native
// (native clipboard would require expo-clipboard).
export async function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS === 'web' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Check if the current platform supports file upload
export function canUploadFiles(): boolean {
  return Platform.OS === 'web';
}
