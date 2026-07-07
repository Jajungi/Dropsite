import type { AdminLogEntry } from '@/src/types';

/** 데모용 초기 활동 로그 */
export function seedDemoAdminLogs(): AdminLogEntry[] {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

  return [
    {
      id: 'log-seed-1',
      category: 'member',
      action: 'member.approve',
      message: '이서연 회원 가입 승인 (+500P 웰컴)',
      actorId: 'user-6',
      actorName: '관리자',
      targetId: 'user-2',
      targetName: '이서연',
      createdAt: hoursAgo(48),
    },
    {
      id: 'log-seed-2',
      category: 'lesson',
      action: 'lesson.approve',
      message: '박지호 레슨 이용 권한 승인',
      actorId: 'user-6',
      actorName: '관리자',
      targetId: 'user-3',
      targetName: '박지호',
      createdAt: hoursAgo(36),
    },
    {
      id: 'log-seed-3',
      category: 'match',
      action: 'match.confirm',
      message: '코트 2 랭크전 결과 확정 (A 21:18 B)',
      actorId: 'user-6',
      actorName: '관리자',
      targetId: 'match-demo-1',
      createdAt: hoursAgo(24),
    },
    {
      id: 'log-seed-4',
      category: 'attendance',
      action: 'attendance.check_in',
      message: '김민준 출석 인증 (+100P)',
      actorId: 'user-1',
      actorName: '김민준',
      targetId: 'user-1',
      targetName: '김민준',
      createdAt: hoursAgo(5),
    },
    {
      id: 'log-seed-5',
      category: 'court',
      action: 'court.return',
      message: '코트 4 강제 반납 (관리자)',
      actorId: 'user-6',
      actorName: '관리자',
      meta: { courtId: 4 },
      createdAt: hoursAgo(3),
    },
    {
      id: 'log-seed-6',
      category: 'lesson',
      action: 'lesson.queue.next',
      message: '최유나 레슨 대기열 → 다음 차례 지정',
      actorId: 'user-6',
      actorName: '관리자',
      targetId: 'user-4',
      targetName: '최유나',
      createdAt: hoursAgo(2),
    },
    {
      id: 'log-seed-7',
      category: 'social',
      action: 'friend.request',
      message: '정태양 → 한지우 친구 신청',
      actorId: 'user-5',
      actorName: '정태양',
      targetId: 'user-7',
      targetName: '한지우',
      createdAt: hoursAgo(1.5),
    },
    {
      id: 'log-seed-8',
      category: 'point',
      action: 'point.cleaning_bonus',
      message: '월간 청소 기여 보너스 지급 (3명)',
      actorName: '시스템',
      createdAt: hoursAgo(0.5),
    },
  ];
}
