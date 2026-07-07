# 지금 바로 할 일 (Storage 완료 후)

## 1. Confirm email 끄기 (중요!)

지금 보신 **Email 제공자 팝업 안에는 없습니다.** 팝업을 닫고:

1. 왼쪽 **Authentication** 메뉴 유지
2. **Providers** 말고 아래쪽 항목 중 **Sign In / Sign Up** 클릭  
   (없으면 **Configuration** → **Sign In / Sign Up**)
3. 여기서:
   - **Allow new users to sign up** → **ON**
   - **Confirm email** → **OFF**
4. **Save**

> Confirm email 이 켜져 있으면 가입할 때마다 메일을 보내서 `over_email_send_rate_limit` (429) 오류가 납니다.

### Email 팝업(Providers → Email)에서 하는 것

- **Enable email provider** → ON (이미 됨)
- **Confirm email** 은 이 화면에 **없음** — 위 Sign In / Sign Up 에서 끄세요

---

## 2. API 키 → `.env` (2분)

1. **Project Settings** (왼쪽 아래 톱니) → **API**
2. 복사:
   - **Project URL**
   - **anon public** (Publishable key가 아님 — `anon` 키)
3. 프로젝트 루트 `.env` 열어서 교체:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. 터미널에서 확인:

```bash
npm run setup:check
```

`OK: Supabase env looks valid` 가 나오면 성공.

---

## 3. 앱 재시작

```bash
npx expo start -c
```

---

## 4. 회원가입 + 관리자 승인

1. 앱 → **회원가입** (학번, 이름, 비밀번호)
2. SQL Editor → `supabase/003_promote_admin.sql` 열어서 `본인학번` 바꾼 뒤 **Run**
3. 앱에서 **로그인**

---

## 체크리스트

- [x] DB 스키마 (`complete_after_enums.sql`)
- [x] Storage `avatars` 버킷 + 정책
- [ ] Confirm email OFF
- [ ] `.env` URL + anon key
- [ ] `npx expo start -c`
- [ ] 회원가입 + `003_promote_admin.sql`
