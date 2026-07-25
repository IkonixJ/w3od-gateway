import { Megaphone } from 'lucide-react-native';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Palette } from '@/design/tokens';

export default function CampaignsScreen() {
  return (
    <PlaceholderScreen
      icon={<Megaphone color={Palette.neonLime} size={28} />}
      title="CAMPAIGNS"
      subtitle="Active reward campaigns"
      tone="lime"
      badge="COMING SOON"
    />
  );
}
