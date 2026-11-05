# 결과 화면 main 통합본과 격국 추가 감사

status: local-validation-complete-main-merge-blocked

확인일: 2026-11-02. push·배포 없음. **결과 화면 통합본은 검증했지만 모든 엔진의 정확도 개선이 완료된 상태는 아니다.**

## 통합 범위와 현재 위치

- 기준 `origin/main 87bd85731a24f2fb27e44395fd61918d51195ecf`에서 시작해 작업 중 추가된 `ec86d2e0f634a838575cf7ebfce400552087a301`까지 병합했다.
- 기존 감사 브랜치의 결과 UI 커밋 `025d10112`, `9a2f9908c`만 선택 적용했다. CR-001~006의 엔진/준비/결제 연결을 통째로 가져오지 않았다.
- 로컬 커밋: `62b460518` 결과 UI 통합, `8c5b52914` 최신 main 병합, `75009342d` 정적 셸 캐시 동기화. 뒤따르는 테스트·보고 커밋은 이 위에 쌓인다.
- 작업 브랜치 `codex/results-main-gyeokguk-20261102`, 경로 `D:/Development/code-destiny/.codex-worktrees/results-main-gyeokguk-20261102`.
- **실제 로컬 main 브랜치로의 병합은 미완료.** main 체크아웃은 `e6aa5a287`이며 다른 작업의 미커밋 8개 파일이 있다. 그중 ConsultationAccessPanel, prompt-hub-honey, saju-reading.css, honey-unlock-catalog, honey-wallet은 main→최신 origin/main 변경과 겹친다. 임의 stash·commit·reset·덮어쓰기·main ref 강제 이동을 하지 않았다.
- root `feat/world-cast-page`와 기존 엔진 감사 체크아웃도 보존했다. 이번 통합 작업 공간은 최종 병합 전 검토·보존을 위해 남긴다.

## 수정한 파일과 의도

| 파일군 | 변경 |
| --- | --- |
| `components/fortune/ResultReference.tsx`, `result-reference.module.css`, `lib/i18n/result-reference-copy.ts` | 재사용 가능한 기본 닫힘 근거 영역, 기존 언어별 문구 사용 |
| `components/fortune/AnalysisBasisPanel.tsx`, `PaidResultImageGuide.tsx` | 계산 근거와 이미지 제작 안내 최소화 |
| `app/ziwei-ai/ZiweiAiClient.tsx`, `app/vedic-ai/VedicAiClient.tsx`, `app/astrology-ai/result/AstrologyAiResultClient.tsx`, `app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx` | 저장된 결론·해석을 먼저 표시, 명반/근거/안내 접힘 |
| `app/new-year-ai-consultation/NewYearAiClient.tsx` | 해석 우선. StrictMode에서 폐기된 조회 잠금이 새 조회를 막지 않도록 조회 소유권을 구분 |
| `app/life-book-ai/result/LifeBookAiResultClient.tsx`, `app/love-secret-ai/result/LoveSecretAiResultClient.tsx`, `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx` | 원문 유지, 명식/레이더/계산 목록 접힘, 공유·후기 도구를 본문 뒤에 배치 |
| `app/fusion-fortune/FusionResultThread.tsx`, `ExpertEvidence.tsx`, `app/destiny-compass/_components/EvidenceCard.tsx`, `app/fortune/[period]/` | 최종 해석 우선, 참고 설명 기본 닫힘 |
| `lib/pdf/export-result-pdf.ts`, `normalize-capture-colors.ts`, `with-open-result-references.ts` | PDF에 필요한 자료를 일시적으로 펼치고 성공·실패 후 원래 접힘 상태 복원 |
| `js/core/paid-editorial-report.mjs`, `css/paid-editorial-report.css`, public 사본 | 기존 정적 리포트의 안내를 접힘 처리. 원문 삭제 없음 |
| `index.html`, public 7개 셸, `config/sitemap-lastmod.json` | 정본 생성 결과와 같은 자산 캐시·콘텐츠 서명. 가격·정책·본문 수정 없음 |
| `__tests__/ui/{ziwei-result-disclosure,new-year-saved-result-load}.test.mjs`, fusion 정적 테스트, preservation fixture | 재열람·PDF·원문 보존 회귀. 감사 브랜치의 git 이력에 의존하던 검사를 고정 해시 fixture로 이식 |
| `tools/oracle/next-delivery/` | 실제 Next 앱 mock 표시 하네스. 엔진 ON/실 PG 하네스는 미반입 |
| `tools/oracle/gyeokguk/`, `change-requests/CR-008.md`, 결과 JSON | 읽기 전용 격국 재현과 승인 대상 분리 |

