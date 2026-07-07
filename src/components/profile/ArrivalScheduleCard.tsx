import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Button } from '@/src/components/ui/Button';
import { formatTodayLabel, getTodayKey, isScheduleForToday } from '@/src/utils/dateFormat';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

export function ArrivalScheduleCard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const updateUserSchedule = useAuthStore((s) => s.updateUserSchedule);
  const showToast = useNotificationStore((s) => s.showToast);

  const todayKey = useMemo(() => getTodayKey(), []);
  const todayLabel = useMemo(() => formatTodayLabel(), []);

  const savedForToday =
    currentUser &&
    isScheduleForToday(currentUser.scheduleDate, todayKey) &&
    currentUser.scheduledStart;

  const [arrivalTime, setArrivalTime] = useState(savedForToday ? currentUser!.scheduledStart! : '');
  const [endTime, setEndTime] = useState(
    savedForToday && currentUser?.scheduledEnd ? currentUser.scheduledEnd : ''
  );

  useEffect(() => {
    if (!currentUser) return;
    const valid = isScheduleForToday(currentUser.scheduleDate, todayKey) && currentUser.scheduledStart;
    setArrivalTime(valid ? currentUser.scheduledStart! : '');
    setEndTime(valid && currentUser.scheduledEnd ? currentUser.scheduledEnd : '');
  }, [currentUser?.id, currentUser?.scheduleDate, currentUser?.scheduledStart, currentUser?.scheduledEnd, todayKey]);

  if (!currentUser) return null;

  const handleSave = () => {
    const result = updateUserSchedule(currentUser.id, arrivalTime, endTime || undefined);
    showToast({
      type: result.success ? 'success' : 'warning',
      title: '',
      message: result.message,
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>오늘</Text>
        <Text style={styles.dateValue}>{todayLabel}</Text>
      </View>

      <Text style={styles.fieldLabel}>도착 예정 시각</Text>
      <TextInput
        style={styles.input}
        value={arrivalTime}
        onChangeText={setArrivalTime}
        placeholder="예: 18:30"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />

      <Text style={styles.fieldLabel}>퇴장 예정 (선택)</Text>
      <TextInput
        style={styles.input}
        value={endTime}
        onChangeText={setEndTime}
        placeholder="예: 21:00"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />

      <Text style={styles.hint}>친구 · 일정 탭에 오늘 도착 시간으로 표시됩니다.</Text>

      <Button title="오늘 일정 저장" variant="outline" fullWidth onPress={handleSave} style={styles.saveBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  dateValue: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 16,
  },
  fieldLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  saveBtn: { marginTop: spacing.sm },
});
