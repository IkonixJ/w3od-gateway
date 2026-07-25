import { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TextInput, type ViewStyle } from 'react-native';

import { Palette, Typography, Radii, Spacing } from '@/design/tokens';
import { responsive } from '@/design/responsive';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  style?: ViewStyle;
  error?: boolean;
  length?: number;
}

export function PinInput({
  value,
  onChange,
  onComplete,
  style,
  error = false,
  length = 4,
}: PinInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const dotSize = responsive(56, 48, 64);

  const digits = value.padEnd(length, ' ').split('').slice(0, length);

  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.dots}>
        {digits.map((digit, index) => {
          const isActive = focused && index === value.length;
          const isFilled = digit !== ' ';

          return (
            <View
              key={index}
              style={[
                styles.dotContainer,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: Radii.lg,
                  borderColor: error
                    ? Palette.error
                    : isActive
                    ? Palette.neonCyan
                    : isFilled
                    ? 'rgba(0,240,255,0.4)'
                    : 'rgba(255,255,255,0.12)',
                  shadowColor: error ? Palette.error : Palette.neonCyan,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isActive ? 0.5 : 0,
                  shadowRadius: isActive ? 12 : 0,
                  elevation: isActive ? 4 : 0,
                },
              ]}
            >
              {isFilled && <View style={[styles.dot, { backgroundColor: error ? Palette.error : Palette.neonCyan }]} />}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(text) => {
          const cleaned = text.replace(/\D/g, '').slice(0, length);
          onChange(cleaned);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        caretHidden
        secureTextEntry
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing['4'],
    justifyContent: 'center',
  },
  dotContainer: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
  },
});
