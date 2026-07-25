import { Text, type TextProps } from 'react-native';

import { Palette, Typography } from '@/design/tokens';

type NeonTone =
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'magenta'
  | 'lime'
  | 'amber'
  | 'rose'
  | 'success'
  | 'warning'
  | 'muted';

type TextVariant = 'display' | 'heading' | 'body';
type TextWeight = 'regular' | 'medium' | 'semiBold' | 'bold';

const TONE_COLOR: Record<NeonTone, string> = {
  cyan: Palette.neonCyan,
  blue: Palette.electricBlue,
  purple: Palette.purpleGlow,
  magenta: Palette.neonMagenta,
  lime: Palette.neonLime,
  amber: Palette.neonAmber,
  rose: Palette.neonRose,
  success: Palette.success,
  warning: Palette.warning,
  muted: Palette.textSecondary,
};

const FONT_FAMILY: Record<TextVariant, Record<TextWeight, string>> = {
  display: {
    regular: Typography.families.displayRegular,
    medium: Typography.families.displayMedium,
    semiBold: Typography.families.display,
    bold: Typography.families.display,
  },
  heading: {
    regular: Typography.families.headingRegular,
    medium: Typography.families.headingMedium,
    semiBold: Typography.families.headingSemiBold,
    bold: Typography.families.headingBold,
  },
  body: {
    regular: Typography.families.bodyRegular,
    medium: Typography.families.bodyMedium,
    semiBold: Typography.families.bodySemiBold,
    bold: Typography.families.bodyBold,
  },
};

interface NeonTextProps extends TextProps {
  tone?: NeonTone;
  glow?: boolean;
  variant?: TextVariant;
  weight?: TextWeight;
  letterSpacing?: number;
}

export function NeonText({
  tone = 'cyan',
  glow = true,
  variant = 'body',
  weight = 'regular',
  letterSpacing,
  style,
  ...rest
}: NeonTextProps) {
  const color = TONE_COLOR[tone];
  return (
    <Text
      style={[
        {
          color,
          fontFamily: FONT_FAMILY[variant][weight],
          textShadowColor: glow ? color : 'transparent',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: glow ? 8 : 0,
          letterSpacing: letterSpacing,
        },
        style,
      ]}
      {...rest}
    />
  );
}
