import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '@/src/theme';

interface HamburgerIconProps {
  active: boolean;
  size?: number;
}

export function HamburgerIcon({ active, size = 26 }: HamburgerIconProps) {
  const barW = size;
  const barH = 2;
  const gap = 5;
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 130 });
  }, [active, progress]);

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-(gap + barH), 0]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  const midStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
    transform: [{ scaleX: interpolate(progress.value, [0, 1], [1, 0.3]) }],
  }));

  const botStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [gap + barH, 0]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, -45])}deg` },
    ],
  }));

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View
        style={[styles.bar, { width: barW, height: barH, borderRadius: barH }, topStyle]}
      />
      <Animated.View
        style={[styles.bar, { width: barW, height: barH, borderRadius: barH }, midStyle]}
      />
      <Animated.View
        style={[styles.bar, { width: barW, height: barH, borderRadius: barH }, botStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    backgroundColor: colors.text,
  },
});
