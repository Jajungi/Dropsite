import type { User } from '@/src/types';

/** 표시용 이름 — 닉네임 없이 실명만 사용 */
export function userDisplayName(user: Pick<User, 'name'> | null | undefined): string {
  return user?.name?.trim() || '회원';
}
