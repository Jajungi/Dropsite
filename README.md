# DI GIST 배드민턴 동아리 통합 예약 시스템

React Native (Expo) 기반의 모바일·웹 동시 지원 배드민턴 동아리 예약 및 매칭 플랫폼입니다.

## 주요 기능

- **활동 시간 기반 시스템 전환** — 화·목 18:30~21:50에만 예약/매칭 활성화
- **위치 기반 인증** — 디지스트 S1 체육관 반경 500m 이내에서만 주요 기능 사용
- **3×3 코트 현황판** — 9개 코트 실시간 상태, 게임 수 진행바, 합류/반납
- **팀 빌딩 로비** — 친구 스케줄, 랭크 필터, 모집방
- **마이페이지** — Elo 추이, 승률, 청소 기여 랭킹
- **관리자 패널** — 회원 승인, 경기 결과 확정, 레슨 대기열
- **레슨 사이렌 알림** — 다음 차례 시 전체 화면 알림 + 진동

## 시작하기

```bash
npm install
npm start        # Expo 개발 서버
npm run web      # 웹 (PWA)
npm run android  # Android
npm run ios      # iOS (macOS 필요)
```

### 여러 기기 실시간 동기화 (개발용)

터미널 1 — 동기화 서버:

```bash
npm run server
```

터미널 2 — 앱 (`.env`에 서버 주소 설정):

```bash
cp .env.example .env
npm run web
```

`.env` 예시:

```
EXPO_PUBLIC_SYNC_URL=http://localhost:3001
```

같은 Wi‑Fi의 폰에서는 `localhost` 대신 PC IP를 사용하세요 (예: `http://192.168.0.10:3001`).

서버 없이도 **같은 브라우저 탭** 간에는 로컬 저장소로 자동 동기화됩니다.

### Supabase (프로덕션 권장)

클라우드 DB·인증·실시간 코트 동기화. 상세 체크리스트: **[docs/SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md)**

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. `supabase/migrations/` SQL 실행 + `avatars` 버킷 생성
3. `.env`에 URL·anon key 설정 후 `npx expo start -c`

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Supabase가 설정되면 로컬 sync-server는 사용하지 않습니다.

## 데모 계정

| 역할 | 학번 | 비밀번호 |
|------|------|----------|
| 회원 | 20240001 | dgist1234 |
| 관리자 | 20230001 | dgist1234 |

## 프로젝트 구조

```
src/
  types/          # TypeScript 타입 정의
  constants/      # 상수, 가이드 콘텐츠
  services/       # 비즈니스 로직 (활동시간, 지오펜스, 포인트, Elo)
  stores/         # Zustand 상태 관리
  hooks/          # 커스텀 훅
  components/     # UI 컴포넌트
  theme/          # 디자인 토큰
app/
  (tabs)/         # 메인 탭 화면
  admin/          # 관리자 패널
```

## 데모 모드

개발/데모 환경에서는 `demoMode: true`로 설정되어 위치 인증 없이 모든 기능을 체험할 수 있습니다. 실제 배포 시 `src/stores/authStore.ts`의 `demoMode`를 `false`로 변경하세요.

## 기술 스택

- Expo SDK 57 + Expo Router
- TypeScript
- Zustand (상태 관리)
- React Native Reanimated (애니메이션)
- expo-location (지오펜싱)
- expo-haptics (햅틱 피드백)
