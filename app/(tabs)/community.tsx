import { Users } from 'lucide-react-native';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Palette } from '@/design/tokens';

export default function CommunityScreen() {
  return (
    <PlaceholderScreen
      icon={<Users color={Palette.purpleGlow} size={28} />}
      title="COMMUNITY"
      subtitle="Members, campaigns, and messaging"
      tone="purple"
      badge="COMING SOON"
    />
  );
}
