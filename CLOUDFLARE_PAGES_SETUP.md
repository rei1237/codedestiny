# Cloudflare Pages 배포 설정 가이드

## 1. GitHub Actions 비활성화 완료

Workers 배포 스크립트가 충돌을 일으켜 다음 파일들을 `.bak`으로 변경했습니다:
- `.github/workflows/cloudflare-pages-deploy.yml.bak`
- `.github/workflows/fortune-daily-publish.yml.bak`

## 2. Cloudflare Pages 대시보드 설정

### 2.1 Pages 프로젝트 생성
1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages** 접속
2. **Create a project** → **Connect to Git**
3. GitHub 저장소 `rei1237/codedestiny` 선택
4. **Build settings**:
   - **Build command:** `npx @opennextjs/cloudflare@latest build`
   - **Build output directory:** `.open-next/assets`
   - **Root directory:** `/`

### 2.2 Node.js Version
- **Environment variable:** `NODE_VERSION` = `24`

## 3. 필수 환경 변수 (Pages Dashboard → Settings → Environment variables)

### 필수 (없으면 빌드/런타임 실패)

| 변수명 | 설명 | 예시/형식 |
|--------|------|-----------|
| `NODE_VERSION` | Node.js 버전 | `24` |
| `MONGO_URI` | MongoDB 연결 문자열 | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | JWT 토큰 서명용 비밀키 | `openssl rand -base64 32` 명령으로 생성 |
| `JWT_EXPIRES_IN` | JWT 만료 시간 | `7d` |
| `CSRF_SECRET` | CSRF 토큰용 비밀키 | JWT_SECRET과 동일하게 사용 가능 |

### API 키 (AI/외부 서비스)

| 변수명 | 사용처 |
|--------|--------|
| `GEMINI_API_KEY` | Google Gemini AI |
| `GOOGLE_API_KEY` | Google API |
| `ANTHROPIC_API_KEY` | Claude AI |
| `GOOGLE_OAUTH_CLIENT_ID` | Google 로그인 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google 로그인 |
| `NAVER_OAUTH_CLIENT_ID` | 네이버 로그인 |
| `NAVER_OAUTH_CLIENT_SECRET` | 네이버 로그인 |
| `KAKAO_OAUTH_CLIENT_ID` | 카카오 로그인 |
| `KAKAO_OAUTH_CLIENT_SECRET` | 카카오 로그인 |

## 4. JWT_SECRET 생성 방법

```bash
openssl rand -base64 32
```

또는 Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 5. MongoDB Atlas IP 화이트리스트 설정

Cloudflare Pages는 서버리스 환경으로 IP가 매 요청마다 변경됩니다.

**설정 방법:**
1. MongoDB Atlas Dashboard → **Network Access**
2. **Add IP Address** → **Allow Access from Anywhere** (0.0.0.0/0)
3. **Confirm**

## 6. 도메인 설정

1. Cloudflare Dashboard → **Pages** → `codedestiny` 프로젝트
2. **Custom domains** 탭 → **Set up a custom domain**
3. 도메인 입력 (예: `code-destiny.com`)

## 7. 참고 파일

- `open-next.config.ts` - OpenNext 기본 설정
- `next.config.mjs` - Next.js 설정
- `package.json` - build 스크립트: `npx @opennextjs/cloudflare@latest build`

## 중요: 환경변수 보안

- `.env` 파일은 git에 커밋되지 않습니다 (`.gitignore`에 포함)
- 모든 시크릿 키는 **Cloudflare Dashboard**에서만 설정하세요
- GitHub에 절대 시크릿 키를 커밋하지 마세요
