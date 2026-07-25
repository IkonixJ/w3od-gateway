import { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import QRCode from 'qrcode';

import { Palette, Radii } from '@/design/tokens';

interface QRCodeViewProps {
  value: string;
  size?: number;
}

// Generates a QR code as a data URL on web (and base64 on native) and renders
// it in an Image. Falls back to a spinner while generating.
export function QRCodeView({ value, size = 200 }: QRCodeViewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#05060A',
        light: '#00F0FFFF',
      },
      width: size * 2,
    })
      .then((url: string) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (error) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <ActivityIndicator color={Palette.neonCyan} />
      </View>
    );
  }

  if (!dataUrl) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <ActivityIndicator color={Palette.neonCyan} />
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <View style={styles.innerFrame}>
        <Image
          source={{ uri: dataUrl }}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    padding: 12,
    backgroundColor: '#00F0FF',
    borderRadius: Radii.lg,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  innerFrame: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.md,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.glass300,
    borderRadius: Radii.lg,
  },
});
