---
status: active
updated: 2026-09-30
next: 기존 워크트리의 미커밋 전환 효과를 보존한 채 고민 100개 탐색과 초융합 UI·생성 경로 검증을 끝낸 뒤 최종 main CI 통과 시 운영 승격한다.
---

# 꿀꿀운세·영냥이 최종 디자인 및 초융합 검증 인수인계

## 2026-09-30 재개 검증 기록 (이 절이 아래 과거 상태를 대체)

- 보존 커밋: `f9ce80fa8` 전환 효과, `acbb8ae46` 고민 100개와 초융합 UI/검증, `49f123bda0c608c9bf567b5fcfcd14945bdb03a6` 최신 main 통합.
- 기존 6개 ID/상품-kind 매핑 유지 + 신규 일상 고민 94개. 10개 분야, 검색, 12개씩 더 보기, 선택 상태, 빈 결과 안내, 기존 ask 상담 연결. 검색어/고민 원문은 analytics로 전달하지 않는다.
- 초융합 배너에 기존 영냥이 hero 이미지를 노출. 3개 pair와 6체계 종합 상품을 구분하고, 계산 근거 비교와 종합 행동 조언을 설명한다. 가격/결제/인증/API/DB/생성 엔진은 이 작업에서 변경하지 않았다. 최신 main의 다른 작업은 merge로 보존했다.
- `node --test __tests__/ui/question-concerns.test.mjs __tests__/ui/yeongnyangi-fusion-delivery.test.mjs`: main 통합 후 10/10 통과.
- 초융합 실제 엔진 → snapshot → manifest/factSelectors → StructuredChapterProvider 입력 → validate/deliver → draft 저장/복구 → 재조회까지 총 82장 확인. 각 체계 입력 누락, 잘못된 출처, 동일 장 복제 거부. draft 저장 후 finish 실패를 주입하고 provider 재호출 없이 재개 확인. 4상품 ask 재시도 snapshot 및 타로 카드 불변 확인.
- 위 생성 검증은 provider/repository/DB/queue 경계를 mock으로 대체했다. 운영 DB 내구성·실LLM 문장 품질의 실측 증거가 아니다. 네트워크 guard 적용, 실과금/실결제/운영 DB 쓰기 없음.
- 기존 engines/invariance 3검사 통과. 전환 효과의 modifier/reduced-motion/detail=0/중복클릭/pageshow/2.5초 cleanup mock 이벤트 검사 통과. 독립 리뷰 확정 결함 없음.
- CUA Chrome에서 실제 변경 JSX/CSS fixture의 검색/빈결과/분야/선택을 확인. 360/390/430/1280px 수평 overflow 없음, 초융합 CTA 높이47px. 본문/이미지/CTA 화면 확인. 전체 Next 앱 검증과는 구분한다.
- 화면 파일: `C:/Users/user/.codex/visualizations/2026/09/30/01a0f103-b390-74e1-86b7-fd14e779888e/concerns-fusion-{360,390,430,1280}.png`.
- 전체 Next 로컬 dev는 C드라이브 워크트리와 D드라이브 node_modules junction의 모듈 경로/CSS plugin 충돌로 실패. 제품 설정 변경 없이 중단. CI 빌드의 실제 앱에서 상담 입력 전달 및 초융합 선택 확인이 남는다.
- `check:fast -- --plan` critical. 최초 check:fast paid gates88/npm test/lint 통과 후 sitemap drift로 중단, 정본 생성기로 갱신. 재실행 진행 상태는 최종 로그 `$env:TEMP/concerns-check-final.log` 확인. 실행 도중 main 통합했으므로 최종 통합 범위의 확정 근거는 exact-SHA CI로 삼는다.
- tracked-clean `verify:public-mirror-fresh` 통과. main 통합 시 sitemap 원장 충돌은 origin/main을 기준으로 generator 재생성. `verify:no-nested-retry` 통합 후 통과.
- 남은 순서: public sync/fresh 최종 확인 → 공유 main의 다른 미커밋 보존하며 fast-forward → push → exact main CI required 통과 확인 → 실제 앱 릴리스 검증 → 승인된 1회 production workflow → Pages/Worker live SHA 확인. 운영 승격은 아직 실행하지 않았다.

