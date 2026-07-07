import { typography, spacing } from '@/src/theme';

/** 반응형 기준 너비 (iPhone 14 등) */
export const REF_WIDTH = 390;

/** 개발자 무한 포인트 모드 ON 시 부여 포인트 */
export const INFINITE_DEV_POINTS = 999_999;

type TypographyKey = keyof typeof typography;

function scaleNum(n: number, scale: number): number {
  return Math.round(n * scale);
}

/** 화면 너비 기준 글자·간격 스케일 (데스크톱은 1 고정) */
export function getResponsiveMetrics(width: number, isDesktop: boolean) {
  const isCompact = !isDesktop && width < 360;
  const isNarrow = !isDesktop && width < 340;
  // 모바일은 전반적으로 살짝 작게 (기준폭에서도 0.9배 상한)
  const scale = isDesktop ? 1 : Math.min(0.9, Math.max(0.78, (width / REF_WIDTH) * 0.9));
  const spaceScale = isDesktop ? 1 : Math.min(0.95, Math.max(0.82, width / REF_WIDTH));

  const s = (n: number) => scaleNum(n, scale);
  const sp = (n: number) => scaleNum(n, spaceScale);

  const scaledTypography = Object.fromEntries(
    (Object.keys(typography) as TypographyKey[]).map((key) => {
      const t = typography[key];
      return [
        key,
        {
          ...t,
          fontSize: s(t.fontSize),
          lineHeight: s(t.lineHeight),
        },
      ];
    })
  ) as typeof typography;

  const scaledSpacing = {
    xs: sp(spacing.xs),
    sm: sp(spacing.sm),
    md: sp(spacing.md),
    lg: sp(spacing.lg),
    xl: sp(spacing.xl),
    xxl: spacing.xxl,
  };

  return { scale, spaceScale, isCompact, isNarrow, scaledTypography, scaledSpacing };
}
