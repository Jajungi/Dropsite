import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

const ROWS: { category: string; activity: string; points: string; positive?: boolean }[] = [
  { category: '적립 (+)', activity: '체육관 출석 인증 (500m 내)', points: '준회원 +100p / 정회원 +120p', positive: true },
  { category: '적립 (+)', activity: '일반 랭킹전 승리 (관리자 확정)', points: '승리 팀원당 +50p', positive: true },
  { category: '적립 (+)', activity: '이달의 청소·정리 기여왕 (Top 5)', points: '+150p ~ +500p 차등', positive: true },
  { category: '적립 (+)', activity: '신입 부원 웰컴 리워드', points: '가입 축하 +500p', positive: true },
  { category: '사용 (-)', activity: '일반 코트 예약 (1게임당)', points: '-20p', positive: false },
  { category: '사용 (-)', activity: '중앙 코트 예약 (4·5·6번)', points: '-30p (1.5배)', positive: false },
];

export function GuidePointsTable() {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.colCat]}>구분</Text>
        <Text style={[styles.headerCell, styles.colAct]}>활동</Text>
        <Text style={[styles.headerCell, styles.colPts]}>포인트</Text>
      </View>
      {ROWS.map((row, i) => (
        <View key={i} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
          <Text style={[styles.cell, styles.colCat, styles.catText]}>{row.category}</Text>
          <Text style={[styles.cell, styles.colAct]}>{row.activity}</Text>
          <Text
            style={[
              styles.cell,
              styles.colPts,
              styles.ptsText,
              row.positive ? styles.positive : styles.negative,
            ]}
          >
            {row.points}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    ...typography.small,
    fontWeight: '700',
    color: colors.textMuted,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-start',
    gap: 4,
  },
  rowAlt: { backgroundColor: colors.surfaceAlt },
  cell: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  colCat: { width: '18%' },
  colAct: { flex: 1 },
  colPts: { width: '30%', textAlign: 'right' },
  catText: { fontWeight: '600', color: colors.textMuted },
  ptsText: { fontWeight: '700' },
  positive: { color: colors.success },
  negative: { color: colors.error },
});
