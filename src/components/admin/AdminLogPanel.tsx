import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { colors, spacing, typography, borderRadius } from '@/src/theme';
import type { AdminLogCategory, AdminLogEntry } from '@/src/types';

export const ADMIN_LOG_CATEGORY_LABEL: Record<AdminLogCategory, string> = {
  member: '회원',
  lesson: '레슨',
  match: '경기',
  court: '코트',
  attendance: '출석',
  social: '소셜',
  point: '포인트',
  system: '시스템',
};

const CATEGORY_COLORS: Record<AdminLogCategory, string> = {
  member: colors.primary,
  lesson: '#7C3AED',
  match: colors.warning,
  court: '#0891B2',
  attendance: colors.success,
  social: '#DB2777',
  point: '#CA8A04',
  system: colors.textMuted,
};

type LogFilter = AdminLogCategory | 'all';

interface AdminLogPanelProps {
  logs: AdminLogEntry[];
  filter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
  onClear?: () => void;
  compact?: boolean;
  maxItems?: number;
  onViewAll?: () => void;
}

export function AdminLogPanel({
  logs,
  filter,
  onFilterChange,
  onClear,
  compact,
  maxItems,
  onViewAll,
}: AdminLogPanelProps) {
  const filtered =
    filter === 'all' ? logs : logs.filter((l) => l.category === filter);
  const displayed = maxItems != null ? filtered.slice(0, maxItems) : filtered;

  const filters: { key: LogFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    ...Object.entries(ADMIN_LOG_CATEGORY_LABEL).map(([key, label]) => ({
      key: key as AdminLogCategory,
      label,
    })),
  ];

  return (
    <View style={styles.wrap}>
      {!compact && (
        <ScrollableFilters filters={filters} active={filter} onChange={onFilterChange} />
      )}

      {displayed.length === 0 ? (
        <Text style={styles.empty}>기록된 활동 로그가 없습니다</Text>
      ) : (
        displayed.map((log) => <LogRow key={log.id} log={log} compact={compact} />)
      )}

      {onViewAll && filtered.length > (maxItems ?? 0) && (
        <Pressable onPress={onViewAll} style={styles.viewAll}>
          <Text style={styles.viewAllText}>전체 로그 보기 ({filtered.length}건)</Text>
        </Pressable>
      )}

      {!compact && onClear && logs.length > 0 && (
        <Button title="로그 전체 삭제" onPress={onClear} size="sm" variant="outline" />
      )}
    </View>
  );
}

function ScrollableFilters({
  filters,
  active,
  onChange,
}: {
  filters: { key: LogFilter; label: string }[];
  active: LogFilter;
  onChange: (f: LogFilter) => void;
}) {
  return (
    <View style={styles.filterRow}>
      {filters.map((f) => (
        <Pressable
          key={f.key}
          onPress={() => onChange(f.key)}
          style={[styles.filterChip, active === f.key && styles.filterChipActive]}
        >
          <Text style={[styles.filterLabel, active === f.key && styles.filterLabelActive]}>
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function LogRow({ log, compact }: { log: AdminLogEntry; compact?: boolean }) {
  const color = CATEGORY_COLORS[log.category];
  const time = new Date(log.createdAt).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.logRow, compact && styles.logRowCompact]}>
      <View style={styles.logTop}>
        <View style={[styles.categoryBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.categoryText, { color }]}>
            {ADMIN_LOG_CATEGORY_LABEL[log.category]}
          </Text>
        </View>
        <Text style={styles.logTime}>{time}</Text>
      </View>
      <Text style={styles.logMessage}>{log.message}</Text>
      {!compact && log.actorName && (
        <Text style={styles.logActor}>by {log.actorName}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  filterChipActive: { backgroundColor: colors.primaryLight },
  filterLabel: { ...typography.small, color: colors.textMuted, fontWeight: '600' },
  filterLabelActive: { color: colors.primary },
  empty: { ...typography.caption, color: colors.textMuted, paddingVertical: spacing.md },
  logRow: {
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  logRowCompact: { padding: spacing.sm },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  categoryText: { ...typography.small, fontWeight: '700', fontSize: 10 },
  logTime: { ...typography.small, color: colors.textMuted, fontSize: 11 },
  logMessage: { ...typography.caption, color: colors.text, lineHeight: 18 },
  logActor: { ...typography.small, color: colors.textMuted, fontSize: 11 },
  viewAll: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  viewAllText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
});
