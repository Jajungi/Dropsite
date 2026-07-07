# Supabase 마이그레이션 가이드

Drop 배드민턴 앱을 로컬 JSON + 동기화 서버에서 **Supabase(Postgres + Auth + Storage + Realtime)** 로 이전하는 체크리스트입니다.

> **보안 원칙**: 서비스 롤 키는 앱에 넣지 않습니다. 민감한 쓰기(포인트·출석·코트 예약)는 RLS + RPC로 서버에서 검증합니다.

---

## 당신이 직접 해야 할 일 (필수)

아래는 **코드로 대체할 수 없는** 작업입니다. 순서대로 진행하세요.

### 1. Supabase 프로젝트 생성
- [ ] [supabase.com](https://supabase.com) 로그인 → **New project**
- [ ] 리전: `Northeast Asia (Seoul)` 권장
- [ ] DB 비밀번호 안전하게 보관 (복구용)

### 2. SQL 마이그레이션 실행
- [ ] Dashboard → **SQL Editor** → **New query**
- [ ] **처음 실행**: `supabase/migrations/001_initial_schema.sql` 전체 → Run
- [ ] **`profiles does not exist` (LINE 40) 오류가 났다면**  
  enum은 이미 만들어진 상태이므로 → `supabase/complete_after_enums.sql` **전체** 실행 (수정된 나머지 스키마)
- [ ] Table Editor에 `profiles`, `courts` 등 생성 확인

### 3. Storage 버킷 생성
- [ ] Dashboard → **Storage** → New bucket
  - Name: `avatars`
  - Public bucket: **ON** (프로필 썸네일 공개 URL용)
  - File size limit: **200 KB**
  - Allowed MIME: `image/jpeg`, `image/webp`
- [ ] SQL Editor에서 `supabase/migrations/002_storage_avatars.sql` 실행 (정책 적용)

### 3-1. 쓰기 연결 정책·보안 보강 (필수, 재실행 안전)
- [ ] SQL Editor에서 **`supabase/005_write_policies.sql` 전체 실행**
  - 알림·관리자 로그 insert 정책 추가
  - `rpc_adjust_points` 를 "본인 포인트는 본인, 타인은 관리자만" 규칙으로 갱신
  - **보안**: 회원이 자기 프로필의 포인트·엘로·등급 등 민감 컬럼을 직접 조작하지 못하게 막는 트리거(`guard_profile_columns`) 추가
- [ ] 이 파일을 실행해야 포인트/출석/경기/청소/알림/로그가 DB에 저장됩니다.

### 3-2. 포인트 경제 서버 검증 (필수, 재실행 안전)
- [ ] SQL Editor에서 **`supabase/006_secure_points.sql` 전체 실행**
  - **보안 핵심**: 일반 사용자가 `rpc_adjust_points` 로 자기 포인트를 임의 적립하지 못하게 차단 (본인은 차감만 가능)
  - 정당한 적립은 서버가 금액을 강제하는 전용 RPC로만 처리:
    - `rpc_check_in(lat,lng)` — 출석 (서버가 500m 지오펜스·하루 1회·티어별 포인트 검증)
    - `rpc_submit_cleaning(kind,area,participants)` — 청소/네트/콕 (+100 서버 강제)
    - `rpc_refund_court(court_id)` — 예약 취소 환불 (마지막 미환불 차감분만큼)

### 3-3. 소셜·실시간 테이블 (필수, 재실행 안전)
- [ ] SQL Editor에서 **`supabase/007_social_tables.sql` 전체 실행**
  - `friend_requests` (친구 신청/관계), `coach_announcements` (코치 공지)
  - `lesson_queue` (레슨 대기열), `team_rooms` (파트너 모집방)
  - 각 테이블 RLS + Realtime 발행 포함

### 3-4. 코트 예약 서버 검증 + 실시간 확대 (필수, 재실행 안전)
- [ ] SQL Editor에서 **`supabase/008_court_security_realtime.sql` 전체 실행**
  - **보안 핵심**: 코트 예약을 `rpc_reserve_court` 로만 가능하게 하고, `guard_court_columns` 트리거로 클라이언트의 코트 직접 조작(무료 예약·코트 탈취)을 차단
    - 서버가 지오펜스·비용(랭크 할인)·중복 예약·코치코트 자격·피크타임·잔액을 검증하고 포인트를 원자 차감
  - **실시간 확대**: `point_transactions`·`attendance_records`·`cleaning_submissions`·`admin_logs`·`match_results` Realtime 발행 → 포인트/출석/청소/경기/관리자로그가 새로고침 없이 반영

### 4. 환경 변수 설정
- [ ] Dashboard → **Project Settings** → **API**
- [ ] Dashboard → **Authentication** → **Providers** → Email → **Confirm email 비활성화** (학번 로그인 앱)
- [ ] 프로젝트 루트에 `.env` 생성 (`.env.example` 참고):

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
# EXPO_PUBLIC_SYNC_URL 는 Supabase 사용 시 비워두거나 삭제
```

- [ ] **절대 금지**: `service_role` 키를 앱·Git·Expo에 넣기

### 5. 첫 관리자 계정
- [ ] 앱에서 회원가입 (학번 + 비밀번호)
- [ ] SQL Editor에서 본인을 관리자로 승격:

```sql
update public.profiles
set membership_tier = 'admin', member_status = 'approved'
where student_id = '본인학번';
```

### 6. (선택) 데모 계정 시드
- [ ] 앱에서 `20240001`, `20230001` 등 회원가입 후 위와 같이 `approved` 처리
- [ ] 또는 SQL `seed_demo_profiles.sql` (추후 제공) — Auth 사용자는 앱 가입이 더 안전

### 7. 앱 재시작
- [ ] `npx expo start -c` (캐시 클리어 후 환경 변수 반영)

---

## 용량·보존 정책 (DB 사이즈 절약)

| 데이터 | 보존 규칙 | 앱 표시 | 구현 |
|--------|-----------|---------|------|
| **전적 (match_results)** | 최근 **50건** (전체) | 프로필 **20건** | DB 트리거 + 쿼리 `limit` |
| **포인트 내역** | 사용자당 **40건** | **30건** | DB 트리거 |
| **알림 (inbox)** | 사용자당 **20건** | 20건 | DB 트리거 |
| **관리자 로그** | 최근 **200건** | 50건 | DB 트리거 |
| **청소 인증** | **90일** | 리더보드 상위만 | DB 트리거 |
| **출석** | **365일** | 전체 표시 | 주기적 정리 (선택) |
| **프로필 사진** | **256×256**, JPEG/WebP, **≤150KB** | Storage URL | 클라이언트 압축 후 업로드 |
| **코트 상태** | 9코트 고정 row | 실시간 | Realtime 구독 |

상수 정의: `src/constants/dataRetention.ts`  
압축 로직: `src/services/avatarImage.ts`

---

## 보안 설계

### 인증
- 학번 로그인 → Supabase Auth **가상 이메일** (`{학번}@badmin.dgist.internal`)
- 비밀번호는 Supabase Auth가 bcrypt 처리 (클라이언트 `hashPassword` 미사용)
- `credentials` 로컬 맵은 Supabase 모드에서 **저장하지 않음**

### RLS (Row Level Security)
- 모든 public 테이블 `ENABLE ROW LEVEL SECURITY`
- `profiles`: 본인은 `avatar_path`, `schedule_*`, `is_at_gym` 등만 수정 가능. 포인트·엘로·등급·전적 등 민감 컬럼은 `guard_profile_columns` 트리거가 직접 수정 차단 (관리자·서버 RPC만)
- `admin_note`, `membership_tier` 등은 **관리자만** 읽기/쓰기
- `point_transactions`: 직접 INSERT 금지(`with check(false)`) → RPC만
- **포인트 적립 서버 검증 (006)**: 일반 사용자는 `rpc_adjust_points` 로 **차감(음수)만** 가능. 적립(양수)은 관리자 또는 전용 RPC(`rpc_check_in`·`rpc_submit_cleaning`·`rpc_refund_court`)로만 → 클라이언트가 포인트 임의 적립 불가
- `admin_logs`: 읽기는 관리자만, insert는 승인 회원 (감사 로그)
- `notifications`: 본인 것만 읽기/읽음 처리, insert는 승인 회원
- `friend_requests`: 본인 관련 행만, insert는 본인 발신 · 승인 회원 (007)
- `lesson_queue`: 등록은 레슨 승인자 본인, 순번 변경은 관리자 (007)
- `team_rooms`: 개설은 방장 본인, 참여/나가기는 승인 회원 (코트와 동일 신뢰모델) (007)
- `coach_announcements`: 읽기는 승인 회원, 쓰기는 관리자 (007)
- **코트 예약 잠금 (008)**: `courts` 는 `guard_court_columns` 트리거로 보호 — 클라이언트는 `status='reserved'` 전환·`reserved_by` 탈취 불가. 예약은 `rpc_reserve_court`(지오펜스·비용·중복·자격·잔액 검증) 로만. 그 외(경기 시작/종료/반납/합류)는 참여자 본인만 가능

### Storage
- `avatars/{user_id}/avatar.jpg` — 본인 폴더만 업로드/삭제
- 공개 읽기 (썸네일); 원본 고해상도 저장 안 함

### 앱에서 하지 말 것
- 서비스 롤 키
- 포인트/Elo를 클라이언트만 믿고 DB에 쓰기
- base64 프로필 사진을 `profiles` 컬럼에 저장

---

## 구현 체크리스트 (개발)

### Phase 0 — 문서·환경
- [x] `docs/SUPABASE_MIGRATION.md` (이 문서)
- [x] `.env.example` Supabase 변수
- [x] `@supabase/supabase-js`, `expo-image-manipulator` 설치

### Phase 1 — DB 스키마
- [x] `supabase/migrations/001_initial_schema.sql` — 테이블·enum·RLS·보존 트리거
- [x] `supabase/migrations/002_storage_avatars.sql` — Storage 정책
- [ ] Dashboard에서 SQL 실행 (**사용자**)

### Phase 2 — 클라이언트 기반
- [x] `src/lib/supabase.ts` — 클라이언트·`isSupabaseEnabled()`
- [x] `src/constants/dataRetention.ts`
- [x] `src/services/avatarImage.ts` — 리사이즈·압축
- [x] `src/services/supabase/mappers.ts` — DB ↔ 앱 타입
- [x] `src/services/supabase/auth.ts` — 로그인·회원가입·세션
- [x] `src/services/supabase/profiles.ts` — 목록·프로필·아바타 업로드
- [x] `src/services/supabase/courts.ts` — 코트 로드·Realtime
- [x] `src/services/supabase/init.ts` — 앱 시작 시 hydrate

### Phase 3 — 스토어 연동 (하이브리드)
- [x] `authStore` — Supabase 시 async login/register/logout, 출석·일정·재실관 동기화
- [x] `courtStore` — Supabase Realtime 구독, 예약 취소 환불(self kind)
- [x] `app/_layout.tsx` — Supabase init 분기
- [x] `pointStore` — `rpc_adjust_points` 쓰기 + 하이드레이트 (`src/services/supabase/points.ts`)
- [x] `notificationStore` — 경기·청소·알림 쓰기/읽기 (`matches.ts`·`submissions.ts`·`notifications.ts`)
- [x] `adminLog` — `admin_logs` 쓰기/읽기 (`adminLogs.ts`)
- [x] `friendStore`·`lessonStore`·`lobbyStore`·`coachingStore` — `social.ts` 연동 + Realtime (007)

### Phase 4 — RPC·보안 강화
- [x] `rpc_adjust_points` — 본인/관리자 권한 검증 + 잔액 원자적 갱신 (005·006)
- [x] `guard_profile_columns` 트리거 — 포인트·엘로·등급 등 클라이언트 직접 조작 차단 (005)
- [x] 경기 확정/철회 시 엘로·전적을 프로필에 반영 (`updateProfileStatsRemote`)
- [x] **포인트 적립 서버 검증** — `rpc_check_in`·`rpc_submit_cleaning`·`rpc_refund_court` (006)
- [x] **`rpc_reserve_court`** — 코트 예약 전체를 서버 검증 + `guard_court_columns` 트리거로 직접 조작 차단 (008)

### Phase 4-1 — 실시간 확대 (006·007·008)
- [x] 친구·레슨대기열·모집방·코치공지 Realtime 구독 (`init.ts`)
- [x] 알림·경기결과 Realtime 구독 (다른 기기/관리자 화면 즉시 반영)
- [x] 포인트내역·출석·청소·관리자로그 Realtime 구독 (008)

### Phase 5 — 정리
- [ ] `EXPO_PUBLIC_SYNC_URL` 미사용 시 sync-server 비활성 문서화
- [ ] `PRODUCT_SPEC.md` 백엔드 섹션 갱신
- [ ] 프로덕션 EAS 빌드 시 env 주입

---

## 로컬 ↔ Supabase 모드

| 환경 변수 | 동작 |
|-----------|------|
| `EXPO_PUBLIC_SUPABASE_URL` + `ANON_KEY` 설정 | **Supabase 모드** — Auth·DB·Realtime |
| 미설정 | **로컬 모드** — AsyncStorage + 선택적 sync-server (기존) |

개발 중에는 로컬로 두고, Supabase 키만 넣으면 전환됩니다.

---

## GitHub 연동 (자동 마이그레이션)

코드는 GitHub에 올리고, Supabase가 `supabase/migrations/` 를 자동 적용하게 할 수 있습니다.

### 내가 대신 못 하는 것
- Supabase / GitHub **계정 로그인** (본인만 가능)
- GitHub에 **push** (이 PC에 git remote가 아직 없음)

### 당신이 할 일

**A. 코드를 GitHub에 올리기**
1. GitHub에서 `badmin` 저장소 생성 (또는 Dropsite 연동용 repo)
2. 터미널에서 (저장소 URL은 본인 것으로 교체):

```bash
git remote add origin https://github.com/본인아이디/badmin.git
git add supabase/ docs/ src/ app/ ...
git commit -m "Add Supabase migrations and client integration"
git push -u origin main
```

**B. Supabase ↔ GitHub 연결**
1. Supabase Dashboard → **Project Settings** → **Integrations** → **GitHub**
2. 저장소 선택 → `supabase/migrations` 경로 확인
3. 이후 `main`에 push하면 마이그레이션이 자동 적용됨

> 지금은 SQL Editor에서 `complete_after_enums.sql` 한 번 수동 실행하는 게 더 빠릅니다. GitHub 연동은 이후 스키마 변경용으로 쓰면 됩니다.

---

## 트러블슈팅

| 증상 | 확인 |
|------|------|
| `relation "public.profiles" does not exist` LINE 40 | **원인**: 예전 001에서 함수가 테이블보다 먼저 생성됨 → **`supabase/complete_after_enums.sql` 실행** (001 수정됨) |
| `type "membership_tier" already exists` | enum은 이미 있음 → `complete_after_enums.sql`만 실행 (001 전체 재실행 X) |
| 로그인 실패 | Auth → Users에 계정 있는지, 이메일 형식 `{학번}@badmin.dgist.internal` |
| RLS 오류 | `member_status = approved'` 인지, 관리자 승인 SQL 실행 |
| 코트 안 보임 | `courts` 테이블 9행 seed 되었는지 |
| 아바타 업로드 실패 | `avatars` 버킷 + `002_storage_avatars.sql` 정책 |
| Realtime 안 됨 | Dashboard → Database → Replication → `courts` publication |

---

## 참고 파일

- 스키마: `supabase/migrations/`
- 클라이언트: `src/lib/supabase.ts`, `src/services/supabase/`
- 기존 동기화 (로컬 모드): `server/sync-server.mjs`
