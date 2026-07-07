import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { User } from '@/src/types';
import { FriendRow } from './FriendRow';
import { colors, spacing, typography, borderRadius, shadows } from '@/src/theme';

interface FriendsListPanelProps {
  onlineFriends: User[];
  offlineFriends: User[];
  othersCheckedIn: User[];
}

function Section({
  title,
  subtitle,
  children,
  emptyMessage,
  isEmpty,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.card}>
        {isEmpty ? (
          <Text style={styles.empty}>{emptyMessage}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export function FriendsListPanel({
  onlineFriends,
  offlineFriends,
  othersCheckedIn,
}: FriendsListPanelProps) {
  const hasFriends = onlineFriends.length > 0 || offlineFriends.length > 0;

  return (
    <View style={styles.wrap}>
      <Section
        title="체육관 · 온라인"
        subtitle="지금 체육관에 있는 친구"
        isEmpty={onlineFriends.length === 0}
        emptyMessage="체육관에 있는 친구가 없어요"
      >
        {onlineFriends.map((user, i) => (
          <React.Fragment key={user.id}>
            {i > 0 && <Divider />}
            <FriendRow user={user} />
          </React.Fragment>
        ))}
      </Section>

      <Section
        title="오프라인"
        subtitle="아직 도착하지 않은 친구"
        isEmpty={offlineFriends.length === 0}
        emptyMessage={hasFriends ? '모든 친구가 체육관에 있어요' : '등록된 친구가 없어요'}
      >
        {offlineFriends.map((user, i) => (
          <React.Fragment key={user.id}>
            {i > 0 && <Divider />}
            <FriendRow user={user} />
          </React.Fragment>
        ))}
      </Section>

      <Section
        title="오늘 출석"
        subtitle="친구가 아닌 동아리원"
        isEmpty={othersCheckedIn.length === 0}
        emptyMessage="오늘 출석한 다른 동아리원이 없어요"
      >
        {othersCheckedIn.map((user, i) => (
          <React.Fragment key={user.id}>
            {i > 0 && <Divider />}
            <FriendRow user={user} compact />
          </React.Fragment>
        ))}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
});
