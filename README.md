# CODE DESTINY (Unified Root)

이 저장소는 **단일 루트 기준(현재 폴더 자체가 프로젝트 루트)** 으로 운영합니다.
중복 루트(`pages`, `workers`)를 분리 운용하지 않고, 원격 `origin/main`을 기준으로 동기화합니다.

## 1) 기본 원칙

- 개발/배포 기준 루트는 이 디렉토리 하나만 사용합니다.
- `git fetch + reset --hard + clean -xfd`를 표준 초기화 플로우로 사용합니다.
- 로컬 실험 파일은 커밋 전 반드시 정리합니다.
- 비밀값은 `.env*`에만 두고, 저장소에는 예제 파일만 유지합니다.

## 2) 요구사항

- Node.js >= 20
- npm (lockfile: `package-lock.json`)
- MongoDB (기존 API 설정 기준)
- Cloudflare 배포 시 API 토큰/프로젝트 관련 환경변수

## 3) 빠른 시작

```bash
npm ci
npm run dev
```

API 서버가 필요한 경우:

```bash
npm run api
```

## 4) 강제 동기화(충돌 복구 표준)

```bash
git fetch --all --prune --tags
BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's#^refs/remotes/origin/##')
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
git clean -xfd
```

Windows PowerShell 예시:

```powershell
git fetch --all --prune --tags
$branch = (git symbolic-ref refs/remotes/origin/HEAD) -replace '^refs/remotes/origin/',''
if (-not $branch) { $branch = 'main' }
git checkout $branch
git reset --hard origin/$branch
git clean -xfd
```

## 5) 프로젝트 구조(바이브 코딩 최적화)

- `app/`: Next.js App Router 페이지 및 라우트
- `public/`: 정적 자산
- `server/`: Express API, 배치/크론 로직
- `scripts/`: 빌드/배포/동기화 자동화 스크립트
- `js/`, `styles/`, `css/`: 레거시/공통 프론트 자산
- `workers/` (하위 경로): 런타임 워커 코드(루트 프로젝트의 일부)
- `admin/`: 관리자 UI/설정 관련 자산
- `docs/`, `Rules/`: 운영 문서/정책

## 6) 자주 쓰는 명령어

```bash
npm run dev
npm run api
npm run build
npm run lint
npm run build:cf
npm run deploy:cf:pages
npm run deploy:cf:worker
```

## 7) 환경 변수 가이드

기본 템플릿:

- `.env.example` -> `.env`
- `.env.cloudflare.example` -> `.env.cloudflare`
- `admin/.env.example` (관리자 포털)

현재 운영에 자주 쓰는 핵심 키:

- `JWT_SECRET`
- `MONGODB_URI`
- `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY`
- `ANTHROPIC_API_KEY`
- `ADMIN_SECRET_HASH`
- `ADMIN_ALLOWED_IPS`
- `CLOUDFLARE_API_TOKEN`
- `CF_PAGES_PROJECT_NAME`
- `CF_PAGES_BRANCH`

## 8) 관리자 포털 메모

- 관리자 포털은 비밀 경로 기반 접근 제어를 사용합니다.
- 민감 응답은 노출 최소화(예: 404 위장) 원칙을 따릅니다.
- 인증/세션/CSRF 관련 정책 변경 시 `server/`와 `admin/`를 함께 검토하세요.

## 9) 협업 규칙

- 대규모 리팩터링 전: 먼저 강제 동기화로 기준 상태를 맞춥니다.
- 기능 작업 후: `npm run lint`와 핵심 시나리오 수동 점검을 수행합니다.
- 배포는 CI/Git 기반 자동화를 우선하고 수동 중복 배포를 피합니다.

