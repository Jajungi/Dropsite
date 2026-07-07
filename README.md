# Drop · DI GIST 배드민턴 동아리 통합 예약 시스템

React Native (Expo) 기반의 모바일·웹 동시 지원 배드민턴 동아리 예약 및 매칭 플랫폼입니다.
백엔드는 Supabase(Postgres · Auth · Realtime · Storage)를 사용합니다.

**배포 링크:** `https://<프로젝트명>.pages.dev` (Cloudflare Pages)

## 주요 기능

- **활동 시간 기반 시스템 전환** — 활동 시간에만 예약/매칭 활성화
- **위치 기반 인증** — 디지스트 S1 체육관 반경 500m 이내에서만 주요 기능 사용
- **3×3 코트 현황판** — 9개 코트 실시간 상태, 게임 수 진행바, 합류/반납
- **게스트 모드** — 이름만 입력해 임시 입장, 코트 예약·모집방 참여·이용 안내 열람 가능 (포인트·친구·랭크·기록은 제한)
- **팀 빌딩 로비** — 친구 스케줄, 랭크 필터, 모집방
- **마이페이지** — Elo 추이, 승률, 청소 기여 랭킹
- **관리자 패널** — 회원 승인, 경기 결과 확정, 레슨 대기열, 알림 패널, 개발자 모드
- **레슨 사이렌 알림** — 다음 차례 시 전체 화면 알림 + 진동
- **실시간 동기화** — 코트·프로필·소셜·알림·포인트 등 Supabase Realtime 반영

## 시작하기

```bash
npm install
npm start        # Expo 개발 서버
npm run web      # 웹 (PWA)
npm run android  # Android
npm run ios      # iOS (macOS 필요)
```

## Supabase 설정 (필수)

클라우드 DB·인증·실시간 동기화. 상세 체크리스트: **[docs/SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md)**

1. [supabase.com](https://supabase.com)에서 프로젝트 생성 (리전: Seoul 권장)
2. SQL Editor에서 마이그레이션 순서대로 실행:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_avatars.sql`
   - `supabase/005_write_policies.sql` ~ `010_fix_anonymous_user_trigger.sql`
3. `avatars` Storage 버킷 생성
4. **Authentication → Providers → Anonymous sign-ins** 활성화 (게스트 모드용)
5. `.env`에 URL·anon key 설정 후 `npx expo start -c`

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 온라인 배포 (Cloudflare Pages)

GitHub 저장소를 Cloudflare Pages에 연결해 배포합니다.
상세 가이드: **[docs/DEPLOY_CLOUDFLARE.md](docs/DEPLOY_CLOUDFLARE.md)**

| 항목 | 값 |
|------|-----|
| Build command | `npx expo export -p web` |
| Build output directory | `dist` |
| 환경 변수 | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `NODE_VERSION=20` |

배포 후 Supabase → **Authentication → URL Configuration**의 Site URL을 배포 주소로 등록해야 로그인이 됩니다.

### 로컬 개발용 동기화 서버 (Supabase 미사용 시)

Supabase 없이 여러 기기를 맞추려면:

```bash
npm run server   # 터미널 1 — 동기화 서버
npm run web      # 터미널 2 — .env에 EXPO_PUBLIC_SYNC_URL 설정
```

서버 없이도 **같은 브라우저 탭** 간에는 로컬 저장소로 자동 동기화됩니다.
Supabase가 설정되면 sync-server는 사용하지 않습니다.

## 앱 배포

- **PWA** — 배포된 웹을 폰 브라우저에서 "홈 화면에 추가"
- **Android APK** — `eas build --platform android --profile preview`
- **스토어 출시** — `eas build` → `eas submit` (App Store / Play Store)

## 프로젝트 구조

```
src/
  types/          # TypeScript 타입 정의
  constants/      # 상수, 가이드 콘텐츠, 포인트 규칙
  services/       # 비즈니스 로직 + Supabase 연동 (services/supabase)
  stores/         # Zustand 상태 관리
  hooks/          # 커스텀 훅
  components/     # UI 컴포넌트
  utils/          # 반응형·게스트 접근 등 유틸
  theme/          # 디자인 토큰
app/
  (tabs)/         # 메인 탭 화면
  login.tsx       # 로그인 / 회원가입 / 게스트
supabase/         # SQL 마이그레이션
```

## 개발자 모드

위치 인증 우회 등 테스트 기능은 **관리자 패널 → 개발자 모드**에서 토글합니다.
(무한 포인트 모드, 데모 모드 등 — 실제 운영 시 꺼둔 상태 유지)

## 기술 스택

- Expo SDK 57 + Expo Router
- TypeScript
- Supabase (Postgres · Auth · Realtime · Storage)
- Zustand (상태 관리)
- React Native Reanimated (애니메이션)
- expo-location (지오펜싱) · expo-haptics (햅틱)
