# 지금 바로 할 일 (현재 운영 상태)

**마지막 갱신**: 2026-07-08

초기 Supabase·Storage 세팅이 끝난 뒤의 **운영·배포 체크**입니다.  
처음부터 DB를 까는 경우 → [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md)

---

## 이미 끝난 것으로 보는 항목

- [x] DB 스키마 + `005`~`014` 보안·소셜 패치
- [x] Storage `avatars`
- [x] Cloudflare Pages 웹 배포
- [x] EAS 프로젝트 연결 (`app.json` projectId)
- [x] Firebase Android + `google-services.json`
- [x] EAS FCM V1 서비스 계정 키
- [x] Edge Function `send-push` 배포
- [x] `015` 푸시 토큰 SQL (대시보드에서 실행)

---

## 웹 확인

1. Cloudflare Pages에 최신 `main` 배포됐는지
2. 환경변수: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. Supabase Auth → **Confirm email OFF**, Sign up ON
4. Auth URL에 Pages 도메인 허용

```bash
npm run setup:check
```

---

## 앱 / 스토어

| 산출물 | Expo Builds |
|--------|-------------|
| 테스트 APK | preview 프로필 — Finished 후 Download |
| 스토어 AAB | production 프로필 — Play 내부 테스트에 업로드 |

스토어 문구·권한 설명: [STORE_LISTING.md](./STORE_LISTING.md)  
개인정보처리방침: [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) · 웹 `/privacy`

---

## 관리자 1명 만들기

신규 학번 가입은 `013` 기준 **자동 승인(준회원)** 입니다.  
본인을 관리자로:

```sql
update public.profiles
set membership_tier = 'admin', member_status = 'approved'
where student_id = '본인학번';
```

(`003_promote_admin.sql` 참고)

---

## 푸시가 안 올 때

1. **실기기** Android 앱 + 알림 허용
2. 로그인 후 `push_tokens` 테이블에 토큰 있는지
3. FCM V1이 EAS Credentials에 연결됐는지
4. `send-push` 배포·SQL 트리거 URL/키가 맞는지

상세: [PUSH_AND_PLAY_STORE.md](./PUSH_AND_PLAY_STORE.md)
