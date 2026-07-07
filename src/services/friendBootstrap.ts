import type { User } from '@/src/types';

/** 데모 초기 친구 관계 (user-1 ↔ 즐겨찾기였던 멤버) */
export function seedDemoFriendships(users: User[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const me = users.find((u) => u.id === 'user-1');
  if (!me) return map;

  const friendIds = users
    .filter((u) => u.id !== 'user-1' && u.memberStatus === 'approved')
    .slice(0, 3)
    .map((u) => u.id);

  map['user-1'] = friendIds;
  friendIds.forEach((fid) => {
    if (!map[fid]) map[fid] = [];
    if (!map[fid].includes('user-1')) map[fid].push('user-1');
  });
  return map;
}
