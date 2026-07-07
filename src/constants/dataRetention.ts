/** DB·Storage 보존·표시 한도 — 서버 트리거와 앱 쿼리 limit 동기화 */

export const DATA_RETENTION = {
  /** DB 전체 보존 (트리거) */
  matchResultsDb: 50,
  pointTransactionsPerUserDb: 40,
  notificationsPerUserDb: 20,
  adminLogsDb: 200,
  cleaningSubmissionsDays: 90,
  attendanceDays: 365,

  /** 앱 UI·쿼리 limit */
  matchHistoryDisplay: 20,
  pointHistoryDisplay: 30,
  adminLogsDisplay: 50,
  inboxDisplay: 20,
} as const;

/** 프로필 사진 Storage 제한 */
export const AVATAR_LIMITS = {
  maxEdgePx: 256,
  maxBytes: 150 * 1024,
  jpegQuality: 0.72,
  storageBucket: 'avatars',
  fileName: 'avatar.jpg',
} as const;
