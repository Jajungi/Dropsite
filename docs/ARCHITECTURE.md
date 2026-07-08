# Drop 시스템 아키텍처

**문서 버전**: 2026-07-08  
**대상**: Drop 웹 클라이언트, Android 클라이언트, Supabase 백엔드의 구성 및 데이터 흐름

관련 문서: [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) · [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) · [PUSH_AND_PLAY_STORE.md](./PUSH_AND_PLAY_STORE.md)

---

## 1. 시스템 구성

```mermaid
flowchart TB
  subgraph Clients
    Web["웹<br/>Cloudflare Pages"]
    Android["Android 앱<br/>EAS APK/AAB"]
  end

  subgraph App["클라이언트 애플리케이션<br/>Expo Router + Zustand"]
    UI["화면 app/"]
    Stores["stores/"]
    Services["services/"]
  end

  subgraph Backend["Supabase"]
    Auth["Auth<br/>학번·게스트"]
    DB["Postgres + RLS"]
    RPC["Security Definer RPC"]
    RT["Realtime"]
    Storage["Storage avatars"]
    Edge["Edge Function<br/>send-push"]
  end

  subgraph Push
    ExpoPush["Expo Push API"]
    FCM["FCM V1"]
  end

  Web --> UI
  Android --> UI
  UI --> Stores --> Services
  Services --> Auth
  Services --> RPC
  Services --> DB
  RT -.->|"구독 변경"| Stores
  DB -->|"notifications INSERT"| Edge
  Edge --> ExpoPush --> FCM --> Android
  Services --> Storage
```

### 설계 원칙

- 포인트 적립, 코트 예약, 출석 등 민감 쓰기는 클라이언트에서 테이블을 직접 수정하지 않으며, 서버 RPC가 지오펜스·비용·권한을 검증한다.
- 다수 클라이언트가 동일 리소스를 조회할 때 Supabase Realtime으로 코트·프로필·알림 상태가 동기화된다.
- `EXPO_PUBLIC_SUPABASE_*`가 설정된 환경에서는 Supabase를 사용한다. 미설정 시 로컬 AsyncStorage 및 선택적 동기화 서버로 동작한다. 프로덕션 배포는 Supabase를 사용한다.

---

## 2. 부팅 및 인증

```mermaid
flowchart TD
  Start[앱 실행 _layout] --> Env{Supabase<br/>URL+anon?}
  Env -->|yes| InitSB[initSupabaseApp<br/>세션·프로필·Realtime 구독]
  Env -->|no| InitLocal[hydrate + 선택 sync 서버]
  InitSB --> Push{네이티브 and<br/>비게스트?}
  Push -->|yes| RegToken[registerPushTokenForUser]
  Push -->|no| Ready[화면 가드]
  RegToken --> Ready
  InitLocal --> Ready
  Ready --> Guard{useAuthGuard<br/>세션?}
  Guard -->|없음| Login[/login]
  Guard -->|있음| Tabs[탭 화면]
```

### 인증 방식

| 방식 | 동작 | 비고 |
|------|------|------|
| 학번 회원 | 가상 이메일 `drop-{학번}@example.com` + 비밀번호 | 마이그레이션 `013` 적용 후 신규 가입은 준회원·승인 상태로 생성 |
| 게스트 | Anonymous Auth + `rpc_setup_guest_profile` | 코트 예약·이용 안내. 포인트·친구·랭크 제한 |
| 관리자 | `membership_tier = admin` | `/admin` 및 운영 RPC |

공개 경로: `/login`, `/privacy`

---

## 3. 코트 예약 · 합류

```mermaid
sequenceDiagram
  participant U as 사용자(웹/앱)
  participant Store as courtStore
  participant RPC as rpc_reserve_court
  participant DB as courts / points
  participant RT as Realtime
  participant Others as 다른 클라이언트

  U->>Store: 예약(코트,모드,게임수)
  Store->>Store: 클라이언트 지오펜스·UI 낙관 반영
  Store->>RPC: 서버 예약 요청
  RPC->>RPC: 500m·잔액·피크·코치코트자격 검증
  RPC->>DB: 코트 상태 + 포인트 차감
  DB-->>RT: row change
  RT-->>Others: 코트 맵 갱신
  RT-->>Store: 확정 상태 동기화
```

**합류**: 신청 → 코트 `join_requests` → 호스트 수락 → 인원 반영 → (해당 시) `notifications` insert → 원격 푸시.