재개 위치: `C:/Users/user/.codex/worktrees/ggulggul-home-entry/code-destiny`.
재개 문서: `C:/Users/user/.codex/worktrees/ggulggul-home-entry/code-destiny/docs/handoff/2026-09-30-yeongnyangi-concerns-fusion-release-handoff.md`.
마지막 구현/통합 SHA: `49f123bda0c608c9bf567b5fcfcd14945bdb03a6`.
첫 다음 행동: `git status --short`와 최종 검증 로그 확인 후 공유 main 통합/push 상태를 확인한다. 배포 완료 여부는 최종 응답 또는 GitHub release run과 live SHA로 확인한다.

## 사용자 요청과 승격 조건

모든 아래 요청은 누적 범위다. 아직 운영 승격하지 않았다. 문서는 작업 사실과 다음 작업을 전달하며 별도 과금 승인을 대체하지 않는다.

1. 대표 `/` 진입은 꿀꿀운세. 꿀꿀운세에서 영냥이 사이트 자체 `/yeongnyangi/`로 연결한다.
2. 양방향 진입점을 고급스러운 달빛 분위기로 개선한다. 역방향은 사용자가 고른 연꽃 꽃돼지 이미지로 한다.
3. 꿀꿀→영냥이 전환 효과도 개선한다. 이미지 생성은 선택이다.
4. 영냥이의 `다른 고민 더 찾아보기`에 누구나 겪는 다양한 고민을 최대 약 100개, 카테고리별 검색 가능하게 구성하고 `영냥이에게 무엇이든 상담하기`로 잇는다.
5. 초융합 운세 배너에 영냥이를 노출하고 실제 서비스 설명을 충분히 쓴다. 여러 운세 체계가 생성 과정에 제대로 반영되는지 정확히 검증한다. 통과한 뒤에만 운영 승격한다.
6. 컨텍스트가 길면 다음 세션용 인수인계를 작성하도록 명시적으로 요청했다. 이 문서가 해당 인수인계다.

## 작업 위치와 Git

- 작업 디렉터리: `C:\Users\user\.codex\worktrees\ggulggul-home-entry\code-destiny` (기존 detached worktree 재사용)
- 로컬 마지막 커밋: `e08e20197fdde744aa306fd066d0ef8b4b6ca800` — 꽃돼지 역방향 진입점과 `.ignore` 보정. 아직 main 통합·push 안 함.
- 이미 main에 push한 커밋: `5687ea634740094868a3e34313b7d416441f0fe4` — 대표 진입과 영냥이 카드 개선.
- 새 브랜치/PR 만들지 않았다. 다음 세션도 해당 워크트리 변경을 마무리하고 main에 통합한다.
- 공유 main `D:\Development\code-destiny`에는 다른 세션의 marketing/HANDOFF.md, marketing/content-log.md, marketing/performance.md, next-env.d.ts, tsconfig.json 및 .tmp/ 변경이 있었다. 새 상태를 확인하고 보존한다. broad reset/clean/stash/git add -A 금지.
- 옛 인수인계 `2026-09-30-ggulggul-yeongnyangi-entry-production-handoff.md`는 이 워크트리에 untracked로 보존되어 있다. 옛 SHA/상태는 이 문서가 대체한다.
- 최초 calendar guard dirty 1줄은 origin/main에 이미 동일 반영된 것을 확인하고 그 파일만 복원했다. 패치 백업은 `%TEMP%\ggulggul-calendar-handoff.patch`.

## 완료한 첫 커밋 5687ea634

