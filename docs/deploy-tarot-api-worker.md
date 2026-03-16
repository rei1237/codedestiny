# 타로 API 연동을 위한 Cloudflare Worker 배포 절차

타로 API(`/api/tarot/draw`, `/api/tarot/reading`)가 동작하려면 **Worker**가 배포되어야 합니다.  
정적 페이지만 배포하는 `deploy:cf:pages`로는 POST 요청이 405가 나므로, 아래 절차대로 **Worker 배포**를 진행하세요.

---

## 1. 사전 요구사항

- **Node.js** 20 이상
- **npm** (또는 pnpm/yarn)
- **Cloudflare 계정** (가입: https://dash.cloudflare.com/sign-up )
- 프로젝트 루트에서 터미널 실행 가능

---

## 2. 프로젝트 설치 및 인증

### 2.1 의존성 설치

```bash
cd c:\Users\Neo\Desktop\CODE-DESTINY-main
npm install
```

### 2.2 Cloudflare 로그인 (최초 1회)

Worker 배포 시 Cloudflare 인증이 필요합니다.

**방법 A – 브라우저 OAuth (로컬에서 수동 배포할 때)**

```bash
npx wrangler login
```

브라우저가 열리면 Cloudflare 계정으로 로그인합니다.

**방법 B – API 토큰 (CI/자동 배포용)**

1. Cloudflare 대시보드 → **My Profile** → **API Tokens**
2. **Create Token** → **Edit Cloudflare Workers** 템플릿 사용 또는 커스텀 권한으로 생성
3. 프로젝트 루트에 `.env.cloudflare` 또는 `.env` 생성 후 다음 한 줄 추가:

   ```env
   CLOUDFLARE_API_TOKEN=여기에_토큰_붙여넣기
   ```

   (또는 `CF_API_TOKEN` 사용 가능)

---

## 3. 빌드만 하기 (배포 전 로컬 확인용)

Worker 배포 전에 빌드가 정상인지 확인하려면:

```bash
npm run build:cf
```

**동작:**

1. `clean:cf` – 이전 Cloudflare 빌드 산출물 정리
2. `build-cloudflare.mjs` – `npx @opennextjs/cloudflare build` 실행  
   - 내부적으로 `next build` 후 OpenNext Cloudflare 빌드
   - `.open-next/` 폴더 생성 (Worker 코드, 서버 함수 등)
3. `prepare-cloudflare-dist.mjs` – `.open-next/assets`를 `dist/`로 복사

**결과:**

- `.open-next/` – Worker 진입점(`worker.js`), 서버 함수, 미들웨어 등
- `dist/` – 정적 에셋(HTML, JS, CSS, 이미지 등)

빌드가 끝나면 `dist`와 `.open-next` 폴더가 있어야 합니다.

---

## 4. Worker 배포 (타로 API 포함 전체 배포)

타로 API가 같은 도메인에서 동작하도록 하려면 **반드시** 이 방식으로 배포합니다.

### 4.1 한 번에 빌드 + 배포

```bash
npm run deploy:cf:worker
```

**동작 순서:**

1. **`.open-next` 존재 여부**
   - 없으면: `npm run build:cf`를 먼저 실행하라고 안내 후 종료  
   - 있으면 다음 단계로 진행

2. **`dist` 존재 여부**
   - 없으면: 자동으로 `npm run build:cf` 실행 후 다시 확인

3. **Worker 배포**
   - `npx wrangler deploy --config wrangler.worker.jsonc` 실행
   - 설정 내용:
     - **main**: `.open-next/worker.js` (API 라우트 포함 서버 로직)
     - **assets.directory**: `./dist` (정적 파일)

4. 배포가 끝나면 터미널에 Workers URL이 출력됩니다.  
   예: `https://code-destiny-web.<계정서브도메인>.workers.dev`

### 4.2 이미 빌드해 둔 경우 (빌드 생략하고 배포만)

이미 `npm run build:cf`를 실행한 상태라면:

```bash
node scripts/deploy-worker.mjs
```

`.open-next`와 `dist`가 있으면 바로 `wrangler deploy`만 실행됩니다.

---

## 5. 배포 후 확인

### 5.1 Worker URL에서 사이트 접속

터미널에 나온 URL(예: `https://code-destiny-web.xxxx.workers.dev`)로 접속해  
메인 페이지와 타로 기능이 정상 동작하는지 확인합니다.

### 5.2 타로 API 직접 호출 테스트

**draw (카드 뽑기):**

```bash
curl -X POST "https://code-destiny-web.xxxx.workers.dev/api/tarot/draw" \
  -H "Content-Type: application/json" \
  -d "{\"spreadType\":\"relationship_six_card\"}"
```

**reading (해석):**

- 위 draw 응답의 `cards`를 사용해 reading 엔드포인트로 POST 요청

정상이면 JSON으로 `{ "ok": true, "spreadType": "...", "cards": [...] }` 형태가 나와야 합니다.

### 5.3 브라우저에서 타로 체험 페이지

사이트에서 타로 러브/재회/연운 등 체험 페이지로 들어가  
카드 뽑기·해석이 끝까지 되면 배포와 API 연동이 정상인 것입니다.

---

## 6. 커스텀 도메인 연결 (선택)

`code-destiny.pages.dev` 또는 `code-destiny.com` 같은 기존 도메인을 Worker에 붙이려면:

1. **Cloudflare 대시보드** → **Workers & Pages**
2. **code-destiny-web** Worker 선택
3. **Settings** → **Domains & Routes** (또는 **Triggers**)
4. **Add Custom Domain** 또는 **Add Route**로 도메인/경로 추가

도메인을 Worker에 연결하면 해당 도메인으로 접속해도 타로 API가 같은 오리진으로 동작합니다.

---

## 7. 두 가지 배포 방식 정리

| 항목           | `deploy:cf:pages`        | `deploy:cf:worker`        |
|----------------|--------------------------|---------------------------|
| 명령           | `npm run deploy:cf:pages` | `npm run deploy:cf:worker` |
| 대상           | Cloudflare **Pages** (정적) | Cloudflare **Workers** (전체) |
| Worker 실행    | 없음                     | 있음                      |
| POST /api/tarot | 405 발생                 | 정상 동작                 |
| 결과 URL 예시  | `xxx.pages.dev`          | `xxx.workers.dev` + 커스텀 도메인 가능 |

타로 API를 쓰려면 **반드시 `deploy:cf:worker`** 를 사용하세요.

---

## 8. 문제 발생 시

- **`.open-next not found`**  
  → `npm run build:cf`를 먼저 실행한 뒤 다시 `npm run deploy:cf:worker`

- **`wrangler deploy` 인증 오류**  
  → `npx wrangler login` 또는 `.env`에 `CLOUDFLARE_API_TOKEN` 설정

- **배포 후에도 타로에서 405**  
  → 실제로 접속한 URL이 Worker URL인지 확인(예: `xxx.workers.dev` 또는 연결한 커스텀 도메인). Pages 전용 URL(`xxx.pages.dev`)만 쓰면 Worker가 없어 405가 납니다.

- **CORS 오류**  
  → 같은 Worker 도메인에서만 호출하면 CORS는 발생하지 않습니다. 다른 도메인에서 API를 부르는 경우에는 Worker에서 CORS 헤더를 추가하는 처리가 필요합니다.
