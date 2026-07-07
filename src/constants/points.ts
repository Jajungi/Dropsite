/** 포인트 정책 — 단일 출처 (적립·사용·제한) */

export const POINT_EARN = {
  CLUB_FEE: 500,
  ATTENDANCE_FULL: 150,
  ATTENDANCE_ASSOCIATE: 100,
  CLEANING: 100,
  NET_SETUP: 100,
  /** 경기 승리 — 팀원당 고정 (승리 축하) */
  MATCH_WIN: 50,
  /** 경기 패배 — 팀원당 고정 (패배 위로, 승리보다 적게) */
  MATCH_LOSS: 20,
} as const;

/** 점수를 입력하면 Elo·포인트가 바로 반영되지만, 하루 이 횟수를 넘으면 관리자 승인이 필요해요 */
export const AUTO_RATED_MATCH_DAILY_LIMIT = 8;

export const POINT_SPEND = {
  COURT_GENERAL: 20,
  COURT_CENTER: 30,
  SHUTTLECOCK: 20,
} as const;

export const MIN_RESERVE_POINTS = 30;
export const PEAK_TIME_RESERVATION_LIMIT = 2;
export const PEAK_HOURS = [19, 20] as const;
export const MAX_RANK_DISCOUNT_PERCENT = 30;

/** Gold 이상 랭크 티어별 코트 예약 할인율 (0~0.30) */
export const RANK_RESERVATION_DISCOUNT: Record<string, number> = {
  bronze: 0,
  silver: 0,
  gold: 0.1,
  platinum: 0.17,
  diamond: 0.24,
  master: 0.3,
};

export const POINT_TYPE_LABELS: Record<string, string> = {
  club_fee: '동아리비 납부',
  check_in: '출석 인증',
  cleaning: '청소·정리',
  net_setup: '네트 설치·철거',
  match_win: '경기 승리',
  match_loss: '경기 참여',
  court_reserve: '코트 예약',
  shuttlecock: '셔틀콕 수령',
  welcome: '웰컴 리워드',
  bonus: '보너스',
  admin: '운영진 조정',
};

export const NET_SETUP_AREAS = ['네트 설치', '네트 철거'] as const;

/** 셔틀콕 동방 운반 봉사 — 네트 설치와 동일 포인트(+100) */
export const SHUTTLECOCK_CARRY_AREAS = ['동방에서 콕 가져오기', '동방에 콕 가져다놓기'] as const;
