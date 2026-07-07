import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { POINT_EARN, POINT_SPEND } from '@/src/constants/points';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

const ROWS: { category: string; activity: string; points: string; positive?: boolean }[] = [
  { category: '적립 (+)', activity: '동아리비 납부 인증', points: `+${POINT_EARN.CLUB_FEE}p`, positive: true },
  {
    category: '적립 (+)',
    activity: '체육관 출석 인증 (500m 내)',
    points: `정회원 +${POINT_EARN.ATTENDANCE_FULL}p / 준회원 +${POINT_EARN.ATTENDANCE_ASSOCIATE}p`,
    positive: true,
  },
  { category: '적립 (+)', activity: '청소 및 정리 인증', points: `+${POINT_EARN.CLEANING}p`, positive: true },
  { category: '적립 (+)', activity: '네트 설치 및 철거 인증', points: `+${POINT_EARN.NET_SETUP}p`, positive: true },
  { category: '적립 (+)', activity: '일반 랭킹전 승리 (팀원당)', points: `+${POINT_EARN.RANKED_WIN}p`, positive: true },
  { category: '사용 (-)', activity: '일반 코트 예약 (1게임당)', points: `-${POINT_SPEND.COURT_GENERAL}p`, positive: false },
  { category: '사용 (-)', activity: '중앙 코트 예약 (4~6번)', points: `-${POINT_SPEND.COURT_CENTER}p`, positive: false },
  { category: '사용 (-)', activity: '새 경기용 셔틀콕 수령', points: `-${POINT_SPEND.SHUTTLECOCK}p`, positive: false },
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
