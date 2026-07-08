import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  useWindowDimensions,
  type View as RNView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { TouchGuard } from '@/src/components/ui/TouchGuard';
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
  detailProps: Omit<
    CourtDetailContentProps,
    'court' | 'courtPreviewWidth' | 'hideCourtPreview' | 'embedded' | 'onDismiss'
  >;
}

const EXPAND_MS = 360;
const COLLAPSE_MS = 300;
const EXPAND_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const COLLAPSE_EASING = Easing.bezier(0.4, 0, 0.2, 1);
const EXPAND_TIMING = { duration: EXPAND_MS, easing: EXPAND_EASING };
const COLLAPSE_TIMING = { duration: COLLAPSE_MS, easing: COLLAPSE_EASING };
const DETAIL_GAP = 8;
const DETAIL_HEADER_H = 48;
const CLUSTER_PAD = 12;

type ExpandedLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  detailTop: number;
  detailHeight: number;
};

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
  const { gridPadding, contentWidth, isDesktop, headerHeight, tabBarHeight, needsHorizontalScroll } =
    useLayoutMode();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const containerRef = useRef<RNView>(null);
  const cardRefs = useRef<Map<number, RNView>>(new Map());
  const pendingCourtRef = useRef<Court | null>(null);
  const [containerSize, setContainerSize] = useState({ width: contentWidth, height: 400 });
  const [containerScreenY, setContainerScreenY] = useState(0);

  const progress = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const originW = useSharedValue(80);
  const originH = useSharedValue(40);
  const targetX = useSharedValue(0);
  const targetY = useSharedValue(8);
  const targetW = useSharedValue(contentWidth - gridPadding * 2);
  const targetH = useSharedValue(getCourtHeight(contentWidth - gridPadding * 2));
  const detailTopY = useSharedValue(0);
  const detailPanelH = useSharedValue(280);

  const computeTarget = useCallback(
    (containerW: number, containerH: number, screenY?: number): ExpandedLayout => {
      const pad = gridPadding;
      const visibleTop = insets.top + headerHeight;
      const visibleBottom = windowHeight - tabBarHeight;
      const visibleHeight = visibleBottom - visibleTop;

      const maxWidth = isDesktop ? Math.min(containerW - pad * 2, 480) : containerW - pad * 2;
      const detailBodyH = Math.min(340, Math.max(180, visibleHeight * 0.4));
      const detailHeight = DETAIL_HEADER_H + detailBodyH;
      const clusterGap = DETAIL_GAP;

      let width = maxWidth;
      let height = getCourtHeight(width);
      const maxCourtH = visibleHeight - detailHeight - clusterGap - CLUSTER_PAD * 2;
      if (height > maxCourtH) {
        height = Math.max(72, maxCourtH);
        width = height * COURT_ASPECT;
      }

      const clusterHeight = height + clusterGap + detailHeight;
      const visibleCenter = (visibleTop + visibleBottom) / 2;
      const clusterTopInViewport = visibleCenter - clusterHeight / 2;

      let y = clusterTopInViewport - (screenY ?? 0);
      y = Math.max(CLUSTER_PAD, Math.min(y, containerH - clusterHeight - CLUSTER_PAD));

      const detailTop = y + height + clusterGap;

      return {
        x: (containerW - width) / 2,
        y,
        width,
        height,
        detailTop,
        detailHeight,
      };
    },
    [gridPadding, headerHeight, insets.top, isDesktop, tabBarHeight, windowHeight]
  );

  const applyTarget = useCallback(
    (containerW: number, containerH: number, screenY?: number) => {
      const t = computeTarget(containerW, containerH, screenY);
      targetX.value = t.x;
      targetY.value = t.y;
      targetW.value = t.width;
      targetH.value = t.height;
      detailTopY.value = t.detailTop;
      detailPanelH.value = t.detailHeight;
      if (screenY !== undefined) setContainerScreenY(screenY);
    },
    [computeTarget, detailPanelH, detailTopY, targetH, targetW, targetX, targetY]
  );

  const remeasureTarget = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.measureInWindow((_cx, cy) => {
      applyTarget(containerSize.width, containerSize.height, cy);
    });
  }, [applyTarget, containerSize.height, containerSize.width]);

  const measureAndSetOrigin = useCallback(
    (courtId: number, containerW: number, containerH: number, onReady?: () => void) => {
      const cardView = cardRefs.current.get(courtId);
      const container = containerRef.current;
      if (!cardView || !container) {
        remeasureTarget();
        onReady?.();
        return;
      }
      cardView.measureInWindow((mx, my, mw, mh) => {
        container.measureInWindow((cx, cy) => {
          originX.value = mx - cx;
          originY.value = my - cy;
          originW.value = mw;
          originH.value = mh;
          applyTarget(containerW, containerH, cy);
          onReady?.();
        });
      });
    },
    [applyTarget, originH, originW, originX, originY, remeasureTarget]
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
    remeasureTarget();
  }, [containerSize, remeasureTarget]);

  useEffect(() => {
    if (selectedCourtId == null) return;
    measureAndSetOrigin(selectedCourtId, containerSize.width, containerSize.height, startExpand);
    // containerSize intentionally omitted — resize handled by remeasureTarget
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

  const detailStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: detailTopY.value,
    height: detailPanelH.value,
    opacity: interpolate(progress.value, [0.3, 0.65], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(progress.value, [0.3, 0.65], [16, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const expandedLayout = computeTarget(
    containerSize.width,
    containerSize.height,
    containerScreenY
  );
  const expandedW = expandedLayout.width;
  const expandedH = expandedLayout.height;

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
        {needsHorizontalScroll ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            scrollEnabled={!selectedCourtId}
            contentContainerStyle={styles.hScrollContent}
          >
            <CourtGrid
              courts={courts}
              onCourtPress={handleCourtPress}
              selectedCourtId={selectedCourtId}
              filter={filter}
              myUserId={myUserId}
              registerCourtRef={registerCourtRef}
              showCoachingLink={!selectedCourtId}
            />
          </ScrollView>
        ) : (
          <CourtGrid
            courts={courts}
            onCourtPress={handleCourtPress}
            selectedCourtId={selectedCourtId}
            filter={filter}
            myUserId={myUserId}
            registerCourtRef={registerCourtRef}
            showCoachingLink={!selectedCourtId}
          />
        )}
      </Animated.View>

      {selectedCourt && (
        <>
          <Pressable
            style={styles.dismissBackdrop}
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel="코트 목록으로 돌아가기"
          />

          <Animated.View style={flyingCourtStyle}>
            <Pressable
              style={styles.flyingCourt}
              onPress={requestClose}
              accessibilityRole="button"
              accessibilityLabel="코트 닫기"
            >
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
            </Pressable>
          </Animated.View>

          <Animated.View
            style={[styles.detailLayer, detailStyle, { pointerEvents: selectedCourtId ? 'box-none' : 'none' }]}
          >
            <View style={styles.detailHeader} pointerEvents="box-none">
              <TouchGuard>
                <Pressable onPress={requestClose} style={styles.backBtn}>
                  <Text style={styles.backText}>← 코트 목록</Text>
                </Pressable>
              </TouchGuard>
              <Pressable style={styles.headerCenter} onPress={requestClose}>
                <Text style={styles.detailTitle}>{selectedCourt.id}번</Text>
              </Pressable>
              <TouchGuard>
                <Pressable onPress={requestClose} style={styles.closeBtn}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </TouchGuard>
            </View>
            <View style={styles.detailBody}>
              <CourtDetailContent
                court={selectedCourt}
                hideCourtPreview
                embedded
                courtPreviewWidth={expandedW}
                onDismiss={requestClose}
                {...detailProps}
              />
            </View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
  gridLayer: {},
  hScrollContent: { minWidth: '100%' },
  dismissBackdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 16,
  },
  flyingCourt: { flex: 1, overflow: 'hidden' },
  detailLayer: {
    zIndex: 25,
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  detailBody: {
    flex: 1,
    minHeight: 0,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  backText: { ...typography.button, color: colors.primary, fontSize: 14 },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
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
