import { ACTIVITY_SCHEDULE } from '@/src/constants';

export function isActivityTime(now: Date = new Date()): boolean {
  const day = now.getDay();
  const session = ACTIVITY_SCHEDULE.find((s) => s.day === day);
  if (!session) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = session.startHour * 60 + session.startMinute;
  const endMinutes = session.endHour * 60 + session.endMinute;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export function getNextActivityTime(now: Date = new Date()): Date | null {
  const candidates: Date[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + offset);
    const day = checkDate.getDay();
    const session = ACTIVITY_SCHEDULE.find((s) => s.day === day);
    if (!session) continue;

    const activityStart = new Date(checkDate);
    activityStart.setHours(session.startHour, session.startMinute, 0, 0);

    if (activityStart > now) {
      candidates.push(activityStart);
    }
  }

  return candidates.length > 0 ? candidates[0] : null;
}

export function getActivityTimeRemaining(now: Date = new Date()): string | null {
  if (!isActivityTime(now)) return null;

  const day = now.getDay();
  const session = ACTIVITY_SCHEDULE.find((s) => s.day === day);
  if (!session) return null;

  const endDate = new Date(now);
  endDate.setHours(session.endHour, session.endMinute, 0, 0);

  const diff = endDate.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}시간 ${minutes}분 남음`;
}

export function formatCountdownToNext(next: Date, now: Date = new Date()): string {
  const diff = next.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}일 ${hours}시간 후`;
  if (hours > 0) return `${hours}시간 ${minutes}분 후`;
  return `${minutes}분 후`;
}

export function getActivityDayLabel(day: number): string {
  const labels = ['일', '월', '화', '수', '목', '금', '토'];
  return labels[day] ?? '';
}
