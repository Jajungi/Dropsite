import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import type { Court } from '@/src/types';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface LiveScoreTickerProps {
  courts: Court[];
  selectedCourtId: number | null;
  onSelect: (court: Court) => void;
}

export function LiveScoreTicker({ courts, selectedCourtId, onSelect }: LiveScoreTickerProps) {
  const liveCourts = courts.filter((c) => c.status !== 'empty');

  if (liveCourts.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>진행 중인 경기가 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {liveCourts.map((court) => {
          const selected = selectedCourtId === court.id;
          const isLive = court.status === 'playing';
          const names = court.players.map((p) => p.name).join(' · ') || '—';

          return (
            <Pressable
              key={court.id}
              onPress={() => onSelect(court)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              {isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
              <Text style={styles.courtNum}>COURT {court.id}</Text>
              <Text style={styles.score}>
                {court.gamesCompleted}
                <Text style={styles.scoreSep}> / </Text>
                {court.maxGames || '—'}
              </Text>
              <Text style={styles.names} numberOfLines={1}>
                {names}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Platform.select({
      web: { position: 'sticky' as const, top: 0, zIndex: 100 },
    }),
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  emptyWrap: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emptyText: { ...typography.caption, color: colors.textMuted },
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 148,
    gap: 4,
    marginRight: spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  cardSelected: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.neon,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neon,
  },
  liveText: {
    ...typography.label,
    color: colors.neon,
    fontSize: 9,
  },
  courtNum: { ...typography.label, color: colors.textMuted, fontSize: 9 },
  score: { ...typography.scoreSm, color: colors.text },
  scoreSep: { ...typography.caption, color: colors.textMuted },
  names: { ...typography.small, color: colors.textSecondary, maxWidth: 130 },
});
