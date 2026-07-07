import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import type { EloHistoryPoint } from '@/src/types';
import { colors, spacing, typography } from '@/src/theme';
import { ProfileEmptyState } from './ProfileEmptyState';

interface EloChartProps {
  data: EloHistoryPoint[];
  width?: number;
  height?: number;
}

export function EloChart({ data, width, height = 120 }: EloChartProps) {
  const [measured, setMeasured] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w && w !== measured) setMeasured(w);
  };

  if (data.length < 2) {
    return (
      <View style={styles.container} onLayout={onLayout}>
        <Text style={styles.title}>Elo 레이팅 추이</Text>
        <ProfileEmptyState message="아직 기록이 없어요" hint="랭크전 결과가 쌓이면 그래프가 표시돼요" />
      </View>
    );
  }

  const chartWidth = width ?? (measured > 0 ? measured : 300);
  const padding = { top: 10, right: 10, bottom: 24, left: 36 };
  const chartW = chartWidth - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const elos = data.map((d) => d.elo);
  const minElo = Math.min(...elos) - 20;
  const maxElo = Math.max(...elos) + 20;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.elo - minElo) / (maxElo - minElo)) * chartH;
    return { x, y, ...d };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Text style={styles.title}>Elo 레이팅 추이</Text>
      <Svg width={chartWidth} height={height}>
        <Line
          x1={padding.left}
          y1={padding.top + chartH}
          x2={padding.left + chartW}
          y2={padding.top + chartH}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Polyline
          points={polyline}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r={4} fill={colors.primary} />
            <SvgText
              x={p.x}
              y={height - 4}
              fontSize={9}
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {p.date}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  title: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.sm, alignSelf: 'flex-start' },
});
