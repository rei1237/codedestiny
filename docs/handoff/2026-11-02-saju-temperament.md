---
status: blocked
updated: 2026-11-02
---

# 사주 LLM 상담의 타고난 성향 해석 개선

사용자 요청: 영냥이와 꿀꿀운세의 모든 사주 LLM 상담에서 오행·십성을 근거로 타고난 성향을 더 구체적으로 해석한다. 기존 명식·신강약·용신 계산은 유지하고, 문체는 구체적이고 균형 있게 한다.

## 작업 위치와 커밋

- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\saju-temperament-20261102-141359`
- 브랜치: `wt/saju-temperament-20261102-141359`
- 기준 main: `5ac923923fe2e54b9a958c90f00f8971b8b2a8a6`
- 구현: `af00622dfca84464d572baefb5af7d0d0d212552` — `feat(saju): ground innate traits in ten gods`
- 사이트맵 동기화: `535c9ec02a1651145bec70bade11c670e208f274` — `chore(seo): sync consultation sitemap signatures`
- 문서 절대 경로: `D:\Development\code-destiny\.codex-worktrees\saju-temperament-20261102-141359\docs\handoff\2026-11-02-saju-temperament.md`

## 구현

- 순수 공통 모듈이 기존 간지와 정본 십성·지장간 표를 읽는다. 열 가지 십성에 욕구·선택 습관·강점·과할 때의 그림자·조절법을 구분했다.
- 기존 강약, 월지 본기, 정편 구성, 제공된 원국 투간, 종격 확인 상태를 해석 조건으로 전달한다. 지장간 존재를 통근 성립으로 바꾸거나 운의 투출을 타고난 성향으로 읽지 않는다.
- 겉 십성은 일간을 제외하고 세며 지장간과 중복 합산하지 않는다. 동일 오행도 일간에 따라 다른 십성 역할로 설명한다. 시주 미상·부분 명식·미확인 강약은 한계를 명시한다.
- 영냥이 일반·질문형·v7 원장·장별 프롬프트, 사주 전문가, 인생 총운, 신년, 연애, 찻집, 네오, 기본 궁합, 융합, 가디언, 마스터 연애·궁합, 작명, 다중 관점 상담에 연결했다.
- 사람별 성향을 분리하고 도파민 수치·중독·인격·미래를 판정하지 않는다. 없는 오행·십성을 능력·도덕성의 결여로 설명하던 기존 문구도 조건부로 정리했다.
- 공개 API 형식, 계산 엔진, 결제·가격·이용권·월정석·단건 결제, 인증, DB 스키마·저장·기존 결과 재열람 로직은 수정하지 않았다. 추가 LLM 호출·재시도 조건도 없다.
- 사이트맵 생성기가 감지한 전이 소스 지문 23개를 동기화했다. URL 1,037개와 색인 정책을 유지했다.

## 수정 파일

- `worker/lib/saju-temperament.js`, `worker/lib/saju-derived-signals.js`
- `worker/lib/saju-ai-prompt.js`, `worker/lib/saju-compat-prompts.js`, `worker/lib/fusion-fortune-prompt.js`, `worker/lib/guardian-fortune-prompt.js`
- `worker/lib/love-secret-ai-facts.js`, `worker/lib/neo-operation-room-prompt.js`, `worker/lib/master-love-codex-evidence.js`, `worker/lib/master-love-codex-prompt.mjs`
- `worker/routes/fortune-tea-house.js`, `worker/routes/karma-destiny-ai.js`, `worker/routes/life-book-ai.js`, `worker/routes/naming-prompt.js`, `worker/routes/new-year-ai.js`
- `worker/yeongnyangi/fortune/concise-reading-prompt.ts`, `worker/yeongnyangi/fortune/saju/index.ts`, `worker/yeongnyangi/fortune/shared/prompt.ts`
- `__tests__/ui/saju-temperament.test.mjs`, `__tests__/ui/saju-temperament-prompts.test.mjs`, `__tests__/worker/__fixtures__/naming-prompt.ko.golden.txt`
- `config/sitemap-lastmod.json`, `sitemap.xml`, `public/sitemap.xml`, `sitemap-ko.xml`, `public/sitemap-ko.xml`

## 검증

- `npm run typecheck`: 통과(exit 0).
- 변경 파일 ESLint: 20개 코드 파일 통과(exit 0).
- `npm run test:jest -- --runInBand --runTestsByPath`로 사주 프롬프트·총운·작명·찻집·네오·마스터 연애·융합 관련 10개 스위트 실행: **304개 통과**.
- `node --test --test-concurrency=1 __tests__/ui/saju-temperament.test.mjs __tests__/ui/saju-temperament-prompts.test.mjs __tests__/ui/saju-derived-signals.test.mjs __tests__/ui/yeongnyangi-reading-v7-prompt.test.mjs __tests__/ui/yeongnyangi-reading-v7-ledger.test.mjs`: 39개 통과, 원장 스위트는 localhost 접속 EACCES로 실패. 외부 통신 차단을 유지한 승인된 실행 환경에서 원장만 재실행하여 **추가 8개 통과**. 관련 테스트 총 **351개 통과**.
- `npm run check:fast -- --plan`: critical 자동 승격 확인.
- `npm run check:fast`: 제한된 실행 환경에서 전체 `npm test`와 결제 동의 검사기 자체 테스트·결제 약관 검사가 실패했다. 로컬 테스트 서버·임시 파일 권한을 허용하고 외부 mock 차단을 유지한 환경에서도 재실행했다. 두 번째 실행은 paid-gate-suite의 90개 항목 중 **25개 통과, `npm test` 1개 실패(806.6초)**를 확인한 뒤 main CI 차단 상태에서 중단했다. 나머지 64개와 첫 실패의 기준점 귀책 비교는 미완료이며, **공식 전체 검사는 통과하지 않았다**. 실패한 전체 테스트의 개별 원인은 이 실행의 버퍼가 검사기 종료 시에만 출력되어 확정하지 못했다. 관련 테스트 351개 통과와 혼동하지 않는다.
- `npm run check:pre-push`: 사이트맵 동기화 후 **통과(exit 0)**. 홈 레지스트리, 정적 미러, 사이트맵, llms 문서, SEO 정본, 저장소 위생 검사 통과.
- 실 LLM·실결제·운영 DB 쓰기·운영 배포는 실행하지 않았다. 실제 생성 문장의 품질은 mock 검증과 별도다.

## 전달 차단과 다음 행동

main CI는 작업 시작 전부터 `5ac923923fe2e54b9a958c90f00f8971b8b2a8a6`의 중복 H1 검사로 실패했고, 전달 직전 확인에서도 같았다.

- CI: https://github.com/rei1237/codedestiny/actions/runs/41391113434
- 실패: `/yeongnyangi/fortune`, `/yeongnyangi/library`, `/yeongnyangi/result`의 서버 H1과 클라이언트 H1 중복.
- `docs/context/delivery-and-ci.md`의 **이미 빨간 main 위에 push하지 않는다**는 규칙에 따라 main 머지·push를 보류했다. 작업과 관계없는 화면 결함을 이 변경에 섞지 않았다.
- 기본 작업 폴더 `D:\Development\code-destiny`의 `feat/world-cast-page`와 다른 세션의 미커밋 변경을 보존했다. 이 문서의 워크트리도 고유 미머지 커밋이 있어 보존한다.
- 첫 다음 행동: main CI 실패가 해결됐는지 확인한다. 여전히 실패하면 push하지 않는다. 해결됐다면 현재 main 보유 워크트리와 동시 변경을 확인하고, 안전하게 main에 직접 머지한 다음 커밋된 트리에서 `npm run check:pre-push` → `git push origin main` → CI 1회 확인을 완료한다. PR은 만들지 않는다.
- 전달 완료 뒤 이 문서를 `status: done`으로 닫고 자기 워크트리의 `node_modules` 정션을 먼저 해제한 뒤 워크트리와 머지된 `wt/*` 브랜치를 배수한다.

재개 지시:

```text
D:\Development\code-destiny\.codex-worktrees\saju-temperament-20261102-141359에서 D:\Development\code-destiny\.codex-worktrees\saju-temperament-20261102-141359\docs\handoff\2026-11-02-saju-temperament.md를 읽고, 구현 커밋 af00622dfca84464d572baefb5af7d0d0d212552와 사이트맵 커밋 535c9ec02a1651145bec70bade11c670e208f274가 보존됐는지 확인하라. main CI의 기존 중복 H1 실패가 해결됐는지 확인하는 것부터 이어서 진행하고, 실패 상태에서는 push하지 마라. 이 문서 이후 문서 커밋의 SHA는 git log -1로 확인한다.
```

## 최종 전달 상태

구현·관련 검사·사이트맵 동기화·커밋된 트리의 전달 검사는 완료했다. 광범위 검사 프로세스는 중단·정리했으며 공식 전체 검사는 미통과·미완료다. main 머지·push와 실제 LLM 문장 품질은 미검증이다. 기존 main CI가 해결되면 전체 테스트의 실패 상세와 기준점 재현을 확인한 후 전달해야 한다. 이 워크트리의 고유 미머지 커밋은 삭제하지 않는다.
