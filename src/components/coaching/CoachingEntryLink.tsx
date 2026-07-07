import React from 'react';
import { Text, StyleSheet, Pressable, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '@/src/theme';

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
      <View style={styles.inner}>
        <Ionicons name="school-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.text}>코칭 · 레슨 · 공지</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: '#E8EAED',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0.1,
  },
});
