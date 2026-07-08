# Cloudflare Pages 배포

**문서 버전**: 2026-07-08  
**저장소**: https://github.com/Jajungi/DGISTDrop

| 항목 | 값 |
|------|-----|
| 개인정보처리방침 | `https://<도메인>/privacy` |
| 시스템 구성 | [ARCHITECTURE.md](./ARCHITECTURE.md) |

`main` 브랜치 push 시 Pages가 자동으로 빌드·배포한다.

---

## 1. GitHub 연동

```powershell
cd "<프로젝트-루트>"
git branch -M main
git remote add origin https://github.com/Jajungi/DGISTDrop.git
git push -u origin main
```

기존 remote가 있는 경우: `git remote set-url origin https://github.com/Jajungi/DGISTDrop.git`

---

## 2. Pages 프로젝트

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. GitHub 저장소 **Jajungi/DGISTDrop** 연결

### 빌드 설정

| 항목 | 값 |
|------|-----|
| Project name | `dgistdrop` (또는 Cloudflare에서 연결한 프로젝트명). URL은 `<name>.pages.dev` |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run build:web` |
| Build output directory | `dist` |
| Root directory | `/` (기본) |

`npm run build:web`은 `expo export -p web` 이후 `scripts/cloudflare-fixup.mjs`를 실행한다.  
`npx expo export -p web`만 사용하면 폰트·아이콘이 `dist/.../node_modules/...`에 위치하여 Pages 배포에서 제외될 수 있다.

### 환경 변수

| 이름 | 값 |
|------|-----|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon public 키 |
| `NODE_VERSION` | `20` |

Production·Preview 환경에 동일하게 설정한다. `.env`는 Git에 포함되지 않으므로 Cloudflare Dashboard에 등록한다.

### 배포

**Save and Deploy** 후 성공 시 `https://<project-name>.pages.dev`로 제공된다.

빌드 실패 시 Deployments → 해당 배포 → build log에서 환경 변수·Node 버전·저장소 내용을 확인한다.

---

## 3. Supabase Auth URL

| 항목 | 값 |
|------|-----|
| Site URL | Pages 배포 URL |
| Redirect URLs | 동일 URL |

Dashboard → Authentication → URL Configuration

---

## 4. 검증

| 항목 | 기대 결과 |
|------|-----------|
| 루트 URL | 로그인 화면 |
| 회원·게스트 로그인 | 세션 성립 |
| 코트 화면 | 9코트 로드 |
| `/privacy` | 개인정보처리방침 표시 |

---

## 5. 이후 배포

```powershell
git add .
git commit -m "<메시지>"
git push
```

Cloudflare가 자동 재배포한다.

환경 변수 변경: Workers & Pages → 프로젝트 → Settings → Environment variables → 저장 후 재배포.

---

## 부가 사항

| 항목 | 내용 |
|------|------|
| PWA | 모바일 브라우저에서 홈 화면 추가 가능 |
| 커스텀 도메인 | Pages → Custom domains |
