import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Gift,
  Megaphone,
  ShieldAlert,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react-native';

import { Palette, Typography, Spacing, Radii } from '@/design/tokens';
import type { NotificationItem } from '@/types/dashboard';

interface NotificationPreviewProps {
  item: NotificationItem;
  onPress?: (id: string) => void;
}

const ICON_MAP: Record<NotificationItem['icon'], LucideIcon> = {
  reward: Gift,
  campaign: Megaphone,
  security: ShieldAlert,
  event: CalendarDays,
};

const TONE_COLOR: Record<NotificationItem['tone'], string> = {
  cyan: Palette.neonCyan,
  magenta: Palette.neonMagenta,
  lime: Palette.neonLime,
  amber: Palette.neonAmber,
};

const TONE_BG: Record<NotificationItem['tone'], string> = {
  cyan: 'rgba(0,240,255,0.1)',
  magenta: 'rgba(255,0,229,0.1)',
  lime: 'rgba(182,255,0,0.1)',
  amber: 'rgba(255,184,0,0.1)',
};

export function NotificationPreview({ item, onPress }: NotificationPreviewProps) {
  const Icon = ICON_MAP[item.icon];
  const color = TONE_COLOR[item.tone];

  return (
    <Pressable onPress={() => onPress?.(item.id)} style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: TONE_BG[item.tone] }]}>
        <Icon color={color} size={16} />
      </View>
      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.body} numberOfLines={1}>
          {item.body}
        </Text>
      </View>
      <Text style={styles.time}>{item.time}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Typography.families.bodySemiBold,
    fontSize: Typography.sizes.sm,
    color: Palette.textPrimary,
  },
  body: {
    fontFamily: Typography.families.bodyRegular,
    fontSize: Typography.sizes.xs,
    color: Palette.textTertiary,
  },
  time: {
    fontFamily: Typography.families.bodyMedium,
    fontSize: Typography.sizes.xs,
    color: Palette.textTertiary,
  },
});
