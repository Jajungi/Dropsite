import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, type LayoutChangeEvent, type ViewStyle, View } from 'react-native';
import { colors } from '@/src/theme';
import {
  buildRealisticShadowCss,
  computeLightShadowOffset,
  useLightSourceStore,
} from '@/src/stores/lightSourceStore';

const DEFAULT = { x: 0, y: 8, falloff: 0.2 };

export function useGlobalLightShadow(intensity = 1, elevated = false) {
  const ref = useRef<View>(null);
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [shadow, setShadow] = useState(DEFAULT);
  const lightX = useLightSourceStore((s) => s.x);
  const lightY = useLightSourceStore((s) => s.y);
  const lightActive = useLightSourceStore((s) => s.active);

  const measureCard = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      setLayout({ x, y, width, height });
    });
  }, []);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setLayout((prev) => ({ ...prev, width, height }));
      requestAnimationFrame(measureCard);
    },
    [measureCard]
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || layout.width === 0) {
      setShadow(DEFAULT);
      return;
    }
    const next = lightActive
      ? computeLightShadowOffset(
          lightX,
          lightY,
          layout.x,
          layout.y,
          layout.width,
          layout.height,
          intensity
        )
      : { ...DEFAULT, falloff: 0.25 };

    setShadow(next);
  }, [intensity, layout, lightActive, lightX, lightY]);

  const shadowStyle: ViewStyle =
    Platform.OS === 'web'
      ? ({
          boxShadow: buildRealisticShadowCss(shadow.x, shadow.y, shadow.falloff, elevated),
          transition: 'box-shadow 0.12s ease-out',
        } as ViewStyle)
      : {
          shadowColor: colors.chunkyShadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 12,
          elevation: 6,
        };

  return { ref, onLayout, shadowStyle, layout, remeasure: measureCard };
}
