-- ============================================================
-- 첫 관리자(마스터) 계정 만들기
-- ============================================================

-- (A) 지금 가입한 계정이 하나뿐이면: 전부 관리자+승인
update public.profiles
set membership_tier = 'admin', member_status = 'approved';

-- (B) 특정 학번만 관리자로 하려면 위 대신 이걸 사용:
-- update public.profiles
-- set membership_tier = 'admin', member_status = 'approved'
-- where student_id = '본인학번';

-- 확인
select student_id, name, membership_tier, member_status, created_at
from public.profiles
order by created_at desc;
