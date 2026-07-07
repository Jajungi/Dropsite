import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import type { GameMode, NantaHalf } from '@/src/types';
import { GAME_MODE_CONFIG, GAME_MODES, NANTA_HALF_LABEL } from '@/src/constants/court';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface GameModePickerProps {
  value: GameMode;
  nantaHalf: NantaHalf;
  onChange: (mode: GameMode) => void;
  onNantaHalfChange: (half: NantaHalf) => void;
  /** 선택 불가 모드 */
  disabledModes?: GameMode[];
}

export function GameModePicker({
  value,
  nantaHalf,
  onChange,
  onNantaHalfChange,
  disabledModes = [],
}: GameModePickerProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.modeRow}>
        {GAME_MODES.map((mode) => {
          const config = GAME_MODE_CONFIG[mode];
          const active = value === mode;
          const disabled = disabledModes.includes(mode);
          return (
            <Pressable
              key={mode}
              onPress={() => !disabled && onChange(mode)}
              disabled={disabled}
              style={[
                styles.modeBtn,
                active && { backgroundColor: config.badgeBg, borderColor: config.color },
                disabled && styles.modeBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.modeDot, { backgroundColor: config.color }]} />
              <Text style={[styles.modeLabel, active && { color: config.color, fontWeight: '700' }]}>
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value === 'nanta' && (
        <View style={styles.halfBlock}>
          <Text style={styles.halfTitle}>사용 반코트</Text>
          <View style={styles.halfRow}>
            {(['near', 'far'] as NantaHalf[]).map((half) => {
              const active = nantaHalf === half;
              return (
                <Pressable
                  key={half}
                  onPress={() => onNantaHalfChange(half)}
                  style={[styles.halfBtn, active && styles.halfBtnActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.halfLabel, active && styles.halfLabelActive]}>
                    {NANTA_HALF_LABEL[half]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.halfHint}>난타는 무대·입구 방향으로 나뉜 반코트 한쪽만 사용해요</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  modeBtn: {
    flex: 1,
    minWidth: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  modeBtnDisabled: { opacity: 0.35 },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  halfBlock: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: GAME_MODE_CONFIG.nanta.badgeBg,
  },
  halfTitle: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
  },
  halfRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  halfBtnActive: {
    borderColor: GAME_MODE_CONFIG.nanta.color,
    backgroundColor: GAME_MODE_CONFIG.nanta.badgeBg,
  },
  halfLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  halfLabelActive: {
    color: GAME_MODE_CONFIG.nanta.color,
    fontWeight: '800',
  },
  halfHint: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
});
