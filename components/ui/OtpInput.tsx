import { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TextInput, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { Palette, Typography, Radii, Spacing, Animation } from '@/design/tokens';
import { responsive } from '@/design/responsive';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  style?: ViewStyle;
  error?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  style,
  error = false,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const boxSize = responsive(48, 40, 56);

  const digits = value.padEnd(length, ' ').split('').slice(0, length);

  const handlePress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.boxes}>
        {digits.map((digit, index) => {
          const isActive = focused && index === value.length;
          const isFilled = digit !== ' ';

          return (
            <Animated.View
              key={index}
              style={[
                styles.box,
                {
                  width: boxSize,
                  height: boxSize + 8,
                  borderColor: error
                    ? Palette.error
                    : isActive
                    ? Palette.neonCyan
                    : isFilled
                    ? 'rgba(0,240,255,0.4)'
                    : 'rgba(255,255,255,0.1)',
                  backgroundColor: isActive
                    ? 'rgba(0,240,255,0.08)'
                    : isFilled
                    ? 'rgba(0,240,255,0.04)'
                    : 'rgba(255,255,255,0.03)',
                  shadowColor: error ? Palette.error : Palette.neonCyan,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isActive ? 0.5 : 0,
                  shadowRadius: isActive ? 10 : 0,
                  elevation: isActive ? 4 : 0,
                },
              ]}
            >
              <Animated.Text style={styles.digit}>
                {isFilled ? digit : ''}
              </Animated.Text>
            </Animated.View>
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
      />
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  boxes: {
    flexDirection: 'row',
    gap: Spacing['2'],
    justifyContent: 'center',
  },
  box: {
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes['2xl'],
    color: Palette.textPrimary,
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