## 검증 결과

| 명령/범위 | 결과 |
| --- | --- |
| `node --test __tests__/ui/ziwei-result-disclosure.test.mjs __tests__/ui/new-year-saved-result-load.test.mjs __tests__/ui/fusion-fortune.static.test.js` (guard preload) | 28/28 통과 |
| `node --test` paid-report-storage / paid-report-partial / saju-gyeokguk-claim-guard (guard preload) | 15/15 통과 |
| `node --test` direct-payment-resume / paid-delivery-scope-auth-restore / payment-resume-context / new-year-paid-delivery / life-book-paid-delivery / love-secret-paid-delivery / ziwei-deep-paid-delivery / saju-paid-delivery (guard preload) | 237/237 통과. DB·PG·LLM mock |
| `node tools/oracle/next-delivery/verify-service-results.mjs` | 87bd 기준 14/14 통과, 390·960px, 최초/재열람 원문 해시 동일, 모든 API GET, 페이지 오류 0, 미구현 API 0 |
| `AUDIT_SERVICES=ziwei,new-year` 같은 명령 | ec86 통합 뒤 2/2 통과. 자미두수 추가로 고유 시나리오 15개. 새 결론 위치 기준 신년 재검증 포함 |
| `node scripts/verify-paid-editorial-report.mjs` | 4개 폭, 외부 요청 0, mock 게이트 통과 |
| `node tools/oracle/gyeokguk/verify.mjs` | 공통 프로필 계약 19/19. 비교 48건 중 B 29건 기록, I/O 0, 소스 32개 해시 |
| `tsc --noEmit --incremental false` | 최초 통합 및 ec86 통합 후 exit 0 |
| `npm run lint` 및 새 하네스 대상 ESLint | 통과 |
| `npm run check:fast -- --plan` | critical 계획 확인. 아래 Swiss 제약으로 전체 실행은 하지 않음 |
| `npm run check:pre-push` | 75009342d 기준 exit 0. 미러/사이트맵/SEO/위생 통과. push 명령이 아님 |

280개는 서로 다른 선택 회귀 테스트 합계이며 19개 프로필 계약, 15개 브라우저 시나리오를 더해 하나의 정확도 수치로 만들지 않는다. 브라우저 증거 요약: [main-results-browser-summary.json](results/main-results-browser-summary.json). 최초 전체 실행은 컴파일한 프로젝트 소스 621개, API GET 218건이며 실 서비스로 전달되지 않았다.

별도 visual-checker가 주요 10개 서비스의 20장 및 자미두수 2장을 확인했다. 신년운세는 최초 캡처가 중간 연애 본문을 잡아 빈 공간처럼 보였으나 첫 질문 답변 기준 재검증에서 해소됐다. 확인한 범위의 본문 잘림/가로 넘침 없음. 자동 검사는 기본 닫힘·키보드 토글·재열람도 확인했다. 원격 폰트는 차단했으므로 운영 CDN 폰트 픽셀 검증은 아니다.

Impeccable detector는 새 공통 접힘 및 자미두수/신년 화면을 검사했다. 신년의 기존 width transition 1건과 격자 배경 advisory 1건은 원래 main에도 있어 이번 범위에서 변경하지 않았다. CLI가 `--format json`을 경로로 처리한 경고가 있었으며 결과는 텍스트 출력으로 확인했다.

### 실패와 보정

