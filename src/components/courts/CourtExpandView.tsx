import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Platform,
  type View as RNView,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import type { Court } from '@/src/types';
import { CourtGrid } from './CourtGrid';
import { CourtIllustration } from './CourtIllustration';
import { CourtPlayerProfiles } from './CourtPlayerProfiles';
import { CourtDetailContent, type CourtDetailContentProps } from './CourtDetailContent';
import { getCourtHeight, COURT_ASPECT } from '@/src/constants/court';
import { useLayoutMode } from '@/src/hooks/useLayoutMode';
import { colors, spacing, typography, borderRadius } from '@/src/theme';

interface CourtExpandViewProps {
  courts: Court[];
  selectedCourtId: number | null;
  selectedCourt: Court | null;
  onCourtPress: (court: Court) => void;
  onDeselect: () => void;
  onRegisterClose: (close: () => void) => void;
  filter?: 'all' | 'empty' | 'mine';
  myUserId?: string;
  detailProps: Omit<CourtDetailContentProps, 'court' | 'courtPreviewWidth' | 'hideCourtPreview' | 'embedded'>;
}

const EXPAND_MS = 360;
const COLLAPSE_MS = 300;
const EXPAND_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const COLLAPSE_EASING = Easing.bezier(0.4, 0, 0.2, 1);
const EXPAND_TIMING = { duration: EXPAND_MS, easing: EXPAND_EASING };
const COLLAPSE_TIMING = { duration: COLLAPSE_MS, easing: COLLAPSE_EASING };

