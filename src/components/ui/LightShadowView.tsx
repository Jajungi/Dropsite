import React from 'react';
import { View, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useGlobalLightShadow } from '@/src/hooks/useGlobalLightShadow';
import { useLightSourceStore } from '@/src/stores/lightSourceStore';

interface LightShadowViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  elevated?: boolean;
}

export function LightShadowView({ children, style, intensity = 1, elevated = false }: LightShadowViewProps) {
  const { ref, onLayout, shadowStyle } = useGlobalLightShadow(intensity, elevated);

  return (
    <View ref={ref} onLayout={onLayout} style={[shadowStyle, style]}>
      {children}
    </View>
  );
}

/** 코트 그리드 전체에서 마우스 위치를 공유해 모든 코트 그림자가 반응 */
export function LightShadowCapture({ children }: { children: React.ReactNode }) {
  const setLight = useLightSourceStore((s) => s.setLight);
  const clearLight = useLightSourceStore((s) => s.clearLight);

  if (Platform.OS !== 'web') {
    return (
      <View
        onTouchStart={(e) => {
          const t = e.nativeEvent.touches[0];
          if (t) setLight(t.pageX, t.pageY);
        }}
        onTouchMove={(e) => {
          const t = e.nativeEvent.touches[0];
          if (t) setLight(t.pageX, t.pageY);
        }}
        onTouchEnd={() => clearLight()}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      {...(Platform.OS === 'web'
        ? ({
            onMouseMove: (e: { nativeEvent: { pageX: number; pageY: number } }) => {
              setLight(e.nativeEvent.pageX, e.nativeEvent.pageY);
            },
            onMouseLeave: () => clearLight(),
          } as object)
        : {})}
    >
      {children}
    </View>
  );
}
