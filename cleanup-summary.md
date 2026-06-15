# Code Destiny Cleanup Summary

## 삭제한 파일 목록

| 파일 | 근거 | 검증 |
| --- | --- | --- |
| `all_webp_files.txt` | `dist` WebP inventory 산출물. `git grep "all_webp_files"` 결과 문서/보고서 외 참조 없음. | `npm run audit:cleanup`, `npm run typecheck`, `npm run lint`, `npm run build:worker`, `npm run build` 통과 |

## 삭제하지 않고 보류한 후보 목록

- `_tmp_*`, `.codex*.log`, dev-server logs, `tsconfig.tsbuildinfo`: 대부분 ignored 산출물 또는 캐시. 추적 파일 삭제 커밋 대상 아님.
- `seo-audit-report.md`, `seo-audit-report.json`: 생성 스크립트 `scripts/seo-audit.mjs`가 명시적으로 출력하는 감사 결과물이라 보류.
- `LoveSimulation.jsx`: React 유료 기능 보호 영역. 정적 진입/Worker registry와 기능명이 연결되어 있어 보류.
- `js/saju-engine.js`, `js/saju-engine-tarot-sukuyo-quantum.js`: static runtime loader가 직접 로드하므로 삭제 금지.
- `public/**` mirrors: sync 산출물이라 직접 삭제 금지.
- 결제, 프로필, PDF, R2, MongoDB, webhook, PortOne/Inicis 관련 파일: 사용처 증거 없이 삭제 금지.

## 통합한 중복 로직 목록

- 아직 없음. 현재 단계는 기준선 확정과 명백한 산출물 제거만 수행.

## 새로 만든 공통 모듈 목록

- 아직 없음.

## 성능 개선 사항

- 추적 중이던 `dist` WebP inventory 178,992 bytes 제거.
- 대형 runtime/engine 파일은 실제 loader 참조가 있어 삭제하지 않고 병목 후보로만 기록.

## 결제/프로필/PDF/R2 회귀 방지 확인 결과

- 결제/프로필/PDF/R2 핵심 파일은 수정하지 않음.
- `npm run build:worker` dry-run 통과.
- `npm run build`에서 `sync:public`, `verify:public-parity`, `verify:i18n-runtime`, `verify:locale-main-sync`, `verify:runtime-cache-sync`, Next compile, static export, postbuild 통과.

## 남은 리스크

- lint 경고는 기존 다수 존재. 현재 기준으로 exit 0이며, 후속 정리에서는 경고 수 증가 없음 기준으로 추적 필요.
- `public/version.json`은 `npm run build`가 갱신하는 빌드 메타데이터라 cleanup 커밋에는 포함하지 않음.
- cleanup audit dry-run은 문서 파일까지 unused 후보로 볼 수 있어 삭제 판단에는 추가 사용처 증거가 필요.

## 다음에 정리할 후보

- 프로필 접근/카드 결제 정책: `worker/routes/profile.js`, `worker/routes/user.js`, `worker/lib/profile-card-mutation-policy.js`.
- 결제 게이트 contract: `index.html`, `js/destiny-profile.js`, `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`.
- PDF ready/archive payload 반복: `worker/routes/astro.js`, `saju-lifebook.js`, `saju-new-year.js`, `saju-love-secret.js`, `ziwei-book.js`.
- R2 URL 생성 규칙: `lib/r2-public-url.ts`, static shell hardcoded asset URLs.
- 운영 console/debug 출력: 결제/PDF/runtime 로그 중 민감 맥락 노출 가능 지점.
