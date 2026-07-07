import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import type { Court } from '@/src/types';
import { COURT_FLOOR_COLORS } from '@/src/constants/court';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface CourtScheduleListProps {
  courts: Court[];
  selectedCourtId: number | null;
  onSelect: (court: Court) => void;
}

const STATUS: Record<Court['status'], string> = {
  empty: '대기',
  reserved: '예약',
  playing: '경기',
  just_finished: '종료',
};

export function CourtScheduleList({ courts, selectedCourtId, onSelect }: CourtScheduleListProps) {
  const sorted = [...courts].sort((a, b) => {
    const order = { playing: 0, reserved: 1, just_finished: 2, empty: 3 };
    return order[a.status] - order[b.status] || a.id - b.id;
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>코트 일정</Text>
      {sorted.map((court) => {
        const selected = selectedCourtId === court.id;
        const isLive = court.status === 'playing';
        return (
          <Pressable
            key={court.id}
            onPress={() => onSelect(court)}
            style={[styles.row, selected && styles.rowSelected]}
          >
            {selected && <View style={styles.accentBar} />}
            <View style={[styles.swatch, { backgroundColor: COURT_FLOOR_COLORS[court.status] }]} />
            <View style={styles.info}>
              <View style={styles.topLine}>
                <Text style={styles.courtId}>{court.id}번</Text>
                {isLive && (
                  <View style={styles.livePill}>
                    <Text style={styles.livePillText}>LIVE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.meta}>
                {STATUS[court.status]}
                {court.maxGames > 0 && ` · ${court.gamesCompleted}/${court.maxGames}G`}
                {court.players.length > 0 && ` · ${court.players.length}명`}
              </Text>
            </View>
            {court.maxGames > 0 && court.status !== 'empty' && (
              <Text style={styles.score}>
                {court.gamesCompleted}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  heading: { ...typography.label, color: colors.textMuted, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  rowSelected: { backgroundColor: colors.surfaceAlt },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.neon,
  },
  swatch: { width: 4, height: 32, borderRadius: 2 },
  info: { flex: 1, gap: 2 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  courtId: { ...typography.bodyBold, color: colors.text },
  livePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  livePillText: { ...typography.label, color: colors.neon, fontSize: 8 },
  meta: { ...typography.small, color: colors.textMuted },
  score: { ...typography.scoreSm, color: colors.text, fontSize: 28 },
});
