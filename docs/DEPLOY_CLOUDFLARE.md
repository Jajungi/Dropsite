# Cloudflare Pages 배포 가이드

Expo 웹(정적) + Supabase 백엔드를 Cloudflare Pages로 배포합니다.
서버(`sync-server`)는 배포하지 않습니다 — Supabase가 백엔드입니다.

---

## 배포 설정값 (Cloudflare 대시보드 입력)

| 항목 | 값 |
|------|-----|
| Framework preset | `None` |
| Build command | `npx expo export -p web` |
| Build output directory | `dist` |
| Node version | `20` (환경변수 `NODE_VERSION=20`) |

### 환경 변수 (Environment variables) — 필수

`.env`는 git에 올라가지 않으므로 Cloudflare에 직접 넣어야 합니다.

```
EXPO_PUBLIC_SUPABASE_URL       = https://xndodghcmedkkaurbnab.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY  = (.env 의 anon key 값)
NODE_VERSION                   = 20
```

> Production / Preview 두 환경 모두에 동일하게 넣어 주세요.

---

## 1단계 — GitHub에 코드 올리기

GitHub 웹에서 빈 저장소를 하나 만든 뒤(README 체크 해제), 아래 실행:

```bash
git add .
git commit -m "deploy: cloudflare pages ready"
git branch -M main
git remote add origin https://github.com/<내아이디>/<저장소>.git
git push -u origin main
```

> 이미 커밋은 되어 있으니, remote 추가 + push만 하면 됩니다.

---

## 2단계 — Cloudflare Pages 연결

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**
2. **Connect to Git** → GitHub 인증 → 저장소 선택
3. 위 "배포 설정값" 표대로 입력
4. **Environment variables**에 위 3개 추가
5. **Save and Deploy**
6. 몇 분 후 `https://<프로젝트명>.pages.dev` 링크 생성

이후 `git push` 할 때마다 자동 재배포됩니다.

---

## 3단계 — Supabase에 배포 URL 등록 (필수)

Supabase Dashboard → **Authentication → URL Configuration**

- **Site URL**: `https://<프로젝트명>.pages.dev`
- **Redirect URLs**: 위와 동일 주소 추가

안 하면 로그인/게스트 로그인이 배포 환경에서 막힐 수 있습니다.

---

## 4단계 — 배포 후 점검

- [ ] 로그인 / 회원가입
- [ ] 게스트 입장 (010 마이그레이션 적용 + Anonymous sign-ins ON 필요)
- [ ] 코트 예약
- [ ] 새로고침 시 404 안 뜨는지 (→ `_redirects`가 처리)
- [ ] 폰에서 접속 후 "홈 화면에 추가" (PWA)

---

## 참고

- `public/_redirects` : SPA 딥링크/새로고침 fallback (Cloudflare가 자동 인식)
- 커스텀 도메인: Pages → Custom domains 에서 무료 연결 가능
- 로컬 빌드 확인: `npx expo export -p web` → `npx serve dist`
