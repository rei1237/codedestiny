# 명령·폴더 구조·기술 스택·수정 금지 목록 (원문)

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## Quick Start (전체 명령)

```bash
npm run dev            # 로컬 개발 서버 (local-auth 포함)
npm run dev:next       # Next.js dev 서버만
npm run build          # UTF-8 콘솔 + Cloudflare 빌드
npm run build:cf       # prebuild:cf && build
npm run lint           # next lint
npm run typecheck      # tsc --noEmit
npm run deploy:cf:pages    # Cloudflare Pages 배포
npm run deploy:cf:worker   # Cloudflare Worker 배포
npm run deploy:cf:opennext # OpenNext 경유 배포
```
`verify:*` / `seed:*` / `migrate:*` 스크립트 다수 존재 — 결제·AI·i18n·보안 회귀 검증용. 관련 기능 수정 시 해당 `verify:*` 먼저 실행.

## Folder Structure

```
app/            # Next.js App Router (라우트, app/api/*, [locale]/)
worker/         # Cloudflare Worker 백엔드 (routes/, lib/ — billing/AI/pdf/music)
lib/            # 공유 라이브러리 (llm-client, mongodb, i18n, payment, vedicSwissChart, vedicCalculator)
components/     # 공용 React 컴포넌트 (yeon/, stories/, ui/, fortune/)
src/features/   # 기능 단위 모듈 (fortune-tea-house, neo-war-room)
pages/          # 레거시 Pages Router (_app, _document, 에러 페이지)
scripts/        # 빌드/배포/검증/마이그레이션 스크립트
apps/mobile/    # Capacitor 래퍼 + Android 네이티브 (java/com/codedestiny/app/, proguard-rules.pro)
js/             # 정적 셸이 동적 로드하는 레거시 브라우저 번들 (public/js/ 는 sync:public 미러)
public/, dist/, out/   # 정적 자산 및 빌드 산출물
```

> **죽은 코드는 격리하지 말고 지운다** — 격리 디렉터리(`_graveyard/` 등)는 빌드에서만 빠질 뿐 grep·AI 코드 읽기에는 그대로 노출돼 "다음 세션이 보고 복제하는" 문제를 못 막는다. 안전망은 git 히스토리다. 2026-08-09 에 116파일을 삭제했고 복구 명령은 [docs/cleanup-2026-08/06-deleted.md](../cleanup-2026-08/06-deleted.md) 에 있다.

> **없는 디렉터리 주의** — `veda/` 와 `models/` 는 **존재하지 않는다**(2026-08-09 확인). 베다/나크샤트라 엔진의 실체는 `lib/vedicSwissChart.js`·`lib/vedicCalculator.js`·`worker/lib/vedic-*.js`·`worker/lib/nakshatra-*.js` 다. `tsconfig.json` `exclude` 와 `config/env.contract.json` `scanRoots` 에 남아 있던 `veda` 는 잔재이므로 새 코드의 근거로 삼지 말 것.

## Tech Stack

- **Framework**: Next.js 15 (App Router, `output: "export"` 정적 빌드), React 18.3.1
- **언어/스타일**: TypeScript 5.5 (`strict: false`, `strictNullChecks: true`), Tailwind 3.4
- **DB**: MongoDB (Mongoose) — 프로덕션 경로는 `worker/lib/db.js`, App Router 잔여 경로는 `app/_lib/dbConnect.js`
- **AI**: Gemini REST 직접 호출(`gemini-2.5-flash`) + 실패 시 Cloudflare Workers AI 폴백
- **배포**: Cloudflare Pages + Workers (wrangler 4.73, `@opennextjs/cloudflare`)
- **결제**: PortOne V2 (+ Inicis 일부 연동), 포인트/코인 기반 유료 기능
- **인증**: 커스텀 JWT (NextAuth 아님), Google/Kakao/Naver OAuth
- **i18n**: `ko`(기본, prefix 없음) / `ja`, `zh`, `en`(경로 prefix)

## Code Rules

- ES Modules만 사용, `any` 타입 지양
- `strictNullChecks` 위반 금지 (tsconfig `strict` 자체는 off이므로 과신 금지)
- 환경변수 하드코딩 금지 — 반드시 `process.env`/`env` 바인딩 경유
- 스타일은 Tailwind 클래스만 (인라인 스타일 지양)
- 외부 API 호출·DB 접근에는 try-catch 필수
- Cloudflare Worker 코드는 번들 1MB 제한 유의
- 네이밍: 컴포넌트 `PascalCase`, 유틸 `camelCase`, 라우트 폴더 `kebab-case`
- 컴포넌트: 서버 컴포넌트 기본, 클라이언트는 `'use client'` 명시, Props `interface`는 파일 상단 정의

## Forbidden (수정 금지)

- `.wrangler/`
- `worker/wrangler.toml` — **단, `[vars]` 항목 추가·수정은 허용**(2026-08-12 사용자 승인). 라우트·크론·바인딩·`compatibility_*` 등 **구조는 여전히 손대지 않는다.** 허용한 이유: 튜닝 노브가 코드에만 있으면 값 하나 바꾸는 데도 PR+CI+배포 사이클이 필요해, 장애 중에 되돌릴 방법이 없었다.
  - 🔴 `[vars]` 에 노브를 올리면 **그 값이 프로덕션 값이 되고 코드 기본값은 죽는다.** 그 노브를 지키던 테스트가 있으면 함께 갱신할 것 — 안 그러면 가드가 프로덕션이 안 읽는 값을 지킨다(`__tests__/worker/db.admission-headroom.test.js` 가 그 대응 예시다).
- `package-lock.json`
- `.env*` 패턴의 모든 환경변수 파일 (절대로 깃허브에 업로드 금지 — `.env.local`, `.env`, 서버 전용 env 파일 등)
- `dist/`, `out/` (빌드 산출물)
- 마이그레이션 스크립트 실행 결과물 (`scripts/migrate-*` 자체는 리뷰 후 신중히 수정)
