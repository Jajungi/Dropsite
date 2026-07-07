import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildSlotMarks,
  rangeToSelectedIndices,
  selectedIndicesToTimes,
  formatSelectionSummary,
} from '@/src/utils/timeSlots';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

export interface TimeRangeSliderProps {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  stepMinutes?: number;
  /** HH:MM */
  selectedStart?: string;
  /** HH:MM */
  selectedEnd?: string;
  onChange: (start: string, end: string) => void;
  dateLabel?: string;
  showDateRow?: boolean;
}

export function TimeRangeSlider({
  startHour,
  startMinute,
  endHour,
  endMinute,
  stepMinutes = 30,
  selectedStart,
  selectedEnd,
  onChange,
  dateLabel,
  showDateRow = true,
}: TimeRangeSliderProps) {
  const marks = useMemo(
    () => buildSlotMarks(startHour, startMinute, endHour, endMinute, stepMinutes),
    [startHour, startMinute, endHour, endMinute, stepMinutes]
  );
  const segmentCount = Math.max(0, marks.length - 1);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() =>
    rangeToSelectedIndices(marks, selectedStart, selectedEnd)
  );
  const [timeExpanded, setTimeExpanded] = useState(true);

  useEffect(() => {
    setSelectedIndices(rangeToSelectedIndices(marks, selectedStart, selectedEnd));
  }, [marks, selectedStart, selectedEnd]);

  const applySelection = useCallback(
    (next: Set<number>) => {
      setSelectedIndices(next);
      const times = selectedIndicesToTimes(marks, next);
      onChange(times?.start ?? '', times?.end ?? '');
    },
    [marks, onChange]
  );

  const handleSegmentPress = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    applySelection(next);
  };

  const isSelected = (index: number) => selectedIndices.has(index);

  const rangeSummary = formatSelectionSummary(marks, selectedIndices);

  return (
    <View style={styles.wrap}>
      {showDateRow && dateLabel ? (
        <View style={styles.dateCard}>
          <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.dateText}>{dateLabel}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </View>
      ) : null}

      <View style={styles.timeCard}>
        <Pressable
          style={styles.timeHeader}
          onPress={() => setTimeExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: timeExpanded }}
        >
          <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.timeHeaderText}>시간 선택</Text>
          <Ionicons
            name={timeExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </Pressable>

        {timeExpanded ? (
          <View style={styles.sliderBody}>
            <View style={styles.labelsRow}>
              {marks.slice(0, -1).map((mark) => (
                <View key={`label-${mark}`} style={styles.labelCell}>
                  <Text style={styles.timeLabel}>{mark}</Text>
                </View>
              ))}
              <Text style={styles.timeLabelEnd}>{marks[marks.length - 1]}</Text>
            </View>

            <View style={styles.trackRow}>
              {Array.from({ length: segmentCount }, (_, index) => (
                <Pressable
                  key={`seg-${index}`}
                  onPress={() => handleSegmentPress(index)}
                  style={[
                    styles.segment,
                    index === 0 && styles.segmentFirst,
                    index === segmentCount - 1 && styles.segmentLast,
                    isSelected(index) ? styles.segmentSelected : styles.segmentIdle,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${marks[index]}부터 ${marks[index + 1]}까지`}
                  accessibilityState={{ selected: isSelected(index) }}
                />
              ))}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.segmentSelected]} />
                <Text style={styles.legendText}>선택</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.segmentIdle]} />
                <Text style={styles.legendText}>미선택</Text>
              </View>
            </View>

            {rangeSummary ? (
              <Text style={styles.rangeSummary}>{rangeSummary}</Text>
            ) : (
              <Text style={styles.rangeHint}>칸을 탭해서 선택·해제하세요</Text>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    ...typography.bodyBold,
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  timeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  timeHeaderText: {
    ...typography.bodyBold,
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  sliderBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
    minHeight: 18,
    marginBottom: 2,
  },
  labelCell: {
    flex: 1,
    alignItems: 'flex-start',
  },
  timeLabelEnd: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  trackRow: {
    flexDirection: 'row',
    height: 36,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.5)',
  },
  segmentFirst: {
    borderTopLeftRadius: borderRadius.sm,
    borderBottomLeftRadius: borderRadius.sm,
  },
  segmentLast: {
    borderRightWidth: 0,
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
  },
  segmentSelected: {
    backgroundColor: '#C4B5FD',
  },
  segmentIdle: {
    backgroundColor: '#E8EAEF',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  rangeSummary: {
    ...typography.bodyBold,
    textAlign: 'center',
    color: colors.primary,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  rangeHint: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
