import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { useAppStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceCard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const attendanceRecords = useAuthStore((s) => s.attendanceRecords);
  const checkIn = useAuthStore((s) => s.checkIn);
  const isAtGym = useAppStore((s) => s.isAtGym);
  const checkGeoFence = useAppStore((s) => s.checkGeoFence);
  const showToast = useNotificationStore((s) => s.showToast);

  if (!currentUser) return null;

  const today = todayKey();
  const todayRecord = attendanceRecords.find(
    (r) => r.userId === currentUser.id && r.date === today
  );

  const handleCheckIn = () => {
    if (!checkGeoFence()) {
      showToast({
        type: 'warning',
        title: '',
        message: 'S1 체육관 근처에서만 출석할 수 있어요.',
      });
      return;
    }
    const result = checkIn(currentUser.id);
    showToast({
      type: result.success ? 'success' : 'info',
      title: '',
      message: result.message,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>출석</Text>
        <View style={[styles.locDot, isAtGym && styles.locDotOn]} />
      </View>
      <Text style={styles.desc}>
        {isAtGym
          ? 'S1 체육관 근처입니다. 출석할 수 있어요.'
          : 'S1 체육관 근처로 이동하면 출석할 수 있어요.'}
      </Text>
      {todayRecord ? (
        <View style={styles.doneBox}>
          <Text style={styles.doneText}>✓ 오늘 출석 완료</Text>
          <Text style={styles.doneTime}>
            {new Date(todayRecord.checkedInAt).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      ) : (
        <Button
          title="출석하기"
          onPress={handleCheckIn}
          disabled={!isAtGym}
          fullWidth
          variant="primary"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  locDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
  },
  locDotOn: { backgroundColor: colors.success },
  desc: { ...typography.caption, color: colors.textSecondary },
  doneBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  doneText: { ...typography.bodyBold, color: colors.primary },
  doneTime: { ...typography.small, color: colors.textSecondary },
});
