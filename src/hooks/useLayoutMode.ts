import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCourtHeight } from '@/src/constants/court';
import { GYM_COURT_ROWS } from '@/src/constants/court';
import { WEB_BREAKPOINT } from '@/src/constants/nav';
import { spacing } from '@/src/theme';
import { useActivityStatus } from '@/src/hooks/useActivityStatus';
import { getResponsiveMetrics } from '@/src/utils/responsive';

const STAGE_LABEL_HEIGHT = 22;
const GRID_BOTTOM_BUFFER = 12;
const SHADOW_BLEED = 14;
const MOBILE_SCROLL_BUFFER = 8;
const MOBILE_TAB_BAR_BASE = 49;
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
  const cardHPad = isDesktop ? 3 : 1;
  const cardSlotExtra = cardHPad * 2;
  const cardChromeTop = isDesktop ? 14 : 10;
  const cardChrome = cardChromeTop + 3;

  const tabBarHeight = isDesktop ? 0 : MOBILE_TAB_BAR_BASE + insets.bottom;
  const headerHeight = isDesktop ? 72 : isCompact ? 48 : MOBILE_HEADER_BASE;
  const sectionHeaderHeight = isDesktop ? 112 : isNarrow ? 76 : isCompact ? 82 : height < 680 ? 88 : 100;
  const activityBannerHeight = isActive ? 0 : isCompact ? 44 : 52;
  const panelPaddingV = isDesktop ? spacing.lg + spacing.sm : scaledSpacing.md + scaledSpacing.xs;
  const outerPaddingV = isDesktop ? spacing.md : scaledSpacing.xs;

  const courtWidthFromWidth =
    (gridPanelWidth -
      gridPadding * 2 -
      entranceGutter -
      ROW_ENTRANCE_GAP -
      courtGap * (courtColumns - 1) -
      cardSlotExtra * courtColumns) /
    courtColumns;

  /** 가로는 패널에 꽉 맞춤 — 세로만 스크롤 */
  const courtWidth = Math.max(40, Math.floor(courtWidthFromWidth));

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

  const rows = GYM_COURT_ROWS.length;
  const coachingLinkHeight = 44; // 3번 코트 아래 코칭 링크 영역
  const rowGaps = courtGap * (rows - 1);
  const courtIllusHeight = getCourtHeight(courtWidth);
  const rowBlockHeight = courtIllusHeight + cardChrome;
  const gridContentHeight =
    STAGE_LABEL_HEIGHT +
    rowBlockHeight * rows +
    rowGaps +
    coachingLinkHeight +
    GRID_BOTTOM_BUFFER +
    SHADOW_BLEED +
    30;

  const gridContentWidth = gridPanelWidth;

  const fitsOnScreen = gridContentHeight <= gridAreaHeight + SHADOW_BLEED;
  const expandAreaHeight = Math.max(gridContentHeight, gridAreaHeight);
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
    courtWidth,
    courtColumns,
    courtGap,
    gridPadding,
    entranceGutter,
    cardHPad,
    cardChromeTop,
    cardChrome,
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
