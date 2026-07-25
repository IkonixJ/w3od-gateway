import { MessageSquare } from 'lucide-react-native';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Palette } from '@/design/tokens';

export default function MessagingScreen() {
  return (
    <PlaceholderScreen
      icon={<MessageSquare color={Palette.neonMagenta} size={28} />}
      title="MESSAGING"
      subtitle="Community channels and DMs"
      tone="magenta"
      badge="COMING SOON"
    />
  );
}