- app/page.js에서 LegacyHomeEntry defaultTarget을 `/ggulggul/`로 지정. 기존 query/hash/payment return 우선순위와 question 경로는 보존.
- templates/home-funnel.html이 홈 마크업 정본. generator가 index/public locale mirrors를 생성한다. 생성된 HTML만 편집하지 말 것.
- 꿀꿀운세 타이틀, 작은 달빛 점술방 카드, 실제 `/yeongnyangi/` 연결.
- 모바일 헤더 두 줄과 간격 수정으로 360px 화면 카드와 하단 nav 겹침 해결.
- 360/390/430/desktop 및 Neo 테마 스크린샷 확인. 360에서 portalBottom 678.34 < navTop 679, 수평 overflow 없음.
- root routing 8 tests, check:fast exit0(318 Jest suites / 4615 tests, paid gates88 포함), hero contrast, mobile nonintrusive 검사 통과.
- 독립 마감 리뷰 ship. 실 결제/실 LLM 호출 없음.

### CI 실패 원인과 보정

- 첫 커밋 CI run: https://github.com/rei1237/codedestiny/actions/runs/36676171569
- Static guards의 verify:public-mirror-fresh만 `.ignore` 1줄 drift로 실패. 다른 critical/build/typecheck/lint success. Paid Flow Gates run36676171666 success.
- 원인: Windows Python write_text가 styles/home-funnel.css를 CRLF로 썼고 public mirror는 LF. byte-identical 판정이 로컬과 Linux에서 달라졌다.
- source CSS를 LF(newline='\n')로 정규화하고 sync:public 재실행. `.ignore`에 `/public/styles/home-funnel.css`가 돌아온 보정이 e08e20197에 포함됨.
- generator를 변경하거나 guard를 완화하지 않았다. 최종 tracked clean 상태에서 `npm run verify:public-mirror-fresh` 필수. dirty 상태에서는 이 검사가 시작하지 않거나 혼동을 준다.

## 완료·로컬 커밋 e08e20197

수정 파일: app/yeongnyangi/_original/FortuneHome.tsx, original.css, .ignore.

- 사용자가 선택한 기존 이미지 `/images/home/yeoni-pass-mascot-480.webp` 사용. 240/480 responsive srcSet.
- `달빛 따라, 꿀꿀운세로.` / `꽃돼지 연이가 기다리는 다정한 운세 정원.`
- plum 배경·금색 CTA·아치형 꽃돼지 프레임, 기존 yehwa branch 장식, 모바일 중앙 배치.
- primary `연이의 꽃정원 둘러보기`는 기존 ggulggulFortuneHref helper를 통해 `/ggulggul/`. secondary `/points/` 이용권 알아보기.
- 가격/정책/인증/API/DB 변경 없음.
- 실제 JSX/CSS를 esbuild ReactDOMServer로 추출한 isolated fixture로 360/390/430/desktop 검증. 전체 Next 앱 통합 검증은 아님.
- scoped detector findings 없음. 독립 bridge_review ship.
- 해당 시점 check:fast exit0: paid gates88, Jest318 suites/4615 tests 등 통과. 로그 `%TEMP%\ggulggul-bridge-check.log`.
- 이 check는 아래 전환 효과 수정 전 시작했으므로 전환 효과/이후 기능의 최종 검증으로 쓰지 않는다.

## 현재 미커밋: 꿀꿀→영냥이 효과

- 정본 js/core/home-funnel.js, styles/home-funnel.css 수정 및 public 미러 동기화 완료.
- index.html/public index locale mirrors 변경도 sync 산출물로 존재한다. diff 내용 재확인 후 해당 범위만 commit.
- 기존 과한 원형 glow/전체 페이지 zoom 대신 #0b1220 veil, 기존 영냥이 avatar, 작은 달, serif title, 얇은 금색 선. 640ms.
- overlay aria-hidden, 클릭 중 underlying 탭 방지. 페이지 이동은 기존 link.href 사용.
- reduced-motion 사용자는 native link로 즉시 이동. modifier/newtab 동작과 pageshow cleanup 유지.
- 아직 effect 시각·행동 검증 안 함. node 문법·실제 이벤트 검사와 reduced-motion/Ctrl/중복클릭/pageshow cleanup 검증 필요.
- sync:public와 sitemap:generate 실행 exit0. 로그 `%TEMP%\ggulggul-transition-sync.log`, `%TEMP%\ggulggul-transition-sitemap.log`.
- git diff --check 통과(줄바꿈 경고는 있음).

