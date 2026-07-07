import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

export type FriendsTab = 'friends' | 'schedule';

interface FriendsSegmentTabsProps {
  active: FriendsTab;
  onChange: (tab: FriendsTab) => void;
}

const TABS: { key: FriendsTab; label: string }[] = [
  { key: 'friends', label: '친구' },
  { key: 'schedule', label: '일정' },
];

export function FriendsSegmentTabs({ active, onChange }: FriendsSegmentTabsProps) {
  return (
    <View style={styles.wrap}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(42,61,69,0.08)' } as object,
      default: {},
    }),
  },
  tabText: {
    ...typography.button,
    color: colors.textMuted,
    fontSize: 15,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
