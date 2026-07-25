import { Wallet as WalletIcon } from 'lucide-react-native';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { Palette } from '@/design/tokens';

export default function WalletScreen() {
  return (
    <PlaceholderScreen
      icon={<WalletIcon color={Palette.neonLime} size={28} />}
      title="WALLET"
      subtitle="Balance, transfers, and history"
      tone="lime"
      badge="COMING SOON"
    />
  );
}
