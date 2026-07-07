# 푸시 알림 + Google Play 배포 가이드

앱 안 알림(알림함/토스트/사이렌)은 이미 동작합니다. 이 문서는 **앱이 꺼져 있어도 오는 원격 푸시**와 **Google Play 출시**에 필요한 외부 설정을 정리합니다.

코드는 이미 준비되어 있습니다:

| 구성요소 | 파일 | 역할 |
|----------|------|------|
| 토큰 등록 | `src/services/pushNotifications.ts` | 로그인 시 Expo 푸시 토큰 발급 → `push_tokens` 저장 |
| 등록 연결 | `app/_layout.tsx` | 로그인 사용자 감지 시 자동 등록 |
| DB 테이블 | `supabase/015_push_tokens.sql` | `push_tokens` + RLS + insert 트리거 |
| 발송 함수 | `supabase/functions/send-push/index.ts` | `notifications` insert 시 Expo Push 발송 |
| 빌드 설정 | `eas.json`, `app.json` | Android app-bundle 빌드 |

---

## 1단계 — Expo(EAS) 계정 & projectId

```bash
npm install -g eas-cli
eas login            # Expo 계정 (무료)
eas init             # projectId 발급 → app.json 에 자동 기록
```

- `app.json` 의 `extra.eas.projectId` 값이 `REPLACE_WITH_EAS_PROJECT_ID` 에서 실제 ID로 바뀝니다.
- 바뀌지 않으면 수동으로 붙여 넣으세요.

## 2단계 — Firebase(FCM) 설정 (Android 푸시 필수)

1. https://console.firebase.google.com 에서 프로젝트 생성
2. Android 앱 추가 — 패키지명 **`kr.ac.dgist.badmin`** (app.json 과 동일해야 함)
3. `google-services.json` 다운로드 → **프로젝트 루트**에 저장
   (app.json 이 `./google-services.json` 을 참조합니다)
4. Firebase 프로젝트 설정 → 클라우드 메시징에서 FCM 사용 설정
5. EAS 에 FCM 자격증명 연결:
   ```bash
   eas credentials      # Android → Push Notifications → FCM V1 → google-services.json 업로드
   ```

## 3단계 — Supabase DB & Edge Function

1. SQL Editor 에서 순서대로 실행 (아직 안 했다면 011~014 먼저):
   ```
   supabase/015_push_tokens.sql
   ```
   실행 전 파일 안의 `{PROJECT_REF}` 와 `{ANON_OR_SERVICE_KEY}` 를 실제 값으로 교체하세요.
   - `{PROJECT_REF}`: Supabase 프로젝트 ref (예: `abcd1234`)
   - `{ANON_OR_SERVICE_KEY}`: service_role 키 (Settings → API)

2. Edge Function 배포:
   ```bash
   supabase login
   supabase link --project-ref {PROJECT_REF}
   supabase functions deploy send-push
   ```
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 는 자동 주입됩니다.

> **대안**: pg_net 트리거 대신 대시보드 **Database → Webhooks** 에서
> `notifications` 테이블 insert → `send-push` 함수 호출로 설정해도 됩니다.
> (이 경우 015 의 트리거 부분은 생략)

## 4단계 — Android 빌드 & 테스트

```bash
# 실기기에서 테스트용 APK
eas build -p android --profile preview

# Play 스토어용 app-bundle(.aab)
eas build -p android --profile production
```

- **원격 푸시는 실기기에서만** 동작합니다 (에뮬레이터·웹 X).
- 설치 후 로그인하면 알림 권한을 묻고, 허용 시 토큰이 `push_tokens` 에 저장됩니다.
- 다른 사람이 내 코트에 합류 신청 / 레슨 차례 / 관리자 공지가 오면 폰 알림이 뜹니다.

## 5단계 — Google Play 출시

1. Google Play Console 가입 (일회성 $25)
2. 앱 생성 → 패키지명 `kr.ac.dgist.badmin`
3. 3단계에서 만든 `.aab` 업로드 (내부 테스트 트랙 권장)
4. 스토어 등록정보(아이콘·스크린샷·개인정보처리방침) 작성
5. 검토 제출

자동 업로드까지 하려면:
```bash
eas submit -p android --latest
```
(Play Console 서비스 계정 JSON 필요)

---

## 동작 흐름 요약

```
이벤트 발생 (합류 신청 등)
  → 앱이 notifications 테이블에 insert (targetUserId 있음)
  → 015 트리거 / Webhook 이 send-push 호출
  → send-push 가 그 유저의 push_tokens 조회
  → Expo Push API 로 발송
  → 상대방 폰에 알림 표시 (앱 꺼져 있어도 O)
```

## 자주 겪는 문제

- **토큰이 안 생김**: `app.json` projectId 미설정 / 웹·에뮬레이터에서 실행 / 알림 권한 거부
- **푸시가 안 옴**: `google-services.json` 누락, FCM 자격증명 미연결, 트리거의 URL·키 오타
- **iOS**: 별도 APNs 인증서·Apple Developer 계정($99/년) 필요 (Play 스토어 목표면 지금은 불필요)
