import { useMemo } from 'react';
import { useAuthStore } from '@/src/stores/authStore';
import { useNotificationStore } from '@/src/stores/notificationStore';
import { useFriendStore } from '@/src/stores/friendStore';
import { useAdminAlertStore } from '@/src/stores/adminAlertStore';

export type AdminAlertSection = 'members' | 'lessons' | 'matches' | 'social';

export interface AdminAlert {
  id: string;
  kind: AdminAlertSection;
  title: string;
  subtitle: string;
  section: AdminAlertSection;
  createdAt: string;
}

/** 관리자 주의가 필요한 대기 항목 목록 (확인한 항목은 제외) */
export function useAdminAlerts(): AdminAlert[] {
  const users = useAuthStore((s) => s.users);
  const pendingMatches = useNotificationStore((s) => s.pendingMatches);
  const friendRequests = useFriendStore((s) => s.friendRequests);
  const dismissed = useAdminAlertStore((s) => s.dismissed);

  return useMemo(() => {
    const alerts: AdminAlert[] = [];

    users
      .filter((u) => u.memberStatus === 'pending')
      .forEach((u) =>
        alerts.push({
          id: `member:${u.id}`,
          kind: 'members',
          section: 'members',
          title: `${u.name} 가입 승인 대기`,
          subtitle: `학번 ${u.studentId}`,
          createdAt: u.createdAt,
        })
      );

    users
      .filter((u) => u.lessonStatus === 'pending')
      .forEach((u) =>
        alerts.push({
          id: `lesson:${u.id}`,
          kind: 'lessons',
          section: 'lessons',
          title: `${u.name} 레슨 권한 신청`,
          subtitle: `학번 ${u.studentId}`,
          createdAt: u.lessonRequestedAt ?? u.createdAt,
        })
      );

    pendingMatches
      .filter((m) => m.status === 'pending')
      .forEach((m) =>
        alerts.push({
          id: `match:${m.id}`,
          kind: 'matches',
          section: 'matches',
          title: `코트 ${m.courtId} 경기 확정 대기`,
          subtitle: `A ${m.scoreA} : ${m.scoreB} B`,
          createdAt: m.playedAt,
        })
      );

    friendRequests
      .filter((r) => r.status === 'pending')
      .forEach((r) =>
        alerts.push({
          id: `friend:${r.id}`,
          kind: 'social',
          section: 'social',
          title: `친구 신청 ${r.fromUserName} → ${r.toUserName}`,
          subtitle: '친구 탭에서 처리',
          createdAt: r.createdAt,
        })
      );

    const dismissedSet = new Set(dismissed);
    return alerts
      .filter((a) => !dismissedSet.has(a.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users, pendingMatches, friendRequests, dismissed]);
}

/** 관리자 알림 개수 (아이콘 배지용) */
export function useAdminAlertCount(): number {
  return useAdminAlerts().length;
}
