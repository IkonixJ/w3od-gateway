import { GraduationCap } from 'lucide-react-native';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Palette } from '@/design/tokens';

export default function LearnScreen() {
  return (
    <PlaceholderScreen
      icon={<GraduationCap color={Palette.neonCyan} size={28} />}
      title="LEARN"
      subtitle="Web3 learning tracks and quests"
      tone="cyan"
      badge="COMING SOON"
    />
  );
}
