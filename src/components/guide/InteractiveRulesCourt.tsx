import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { getPortraitCourtGeometry, BWF_DIMS } from '@/src/constants/court';
import { colors, borderRadius, spacing, typography } from '@/src/theme';

export type CourtHighlight = 'singles' | 'doubles' | 'doubles-serve';

const HIGHLIGHTS: { key: CourtHighlight; label: string; hint: string }[] = [
  {
    key: 'singles',
    label: '단식 경기 구역',
    hint: '가로는 안쪽 라인, 세로는 바깥 끝 라인까지',
  },
  {
    key: 'doubles',
    label: '복식 경기 구역',
    hint: '가로·세로 모두 바깥 라인까지',
  },
  {
    key: 'doubles-serve',
    label: '복식 서브 제한',
    hint: '숏·롱 서비스 라인 사이만 유효 (앞·뒤 백라인 구간은 아웃)',
  },
];

const COURT_W = 200;

interface InteractiveRulesCourtProps {
  onHighlightChange?: (key: CourtHighlight | null) => void;
}

export function InteractiveRulesCourt({ onHighlightChange }: InteractiveRulesCourtProps) {
  const [active, setActive] = useState<CourtHighlight | null>(null);
  const g = getPortraitCourtGeometry(COURT_W);
  const serveActive = active === 'doubles-serve';

  const select = (key: CourtHighlight) => {
    const next = active === key ? null : key;
    setActive(next);
    onHighlightChange?.(next);
  };

  const lineColor = 'rgba(255,255,255,0.72)';
  const lineDim = 'rgba(255,255,255,0.38)';
  const serveColor = '#FFD080';
  const serveFill = 'rgba(255, 220, 120, 0.38)';
  const outFill = 'rgba(0,0,0,0.48)';

  return (
    <View style={styles.wrap}>
      <Text style={styles.tip}>버튼을 누르면 코트에 해당 구역이 표시됩니다 · 규격 6.1m × 13.4m</Text>

      <View style={styles.courtFrame}>
        <Svg width={g.courtWidth} height={g.courtHeight}>
          <Rect x={0} y={0} width={g.courtWidth} height={g.courtHeight} rx={12} fill="#3D7560" />

          {/* 하이라이트 */}
          {active === 'singles' && (
            <Rect
              x={g.singlesLeft}
              y={g.by}
              width={g.singlesRight - g.singlesLeft}
              height={g.bh}
              fill="rgba(124, 220, 140, 0.38)"
              stroke="#9AE8A8"
              strokeWidth={2}
            />
          )}
          {active === 'doubles' && (
            <Rect
              x={g.bx}
              y={g.by}
              width={g.bw}
              height={g.bh}
              fill="rgba(124, 180, 255, 0.32)"
              stroke="#8EC0FF"
              strokeWidth={2}
            />
          )}
          {serveActive && (
            <>
              {/* 유효 서브 구역 (숏~롱 사이) */}
              <Rect
                x={g.bx}
                y={g.longServiceTop}
                width={g.bw}
                height={g.shortServiceTop - g.longServiceTop}
                fill={serveFill}
                stroke={serveColor}
                strokeWidth={2}
              />
              <Rect
                x={g.bx}
                y={g.shortServiceBottom}
                width={g.bw}
                height={g.longServiceBottom - g.shortServiceBottom}
                fill={serveFill}
                stroke={serveColor}
                strokeWidth={2}
              />
              {/* 앞쪽 아웃 (네트~숏 서비스 라인) */}
              <Rect
                x={g.bx}
                y={g.shortServiceTop}
                width={g.bw}
                height={g.netY - g.shortServiceTop}
                fill={outFill}
              />
              <Rect
                x={g.bx}
                y={g.netY}
                width={g.bw}
                height={g.shortServiceBottom - g.netY}
                fill={outFill}
              />
              {/* 뒤쪽 아웃 (롱 서비스~백라인) */}
              <Rect x={g.bx} y={g.by} width={g.bw} height={g.longServiceTop - g.by} fill={outFill} />
              <Rect
                x={g.bx}
                y={g.longServiceBottom}
                width={g.bw}
                height={g.by + g.bh - g.longServiceBottom}
                fill={outFill}
              />
            </>
          )}

          {/* 코트 라인 */}
          <Rect x={g.bx} y={g.by} width={g.bw} height={g.bh} fill="none" stroke={lineColor} strokeWidth={1.2} />
          <Line x1={g.bx} y1={g.netY} x2={g.bx + g.bw} y2={g.netY} stroke={lineColor} strokeWidth={2} />

          {/* 싱글 사이드라인 */}
          <Line
            x1={g.singlesLeft}
            y1={g.by}
            x2={g.singlesLeft}
            y2={g.by + g.bh}
            stroke={active === 'singles' ? '#9AE8A8' : lineDim}
            strokeWidth={active === 'singles' ? 1.5 : 1}
            strokeDasharray="4 3"
          />
          <Line
            x1={g.singlesRight}
            y1={g.by}
            x2={g.singlesRight}
            y2={g.by + g.bh}
            stroke={active === 'singles' ? '#9AE8A8' : lineDim}
            strokeWidth={active === 'singles' ? 1.5 : 1}
            strokeDasharray="4 3"
          />

          {/* 숏 서비스 라인 */}
          <Line
            x1={g.bx}
            y1={g.shortServiceTop}
            x2={g.bx + g.bw}
            y2={g.shortServiceTop}
            stroke={serveActive ? serveColor : lineDim}
            strokeWidth={serveActive ? 2 : 1}
          />
          <Line
            x1={g.bx}
            y1={g.shortServiceBottom}
            x2={g.bx + g.bw}
            y2={g.shortServiceBottom}
            stroke={serveActive ? serveColor : lineDim}
            strokeWidth={serveActive ? 2 : 1}
          />

          {/* 복식 롱 서비스 라인 */}
          <Line
            x1={g.bx}
            y1={g.longServiceTop}
            x2={g.bx + g.bw}
            y2={g.longServiceTop}
            stroke={serveActive ? serveColor : lineDim}
            strokeWidth={serveActive ? 2 : 1}
          />
          <Line
            x1={g.bx}
            y1={g.longServiceBottom}
            x2={g.bx + g.bw}
            y2={g.longServiceBottom}
            stroke={serveActive ? serveColor : lineDim}
            strokeWidth={serveActive ? 2 : 1}
          />

          {/* 센터 라인 (숏 서비스~백라인) */}
          <Line
            x1={g.centerX}
            y1={g.by}
            x2={g.centerX}
            y2={g.shortServiceTop}
            stroke={lineDim}
            strokeWidth={0.9}
          />
          <Line
            x1={g.centerX}
            y1={g.shortServiceBottom}
            x2={g.centerX}
            y2={g.by + g.bh}
            stroke={lineDim}
            strokeWidth={0.9}
          />

          {/* 규격 치수 표기 */}
          <SvgText
            x={g.bx + g.bw / 2}
            y={g.by - 6}
            fill="rgba(255,255,255,0.85)"
            fontSize={10}
            fontWeight="600"
            textAnchor="middle"
          >
            {`폭 ${BWF_DIMS.width}m`}
          </SvgText>
          <G transform={`rotate(-90, ${g.bx - 4}, ${g.by + g.bh / 2})`}>
            <SvgText
              x={g.bx - 4}
              y={g.by + g.bh / 2}
              fill="rgba(255,255,255,0.85)"
              fontSize={10}
              fontWeight="600"
              textAnchor="end"
            >
              {`길이 ${BWF_DIMS.length}m`}
            </SvgText>
          </G>
          <SvgText
            x={g.bx + 4}
            y={g.netY - 4}
            fill="rgba(255,255,255,0.55)"
            fontSize={8}
            textAnchor="start"
          >
            {`숏 ${BWF_DIMS.shortServiceFromNet}m`}
          </SvgText>
          <SvgText
            x={g.bx + 4}
            y={g.longServiceTop + 10}
            fill="rgba(255,255,255,0.55)"
            fontSize={8}
            textAnchor="start"
          >
            {`롱 ${BWF_DIMS.doublesLongServiceFromBack}m`}
          </SvgText>
          <SvgText
            x={g.singlesLeft - 2}
            y={g.by + 10}
            fill="rgba(255,255,255,0.5)"
            fontSize={7}
            textAnchor="end"
          >
            {`단식 +${BWF_DIMS.singlesSideInset}m`}
          </SvgText>
        </Svg>
      </View>

      <Text style={styles.dimLegend}>
        BWF 규격 · 폭 {BWF_DIMS.width}m × 길이 {BWF_DIMS.length}m · 숏 서비스 {BWF_DIMS.shortServiceFromNet}m ·
        복식 롱 서비스 {BWF_DIMS.doublesLongServiceFromBack}m
      </Text>

      <View style={styles.chips}>
        {HIGHLIGHTS.map((h) => {
          const isOn = active === h.key;
          return (
            <Pressable
              key={h.key}
              onPress={() => select(h.key)}
              style={[styles.chip, isOn && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: isOn }}
            >
              <Text style={[styles.chipLabel, isOn && styles.chipLabelOn]}>{h.label}</Text>
              {isOn && <Text style={styles.chipHint}>{h.hint}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  tip: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  courtFrame: {
    alignSelf: 'center',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(42,61,69,0.15)' } as object,
      default: {},
    }),
  },
  dimLegend: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: spacing.sm,
  },
  chips: { gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipLabelOn: {
    color: colors.primary,
    fontWeight: '800',
  },
  chipHint: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
  },
});
