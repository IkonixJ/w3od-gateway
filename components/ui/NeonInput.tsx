import {
  type ReactNode,
  useState,
  useCallback,
} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  type ViewStyle,
} from 'react-native';

import { Palette, Typography, Radii, Borders, Spacing } from '@/design/tokens';

type InputTone = 'cyan' | 'blue' | 'purple' | 'magenta' | 'amber';

interface NeonInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  autoCorrect?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  tone?: InputTone;
  error?: string | null;
  style?: ViewStyle;
  onSubmitEditing?: () => void;
}

const FOCUS_BORDER: Record<InputTone, string> = {
  cyan: 'rgba(0,240,255,0.6)',
  blue: 'rgba(30,144,255,0.6)',
  purple: 'rgba(138,43,226,0.6)',
  magenta: 'rgba(255,0,229,0.6)',
  amber: 'rgba(255,184,0,0.6)',
};

const FOCUS_GLOW: Record<InputTone, string> = {
  cyan: '#00F0FF',
  blue: '#1E90FF',
  purple: '#8A2BE2',
  magenta: '#FF00E5',
  amber: '#FFB800',
};

export function NeonInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  leftIcon,
  rightIcon,
  tone = 'cyan',
  error = null,
  style,
  onSubmitEditing,
}: NeonInputProps) {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);

  const isSecure = secureTextEntry && !reveal;
  const focusBorder = FOCUS_BORDER[tone];
  const focusGlow = FOCUS_GLOW[tone];

  const toggleReveal = useCallback(() => setReveal((v) => !v), []);

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputRow,
          {
            borderColor: focused ? focusBorder : error ? Palette.error : Borders.cyan,
            shadowColor: focused ? focusGlow : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: focused ? 0.4 : 0,
            shadowRadius: focused ? 10 : 0,
            elevation: focused ? 3 : 0,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Palette.textDisabled}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          selectionColor={Palette.neonCyan}
        />
        {secureTextEntry && (
          <Pressable onPress={toggleReveal} hitSlop={10} style={styles.rightIcon}>
            {rightIcon}
          </Pressable>
        )}
        {!secureTextEntry && rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

import { Text } from 'react-native';

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing['2'],
  },
  label: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    letterSpacing: Typography.letterSpacings.wide,
    textTransform: 'uppercase',
    color: Palette.textTertiary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.glassDark,
    borderWidth: Borders.thin,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing['4'],
    height: 54,
  },
  leftIcon: {
    marginRight: Spacing['3'],
  },
  rightIcon: {
    marginLeft: Spacing['2'],
  },
  input: {
    flex: 1,
    color: Palette.textPrimary,
    fontFamily: Typography.families.bodyRegular,
    fontSize: Typography.sizes.base,
    height: '100%',
  },
  errorText: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.error,
    letterSpacing: 0.3,
  },
});