## 고민 탐색: 조사만 했고 구현 안 함

- app/components/QuestionJourney.tsx, QuestionJourney.module.css
- lib/fortune/question-journey.ts
- 현재 questionGuides 6개, 첫4는 노출하고 details에 나머지2만 표시한다.
- 기존 id reconnect/money/partner/career/distance/choice와 contextual ids는 외부 연결·freeQuestionMap 때문에 보존.
- questionOffer는 실제 catalog/getProduct, consultationKinds, supportsKind, consultationManifest로 가격/챕터를 가져온다. 하드코딩 가격 금지.
- questionCheckoutHref는 `/yeongnyangi/fortune/?product=...&consultationKind=...&topic=...&questionId=...`.
- app/yeongnyangi/_components/Consultation.tsx 약142행: getQuestionGuide(questionId) 후 product/kind 일치하고 requestedKind.question일 때 기존 질문 입력을 채운다. login draft 복원은 이후라 기존 사용자 draft 우선 유지.
- 따라서 정적 질문 100개는 이 정본/소비자를 활용할 수 있다. `무엇이든`은 실제 consultationKinds의 ask 지원을 먼저 확인하고 연결한다. 이름만 비슷한 `mode=spirit` 신점은 별도 서비스이므로 임의 연결하지 않는다.
- 권장 UX: 약10개 카테고리, 전체 최대100개, 검색 input/카테고리 필터/결과 수/빈 결과 안내/선택 상태, 모바일 스크롤 부담 줄이기. 선택 후 무엇을 상담하는지 확인하며 기존 ask 질문 입력으로 연결.
- 자유 질문도 요청 의도에 맞게 이어지게 하되 사용자 고민 원문을 analytics로 보내지 않는다. URL에 원문을 실을지 말지 기존 draft 구조를 먼저 조사한다.
- 데이터 uniqueness/100개 상한/카테고리·검색/유효 product-kind/질문 전달·기존 draft 보존 검증 필요.

## 초융합: 최신 추가 요청, 조사만 했고 구현 안 함

- FortuneHome.tsx 약373행 fusion-section: Art name="story-curse" 배경만 있고 영냥이 없음. 실제 사용자 지적과 일치.
- 현재 문구는 `흩어진 운명을, 하나의 이야기로.`, 설명 두 줄, 사주·자미두수·숙요·베다·점성술·타로 목록.
- 버튼 openPanel('fusion')의 실제 소비자/상담 경로까지 추적한다.
- app/yeongnyangi/_lib/consultation-copy.ts에 fusion_saju_ziwei, fusion_sukuyo_vedic, fusion_astrology_tarot, fusion_all 설명 정본 존재.
- worker/yeongnyangi/payments/catalog.ts에서 실제 product.systems, readingKind, 정책 확인. 실제 동작에 맞춰 체계별 공통점/차이/종합 조언을 설명하며 혼합해서 같은 체계처럼 쓰지 않는다.
- **worker/yeongnyangi/fortune/reading-v7.ts v7Applies(약232행)는 readingKind==='single'만 적용. reading-v6.ts도 single 제한. v7 tests 통과를 초융합 검증으로 주장하면 안 된다.**
- worker/yeongnyangi/fortune/reading-manifest.ts: readingKind pair는 pairs, all은 combinedRows() 사용. 각 chapter.systems 및 factSelectors가 있음. 이 파일에서 실제 생성 호출부/엔진 snapshot/저장·복구 경로를 추적할 것.
- `worker/yeongnyangi/fortune/orchestrator.ts`, `service.ts`는 존재하지 않음. 추측 경로 편집 금지.
- 기존 __tests__/worker/fusion-* 테스트들은 다른 레거시 fusion일 수 있다. Yeongnyangi fusion_all 경로를 직접 검증하는지 확인해야 함.
- __tests__/ui/yeongnyangi-engines.test.mjs, reading-invariance, reading-v5/v6/v7 및 실제 호출부 관련 테스트에서 시작하되 이름만 보고 증거로 재사용하지 않는다.

### 초융합 승격 전 증거

