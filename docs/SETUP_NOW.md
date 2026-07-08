# 운영 현황 및 구성 참조

**문서 버전**: 2026-07-08  
스키마 초기 구축 절차는 [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md)를 따른다.

---

## 구성 완료 항목

| 항목 | 상태 |
|------|------|
| DB 스키마 및 `005`–`014` 패치 | 적용 |
| Storage `avatars` | 적용 |
| Cloudflare Pages (`dgistdrop` ← `Jajungi/DGISTDrop`) | 적용 |
| EAS 프로젝트 (`app.json` projectId) | 적용 |
| Firebase Android · `google-services.json` | 적용 (프로젝트 표시명 DGISTDrop) |
| EAS FCM V1 서비스 계정 | 적용 |
| Edge Function `send-push` | 배포 |
| `015` 푸시 토큰 스키마 | 적용 |
| Supabase 프로젝트명 `DGISTDrop` | 적용 |

---

## 웹

| 항목 | 값 |
|------|-----|
| 호스팅 | Cloudflare Pages (`main` 자동 배포, GitHub `Jajungi/DGISTDrop`) |
| Supabase | 프로젝트 `DGISTDrop` · ref `xndodghcmedkkaurbnab` |
| 환경 변수 | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Auth | Confirm email 비활성, 신규 가입 허용 |
| Redirect | Pages 도메인을 Supabase Auth URL에 등록 |

검증: `npm run setup:check`

---

## Android · 스토어

| 산출물 | 프로필 | 용도 |
|--------|--------|------|
| APK | `preview` | 내부 설치·검증 |
| AAB | `production` | Google Play 업로드 |

스토어 문구: [STORE_LISTING.md](./STORE_LISTING.md)  
개인정보처리방침: [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) · 경로 `/privacy`

---

## 관리자 계정

학번 신규 가입은 마이그레이션 `013` 기준 준회원·승인 상태로 생성된다.  
관리자 승격:

```sql
update public.profiles
set membership_tier = 'admin', member_status = 'approved'
where student_id = '<학번>';
```

참고: `supabase/003_promote_admin.sql`

---

## 원격 푸시 점검

| 조건 | 내용 |
|------|------|
| 클라이언트 | Android 실기기, 알림 권한 허용, 비게스트 로그인 |
| 토큰 | `push_tokens`에 해당 `user_id` 행 존재 |
| 자격증명 | EAS Credentials에 FCM V1 서비스 계정 연결 |
| 서버 | `send-push` 배포, `015` 트리거 URL·키 일치 |

절차: [PUSH_AND_PLAY_STORE.md](./PUSH_AND_PLAY_STORE.md)
