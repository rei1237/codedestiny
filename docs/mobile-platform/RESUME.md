# 다음 세션 실행 가이드 — 모바일 플랫폼 / 기능별 비주얼 상세페이지

원격 보존: 초안 PR https://github.com/rei1237/codedestiny/pull/1824 (미머지). 생성 시 GitHub가 mergeable=false를 보고했다. main은 작업 시작 이후 진행됐으므로 다른 작업 변경과 통합/충돌 확인을 먼저 수행한다. 기존 로컬 워크트리와 커밋은 보존한다.

## 복사해서 보낼 작업 지시

> D:\Development\code-destiny-mobile-platform-ux의 docs/handoff/mobile-platform-ux.md와 docs/mobile-platform/RESUME.md를 읽고 미완료 작업을 이어서 구현해 주세요. 승인된 최신 디자인은 app/features 경로와 js/feature-detail-panels.mjs의 SVG/HTML 편집형 미리보기입니다. 예전 detail-prototype.html이나 결과 캡처형 디자인으로 되돌리지 마세요. feature-detail-coverage.md의 나머지 65개 대상을 실제 구현과 대조하고 기능군별로 확장한 뒤 전체 모바일·공유·뒤로가기 개선도 이어가세요. 기존 격리 워크트리의 변경을 보존하고 다른 세션과 공통 파일 중첩을 재확인하세요. 실제 LLM·PG·운영 DB·배포는 사용하지 마세요. 검사·커밋·푸시·PR까지 진행하되 머지는 별도 요청을 따르세요. 전체 완료가 아니면 이 인수인계 문서의 상태와 다음 작업을 갱신하세요.

## 1. 지금 바로 이어가는 명령 — 기존 작업 재개

PowerShell에서 실행한다. 아래 명령은 작업 삭제·리셋·브랜치 전환을 하지 않는다.

```powershell
Set-Location -LiteralPath 'D:\Development\code-destiny-mobile-platform-ux'
git branch --show-current
git status --short
git log -6 --oneline
Get-Content -LiteralPath 'docs/handoff/mobile-platform-ux.md'
Get-Content -LiteralPath 'docs/mobile-platform/RESUME.md'
npm run worktree:status
npm run verify:handoff-contract
```

기대 브랜치: `codex/mobile-platform-ux-20260908`. 다르면 편집 전에 경로/브랜치부터 확인한다. 디렉터리가 없으면 공유 저장소에서 `git worktree list`로 찾는다. 새 checkout으로 대체해 미커밋 작업을 잃지 않는다.

**현재 작업 재개에 `npm run session:start`를 실행하지 않는다.** 저장소 스크립트를 확인한 결과 이 명령은 clean linked worktree + HEAD가 최신 origin/main과 동일 + 문서가 main에 머지되어 있음을 요구한다. 미머지 브랜치에서 실패하는 것은 정상이며 가드를 우회하거나 main으로 리셋할 이유가 아니다.

머지 완료·스테이징 SHA 확인 이후에만 새 linked worktree에서 다음 공식 명령을 사용한다.

```powershell
npm run session:start -- --handoff=docs/handoff/mobile-platform-ux.md
```

## 2. 확정 디자인 — 재승인 불필요

- 가로형 비주얼을 세로로 읽는 상세페이지. 모바일 가로 스와이프를 강제하지 않는다.
- 반복되는 둥근 박스/테두리 대신 여백·절제한 구분선·대표 문장·선명한 본문으로 위계를 만든다.
- 대표 이미지는 세계관을 전달하고, 제공 내용은 SVG/HTML로 직접 구성한다. 글자를 이미지에 굽거나 결과 캡처를 확대하지 않는다.
- `개발용 예시 · 개인 결과 아님` 같은 내부 검증 문구를 제품 화면에 표시하지 않는다. 검증 근거는 문서/데이터에서 관리한다.
- 미리보기는 실제 기능의 제공 항목을 설명한다. 가짜 개인 결과·성공 보장·후기·판매량·할인·분량을 만들지 않는다.
- 인생의 책: 펼친 책과 기질/삶의 흐름/장별 해석. 동물 도감: 직접 그린 동물과 성향/행동/성장 미션.
- 찻집의 네 가지 찻잔은 상담 방식, 여섯 고민 찻잔과 구분한다. 선택 단계와 결제 resume 계약을 보존한다.
- 모든 판매 기능을 같은 그림/문구로 치환하지 않는다. 기능 사실을 먼저 파악하고 해당 체계의 시각 언어를 만든다.

## 3. 읽고 수정할 정본

