import { CalendarDays } from 'lucide-react-native';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Palette } from '@/design/tokens';

export default function EventsScreen() {
  return (
    <PlaceholderScreen
      icon={<CalendarDays color={Palette.neonAmber} size={28} />}
      title="EVENTS"
      subtitle="Community events and meetups"
      tone="amber"
      badge="COMING SOON"
    />
  );
}
