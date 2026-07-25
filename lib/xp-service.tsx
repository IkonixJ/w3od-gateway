import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

// Animated counting hook — smoothly transitions a displayed number from
// its old value to its new value using React state updates.
export function useAnimatedCount(target: number, duration = 800) {
  const [displayValue, setDisplayValue] = useState(target);
  const shared = useSharedValue(target);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      shared.value = target;
      setDisplayValue(target);
      return;
    }
    shared.value = withTiming(
      target,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setDisplayValue)(target);
        }
      }
    );
    // Also set up a frame-based update for smooth counting
    const interval = setInterval(() => {
      const current = shared.value;
      setDisplayValue(Math.round(current));
      if (Math.abs(current - target) < 1) {
        setDisplayValue(target);
        clearInterval(interval);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration, shared]);

  return { displayValue, shared };
}

// AnimatedText component that renders a number that counts up/down smoothly.
export function AnimatedCountText({
  target,
  style,
  duration,
}: {
  target: number;
  style?: object;
  duration?: number;
}) {
  const { displayValue } = useAnimatedCount(target, duration);
  return <Text style={style}>{String(displayValue)}</Text>;
}

// Helper to trigger a callback when XP increases.
export function useXpGainNotification(currentXp: number, onGain?: (delta: number) => void) {
  const prevXp = useRef(currentXp);

  useEffect(() => {
    if (currentXp > prevXp.current) {
      const delta = currentXp - prevXp.current;
      onGain?.(delta);
    }
    prevXp.current = currentXp;
  }, [currentXp, onGain]);
}
