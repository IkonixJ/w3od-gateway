import { Bell } from 'lucide-react-native';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Palette } from '@/design/tokens';

export default function NotificationsScreen() {
  return (
    <PlaceholderScreen
      icon={<Bell color={Palette.neonMagenta} size={28} />}
      title="NOTIFICATIONS"
      subtitle="Alerts and updates"
      tone="magenta"
      badge="COMING SOON"
    />
  );
}