export function CourtExpandView({
  courts,
  selectedCourtId,
  selectedCourt,
  onCourtPress,
  onDeselect,
  onRegisterClose,
  filter,
  myUserId,
  detailProps,
}: CourtExpandViewProps) {
  const { gridPadding, contentWidth, isDesktop } = useLayoutMode();
  const containerRef = useRef<RNView>(null);
  const cardRefs = useRef<Map<number, RNView>>(new Map());
  const pendingCourtRef = useRef<Court | null>(null);
  const [containerSize, setContainerSize] = useState({ width: contentWidth, height: 400 });

  const progress = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const originW = useSharedValue(80);
  const originH = useSharedValue(40);
  const targetX = useSharedValue(0);
  const targetY = useSharedValue(8);
  const targetW = useSharedValue(contentWidth - gridPadding * 2);
  const targetH = useSharedValue(getCourtHeight(contentWidth - gridPadding * 2));

  const computeTarget = useCallback(
    (containerW: number, containerH: number) => {
      const pad = gridPadding;
      const maxWidth = isDesktop ? Math.min(containerW - pad * 2, 480) : containerW - pad * 2;
      let width = maxWidth;
      let height = getCourtHeight(width);
      const maxH = containerH * (isDesktop ? 0.24 : 0.2);
      if (height > maxH) {
        height = maxH;
        width = height * COURT_ASPECT;
      }
      return { x: (containerW - width) / 2, y: 4, width, height };
    },
    [gridPadding, isDesktop]
  );

  const updateTargets = useCallback(
    (containerW: number, containerH: number) => {
      const t = computeTarget(containerW, containerH);
      targetX.value = t.x;
      targetY.value = t.y;
      targetW.value = t.width;
      targetH.value = t.height;
    },
    [computeTarget, targetH, targetW, targetX, targetY]
  );

  const measureAndSetOrigin = useCallback(
    (courtId: number, containerW: number, containerH: number, onReady?: () => void) => {
      const cardView = cardRefs.current.get(courtId);
      const container = containerRef.current;
      if (!cardView || !container) {
        onReady?.();
        return;
      }
      cardView.measureInWindow((mx, my, mw, mh) => {
        container.measureInWindow((cx, cy) => {
          originX.value = mx - cx;
          originY.value = my - cy;
          originW.value = mw;
          originH.value = mh;
          updateTargets(containerW, containerH);
          onReady?.();
        });
      });
    },
    [originH, originW, originX, originY, updateTargets]
  );

  const startExpand = useCallback(() => {
    cancelAnimation(progress);
    progress.value = withTiming(1, EXPAND_TIMING);
  }, [progress]);

  const requestClose = useCallback(() => {
    cancelAnimation(progress);
    progress.value = withTiming(0, COLLAPSE_TIMING, (finished) => {
      if (finished) runOnJS(onDeselect)();
    });
  }, [onDeselect, progress]);

  useEffect(() => {
    onRegisterClose(requestClose);
  }, [onRegisterClose, requestClose]);

  useEffect(() => {
    updateTargets(containerSize.width, containerSize.height);
  }, [containerSize, updateTargets]);

  useEffect(() => {
    if (selectedCourtId == null) return;
    measureAndSetOrigin(selectedCourtId, containerSize.width, containerSize.height, startExpand);
    // containerSize intentionally omitted — resize handled by updateTargets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourtId, measureAndSetOrigin, startExpand]);

  const registerCourtRef = useCallback((id: number, ref: RNView | null) => {
    if (ref) cardRefs.current.set(id, ref);
    else cardRefs.current.delete(id);
  }, []);

  const handleCourtPress = useCallback(
    (court: Court) => {
      if (selectedCourtId === court.id) {
        requestClose();
        return;
      }

      if (selectedCourtId != null) {
        pendingCourtRef.current = court;
        cancelAnimation(progress);
        progress.value = withTiming(0, { duration: 200, easing: COLLAPSE_EASING }, (finished) => {
          if (!finished) return;
          const next = pendingCourtRef.current;
          pendingCourtRef.current = null;
          if (next) runOnJS(onCourtPress)(next);
        });
        return;
      }

      onCourtPress(court);
    },
    [onCourtPress, progress, requestClose, selectedCourtId]
  );

  const gridStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [1, 0.35, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [0, 28], Extrapolation.CLAMP),
      },
    ],
  }));

  const flyingCourtStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: interpolate(progress.value, [0, 1], [originX.value, targetX.value], Extrapolation.CLAMP),
    top: interpolate(progress.value, [0, 1], [originY.value, targetY.value], Extrapolation.CLAMP),
    width: interpolate(progress.value, [0, 1], [originW.value, targetW.value], Extrapolation.CLAMP),
    height: interpolate(progress.value, [0, 1], [originH.value, targetH.value], Extrapolation.CLAMP),
    opacity: interpolate(progress.value, [0, 0.06, 0.14], [0, 1, 1], Extrapolation.CLAMP),
    borderRadius: interpolate(progress.value, [0, 1], [12, borderRadius.lg], Extrapolation.CLAMP),
    zIndex: 20,
  }));

  const detailStyle = useAnimatedStyle(() => {
    const top = targetY.value + targetH.value + 8;
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top,
      bottom: 0,
      opacity: interpolate(progress.value, [0.3, 0.65], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(progress.value, [0.3, 0.65], [16, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const expandedW = computeTarget(containerSize.width, containerSize.height).width;
  const expandedH = getCourtHeight(expandedW);
  const expandedLayout = computeTarget(containerSize.width, containerSize.height);

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setContainerSize({ width, height });
      }}
    >
      <Animated.View
        style={[styles.gridLayer, gridStyle, { pointerEvents: selectedCourtId ? 'none' : 'auto' }]}
      >
        <CourtGrid
          courts={courts}
          onCourtPress={handleCourtPress}
          selectedCourtId={selectedCourtId}
          filter={filter}
          myUserId={myUserId}
          registerCourtRef={registerCourtRef}
        />
      </Animated.View>

      {selectedCourt && (
        <>
          <Pressable
            style={[
              styles.sideTap,
              {
                left: 0,
                top: expandedLayout.y,
                width: expandedLayout.x,
                height: expandedLayout.height,
              },
            ]}
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel="코트 목록으로 돌아가기"
          />
          <Pressable
            style={[
              styles.sideTap,
              {
                left: expandedLayout.x + expandedLayout.width,
                top: expandedLayout.y,
                width: containerSize.width - expandedLayout.x - expandedLayout.width,
                height: expandedLayout.height,
              },
            ]}
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel="코트 목록으로 돌아가기"
          />

          <Animated.View style={[flyingCourtStyle, styles.flyingCourt, { pointerEvents: 'none' }]}>
            <CourtIllustration
              court={selectedCourt}
              width={expandedW}
              borderRadius={borderRadius.lg}
            />
            <CourtPlayerProfiles
              players={selectedCourt.players}
              avatarSize={28}
              courtWidth={expandedW}
              courtHeight={expandedH}
            />
          </Animated.View>

          <Animated.View
            style={[styles.detailLayer, detailStyle, { pointerEvents: selectedCourtId ? 'auto' : 'none' }]}
          >
            <View style={styles.detailHeader}>
              <Pressable onPress={requestClose} style={styles.backBtn} hitSlop={8}>
                <Text style={styles.backText}>← 코트 목록</Text>
              </Pressable>
              <View style={styles.headerRight}>
                <Text style={styles.detailTitle}>{selectedCourt.id}번</Text>
                <Pressable onPress={requestClose} style={styles.closeBtn} hitSlop={12}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>
            </View>
            <CourtDetailContent
              court={selectedCourt}
              hideCourtPreview
              embedded
              courtPreviewWidth={expandedW}
              {...detailProps}
            />
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
  gridLayer: {},
  flyingCourt: { overflow: 'hidden' },
  sideTap: {
    position: 'absolute',
    zIndex: 18,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  detailLayer: {
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: { paddingVertical: 4 },
  backText: { ...typography.button, color: colors.primary, fontSize: 14 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailTitle: { ...typography.h3, color: colors.text, fontSize: 16 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.navActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.textLight, fontSize: 14, fontWeight: '700', lineHeight: 16 },
});
