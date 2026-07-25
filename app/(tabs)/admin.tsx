import { ShieldAlert } from 'lucide-react-native';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { RequireRole } from '@/lib/rbac';
import { Palette } from '@/design/tokens';

export default function AdminScreen() {
  return (
    <RequireRole role="admin" fallback="/(tabs)">
      <PlaceholderScreen
        icon={<ShieldAlert color={Palette.neonRose} size={28} />}
        title="ADMIN"
        subtitle="Gateway control panel"
        tone="amber"
        badge="ADMIN ONLY"
      />
    </RequireRole>
  );
}
