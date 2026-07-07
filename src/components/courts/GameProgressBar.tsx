import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/src/theme';

interface GameProgressBarProps {
  completed: number;
  max: number;
  isPlaying?: boolean;
}

export function GameProgressBar({ completed, max, isPlaying }: GameProgressBarProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progress = max > 0 ? completed / max : 0;

  useEffect(() => {
    if (!isPlaying) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isPlaying, pulseAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: `${progress * 100}%`,
              backgroundColor: isPlaying ? colors.courtPlaying : colors.courtFinished,
              opacity: isPlaying ? pulseAnim : 1,
            },
          ]}
        />
      </View>
      <View style={styles.dots}>
        {Array.from({ length: max }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < completed && { backgroundColor: colors.accent },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  track: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
  dots: { flexDirection: 'row', gap: 3, justifyContent: 'center' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
});
