import type { User } from '@/src/types';

/** 코치 공지 작성·삭제 권한 (관리자 또는 코치 권한 부여 회원) */
export function canPostCoachAnnouncement(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.membershipTier === 'admin') return true;
  return Boolean(user.isCoach);
}

export function canManageCoachAnnouncement(
  user: User | null | undefined,
  announcementAuthorId?: string
): boolean {
  if (!user) return false;
  if (user.membershipTier === 'admin') return true;
  if (!user.isCoach) return false;
  return !announcementAuthorId || announcementAuthorId === user.id;
}
