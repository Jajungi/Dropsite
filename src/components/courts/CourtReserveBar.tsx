import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import type { Court } from '@/src/types';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface CourtReserveBarProps {
  courts: Court[];
  filter: 'all' | 'empty' | 'mine';
  onFilterChange: (f: 'all' | 'empty' | 'mine') => void;
  myUserId?: string;
}

export function CourtReserveBar({ courts, filter, onFilterChange, myUserId }: CourtReserveBarProps) {
  const emptyCount = courts.filter((c) => c.status === 'empty').length;
  const reservedCount = courts.filter((c) => c.status === 'reserved').length;
  const myReserved = courts.filter(
    (c) => c.reservedBy === myUserId || c.players.some((p) => p.userId === myUserId)
  ).length;

  const chips: { key: 'all' | 'empty' | 'mine'; label: string; count?: number }[] = [
    { key: 'all', label: '전체', count: courts.length },
    { key: 'empty', label: '예약 가능', count: emptyCount },
    { key: 'mine', label: '내 예약', count: myReserved },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>코트 예약</Text>
        <Text style={styles.summarySub}>
          예약 가능 <Text style={styles.highlight}>{emptyCount}</Text>코트
          {reservedCount > 0 && ` · 대기 ${reservedCount}코트`}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((chip) => {
          const active = filter === chip.key;
          return (
            <Pressable
              key={chip.key}
              onPress={() => onFilterChange(chip.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
              {chip.count !== undefined && (
                <Text style={[styles.chipCount, active && styles.chipTextActive]}>{chip.count}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  summary: { gap: 2 },
  summaryTitle: { ...typography.h2, color: colors.text, fontSize: 18 },
  summarySub: { ...typography.caption, color: colors.textMuted },
  highlight: { color: colors.primary, fontFamily: typography.bodyBold.fontFamily },
  chips: { gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: { ...typography.bodyBold, color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: colors.primary },
  chipCount: { ...typography.small, color: colors.textMuted },
});
