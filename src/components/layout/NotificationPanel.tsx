import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useLessonStore } from '@/src/stores/lessonStore';
import { useCourtStore } from '@/src/stores/courtStore';
import { useAuthStore } from '@/src/stores/authStore';
import type { AppNotification } from '@/src/types';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

const TYPE_ICON: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  join: 'people',
  coach: 'school',
  system: 'information-circle',
  friend: 'heart',
};

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const inboxAll = useNotificationStore((s) => s.inbox);
  const markRead = useNotificationStore((s) => s.markNotificationRead);
  const markAllRead = useNotificationStore((s) => s.markAllNotificationsRead);
  const courts = useCourtStore((s) => s.courts);
  const currentUser = useAuthStore((s) => s.currentUser);
  const lessonQueue = useLessonStore((s) => s.lessonQueue);

  const inbox = useMemo(
    () =>
      inboxAll.filter(
        (n) => !n.targetUserId || (currentUser && n.targetUserId === currentUser.id)
      ),
    [inboxAll, currentUser]
  );

  const liveJoin = useMemo(() => {
    if (!currentUser) return [];
    const items: AppNotification[] = [];
    courts.forEach((court) => {
      const isHost =
        court.reservedBy === currentUser.id ||
        court.players[0]?.userId === currentUser.id;
      if (!isHost) return;
      court.joinRequests.forEach((req) => {
        items.push({
          id: `join-live-${req.id}`,
          type: 'join',
          title: '참가 요청',
          message: `${req.userName}님이 ${court.id}번 코트 합류를 요청했어요`,
          read: false,
          createdAt: req.requestedAt ?? new Date().toISOString(),
          courtId: court.id,
        });
      });
    });
    return items;
  }, [courts, currentUser]);

  const coachAlerts = useMemo(() => {
    if (!currentUser) return [];
    return lessonQueue
      .filter((e) => e.userId === currentUser.id && (e.status === 'next' || e.status === 'active'))
      .map((e) => ({
        id: `coach-${e.id}`,
        type: 'coach' as const,
        title: e.status === 'active' ? '코칭 진행 중' : '코칭 곧 시작',
        message:
          e.status === 'active'
            ? '코치 코트로 이동해 주세요.'
            : '다음 레슨 차례입니다. 준비해 주세요.',
        read: false,
        createdAt: new Date().toISOString(),
      }));
  }, [currentUser, lessonQueue]);

  const all = [...liveJoin, ...coachAlerts, ...inbox].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>알림</Text>
        <View style={styles.headerActions}>
          {all.some((n) => !n.read) && (
            <Pressable onPress={() => markAllRead(currentUser?.id)} hitSlop={8}>
              <Text style={styles.markAll}>모두 읽음</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {all.length === 0 ? (
          <Text style={styles.empty}>새 알림이 없어요</Text>
        ) : (
          all.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => markRead(item.id)}
              style={[styles.row, !item.read && styles.rowUnread]}
            >
              <View style={[styles.iconWrap, styles[`icon_${item.type}`]]}>
                <Ionicons name={TYPE_ICON[item.type]} size={18} color={colors.primary} />
              </View>
              <View style={styles.body}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMsg}>{item.message}</Text>
                <Text style={styles.rowTime}>{formatTime(item.createdAt)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    width: 320,
    maxHeight: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    zIndex: 200,
    overflow: 'hidden',
    ...shadows.md,
    ...Platform.select({
      web: { boxShadow: '0 10px 32px rgba(136,148,171,0.28)' } as object,
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markAll: { ...typography.small, color: colors.primary, fontWeight: '600' },
  list: { maxHeight: 340 },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  rowUnread: { backgroundColor: colors.surfaceAlt },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  icon_join: { backgroundColor: colors.primaryLight },
  icon_coach: { backgroundColor: '#E8F0FF' },
  icon_system: { backgroundColor: colors.surfaceAlt },
  icon_friend: { backgroundColor: colors.primaryLight },
  body: { flex: 1, gap: 2 },
  rowTitle: { ...typography.bodyBold, color: colors.text, fontSize: 14 },
  rowMsg: { ...typography.caption, color: colors.textSecondary },
  rowTime: { ...typography.small, color: colors.textMuted, marginTop: 2 },
});
