import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, Line } from 'react-native-svg';
import { COURT_COLUMNS, GYM_FLOOR, GYM_VENUE, GYM_COURT_ROWS } from '@/src/constants/court';
import { colors, typography } from '@/src/theme';

const ROW_GUTTER = 2;

interface GymFloorMapProps {
  courtWidth: number;
  courtGap: number;
  /** 전체 그리드 가로 폭 (패널 맞춤) */
  floorWidth?: number;
  /** CourtCard wrapper chrome (paddingTop + paddingBottom) */
  cardChrome?: number;
  /** 좌측 입구 라벨 여백 */
  entranceGutter?: number;
  /** 무대 밴드 높이 (그리드와 공유) */
  stageH?: number;
  /** 열 라벨 영역 높이 (그리드와 공유) */
  headerH?: number;
  /** 첫 코트 행 시작 y = stageH + headerH (그리드 paddingTop과 동일) */
  contentTop?: number;
  /** 행 사이 통로 높이 = 그리드 행 간격 */
  aisleH?: number;
}

export function GymFloorMap({
  courtWidth,
  courtGap,
  floorWidth,
  cardChrome = 17,
  entranceGutter = 18,
  stageH = 18,
  headerH = 14,
  contentTop = stageH + headerH,
  aisleH = Math.max(6, Math.round(courtGap * 0.85)),
}: GymFloorMapProps) {
  const ENTRANCE_GUTTER = entranceGutter;
  const colUnit = courtWidth + courtGap;
  const floorW =
    floorWidth ?? ENTRANCE_GUTTER + ROW_GUTTER + colUnit * 3 - courtGap;
  const rowUnit = cardChrome + courtWidth / (13.4 / 6.1);
  const totalRows = GYM_COURT_ROWS.length;
  const floorH = contentTop + rowUnit * totalRows + aisleH * (totalRows - 1) + 8;

  return (
    <View style={[styles.wrap, { width: floorW, height: floorH, pointerEvents: 'none' }]}>
      <Svg width={floorW} height={floorH} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="gym-floor-stripe" patternUnits="userSpaceOnUse" width={8} height={8}>
            <Rect width={8} height={8} fill={GYM_FLOOR.base} />
            <Line x1={0} y1={8} x2={8} y2={0} stroke={GYM_FLOOR.stripe} strokeWidth={0.6} />
          </Pattern>
        </Defs>

        <Rect x={0} y={0} width={floorW} height={floorH} rx={4} ry={4} fill="url(#gym-floor-stripe)" />

        {/* 무대측 구역 */}
        <Rect x={0} y={0} width={floorW} height={stageH} rx={4} fill={GYM_FLOOR.stage} opacity={0.55} />

        {/* 입구측 구역 */}
        <Rect
          x={0}
          y={floorH - 10}
          width={floorW}
          height={10}
          fill={GYM_FLOOR.entrance}
          opacity={0.45}
        />

        {/* 열 구분선 */}
        {([1, 2] as const).map((i) => {
          const x = ENTRANCE_GUTTER + ROW_GUTTER + colUnit * i - courtGap / 2;
          return (
            <Line
              key={i}
              x1={x}
              y1={stageH + 4}
              x2={x}
              y2={floorH - 8}
              stroke={GYM_FLOOR.divider}
              strokeWidth={1}
              strokeDasharray="4 5"
            />
          );
        })}

        {/* 통로 (행 사이) — 코트 행 시작(contentTop) 기준으로 배치 */}
        {Array.from({ length: totalRows - 1 }, (_, i) => i).map((i) => {
          const y = contentTop + rowUnit * (i + 1) + aisleH * i + aisleH / 2;
          return (
            <Rect
              key={`aisle-${i}`}
              x={ENTRANCE_GUTTER + ROW_GUTTER}
              y={y - aisleH / 2}
              width={colUnit * 3 - courtGap}
              height={aisleH}
              fill={GYM_FLOOR.aisle}
              opacity={0.65}
              rx={3}
            />
          );
        })}
      </Svg>

      <View style={[styles.stageBand, { width: floorW, height: stageH }]}>
        <Text style={styles.stageText}>▲ {GYM_VENUE.stageLabel}</Text>
        <Text style={styles.venueHint}>{GYM_VENUE.shortName}</Text>
      </View>

      <View
        style={[
          styles.colHeaders,
          {
            top: stageH + 2,
            left: ENTRANCE_GUTTER + ROW_GUTTER,
            width: colUnit * 3 - courtGap,
          },
        ]}
      >
        {COURT_COLUMNS.map((col, i) => (
          <View key={col.key} style={[styles.colHeader, { width: courtWidth, marginRight: i < 2 ? courtGap : 0 }]}>
            <Text style={styles.colLabel}>{col.label}</Text>
            {col.sublabel ? <Text style={styles.colSub}>{col.sublabel}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    zIndex: 0,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stageBand: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  stageText: {
    ...typography.small,
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  venueHint: {
    ...typography.small,
    fontSize: 8,
    color: colors.textMuted,
    opacity: 0.75,
  },
  colHeaders: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  colHeader: {
    alignItems: 'center',
  },
  colLabel: {
    ...typography.small,
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted,
  },
  colSub: {
    ...typography.small,
    fontSize: 7,
    color: colors.textMuted,
    opacity: 0.7,
    marginTop: 1,
  },
});
