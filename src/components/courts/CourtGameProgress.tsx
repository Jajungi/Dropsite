import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getGameProgressRatio, getGameBarBottom } from '@/src/constants/court';
import type { Court } from '@/src/types';

interface CourtGameProgressProps {
  court: Court;
  courtWidth: number;
}

export function CourtGameProgress({ court, courtWidth }: CourtGameProgressProps) {
  if (court.status !== 'playing') return null;
  if (!court.maxGames) return null;

  const ratio = getGameProgressRatio(court.gamesCompleted, court.maxGames);
  const bottom = getGameBarBottom(court.isCoachCourt);
  const barH = Math.max(2, courtWidth * 0.018);

  return (
    <View style={[styles.track, { bottom, height: barH, borderRadius: barH / 2 }]} pointerEvents="none">
      <View
        style={[
          styles.fill,
          {
            width: `${Math.round(ratio * 100)}%`,
            backgroundColor: '#7CFFB2',
            borderRadius: barH / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.28)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
