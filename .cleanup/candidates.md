# 죽은 코드 후보 (PHASE 1 탐지 + PHASE 2 검증)

탐지: `node scripts/audit-unused-files.mjs`(참조 그래프) + `reports/unused-files-report.json` 필터링 + 전체 grep 재확인.
스캔 총 6223 파일 중 소스코드(.ts/.tsx/.js/.jsx/.mjs/.cjs, public·apps/mobile·out·dist·.next·worker/routes 제외) 미도달 후보 **217개**.

## A. 제거 확정 (PHASE 2 grep 검증 통과 — 위험도 하)

7개 파일. import/require/문자열경로/config/html script-tag 어디에서도 참조 없음. 상위 버전이 이미 존재하거나 일회성 스크래치.

| 대상 | 종류 | 정적참조 | 동적위험 | 판정 | 근거 |
|------|------|------|------|------|------|
| `LoveSimulation.jsx` (root, 2986L) | 파일 | 0 | 하 | 제거 | 실제 구현은 `app/saju/love-simulation/_components/LoveSimulationEngine.tsx`. 루트 사본 미참조 |
| `CrystalSoulTarot_v2.jsx` (root, 1604L) | 파일 | 0 | 하 | 제거 | 스크래치본(`import "./app/hooks/useCoinGate"` — 루트에서만 성립). 실제는 `app/tarot/crystal-soul/CrystalSoulTarotClient.jsx` |
| `CelestialHarmony.jsx` (root, 156L) | 파일 | 0 | 하 | 제거 | 구버전. 실 기능은 `app/api/celestial-harmony/route.js` + `worker/routes/celestial-harmony.js` + 클라이언트 |
| `fix-encoding.js` (root, 6L) | 파일 | 0 | 하 | 제거 | index.html 1회성 패치 스크립트(2026-06-05 적용 완료). package.json 미등록 |
| `fix-acting-btn.js` (root, 6L) | 파일 | 0 | 하 | 제거 | 위와 동일 1회성 패치. 미참조 |
| `tmp/dream.bundle.mjs` (1250L) | 파일 | 0 | 하 | 제거 | esbuild 스크래치 번들(worker/lib 인라인). tmp/ 산출물, 미참조 |
| `tmp/psycho.bundle.js` (857L) | 파일 | 0 | 하 | 제거 | esbuild 스크래치 번들. 미참조 |

## B. 보류 (동적 참조 위험 / 설계상 엔트리포인트 — 사용자 확인 필요)

| 버킷 | 개수 | 사유 |
|------|------|------|
| `scripts/*` (verify-*, migrate-*, test-*, gen-*, seed-*) | ~56 | package.json 미등록이나 **독립 실행 dev/ops 엔트리포인트**. CI·수동 실행·문서 참조 가능. CLAUDE.md상 migrate/verify는 신중 취급 → 보류 |
| `js/*` | ~35 | `js/`↔`public/js/` 미러. `<script>` 태그·전역 로드로 살아있을 수 있음(정적 import 그래프 밖). index.html 참조 확인 필요 |
| `lib/*` | ~26 | 프롬프트/i18n/유틸. 동적 키·lazy import 가능 |
| `components/*` | ~18 | lazy import·배럴 재export 가능 |
| `src/*` (src/features/fortune-tea-house) | ~10 | 초기 탐색 누락 트리. 신규 구조라 참조 관계 재확인 필요 |
| `types/*` (.d.ts) | ~7 | 앰비언트 타입 선언일 수 있음 |
| `pages/*` | 4 | Next.js Pages Router = 파일기반 라우팅 엔트리 |
| `__tests__/*` | 44 | jest glob 대상. dead 아님 |

## C. 제외 (엔트리포인트/설정 — 삭제 금지)

`middleware.ts`, `tailwind.config.js`, `postcss.config.mjs`, `jest.config.cjs`, `next-env.d.ts`, `worker/routes/*`(42개 전부 등록됨), Cloudflare 설정, 결제/인증.

---

**다음 단계**: A 섹션 7개 파일만 PHASE 3에서 위험도 하 순으로 1개씩(또는 안전 배치로) 삭제 → typecheck+lint+worker테스트 → 커밋. B/C는 손대지 않음.
