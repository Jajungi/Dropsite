import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCourtHeight, COURT_ASPECT } from '@/src/constants/court';
import { GYM_COURT_ROWS } from '@/src/constants/court';
import { WEB_BREAKPOINT } from '@/src/constants/nav';
import { spacing } from '@/src/theme';
import { useActivityStatus } from '@/src/hooks/useActivityStatus';
import { getResponsiveMetrics } from '@/src/utils/responsive';

const GRID_BOTTOM_BUFFER = 12;
const SHADOW_BLEED = 14;
const MOBILE_SCROLL_BUFFER = 8;
const MOBILE_TAB_BAR_BASE = 56;
const MOBILE_HEADER_BASE = 52;
const ROW_ENTRANCE_GAP = 2;

export function useLayoutMode() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isActive } = useActivityStatus();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= WEB_BREAKPOINT;
  const isMobile = !isDesktop;
  const responsive = getResponsiveMetrics(width, isDesktop);
  const { scale, isCompact, isNarrow, scaledTypography, scaledSpacing } = responsive;

  const sidebarWidth = isDesktop ? 56 : 0;
  const outerPaddingH = isDesktop ? spacing.md : scaledSpacing.xs;
  const panelPaddingH = isDesktop ? spacing.lg : scaledSpacing.sm;
  const panelPaddingHTotal = outerPaddingH * 2 + panelPaddingH * 2;
  const gridPanelWidth = width - sidebarWidth - panelPaddingHTotal;

  const courtColumns = 3;
  const courtGap = isDesktop ? 8 : isNarrow ? 8 : 10;
  const gridPadding = 0;

  // 코트 바깥 여백 — 모바일에서는 최소화해 코트를 크게
  const entranceGutter = isDesktop ? 18 : 12;
  // 모바일은 카드 좌우 패딩 0 → 코트가 바닥 열에 정확히 정렬
  const cardHPad = isDesktop ? 3 : 0;
  const cardSlotExtra = cardHPad * 2;
  const cardChromeTop = isDesktop ? 14 : 10;
  const cardChrome = cardChromeTop + 3;

  /** 바닥 맵·그리드 공유 세로 지오메트리 (코트가 배경 밖으로 밀리지 않도록 단일 소스) */
  const floorStageH = 18; // 무대 밴드 높이
  const floorHeaderH = isDesktop ? 16 : 13; // 열 라벨(A열/B열/C열) 영역
  const floorContentTop = floorStageH + floorHeaderH; // 첫 코트 행 시작 y
  const aisleH = Math.max(6, Math.round(courtGap * 0.85)); // 행 사이 통로 = 행 간격

  const tabBarHeight = isDesktop ? 0 : MOBILE_TAB_BAR_BASE + insets.bottom;
  const headerHeight = isDesktop ? 72 : isCompact ? 48 : MOBILE_HEADER_BASE;
  const sectionHeaderHeight = isDesktop ? 112 : isNarrow ? 76 : isCompact ? 82 : height < 680 ? 88 : 100;
  const activityBannerHeight = isActive ? 0 : isCompact ? 44 : 52;
  const panelPaddingV = isDesktop ? spacing.lg + spacing.sm : scaledSpacing.md + scaledSpacing.xs;
  const outerPaddingV = isDesktop ? spacing.md : scaledSpacing.xs;

  const rows = GYM_COURT_ROWS.length;
  const coachingLinkHeight = 44; // 3번 코트 아래 코칭 링크 영역
  const rowGaps = aisleH * (rows - 1); // 통로와 동일한 행 간격

  const gridAreaHeight =
    height -
    insets.top -
    tabBarHeight -
    headerHeight -
    sectionHeaderHeight -
    activityBannerHeight -
    panelPaddingV -
    outerPaddingV -
    SHADOW_BLEED -
    (isMobile ? MOBILE_SCROLL_BUFFER : 0);

  // 코트 세로 배치에 필요한 고정 오버헤드(카드 크롬·통로·코칭 링크·버퍼)
  const verticalOverhead =
    floorContentTop +
    cardChrome * rows +
    rowGaps +
    coachingLinkHeight +
    GRID_BOTTOM_BUFFER +
    SHADOW_BLEED +
    30;

  // 데스크톱: 가로 폭에 맞춤 / 모바일: 화면 높이에 3개 행이 모두 들어가도록 세로 기준
  const courtWidthFromWidth =
    (gridPanelWidth -
      gridPadding * 2 -
      entranceGutter -
      ROW_ENTRANCE_GAP -
      courtGap * (courtColumns - 1) -
      cardSlotExtra * courtColumns) /
    courtColumns;

  const availableForRows = gridAreaHeight - verticalOverhead;
  const courtWidthFromHeight = (availableForRows / rows) * COURT_ASPECT;

  const MOBILE_MIN_COURT = 96; // 세로가 짧아도 코트가 너무 작아지지 않도록 최소치
  const courtWidth = isDesktop
    ? Math.max(40, Math.floor(courtWidthFromWidth))
    : Math.max(MOBILE_MIN_COURT, Math.floor(courtWidthFromHeight));

  const courtIllusHeight = getCourtHeight(courtWidth);
  const rowBlockHeight = courtIllusHeight + cardChrome;
  const gridContentHeight =
    floorContentTop +
    rowBlockHeight * rows +
    rowGaps +
    coachingLinkHeight +
    GRID_BOTTOM_BUFFER +
    SHADOW_BLEED +
    30;

  // 선택한 코트 크기로 그리드가 실제 차지하는 가로 폭
  const intrinsicGridWidth =
    entranceGutter +
    ROW_ENTRANCE_GAP +
    courtGap * (courtColumns - 1) +
    cardSlotExtra * courtColumns +
    courtWidth * courtColumns;

  // 세로에 맞춰 코트가 커지면 가로가 패널을 넘칠 수 있음 → 가로 스크롤
  const needsHorizontalScroll = isMobile && intrinsicGridWidth > gridPanelWidth + 1;
  const gridRenderWidth = needsHorizontalScroll ? intrinsicGridWidth : gridPanelWidth;
  const gridContentWidth = gridRenderWidth;

  const fitsOnScreen = gridContentHeight <= gridAreaHeight + SHADOW_BLEED;
  const expandAreaHeight = Math.max(gridContentHeight, gridAreaHeight);
  // 모바일은 세로를 화면에 맞추므로 세로 스크롤은 맞지 않을 때만(폴백)
  const needsVerticalScroll = !fitsOnScreen;

  return {
    isWeb,
    isDesktop,
    isMobile,
    isCompact,
    isNarrow,
    scale,
    scaledTypography,
    scaledSpacing,
    contentWidth: gridPanelWidth,
    gridRenderWidth,
    needsHorizontalScroll,
    courtWidth,
    courtColumns,
    courtGap,
    gridPadding,
    entranceGutter,
    cardHPad,
    cardChromeTop,
    cardChrome,
    floorStageH,
    floorHeaderH,
    floorContentTop,
    aisleH,
    sidebarWidth,
    gridAreaHeight,
    gridContentHeight,
    gridContentWidth,
    expandAreaHeight,
    fitsOnScreen,
    needsVerticalScroll,
    tabBarHeight,
    safeAreaBottom: insets.bottom,
    headerHeight,
  };
}
