import { create } from 'zustand';

interface LightSourceState {
  x: number;
  y: number;
  active: boolean;
  setLight: (x: number, y: number) => void;
  clearLight: () => void;
}

export const useLightSourceStore = create<LightSourceState>((set) => ({
  x: 0,
  y: 0,
  active: false,
  setLight: (x, y) => set({ x, y, active: true }),
  clearLight: () => set({ active: false }),
}));

/** 카드 바닥 그림자 — 접촉 + 확산 + 앰비언트 */
export function computeLightShadowOffset(
  lightX: number,
  lightY: number,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  intensity = 1
) {
  const cx = cardX + cardW / 2;
  const cy = cardY + cardH / 2;
  const dx = cx - lightX;
  const dy = cy - lightY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const falloff = 1 / (1 + Math.pow(distance / 400, 2.2));
  const k = 0.032 * intensity * falloff;

  const baseX = 0;
  const baseY = 8;

  return {
    x: baseX + dx * k * 0.58,
    y: baseY + Math.max(2, dy * k * 0.12 + 6),
    falloff,
  };
}

export function buildRealisticShadowCss(
  ox: number,
  oy: number,
  falloff: number,
  elevated = false
) {
  const lift = elevated ? 1.15 : 1;
  const a = Math.min(1, 0.35 + falloff * 0.45);
  return [
    `${ox}px ${oy}px 1px rgba(15, 28, 24, ${0.22 * a})`,
    `${ox * 0.6 + 1}px ${oy + 4}px ${6 * lift}px rgba(15, 28, 24, ${0.14 * a})`,
    `${ox * 0.35}px ${oy + 10}px ${18 * lift}px rgba(15, 28, 24, ${0.1 * a})`,
    `0px ${oy + 14}px ${32 * lift}px rgba(15, 28, 24, ${0.06 * a})`,
  ].join(', ');
}
