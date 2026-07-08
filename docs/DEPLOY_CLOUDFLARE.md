# Cloudflare Pages 배포 가이드 (Dropsite)

**마지막 갱신**: 2026-07-08  
저장소: https://github.com/Jajungi/Dropsite

초기 연결이 끝난 경우: **Git push → Pages가 `main`을 자동 빌드**하면 됩니다.  
아래는 처음 세팅하거나 빌드가 깨졌을 때 참고용입니다.

개인정보 페이지: 배포 후 `https://<도메인>/privacy`  
아키텍처: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 0단계 — GitHub에 코드 올리기 (처음 한 번)

Cloudflare는 **빈 저장소로는 배포할 수 없습니다.** 아래를 터미널에서 실행하세요.

```powershell
cd "C:\Users\정명진\Documents\Project\badmin"

# git 신원 (본인 정보로 한 번만)
git config user.name "Jajungi"
git config user.email "본인이메일@example.com"

# 커밋 + push
git commit -m "feat: 게스트 모드 + Cloudflare Pages 배포 준비"
git branch -M main
git remote add origin https://github.com/Jajungi/Dropsite.git
git push -u origin main
```

> `remote origin already exists` 가 나오면:
> `git remote set-url origin https://github.com/Jajungi/Dropsite.git`

GitHub 저장소 페이지에서 파일들이 보이면 성공입니다.

---

## 1단계 — Cloudflare 가입 / 로그인

1. https://dash.cloudflare.com 접속
2. 계정 없으면 **Sign up** (이메일 가입 가능, 도메인 없어도 됨)
3. 로그인 후 대시보드 화면으로 이동

---

## 2단계 — Pages 프로젝트 만들기

### 2-1. 메뉴 이동

1. 왼쪽 사이드바에서 **Workers & Pages** 클릭  
   (안 보이면 **Account home** 아래 **Build** 섹션 확인)
2. 오른쪽 상단 **Create** 버튼 클릭
3. **Pages** 탭 선택
4. **Connect to Git** 클릭

### 2-2. GitHub 연결

1. **Connect GitHub** (또는 GitHub 아이콘) 클릭
2. GitHub 로그인 창 → **Authorize Cloudflare** 허용
3. 저장소 목록에서 **Jajungi/Dropsite** 선택 → **Begin setup**

### 2-3. 빌드 설정 (Set up builds and deployments)

아래 표를 **그대로** 입력하세요.

| 화면 항목 | 입력값 |
|-----------|--------|
| **Project name** | `dropsite` (원하는 이름, URL이 `dropsite.pages.dev` 가 됨) |
| **Production branch** | `main` |
| **Framework preset** | `None` (또는 No framework) |
| **Build command** | `npm run build:web` |
| **Build output directory** | `dist` |
| **Root directory** | 비워두기 (기본 `/`) |

> Framework preset을 Auto로 두면 잘못 잡힐 수 있어요. **반드시 None**.
>
> ⚠️ **Build command는 반드시 `npm run build:web`** 여야 합니다. 그냥 `npx expo export -p web`
> 만 쓰면, Expo가 폰트를 `dist/assets/node_modules/...` 아래에 넣는데 Cloudflare Pages는
> `node_modules` 폴더를 배포에서 제외해버려서 **아이콘/폰트가 전부 깨집니다.**
> `npm run build:web` 은 export 후 `scripts/cloudflare-fixup.mjs` 를 돌려 이 폴더 이름을
> 바꾸고 참조를 고쳐줍니다.

### 2-4. 환경 변수 (Environment variables) — 필수!

같은 화면 아래 **Environment variables (advanced)** 를 펼칩니다.

**Add variable** 로 아래 3개를 **각각** 추가:

| Variable name | Value |
|---------------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://xndodghcmedkkaurbnab.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` 파일에 있는 anon key 전체 (eyJ... 로 시작) |
| `NODE_VERSION` | `20` |

- **Type**: Plain text (Secret 아니어도 됨, anon key는 공개용 키)
- Production / Preview 둘 다 넣으라는 옵션이 있으면 **둘 다** 체크

> `.env`는 GitHub에 안 올라가므로 **Cloudflare에 직접 넣는 것**이 맞습니다.

### 2-5. 배포 시작

1. **Save and Deploy** 클릭
2. **Building** 로그가 뜸 (2~5분 소요)
3. 성공하면 **Visit site** 또는 주소: `https://dropsite.pages.dev`  
   (Project name에 따라 `https://<이름>.pages.dev`)

### 2-6. 빌드 실패 시

**Deployments** 탭 → 실패한 배포 → **View build log** 확인.

자주 나는 원인:
- 환경 변수 누락 → Supabase URL/KEY 다시 추가
- `NODE_VERSION` 없음 → Node 20 추가
- GitHub에 코드 없음 → 0단계 push 다시

---

## 3단계 — Supabase에 배포 URL 등록 (로그인 필수)

배포된 주소를 Supabase에 알려줘야 로그인이 됩니다.

1. https://supabase.com/dashboard → 프로젝트 선택
2. 왼쪽 **Authentication** → **URL Configuration**
3. 수정:

| 항목 | 값 |
|------|-----|
| **Site URL** | `https://dropsite.pages.dev` (본인 Pages 주소) |
| **Redirect URLs** | 같은 주소 추가 (Add URL) |

4. **Save**

---

## 4단계 — 동작 확인

- [ ] `https://dropsite.pages.dev` 접속 → 로그인 화면
- [ ] 회원 로그인 / 게스트 입장
- [ ] 코트 화면 로드
- [ ] `/profile` 새로고침 시 404 안 뜨는지

---

## 이후 업데이트 방법

코드 수정 후:

```powershell
git add .
git commit -m "update: ..."
git push
```

→ Cloudflare가 자동으로 다시 빌드·배포합니다 (1~3분).

---

## Cloudflare 화면에서 환경 변수 나중에 수정하려면

1. **Workers & Pages** → 프로젝트 **dropsite** 클릭
2. **Settings** 탭
3. **Environment variables** → Edit variables
4. 저장 후 **Deployments** → **Retry deployment** 또는 새 push

---

## 참고

- 공유 링크: `https://dropsite.pages.dev` (GitHub 주소 아님)
- PWA: 폰 브라우저 → 홈 화면에 추가
- 커스텀 도메인: Pages → **Custom domains** 에서 연결 가능
