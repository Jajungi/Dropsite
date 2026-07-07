import React from 'react';
import { View, type ViewProps } from 'react-native';

const DEFAULT_PADDING = 14;

interface TouchGuardProps extends ViewProps {
  children: React.ReactNode;
  /** 버튼 주변 — 이 영역 탭은 뒤 배경(닫기)으로 전달되지 않음 */
  padding?: number;
}

/** 인터랙티브 요소 주변 터치를 흡수해 근처 탭이 닫기로 이어지지 않게 함 */
export function TouchGuard({ children, padding = DEFAULT_PADDING, style, ...rest }: TouchGuardProps) {
  return (
    <View
      {...rest}
      collapsable={false}
      onStartShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      style={[{ padding, margin: -padding }, style]}
    >
      {children}
    </View>
  );
}