1. 실제 UI에서 영냥이 노출, 설명/모바일/keyboard/reduced-motion 확인.
2. fusion_all 및 각 pair의 catalog systems → 각 엔진 계산 → snapshot → manifest chapter systems/factSelectors → provider prompt → saved result 흐름 추적.
3. mock provider의 호출 입력을 검사해 각 체계 근거가 누락/덮어쓰기/다른 체계로 대체되지 않는지 확인. 같은 단일 결과 복제 여부 검사.
4. 생성 중단/재개, 부분 저장, 재조회, 카드 id/order/orientation 불변 및 전체 결과 종합 챕터 확인. 표시만 번갈아 바뀌는 연출을 실제 다중 체계 생성 증거로 삼지 않는다.
5. provider retry/예산/재생성 중복 여부 확인. 엔진·계산 근거가 없는 경우 성공처럼 표시되지 않는지 확인.
6. 코드/mock 증거와 실 LLM 문장 품질 증거를 구분한다. 이번 요청은 개발 검증에 실과금을 쓰라는 구체 승인이 아니다. 필요하다면 정확한 모델/프롬프트/횟수/예산을 제시하고 별도 승인 후만 호출한다. 운영 DB·실결제도 개발검증에 쓰지 않는다.

## 검증/전달 순서

1. CLAUDE.md, docs/context/delivery-and-ci.md 및 관련 AGENTS 지시를 읽는다. impeccable skill은 이 세션에서 적용했고 기존 자산/브랜드 및 independent finish review로 마감했다.
2. 위 미구현2범위와 미검증 effect를 끝낸다. 의미 있는 targeted tests, check:fast -- --plan 후 check:fast. 매 작은 수정마다 전체 suite 반복하지 않는다.
3. sync:public/sitemap:generate 필요분 반영. 소스 CSS LF 유지.
4. 작업 단위 scoped commit. tracked clean 상태 public-mirror-fresh 검사. 공유 main 상태와 원격 진척 확인 후 main 통합/push. 다른 세션의 변경을 섞지 않는다.
5. **최종 exact main SHA CI required success 필수.** 5687ea634 CI는 실패 상태였고 e08e20197은 아직 push 안 했으므로 완료 아님.
6. 전 범위 검증 통과 후만 기존 production workflow를 현재 파일에서 읽어 지정 SHA로 dispatch. 임의 최신 main 배포 금지. 아직 이 세션은 production dispatch를 한 번도 안 함.
7. 배포 가이드의 반복 polling 금지 규칙 준수. 최종 release verification에서 Pages `/version.json`과 Worker `/api/version` SHA 일치 증거를 얻고, dispatch만 했으면 완료 배포라고 말하지 않는다.

## 시각 증거 및 임시 도구

디렉터리: `C:\Users\user\.codex\visualizations\2026\09\30\01a0f0ce-ec02-7541-a764-ddd35c68c063`
- ggulggul-mobile-360.png / -390.png / -430.png / ggulggul-desktop.png / ggulggul-neo.png
- yeoni-bridge-desktop.png / yeoni-bridge-mobile-360.png / -390.png / -430.png
- yeoni-bridge-detail.png는 잘린 캡처로 무효. 사용하지 않는다.
- bridge preview 임시 .tmp/public/.tmp 파일은 정리했고 Node4320 서버 종료.
- Python4317 서버가 과거 중복 생성된 적 있다. 정리 필요 시 실제 commandline과 소유 확인 후 해당 프로세스만 종료. 재사용된 PID를 추측해 kill 금지.
- CUA는 재진입 시 documentation을 다시 읽어 사용할 것. 모든 browser interaction은 CUA. evaluation은 read-only DOM만.
- local static shell→/yeongnyangi/ 클릭은404(Next없는 서버)였으므로 full Next 성공 증거가 아니다. 배포된 영냥이 홈 정상 확인은 별도 수행했었다.

## 최종 보고

한국어로 수정파일/의도/유지 정책/검증 명령과 결과/미검증 항목을 보고한다. 실기기·실LLM을 하지 않았다면 명확히 구분한다. 운영 승격 미완료를 숨기지 않는다.
