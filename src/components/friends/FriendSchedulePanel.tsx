import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { User } from '@/src/types';
import { Avatar } from '@/src/components/ui/Avatar';
import { getEffectiveSchedule } from '@/src/utils/dateFormat';
import { colors, borderRadius, spacing, typography, shadows } from '@/src/theme';

interface FriendSchedulePanelProps {
  friends: User[];
  activityStart: string;
  activityEnd: string;
}

function timeToPercent(
  start: string,
  end: string | undefined,
  activityStart: string,
  activityEnd: string
): { left: number; width: number } {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const startMin = toMin(activityStart);
  const endMin = toMin(activityEnd);
  const total = endMin - startMin;
  const userStart = toMin(start);
  const userEnd = end ? toMin(end) : userStart + 90;
  const left = ((userStart - startMin) / total) * 100;
  const width = Math.max(8, ((userEnd - userStart) / total) * 100);
  return {
    left: Math.max(0, Math.min(left, 100 - 4)),
    width: Math.min(width, 100 - left),
  };
}

export function FriendSchedulePanel({
  friends,
  activityStart,
  activityEnd,
}: FriendSchedulePanelProps) {
  const sorted = [...friends].sort((a, b) => {
    const aStart = getEffectiveSchedule(a).start;
    const bStart = getEffectiveSchedule(b).start;
    if (!aStart) return 1;
    if (!bStart) return -1;
    return aStart.localeCompare(bStart);
  });

  if (sorted.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>즐겨찾기한 친구가 없어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.timeLabels}>
          <Text style={styles.timeLabel}>{activityStart}</Text>
          <Text style={styles.timeLabel}>{activityEnd}</Text>
        </View>

        {sorted.map((friend) => {
          const sched = getEffectiveSchedule(friend);
          const schedule = sched.start
            ? timeToPercent(sched.start, sched.end, activityStart, activityEnd)
            : null;

          return (
            <View key={friend.id} style={styles.friendRow}>
              <View style={styles.friendInfo}>
                <Avatar
                  name={friend.name}
                  color={friend.avatarColor}
                  size={32}
                  showOnline={friend.isAtGym}
                />
                <View style={styles.nameCol}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  {sched.start ? (
                    <Text style={styles.arrivalTime}>{sched.start}</Text>
                  ) : (
                    <Text style={styles.noTime}>—</Text>
                  )}
                </View>
              </View>
              <View style={styles.barTrack}>
                {schedule && (
                  <View
                    style={[
                      styles.bar,
                      {
                        left: `${schedule.left}%`,
                        width: `${schedule.width}%`,
                        backgroundColor: friend.isAtGym ? colors.primary : colors.accent,
                        opacity: friend.isAtGym ? 1 : 0.65,
                      },
                    ]}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.hint}>굵은 막대 = 오늘 체육관에 머무는 시간</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadows.sm,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 108,
  },
  nameCol: {
    flex: 1,
    gap: 1,
  },
  friendName: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  arrivalTime: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  noTime: {
    ...typography.small,
    color: colors.textMuted,
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: colors.divider,
    borderRadius: 7,
    overflow: 'hidden',
    position: 'relative',
  },
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 7,
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
});
