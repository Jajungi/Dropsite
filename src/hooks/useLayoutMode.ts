import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCourtHeight } from '@/src/constants/court';
import { WEB_BREAKPOINT } from '@/src/constants/nav';
import { spacing } from '@/src/theme';
import { useActivityStatus } from '@/src/hooks/useActivityStatus';

/** 카드 wrapper 패딩 (CourtCard paddingTop 14 + paddingBottom 3) */
const CARD_CHROME = 17;
const STAGE_LABEL_HEIGHT = 22;
const GRID_BOTTOM_BUFFER = 12;
const SHADOW_BLEED = 14;
const MOBILE_SCROLL_BUFFER = 8;
const MOBILE_TAB_BAR_BASE = 49;
const MOBILE_HEADER_BASE = 52;
const ENTRANCE_LABEL_WIDTH = 18;
const ROW_ENTRANCE_GAP = 2;
/** CourtCard wrapper 좌우 패딩 (paddingHorizontal 3 × 2) */
const CARD_H_PAD = 3;
const CARD_SLOT_EXTRA = CARD_H_PAD * 2;

export function useLayoutMode() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isActive } = useActivityStatus();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= WEB_BREAKPOINT;
  const isMobile = !isDesktop;

  const sidebarWidth = isDesktop ? 56 : 0;
  const outerPaddingH = isDesktop ? spacing.md : spacing.xs;
  const panelPaddingH = isDesktop ? spacing.lg : spacing.sm;
  const panelPaddingHTotal = outerPaddingH * 2 + panelPaddingH * 2;
  const gridPanelWidth = width - sidebarWidth - panelPaddingHTotal;

  const courtColumns = 3;
  const courtGap = isDesktop ? 8 : 3;
  const gridPadding = 0;

  const tabBarHeight = isDesktop ? 0 : MOBILE_TAB_BAR_BASE + insets.bottom;
  const headerHeight = isDesktop ? 72 : MOBILE_HEADER_BASE;
  const sectionHeaderHeight = isDesktop ? 112 : height < 680 ? 88 : 100;
  const activityBannerHeight = isActive ? 0 : 52;
  const panelPaddingV = isDesktop ? spacing.lg + spacing.sm : spacing.md + spacing.xs;
  const outerPaddingV = isDesktop ? spacing.md : spacing.xs;

  const courtWidthFromWidth =
    (gridPanelWidth -
      gridPadding * 2 -
      ENTRANCE_LABEL_WIDTH -
      ROW_ENTRANCE_GAP -
      courtGap * (courtColumns - 1) -
      CARD_SLOT_EXTRA * courtColumns) /
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

  const rows = 3;
  const rowGaps = courtGap * (rows - 1);
  const courtIllusHeight = getCourtHeight(courtWidth);
  const rowBlockHeight = courtIllusHeight + CARD_CHROME;
  const gridContentHeight =
    STAGE_LABEL_HEIGHT + rowBlockHeight * rows + rowGaps + GRID_BOTTOM_BUFFER + SHADOW_BLEED + 30;

  const gridContentWidth = gridPanelWidth;

  const fitsOnScreen = gridContentHeight <= gridAreaHeight + SHADOW_BLEED;
  const expandAreaHeight = Math.max(gridContentHeight, gridAreaHeight);
  const needsVerticalScroll = !fitsOnScreen;

  return {
    isWeb,
    isDesktop,
    isMobile,
    contentWidth: gridPanelWidth,
    courtWidth,
    courtColumns,
    courtGap,
    gridPadding,
    sidebarWidth,
    gridAreaHeight,
    gridContentHeight,
    gridContentWidth,
    expandAreaHeight,
    fitsOnScreen,
    needsVerticalScroll,
    tabBarHeight,
    safeAreaBottom: insets.bottom,
  };
}