| 목적 | 파일/심볼 |
| --- | --- |
| 상세 콘텐츠 정본 | index.html → FEATURE_VISUAL_DETAILS |
| 기존 마케팅/가격 연결 근거 | FEATURE_MARKETING_COPY, js/core/service-registry.js, app/_lib/serviceFeatureRegistry.ts |
| 생성 | scripts/sync-feature-marketing-copy.mjs → scripts/lib/build-visual-details.mjs |
| 공통 표시 | js/feature-detail-panels.mjs / .d.mts |
| 전용 스타일 | styles/feature-visual-detail.css |
| 독립 소개주소/OG | app/features/[slug]/page.tsx |
| 기존 가격/진입 CTA | app/features/FeatureIntroductionActions.tsx |
| React 팝업 | app/components/FeatureMarketingDetailModal.tsx, FeatureVisualDetail.tsx |
| 정적 팝업 | index.html의 _open → js/feature-detail-preview.mjs |
| 공통 공유 | js/share-service.mjs, app/components/ShareWidget.tsx, lib/share.v2.ts |
| 현재 작업 원장 | docs/mobile-platform/feature-detail-coverage.md |
| 전체 구조 원장 | docs/mobile-platform/inventory.json / inventory.md |

`lib/marketing/feature-visual-details.generated.json` 및 `public/feature-details/*.json`, public 미러는 직접 고치지 않는다. 확인하지 않은 항목은 `source-inventory-only`를 유지한다. `verified` 일괄 치환 금지.

## 4. 다음 작업 순서

1. **공통 파일 중첩 확인.** index.html과 생성 미러를 다른 작업도 수정 중이었다. 현재 상태를 다시 확인하고 변경을 순서대로 통합한다. 다른 브랜치의 결과를 덮지 않는다.
2. **Neo 팝업 전체 회귀 완료.** `test-feature-visual-details-mobile.mjs`의 React 팝업 단계는 `/app/`의 실제 유료 Neo 링크로 수정됐다. Neo 독립 주소는 direct/OG/SVG·HTML/320~1280px을 통과했다. 실행 제한이 없는 mock 브라우저에서 팝업·Escape·포커스 복귀를 끝까지 기록한다. 찻집 링크는 직접 진입이며 팝업을 기대하지 않는다.
3. **기능군 순회.** 사주 → 자미두수 → 숙요 → 서양 점성술/베다를 구분 → 타로/궁합 → 초융합/나머지 무료 기능. 69개 목록과 155개 마케팅 별칭, 145개 action, React 동적 생성 경로를 대조해 누락된 대상을 추가한다. 정책·계정·결제 처리 화면은 판매 상세 적용 제외 사유를 기록한다.
5. **기능마다 완료.** 입력/결과 구현 근거 → 실제 가치 2~3개 → 직접 구성한 미리보기 → 조건/가격/CTA → 팝업+독립주소 → 모바일/오류/뒤로가기/공유. 한꺼번에 전부 verified로 표시하지 않는다.
6. **기존 전체 범위도 이어간다.** 정적 공유 통합, 공개 요약의 사용자 확인/최소 필드/소유권/만료, Kakao 설정, 전체 backstack/키보드/결제 mock 회귀, 실제 이미지 전송량·느린 모바일 성능 측정. 상세페이지 작업으로 이 범위를 지우지 않는다.

## 5. 알려진 미완료/주의점

- 69개 등록 목적지 중 콘텐츠 적용은 4개이며, 그 4개도 전체 기능 여정 완료를 의미하지 않는다. 나머지 65개는 기능 근거 확인부터 필요하다.
- SVG/HTML로 바꾼 뒤 동물 도감의 기존 캡처 기반 OG fallback이 없어졌다. 별도 대표 OG 이미지를 보강하고 raw metadata 검사를 추가한다.
- 정적 팝업은 기존 hero 요청 후 새 비주얼을 불러올 수 있다. 실제 네트워크를 관찰해 중복 요청을 줄인다.
- 정적 팝업의 상세 CSS 로딩 실패/깜빡임, 기존 섹션 숨김 selector, React focus 복귀·locale 전환 상태를 확인한다.
- 생성기가 JSON을 덮어쓰는 순간 Next 개발 서버에서 일시적인 파싱 오류가 한 번 있었다. 생성 중 검사하지 않으며 필요하면 변경 감지/안전한 파일 교체를 적용한다.
- 개인 결과 공개 요약 백엔드는 아직 없다. private 결과 DOM/URL 전체를 공유하는 방식으로 대체하지 않는다.
- 이전 `detail-prototype.html`과 캡처 WebP는 과거 검토 자료다. 최신 UI의 정본으로 사용하지 않는다. 삭제하려면 소스/테스트/생성 참조부터 확인한다.
- build는 다른 작업의 dev 서버(당시 59211)를 감지한 저장소 가드가 차단했다. 현재 포트/소유자를 재확인하고 타 작업을 종료하지 않는다. CI 또는 충돌 없는 시점에서 재실행한다.

