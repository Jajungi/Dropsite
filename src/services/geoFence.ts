import { GYM_LOCATION } from '@/src/constants';
import type { GeoLocation } from '@/src/types';

const EARTH_RADIUS_M = 6371000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function calculateDistanceMeters(a: GeoLocation, b: GeoLocation): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function isWithinGymFence(location: GeoLocation): boolean {
  const gymLoc: GeoLocation = {
    latitude: GYM_LOCATION.latitude,
    longitude: GYM_LOCATION.longitude,
  };
  return calculateDistanceMeters(location, gymLoc) <= GYM_LOCATION.radiusMeters;
}

export function getDistanceToGym(location: GeoLocation): number {
  return Math.round(
    calculateDistanceMeters(location, {
      latitude: GYM_LOCATION.latitude,
      longitude: GYM_LOCATION.longitude,
    })
  );
}

export const GEO_ERROR_MESSAGES = {
  permission_denied: '위치 권한이 필요해요. 설정에서 위치 접근을 허용해주세요.',
  outside_fence: `아직 체육관 근처가 아니에요! ${GYM_LOCATION.name} 반경 ${GYM_LOCATION.radiusMeters}m 안에서만 이용할 수 있어요.`,
  unavailable: '위치를 확인할 수 없어요. GPS를 켜고 다시 시도해주세요.',
};
