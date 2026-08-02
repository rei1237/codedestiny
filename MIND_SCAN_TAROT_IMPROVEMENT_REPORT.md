# Mind Scan Tarot Improvement Report

## 1. 작업 요약

- Header/Footer 제거: `/tarot/mindscan`을 기존 `CHROMELESS_ROUTES`에 추가해 GlobalHeader, DisclaimerBanner, SiteFooterHub만 숨겼다.
- 상담 품질 개선: 로컬 rule-engine에 메인/보조 카드 조합과 포지션별 관계 렌즈·오해 방지·실행 기준을 반영했다.
- 결과 생성 방식: 로컬 rule-engine을 기본으로 하고 Gemini가 활성화된 경우 검증된 JSON으로 보강하는 하이브리드 구조를 유지했다.

## 2. 판별 결과

- LLM / 정적 / 하이브리드: 하이브리드
- 근거 파일: `lib/tarot/mindscan-reading.mjs`, `app/api/tarot/mindscan/route.js`, `worker/routes/tarot.js`
- 호출 흐름: 5개 메인/보조 카드 pair 정규화 → 로컬 7개 section 생성 → Gemini REST 호출 및 schema 검증 → 실패 시 로컬 결과 폴백

## 3. 수정한 파일

- `app/components/AppChrome.tsx`: 마인드 스캔 라우트만 공통 Header/Footer 제외 목록에 추가
- `lib/tarot/mindscan-reading.mjs`: 카드·포지션·정역방향·메인/보조 조합을 결합한 로컬 해석과 Gemini prompt 규칙 강화
- `scripts/verify-mindscan-reading.mjs`: 실제 최대 3회 호출 동작에 맞춘 retry 기대값과 상담 품질 mock 검증 추가
- `__tests__/ui/mindscan-immersive.static.test.js`: 해당 라우트의 chrome 예외와 모바일 하단 네비게이션 보존 정적 검증 추가
- `MIND_SCAN_TAROT_AUDIT.md`: 구조·생성 방식·권한·저장 여부·불확실성 기록
- `MIND_SCAN_TAROT_IMPROVEMENT_REPORT.md`: 본 결과 보고서

## 4. Header/Footer 제거 방식

- 선택한 방식: 기존 `AppChrome`의 `CHROMELESS_ROUTES`에 정확히 `/tarot/mindscan`만 추가
- 다른 페이지 영향 여부: 다른 route 목록과 GlobalHeader/SiteFooterHub 구현은 수정하지 않았다.
- 회귀 방지 근거: `FeatureBackHomeNav`와 기존 `MobileBottomNav` 조건은 유지했으며, UI 정적 테스트에서 두 진입 수단이 계속 존재하는지 확인했다.

## 5. 상담 품질 개선 내용

- 개선한 prompt 또는 데이터: 말·행동·침묵·관계 거리·다가갈 속도를 섹션 역할로 분리하고, 보조 카드를 숨은 조건·속도·방어의 보완 신호로 해석하도록 Gemini prompt를 보강했다.
- 카드 포지션 반영 방식: 각 포지션에 관계 렌즈와 오해 방지 문장을 추가하고, 메인 카드의 키워드·정역방향·원소 결·보조 카드 키워드를 조합 문장에 반영했다.
- 반복 방지 방식: LLM에 섹션별 역할 중복 금지를 지시하고, 로컬 해석에서는 동일한 메인/보조 조합 문장을 모든 하위 필드에 반복하지 않도록 카드 의미 중심으로 배치했다.
- 과도한 단정 방지 방식: 100%, 무조건, 반드시, 운명이다 등의 확정 표현을 prompt에서 금지하고 로컬 텍스트 정제에서도 완화했다.

## 6. 테스트 결과

- lint: 통과. 저장소 전반의 기존 warning 출력은 남아 있다.
- typecheck: 통과.
- build: 실패/미완료. Next 컴파일은 성공했으나 기존 전체 정적 생성 과정이 180초 제한을 넘겼고, retry 중 `.next/server/app/_not-found/page.js.nft.json` 누락 오류가 발생했다.
- build:worker: 통과. Wrangler `--dry-run`만 실행했으며 배포하지 않았다.
- unit/e2e: `node scripts/verify-mindscan-reading.mjs` 통과. 정상 Gemini mock, HTTP 500 폴백, 깨진 JSON 폴백 및 retry/포지션/반복/단정 표현 검증을 포함한다.
- UI 정적 테스트: `node --test __tests__/ui/mindscan-immersive.static.test.js` 통과.
- `test:node`: 36개 통과, 기존 Maya calendar 5개는 `src/lib/maya-calendar.ts` 해석 실패로 실패했다.
- `test:jest`: 기존 `.claude/worktrees`·`.codex-worktrees`까지 수집되어 duplicate manual mock과 별도 worktree 테스트 오류가 발생했고 120초 제한으로 종료됐다.
- encoding: `npm run verify:entry-encoding -- --strict-core` 통과.
- manual: 실제 결제와 실제 Gemini 호출 없이 정적 구조·mock 결과만 검증했다. 브라우저의 모바일 viewport 수동 확인은 실행 환경상 미완료다.

## 7. 권한/결제 영향

- 변경 여부: 없음.
- 검증 결과: 기존 `useCoinGate`, `tarot-mindscan` feature key, 이용권·월정석·단건 결제와 실패 처리·requestId 흐름을 수정하지 않았다. 결과 저장/히스토리 기능도 새로 추가하지 않았다.

## 8. 남은 리스크

- 아직 확실하지 않은 부분: 운영 배포에서 Next API와 Worker 중 어떤 dispatch가 최종 `/api/tarot/mindscan`을 처리하는지는 배포 설정 확인이 필요하다. 두 구현 모두 공유 builder를 사용한다.
- 후속 개선 후보: 깨끗한 worktree에서 전체 Next build를 재실행하고, 실제 모바일 viewport에서 100dvh·safe-area·결과 스크롤을 확인한다.

## 9. 최종 판정

- 기능 변경: 구현 완료.
- 배포 판정: 추가 확인 필요. 핵심 mock/UI/lint/typecheck/Worker dry-run은 통과했지만 전체 build와 전체 테스트가 저장소의 기존 worktree·생성물 문제로 완료되지 않았다.