**경기 점수**: 점수 입력 시 Elo·전적·포인트 반영. 일일 자동 반영 한도 초과 시 관리자 승인. 난타(`nanta`)는 Elo 미반영.

---

## 4. 출석 · 포인트

```mermaid
flowchart LR
  CheckIn[출석] --> Geo{지오펜스 OK?}
  Geo -->|no| Fail[거절]
  Geo -->|yes| RPC1[rpc_check_in]
  RPC1 --> Pts[포인트·isAtGym]
  Pts --> Friends[친구 목록 정렬]

  Clean[청소/네트 인증] --> RPC2[rpc_submit_cleaning]
  Reserve[코트 예약] --> Spend[rpc_reserve_court 차감]
  Cancel[예약 취소] --> Refund[rpc_refund_court]
```

적립 금액은 서버가 결정한다. 클라이언트는 `profiles.points`를 직접 상향할 수 없다 (`guard_profile_columns`, `006_secure_points`).

---

## 5. 레슨 · 코치 코트

```mermaid
flowchart TD
  Apply[레슨 신청 pending] --> Admin[관리자 입금 확인]
  Admin -->|승인| Queue[대기열 등록]
  Admin -->|거절| End1[종료]
  Queue --> Next[next]
  Next --> Siren[사이렌·알림]
  Siren --> Coach[3번 코치코트 예약]
  Coach --> Active[레슨 active]
  Active --> Done[완료]
  Done --> Promote[다음 next]
```

코치 공지 작성 권한: `is_coach` 또는 `admin` (`012_coach_access`).

---

## 6. 알림 · 원격 푸시

```mermaid
sequenceDiagram
  participant App as 앱/관리자 액션
  participant DB as notifications
  participant Trig as pg_net / Webhook
  participant FN as send-push
  participant Tokens as push_tokens
  participant Expo as Expo Push
  participant Phone as Android 기기

  App->>DB: INSERT 알림
  DB->>Trig: AFTER INSERT
  Trig->>FN: HTTP POST
  FN->>Tokens: user_id 토큰 조회
  FN->>Expo: 메시지 발송
  Expo->>Phone: FCM 전달
  Note over App,DB: 웹·앱 UI는 Realtime으로 알림함 갱신
```

| 구분 | 범위 |
|------|------|
| 인앱 알림 | 알림함·토스트·사이렌. 웹·앱 공통 (`notificationStore`) |
| 원격 푸시 | 네이티브 앱에서 알림을 허용한 경우. OS 푸시는 웹 단독 환경에서 제공되지 않음 |

---

## 7. 배포

```mermaid
flowchart LR
  Code[GitHub main] --> CF[Cloudflare Pages<br/>npm run build:web]
  Code --> EAS[EAS Build]
  EAS --> APK[preview APK]
  EAS --> AAB[production AAB]
  AAB --> Play[Google Play]
  CF --> UsersW[브라우저]
  APK --> UsersA[내부 배포 단말]
  Play --> UsersP[스토어 이용자]
```

| 환경 변수 | 용도 |
|-----------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 공개 anon 키 (RLS 적용) |
| `service_role` | SQL 트리거·Edge Function 전용. 클라이언트 및 공개 저장소에 포함하지 않음 |

---

## 8. 데이터 · 권한

```mermaid
flowchart TB
  Anon[anon 키 접속] --> RLS[RLS 정책]
  RLS --> ReadOK[허용된 읽기]
  RLS --> WriteBlock[민감 쓰기 차단]
  WriteBlock --> RPCOnly[허용된 RPC]
  RPCOnly --> AdminRPC[is_admin / is_coach]
```

스키마 적용 순서: `001` / `complete_after_enums` → `002` Storage → `005`–`015`.  
상세: [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md).

---

## 9. 화면 ↔ 백엔드

| 경로 | Store | 백엔드 |
|------|--------|--------|
| `/` | `courtStore` | `rpc_reserve_court`, courts Realtime |
| `/friends` | `friendStore`, profiles | `friend_requests`, attendance |
| `/lobby` | `lobbyStore` | `team_rooms` |
| `/profile` | `authStore`, `pointStore` | check-in, points, matches |
| `/coaching` | `lessonStore`, `coachingStore` | `lesson_queue`, `coach_announcements` |
| `/admin` | admin* | 운영 RPC·로그·리셋 |
| `/privacy` | — | 개인정보처리방침 |
