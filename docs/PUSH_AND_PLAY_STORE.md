# 푸시 알림 + Google Play 배포 가이드

**마지막 갱신**: 2026-07-08

앱 안 알림(알림함/토스트/사이렌)은 이미 동작합니다.  
이 문서는 **앱이 꺼져 있어도 오는 원격 푸시**와 **Google Play 출시**를 정리합니다.

| 구성요소 | 파일 | 역할 |
|----------|------|------|
| 토큰 등록 | `src/services/pushNotifications.ts` | 로그인 시 Expo 푸시 토큰 → `push_tokens` |
| 등록 연결 | `app/_layout.tsx` | 정회원 로그인 시 자동 등록 |
| DB | `supabase/015_push_tokens.sql` / `.ready.sql` | 테이블·RLS·트리거 |
| 발송 | `supabase/functions/send-push` | Expo Push API 호출 |
| 빌드 | `eas.json`, `app.json` | preview APK · production AAB |

스토어 문구: [STORE_LISTING.md](./STORE_LISTING.md) · 개인정보: [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)

---

## 1단계 — Expo(EAS) (보통 완료됨)

```bash
npm install -g eas-cli
eas login
eas init   # 이미 projectId가 있으면 생략
```

`app.json` → `extra.eas.projectId` 가 실제 UUID여야 합니다. (REPLACE 플레이스홀더면 안 됨)

---

## 2단계 — Firebase(FCM) + EAS 자격증명

1. Firebase 콘솔 → Android 앱 패키지 **`kr.ac.dgist.badmin`**
2. `google-services.json` → 프로젝트 루트 (`app.json`의 `googleServicesFile`)
3. **서비스 계정** → 새 비공개 키 JSON 다운로드  
   (`*firebase-adminsdk*.json` — **Git에 올리지 말 것**, `.gitignore`됨)
4. FCM 연결:
   ```bash
   eas credentials
   # Android → production → Google Service Account
   # → Push Notifications (FCM V1) → Upload service account key
   ```
   ⚠️ `google-services.json`만으로는 부족합니다. **adminsdk JSON**이 필요합니다.

---

## 3단계 — Supabase

1. (필요 시) `011`~`014` 적용 후:
   - `015_push_tokens.ready.sql` — `{SERVICE_ROLE_KEY}`만 본인 service_role로 바꿔 SQL Editor에서 Run  
   - **키를 Git에 커밋하지 말 것**
2. Edge Function:
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase functions deploy send-push
   ```

대안: Dashboard **Database → Webhooks** 에서 `notifications` INSERT → `send-push`.

---

## 4단계 — 빌드

```bash
# 실기기 테스트용 APK
eas build -p android --profile preview

# Play 스토어용 AAB
eas build -p android --profile production
```

- 푸시는 **실기기**에서만 (에뮬·웹 X)
- 로그인 → 알림 허용 → `push_tokens`에 행이 생기는지 확인

빌드 목록: https://expo.dev/accounts/go_pro/projects/badmin/builds

---

## 5단계 — Google Play

1. Play Console 가입 (일회 $25)
2. 앱 생성 · 패키지 `kr.ac.dgist.badmin`
3. **내부 테스트**에 AAB 업로드
4. 스토어 등록정보: [STORE_LISTING.md](./STORE_LISTING.md)
5. 개인정보처리방침 URL: `https://<Pages도메인>/privacy`
6. (선택) `eas submit -p android --latest` — Play 서비스 계정 JSON 필요

---

## 동작 흐름

```
이벤트 → notifications INSERT
  → 트리거/웹훅 → send-push
  → push_tokens 조회 → Expo Push → FCM → 기기
```

상세 다이어그램: [ARCHITECTURE.md](./ARCHITECTURE.md)

## 문제 해결

| 증상 | 원인 후보 |
|------|-----------|
| 토큰 없음 | projectId·실기기·알림 권한·게스트 계정 |
| 푸시 안 옴 | FCM V1 미연결, 트리거 키/URL, send-push 미배포 |
| iOS | APNs·Apple 개발자 계정 별도 (Play만이면 불필요) |