## 6. 로컬 확인과 검사 명령

현재 프런트 주소는 `http://127.0.0.1:26504`, mock API는 `26505`였다. 포트는 다음 실행에서 달라질 수 있으므로 시작 로그를 따른다. 기존 서버가 있으면 재사용한다. 서버가 없을 때 별도 터미널에서:

```powershell
Set-Location -LiteralPath 'D:\Development\code-destiny-mobile-platform-ux'
npm run dev
```

개발 런처의 mock·네트워크 가드를 사용한다. 운영 env나 실 LLM으로 폴백하지 않는다.

```powershell
# 정본 수정 후 생성. 완료된 뒤 브라우저 검사를 시작한다.
npm run sync:public
npm run check:fast -- --plan
npm run check:fast
node --test __tests__/ui/feature-visual-details.test.mjs __tests__/ui/share-service.test.mjs
$env:MOBILE_AUDIT_ORIGIN = 'http://127.0.0.1:26504'
node scripts/test-feature-visual-details-mobile.mjs
node scripts/test-tea-loading-mobile.mjs
node scripts/test-mobile-platform-journeys.mjs
node scripts/test-share-fallback-mobile.mjs
npm run verify:mobile-detail-nonintrusive
npm run verify:handoff-contract
# clean 커밋 상태에서 생성 미러 검사
npm run verify:public-mirror-fresh
```

`test-feature-visual-details-mobile.mjs`의 팝업 대상은 실제 Neo 링크로 수정됐다. 이 환경에서는 30초 실행 제한으로 전체 스크립트가 Fortune Tea House 단계 뒤에 중단되므로, 실행 제한이 없는 mock 브라우저에서 전체 완료 로그를 남긴다.

전체 build는 개발 서버 소유와 mock 환경 계약을 확인한 후 `npm run build`. 가드 실패를 빌드 성공으로 기록하지 않는다. lint/typecheck는 check:fast 실행 계획에 포함되는지 확인하고 빠진 경우 `npm run lint`, `npx tsc --noEmit --incremental`을 실행한다.

## 7. 검증 증거 해석

- 인수인계 시 재실행한 `check:fast`는 sitemap drift를 생성기로 해결한 뒤 재실행했지만 마지막 확인 시 전체 종료되지 않았다. `test-results/mobile-platform/check-fast-handoff.log`의 최종 종료 결과를 확인하기 전 성공으로 보고하지 않는다. 기존 진행 중 검사와 같은 검사를 중복 실행하지 않는다. 초안 PR 생성 직후 조회한 head의 GitHub Actions 목록은 비어 있었으므로 CI 성공 증거도 없다.
- 인수인계 계약과 clean 상태 생성 미러 검사는 통과했다. 전체 완료/배포 승인을 의미하지 않는다.

- 초기 공통/찻집 단계: check:fast의 Node 929, Jest 218 suites/2417 tests 통과. 후속 상세페이지 변경 전체의 통과를 뜻하지 않는다.
- 최신 국소 검증: 상세 단위 4개, 타입 검사 통과. Neo 독립 소개주소는 OG·SVG/HTML 미리보기·320/360/390/430/1280px 가로 넘침 없음 확인. React Neo 팝업은 대상 교정까지 완료했고 동적 상호작용 전체는 실행 제한 때문에 미완료다.
- 이전 상세 3종: 직접 진입/새로고침/CTA/8개 너비 확인. SVG 교체 후 OG는 재검사 필요.
- tea loading, draft restoration, mock life/animal, share fallback 스크립트 통과 증거가 있다. 실결제·실기기·모든 기능 성공을 의미하지 않는다.
- `test-results/mobile-platform/`은 로컬 ignored 로그/캡처다. 다음 머신에는 없을 수 있다. 재현 명령이 우선이다.

## 8. 인수 완료 기준

다음 세션은 먼저 문서·코드·git 상태의 일치를 확인한다. 작업한 기능별 근거와 검증을 원장에 갱신한다. 논리 단위로 커밋/푸시/PR을 제공하고 미실행 검사를 구분한다. 모든 대상의 기능/공유/뒤로가기/모바일 상태를 검증하기 전에는 전체 완료라고 보고하지 않는다. 남은 외부 계정·실기기 확인은 정확한 다음 행동으로 남긴다.
