import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { GAME_COUNT_OPTIONS } from '@/src/constants/court';
import { colors, borderRadius, typography, spacing } from '@/src/theme';

interface GameCountPickerProps {
  value: number;
  onChange: (count: number) => void;
}

export function GameCountPicker({ value, onChange }: GameCountPickerProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>게임 수</Text>
      <View style={styles.row}>
        {GAME_COUNT_OPTIONS.map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.chipPressed,
                Platform.OS === 'web' && { cursor: 'pointer' as const },
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{n}G</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.sm, fontSize: 14 },
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
  },
  chipSelected: { backgroundColor: colors.navActive },
  chipPressed: { opacity: 0.9 },
  chipText: { ...typography.button, color: colors.textSecondary, fontSize: 13 },
  chipTextSelected: { color: colors.textLight },
});