- cherry-pick 충돌은 사이트맵 원장과 감사 전용 README에 한정됐다. 원장은 최신 main에서 재생성하고 README는 실제 포함한 UI 하네스만 설명하도록 정리했다.
- 초기 사이트맵 검사는 서명 갱신 누락으로 실패 → 정본 생성 후 통과. 공개 URL/색인 정책은 유지했다.
- pre-push는 처음에 미커밋 상태로 실패했고, 다음에 정적 셸 캐시 드리프트로 실패했다. 부분 해시 보정은 전체 생성 계약과 일치하지 않아 정본 생성 결과로 보정했다. locale manifest는 생성기가 원래 계약대로 복원했다. 최종 생성 전후 엔진/워커 소스 차이는 없다.
- 격국 러너의 첫 구성에서 `@/` 별칭 및 한글→한자 변환 누락을 고쳤다. 이것은 서비스 결함으로 세지 않았다.

## 유지한 정책과 미검증 범위

- 최신 main 대비 `worker/`, `app/api/`, 역법/6개 엔진/`sajuAdapter.ts::calculateLocalResult()`/운영 의존성 변경 없음. 개선 엔진 플래그를 켜거나 감사 브랜치의 선택 코드를 반입하지 않았다.
- 결제·가격·이용권·월정석·단건 구조, 인증, 저장 스키마, 기존 유료/저장 결과 원문을 유지한다. 네트워크·저장소는 mock이다. 실제 DB 보존 검증을 했다고 주장하지 않는다.
- `check:fast` 전체 계획에는 `npm test`와 Swiss 직접 초기화 테스트가 있다(`__tests__/ui/yeongnyangi-consultation-kinds.test.mjs`, `yeongnyangi-reading-v7-ledger.test.mjs` 등). 사용자 차단 지시가 우선하므로 전체 suite와 Swiss 연결 계산은 실행하지 않았다.
- 전체 production `npm run build`/Worker 빌드/배포 CI는 미실행. 실제 Next의 대상 결과 경로 개발 컴파일과 타입 검증을 완료했으며 이를 전체 production 빌드 통과라고 보고하지 않는다. push/CI dispatch/배포 없음.
- 정적 sync/pre-push 생성은 기존 텍스트/번들/미러를 재생성하는 검사이며 Swiss 런타임을 실행하지 않는다. 새 라이브러리 설치 없음.

## 정확도 개선의 다음 범위

| 영역 | 현재 이번 작업의 증거 | 다음에 필요한 승인/검증 |
| --- | --- | --- |
| 사주 역법·대운 | 기존 감사 브랜치의 승인 범위와 분리; 이번에는 변경 없음 | 기존 확정 101건 및 지원 범위 회귀 후 CR-001~006을 별도 통합. 기존 저장 결과 재계산 금지 |
| 사주 격국·용신 | 동일 명반 29/48 차이, 외격/반례 계약 19건 | [CR-008](change-requests/CR-008.md): 학파 프로필·외격 범위 결정, 격국/용신/해석을 같은 버전으로 연결 |
| 자미두수 | 저장 핵심답변 우선·명반 접힘·재열람 확인 | 기존 감사의 달력/명반 고정 변경을 별도 최신 main 통합·회귀 후 신규 계산에만 적용 |
| 베다 | 저장 결과 표시만 확인 | Swiss 없는 주 검증기와 항성 경도/파다/다샤 오라클 확보. 미확보 차단 유지 |
| 서양점성술·숙요 | 저장 결과 표시만 확인 | Swiss 비연결 계산 경로 및 허용 오라클 확보. 숙요의 달 경도 경로는 음력 변환만으로 검증 불가 |
| 타로 | 저장 답변과 재열람 표시 확인 | 추첨/카드·정역·질문 맥락과 해석 근거의 일치 검증. 천문 오라클 정확도와 섞지 않음 |

고객에게는 결론·생활에서 드러나는 패턴·주의점과 행동 조언을 먼저 제공한다. 이 개선을 계산 정확도 확정으로 포장하지 않는다. 외격도 이름만 표시하는 대신 승인된 성립 조건, 보류 상태, 같은 판정에서 나온 해석이 연결되어야 한다.

## 안전한 최종 병합 순서

main의 기존 작업을 그 소유 작업에서 커밋/정리한 후, 최신 main을 이 통합본에 병합해 변경된 경계만 다시 검증한다. 그다음 정상 git merge로 main에 반영한다. 본 작업이 다른 작업의 미커밋 내용을 임의로 커밋·stash하지 않는다. push·배포와 엔진 플래그 활성화는 계속 별도 단계다.
