import React, { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/src/theme';

const AnimatedView = Animated.createAnimatedComponent(View);

export function WaveBlobBackground() {
  const { width } = useWindowDimensions();
  const drift = useSharedValue(0);
  const breathe = useSharedValue(1);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    breathe.value = withRepeat(
      withTiming(1.04, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [breathe, drift]);

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -11 + drift.value * 22 }],
  }));

  const blobStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
    opacity: 0.14,
  }));

  return (
    <View style={styles.wrap}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} />
            <Stop offset="0.55" stopColor="#FFFFFE" />
            <Stop offset="1" stopColor={colors.wave3} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#sky)" />
      </Svg>

      <AnimatedView style={[styles.blob, blobStyle]}>
        <Svg width={180} height={180} viewBox="0 0 220 220">
          <Path
            d="M 112 6 C 158 2 208 36 214 80 C 220 124 198 172 162 192 C 126 212 76 216 44 194 C 12 172 -4 128 6 88 C 16 48 52 14 88 8 C 96 6 104 6 112 6 Z"
            fill={colors.primary}
          />
        </Svg>
      </AnimatedView>

      <AnimatedView style={[styles.waveLayer, waveStyle]}>
        <Svg width={width * 1.4} height={160} viewBox="0 0 264 132" preserveAspectRatio="none">
          <Path
            d="M0,44 C20,36 46,20 78,27 C110,34 130,50 158,52 C183,54 210,43 242,37 L264,37 L264,132 L0,132 Z"
            fill={colors.wave1}
          />
          <Path
            d="M0,63 C30,55 60,67 90,63 C120,59 144,47 180,52 C208,56 236,49 264,56 L264,132 L0,132 Z"
            fill={colors.wave2}
          />
          <Rect y={79} width={264} height={53} fill={colors.wave3} />
        </Svg>
      </AnimatedView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, overflow: 'hidden', pointerEvents: 'none' as const },
  blob: {
    position: 'absolute',
    top: '8%',
    right: '-12%',
  },
  waveLayer: {
    position: 'absolute',
    left: '-10%',
    right: 0,
    bottom: 0,
    height: 160,
  },
});
