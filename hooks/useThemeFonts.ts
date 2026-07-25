import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  Orbitron_400Regular,
  Orbitron_500Medium,
  Orbitron_700Bold,
} from '@expo-google-fonts/orbitron';
import {
  Rajdhani_400Regular,
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from '@expo-google-fonts/rajdhani';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

let splashHidden = false;

export function useThemeFonts(): { fontsLoaded: boolean; fontError: Error | null } {
  const [fontsLoaded, fontError] = useFonts({
    'Orbitron-Regular': Orbitron_400Regular,
    'Orbitron-Medium': Orbitron_500Medium,
    'Orbitron-Bold': Orbitron_700Bold,
    'Rajdhani-Regular': Rajdhani_400Regular,
    'Rajdhani-Medium': Rajdhani_500Medium,
    'Rajdhani-SemiBold': Rajdhani_600SemiBold,
    'Rajdhani-Bold': Rajdhani_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !splashHidden) {
      splashHidden = true;
      setReady(true);
    }
  }, [fontsLoaded, fontError]);

  return { fontsLoaded: ready, fontError: fontError ?? null };
}
