import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GameMode, NantaHalf } from '@/src/types';
import { GAME_MODE_CONFIG, NANTA_HALF_LABEL } from '@/src/constants/court';
import { typography } from '@/src/theme';

interface GameModeBadgeProps {
  mode: GameMode;
  nantaHalf?: NantaHalf;
  compact?: boolean;
}

export function GameModeBadge({ mode, nantaHalf, compact = false }: GameModeBadgeProps) {
  const config = GAME_MODE_CONFIG[mode];

  return (
    <View style={[styles.wrap, { backgroundColor: config.badgeBg }, compact && styles.wrapCompact]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }, compact && styles.labelCompact]}>
        {config.shortLabel}
      </Text>
      {mode === 'nanta' && nantaHalf && (
        <Text style={[styles.half, { color: config.color }, compact && styles.halfCompact]}>
          {compact ? '½' : NANTA_HALF_LABEL[nantaHalf]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wrapCompact: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    ...typography.small,
    fontWeight: '800',
    fontSize: 11,
  },
  labelCompact: {
    fontSize: 10,
  },
  half: {
    ...typography.small,
    fontWeight: '700',
    fontSize: 10,
    opacity: 0.9,
  },
  halfCompact: {
    fontSize: 11,
    fontWeight: '900',
  },
});
