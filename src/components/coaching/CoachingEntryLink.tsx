import React from 'react';
import { Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing } from '@/src/theme';

interface CoachingEntryLinkProps {
  visible?: boolean;
}

/** 코트 현황 아래 — 코칭 화면 진입 링크 */
export function CoachingEntryLink({ visible = true }: CoachingEntryLinkProps) {
  if (!visible) return null;

  return (
    <Pressable
      onPress={() => router.push('/coaching')}
      style={styles.wrap}
      accessibilityRole="link"
      accessibilityLabel="코칭 레슨 공지 화면 열기"
    >
      <Text style={styles.text}>코칭 · 레슨 · 공지 →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  text: {
    ...typography.small,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
});
