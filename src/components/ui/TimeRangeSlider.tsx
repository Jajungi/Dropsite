import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
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
  // 칸이 많으면 라벨을 한 칸 걸러(또는 더 넓게) 표시해 겹침 방지
  const labelStep = segmentCount > 10 ? 3 : segmentCount > 6 ? 2 : 1;

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

  // 드래그 페인트 선택: 첫 칸 상태로 모드 고정 (선택칸에서 시작→해제, 미선택칸에서 시작→선택)
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const paintModeRef = useRef<null | 'add' | 'remove'>(null);
  const workingSetRef = useRef<Set<number>>(new Set());
  const startLocationXRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const startIndexRef = useRef(-1);
  const DRAG_THRESHOLD = 10;

  const handleTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  const indexFromLocationX = useCallback(
    (locationX: number) => {
      const width = trackWidthRef.current;
      if (width <= 0 || segmentCount <= 0) return -1;
      // 경계 오차로 옆 칸이 잡히지 않도록 중앙 기준으로 스냅
      const clamped = Math.max(0, Math.min(width - 0.001, locationX));
      const idx = Math.floor((clamped / width) * segmentCount);
      return Math.max(0, Math.min(segmentCount - 1, idx));
    },
    [segmentCount]
  );

  const paintAt = useCallback(
    (index: number) => {
      if (index < 0) return;
      const set = workingSetRef.current;
      const mode = paintModeRef.current;
      if (mode === 'add') {
        if (set.has(index)) return;
        set.add(index);
      } else if (mode === 'remove') {
        if (!set.has(index)) return;
        set.delete(index);
      } else {
        return;
      }
      applySelection(new Set(set));
    },
    [applySelection]
  );

  const handleGrant = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX } = e.nativeEvent;
      const index = indexFromLocationX(locationX);
      if (index < 0) return;
      startLocationXRef.current = locationX;
      startIndexRef.current = index;
      hasDraggedRef.current = false;
      workingSetRef.current = new Set(selectedIndices);
      paintModeRef.current = selectedIndices.has(index) ? 'remove' : 'add';
      paintAt(index);
    },
    [indexFromLocationX, paintAt, selectedIndices]
  );

  const handleMove = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX } = e.nativeEvent;
      if (!hasDraggedRef.current) {
        if (Math.abs(locationX - startLocationXRef.current) < DRAG_THRESHOLD) return;
        hasDraggedRef.current = true;
      }
      paintAt(indexFromLocationX(locationX));
    },
    [indexFromLocationX, paintAt]
  );

  const handleRelease = useCallback(() => {
    paintModeRef.current = null;
    hasDraggedRef.current = false;
    startIndexRef.current = -1;
  }, []);

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
              {marks.slice(0, -1).map((mark, index) => {
                // 라벨이 겹치지 않도록 칸이 많으면 한 칸 걸러 표시하고,
                // 우측 끝(별도 표시되는 종료 라벨) 근처 구간은 생략해 겹침 방지
                const showLabel = index % labelStep === 0 && index / segmentCount < 0.85;
                return (
                  <View key={`label-${mark}`} style={styles.labelCell}>
                    {showLabel ? (
                      <Text style={styles.timeLabel} numberOfLines={1}>
                        {mark}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
              <Text style={styles.timeLabelEnd} numberOfLines={1}>
                {marks[marks.length - 1]}
              </Text>
            </View>

            <View
              ref={trackRef}
              style={styles.trackRow}
              onLayout={handleTrackLayout}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={handleGrant}
              onResponderMove={handleMove}
              onResponderRelease={handleRelease}
              onResponderTerminate={handleRelease}
            >
              {Array.from({ length: segmentCount }, (_, index) => (
                <View
                  key={`seg-${index}`}
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
              <Text style={styles.rangeHint}>칸을 탭하거나, 누른 채 좌우로 드래그해 선택·해제하세요</Text>
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
    fontSize: 10,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
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
