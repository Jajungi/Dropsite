-- 코치 권한 (공지 작성) + coach_announcements RLS
-- 전제: 001~011 이 먼저 적용되어 있어야 함

alter table public.profiles
  add column if not exists is_coach boolean not null default false;

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_coach = true
  );
$$;

-- 코치 공지: 조회는 승인 회원, 작성·수정·삭제는 관리자 또는 코치
drop policy if exists "coach_announcements_write" on public.coach_announcements;
create policy "coach_announcements_write" on public.coach_announcements
  for all to authenticated
  using (public.is_admin() or public.is_coach())
  with check (public.is_admin() or public.is_coach());
