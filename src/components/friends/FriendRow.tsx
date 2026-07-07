import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router, type Href } from 'expo-router';
import type { User } from '@/src/types';
import { Avatar } from '@/src/components/ui/Avatar';
import { RANK_THRESHOLDS } from '@/src/constants';
import { formatArrivalLabel, formatScheduleRange } from '@/src/utils/friendsPresence';
import { FriendActionButton } from './FriendActionButton';
import { colors, spacing, typography } from '@/src/theme';

interface FriendRowProps {
  user: User;
  compact?: boolean;
}

export function FriendRow({ user, compact = false }: FriendRowProps) {
  const arrival = formatArrivalLabel(user);
  const range = formatScheduleRange(user);
  const rankLabel = RANK_THRESHOLDS[user.rank]?.label ?? user.rank;

  return (
    <Pressable
      onPress={() => router.push(`/user/${user.id}` as Href)}
      style={({ pressed }) => [styles.row, compact && styles.rowCompact, pressed && styles.rowPressed]}
    >
      <Avatar
        name={user.name}
        color={user.avatarColor}
        imageUri={user.avatarUri}
        size={compact ? 36 : 44}
        showOnline={user.isAtGym}
      />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.rank}>{rankLabel}</Text>
        </View>
        {arrival ? (
          <Text style={styles.arrival}>{arrival}</Text>
        ) : (
          <Text style={styles.noSchedule}>일정 미등록</Text>
        )}
        {range && user.scheduledEnd && (
          <Text style={styles.range}>{range}</Text>
        )}
      </View>
      {user.isAtGym && (
        <View style={styles.hereBadge}>
          <Text style={styles.hereText}>체육관</Text>
        </View>
      )}
      {!compact && <FriendActionButton otherUserId={user.id} compact />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  rowCompact: {
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  body: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 16,
  },
  rank: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  arrival: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  noSchedule: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  range: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },
  hereBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hereText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
});
