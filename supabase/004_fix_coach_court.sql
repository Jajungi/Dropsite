-- 코치 코트 = 3번, 센터 코트 = 4·5·6번으로 정정
-- (이미 예약 중인 코트는 상태 유지, 플래그만 갱신)

update public.courts set is_coach_court = (id = 3);
update public.courts set is_center = (id in (4, 5, 6));

update public.courts set name = '코치코트' where id = 3;
update public.courts set name = id || '코트' where id <> 3;

-- 디자인용 mock 코트 데이터(가짜 예약·경기) 초기화 — 모든 코트를 빈 상태로
update public.courts set
  status = 'empty',
  players = '[]'::jsonb,
  join_requests = '[]'::jsonb,
  reserved_by = null,
  reserved_at = null,
  started_at = null,
  finished_at = null,
  game_mode = null,
  nanta_half = null,
  max_games = 0,
  games_completed = 0,
  updated_at = now();

-- 확인
select id, name, is_center, is_coach_court, status from public.courts order by id;
