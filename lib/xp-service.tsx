import { useEffect, useRef } from 'react';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedProps,
} from 'react-native-reanimated';

// Animated counting hook — smoothly transitions a displayed number from
// its old value to its new value using Reanimated shared values (no 60fps re-renders).
export function useAnimatedCount(target: number, duration = 800) {
  const shared = useSharedValue(target);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      shared.value = target;
      return;
    }
    shared.value = withTiming(target, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [target, duration, shared]);

  return { shared };
}

// AnimatedText component that renders a number that counts up/down smoothly.
// Uses Reanimated's useAnimatedProps to update the text prop on the native
// thread without React re-renders.
export function AnimatedCountText({
  target,
  style,
  duration,
}: {
  target: number;
  style?: object;
  duration?: number;
}) {
  const { shared } = useAnimatedCount(target, duration);
  const animatedProps = useAnimatedProps(() => {
    'worklet';
    return { text: String(Math.round(shared.value)) } as any;
  });
  return (
    <Animated.Text style={style} animatedProps={animatedProps}>
      {String(target)}
    </Animated.Text>
  );
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
