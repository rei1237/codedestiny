---
status: blocked
updated: 2026-10-24
next: "B2 — 가격을 비울지 또는 24시간 수동 갱신할지 사용자 결정 대기. C — 공식 subId·링크 형식 근거 대기. 후속 코드는 main에서 새 안전 워크트리로 진행."
---

# 쿠팡 추천 — 상품별 CTR과 상품 데이터 (Codex 위임)

## 왜

- 원 요청(2026-10-22): "현재 쿠팡 등 광고 시스템을 도입했는데 수익화가 잘되도록 최적화시킬 필요성도 있어보이네"
- 배치 최적화(결과 최대 2개, 노출 위치)는 끝났다. 그 뒤 남은 두 가지를 이 문서로 옮겼다: UX 후속 문서 `docs/handoff/ux-followups-20261023.md`의 22·23번.
- 위임 지시(2026-10-23): "남은 일은 코덱스에게 위임할거니까 인수인계 문서와 명령어 만들어서 줘"
- 목표
  - 어떤 상품이 실제로 눌리는지 상품별 CTR로 본다. 지금은 노출이 섹션 단위라 상품별 CTR을 계산할 수 없다.
  - 이미지·가격이 빠진 쿠팡 상품 32개를 사용자가 채울 수 있게 준비한다. 값은 지어내지 않는다.

## 인수 당시 상태 (2026-10-23, 다시 하지 않는다)

- 기준: 로컬 main `9b88b60f7`과 이 문서 커밋.
  - 로컬 main은 origin/main보다 77커밋 앞서 있다(push 안 함).
  - origin/main에는 로컬에 없는 다른 세션 커밋 22개가 있다(영냥이). 둘을 합치는 일은 이 과제가 아니다.
- 쿠팡 32개는 2026-10-16에 운영 등록·공개됐다.
  - 스냅숏: `docs/operations/affiliate-expanded-coupang-20261016.json`.
  - 32개 모두 `imageUrl`·`price`가 비어 있다. 운영 DB의 현재값은 이 스냅숏과 다를 수 있다.
- 관리자 화면 `/admin/recommendations`에는 이미지 주소·이미지 근거·가격·가격 확인 시각 입력란이 이미 있다(`app/admin/recommendations/page.jsx:87,100-101`).
- 정책 정본: `docs/operations/coupang-foundation.md`. 특히 "API 없이 등록하는 순서"(:42-)와 "이동과 통계"(:93-103)를 읽는다.

## 작업 규칙

- `AGENTS.md`·`CLAUDE.md`를 먼저 읽는다. 아래 사용자 규칙이 AGENTS.md와 다르면 아래가 우선이다.
- 작업 위치
  - 새 워크트리를 만들어 그 안에서만 작업한다. 루트 `D:\Development\code-destiny`에서 다음을 실행한다.

    ```powershell
    powershell -ExecutionPolicy Bypass -File scripts\create-safe-worktree.ps1 -Slug coupang-ctr -Base main
    ```

  - 🔴 `-Base main`이어야 한다. 기본값 origin/main에는 이 문서와 앞선 작업 77커밋이 없다.
  - 루트 체크아웃에는 다른 세션의 미커밋 변경이 있다. 루트에서 `reset --hard`·`stash`·`checkout --`를 쓰지 않는다. 남의 파일(`.claude/skills/fire-your-seo-agency/`, `docs/handoff/ggulggul-master-repair-release.md` 등)은 건드리지 않는다.
- 머지 흐름(PR 없음)
  1. 워크트리에서 `git rebase main`.
  2. `git worktree list`로 실제 main 체크아웃을 확인하고 그곳에서 `git merge --ff-only <워크트리 브랜치>`. 2026-10-24 기준 main은 `C:/Users/user/Documents/Codex/worktrees/mobile-clarity-20261023-122535`이며 원래 루트는 다른 브랜치다.
  3. 실제 main 체크아웃에서 `npm run -s verify:public-mirror-fresh`.
- 커밋·배포
  - 수정이 끝나면 말하지 않아도 커밋한다.
  - 🔴 push·배포는 사용자가 요청할 때만 한다. AGENTS.md의 "종료 전 push"보다 이 규칙이 우선이다.
  - push를 요청받으면 origin/main 기준 워크트리에 자기 커밋만 cherry-pick해서 push한다(로컬 main에 남의 미push 커밋이 있기 때문).
- 셸 파일(`index.html`, `js/*`, `styles/*`)을 고치면 `npm run -s sync:public`을 돌리고 결과를 커밋한다.
  - bash라면 `env -u CACHE_BUST_KEY -u BUILD_CACHE_KEY`를 앞에 붙인다.
  - 이 과제에서는 `js/recommendations-legacy.mjs`, `js/recommendations-core.mjs`, `js/recommendations-browser.mjs`가 해당한다.
- 금지
  - 실결제, 운영 DB 쓰기·환불·정산, 실제 제휴 링크 클릭, 쿠팡 API 호출·키 사용.
  - 운영 DB 읽기는 매번 사용자 승인을 받는다.
  - 유료 LLM 호출, `i18n:translate-pending`.
- 고치지 않는 파일: `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, 마이그레이션 산출물, `worker/wrangler.toml` 구조.
- 비밀값·고객 개인정보를 출력·저장·커밋하지 않는다.
- 프로세스: 포트 번호만 보고 프로세스를 죽이지 않는다. 자기가 띄운 것으로 확인된 경우만 종료한다.
- 테스트 실행
  - `__tests__/ui`는 jest가 아니라 `node --test`로 돌린다.
  - Node 24에서는 디렉터리 인자가 실패하니 글롭을 쓴다: `node --test "__tests__/ui/recommendations*.test.mjs"`.
- 산출물(CSV·스크린숏)은 D 드라이브에 둔다: `D:/codedestiny-qa/coupang-ctr-20261023/`.
- 과제 밖에서 찾은 기존 결함은 고치지 말고 이 문서 끝에 새 번호(`K1.` …)로 적는다.
- 보고는 한국어로, 진행 상황은 짧게 자주.

## 현황 (코드 사실, 2026-10-23 main 기준)

줄 번호는 고치기 전에 `git grep`으로 다시 찾는다.

| 무엇 | 위치 | 지금 |
|---|---|---|
| 이벤트 정제 | `js/recommendations-core.mjs:210-216` `EVENT_NAMES`·`cleanEvent` | 허용 키 5개(`event, service, placement, productId, consent`). `productId`가 없으면 `'block'`으로 저장하고, click만 `productId`가 필수다 |
| 노출 호출 | `app/components/recommendations/RecommendationSurface.jsx:96`, `RecommendationBrowse.jsx:27`, `js/recommendations-legacy.mjs:82` | 섹션 단위 1회, `productId` 없음 → 전부 `'block'` |
| 클릭 호출 | `RecommendationSurface.jsx:104`, `recommendations-legacy.mjs:73`, `RecommendationBrowse.jsx` | 상품별 |
| 전송 | `js/recommendations-browser.mjs:8-13` | `keepalive` POST `/api/recommendations/events`, `credentials: 'omit'` |
| 저장 | `worker/routes/recommendations.js:23-40`, 모델 `worker/lib/recommendation-models.js:6` | `_id = day\|service\|placement\|productId\|event`, `$inc count`. 본문 1024B 상한(:29), 전역 600건/분 상한(:33-34). 비활성·미공개 상품 id는 400 |
| 관리자 집계 | `worker/routes/admin-recommendations.js:14-21` | 최근 30일 원시 행을 최대 5000개 읽고, 넘으면 `possiblyTruncated` 표시 |
| 관리자 화면 | `app/admin/recommendations/page.jsx:54,121-123` | 이벤트별 합계와 서비스 필터만 있다. 상품별 표 없음 |
| 링크 검증 | `js/recommendations-core.mjs:58-71` `validateAffiliateUrl` | `/re/AFFSDP`는 쿼리 키 5개(`lptag, pageKey, itemId, vendorItemId, traceid`)만, 그 밖에는 `/a/<code>` 단축 링크만 허용. subId 없음 |
| 이미지 검증 | 같은 파일 `validImageUrl` | `thumbnail*.coupangcdn.com`·`image*.coupangcdn.com` 또는 로컬 `/assets`·`/images`만 |
| 가격 | 같은 파일 `currentPrice`(약 :155) | 확인 시각부터 24시간이 지나면 `null`로 숨긴다(`coupang-foundation.md:58`). 가격이 없으면 CTA가 "현재 가격 확인"을 맡는다(`RecommendationSurface.jsx:34-36`, `recommendations-legacy.mjs:69-70`) |
| 통계 원칙 | `docs/operations/coupang-foundation.md:93-103` | 노출 = 50% 이상 1초, 표시 세션당 1회. IP·식별자 저장 안 함. 자체 지표와 공식 리포트 분리 |

## 남은 작업 (이 순서로)

### A. 23-코드: 상품별 노출과 CTR (Codex가 끝까지)

- [x] **A1. 상품별 노출을 기록한다**
  - 화면에 실제로 보인 상품마다 노출을 남긴다. 노출 정의(50%·1초·세션당 1회)는 바꾸지 않는다.
  - 결정하고 이 문서에 이유를 적는다. 판단 기준은 전역 600건/분 상한, 본문 1KB, 집계 `_id` 형식이다.
    - (a) 상품마다 이벤트 1건
    - (b) 이벤트 1건에 상품 id 배열
  - 참고: 결과 화면은 최대 2개(`RESULT_PRODUCT_LIMIT`)이고, 둘러보기 화면은 더 많다.
  - 기존 섹션 노출(`'block'`)과 상품 노출이 관리자 "자체 노출" 합계에서 이중 집계되지 않게 한다. `EVENT_NAMES`를 늘리면 `cleanEvent`·서버·관리자 화면을 모두 맞춘다.
  - 노출 호출 3곳(Surface·Browse·legacy)을 모두 바꾼다. 미리보기(`previewProducts`)는 지금처럼 기록하지 않는다.
  - 노출 effect 의존성에 렌더마다 새로 만드는 `context`를 넣지 않는다(`RecommendationSurface.jsx:94-96` 주석 참고). 넣으면 노출이 중복 집계된다.
- [x] **A2. 관리자 화면에 상품별 표를 만든다**
  - 서버에서 30일치를 상품별로 묶어 돌려준다(Mongo `aggregate` `$group`). 상품별 행이 늘면 원시 행 5000개 상한에 먼저 걸린다.
  - 열: 상품 제목·id, 노출, 클릭, CTR(클릭÷노출). 노출이 0이면 "미확인"으로 표시한다. 서비스·위치 필터를 둔다.
  - "자체 지표" 표시를 유지하고, 공식 리포트 숫자(클릭·주문·수익)와 섞지 않는다.
- [x] **A3. 테스트·문서·확인**
  - jest `__tests__/worker/recommendations.test.js`: 새 노출 이벤트 수용·거부, 상품별 집계.
  - `node --test "__tests__/ui/recommendations*.test.mjs"`: 노출 호출이 상품별로 나가는지.
  - `docs/operations/coupang-foundation.md`의 "이동과 통계"를 새 집계에 맞게 고친다.
  - 확인은 mock 개발 서버(`npm run dev`, 외부 요청 차단)와 테스트로만 한다. 운영 DB와 실제 클릭은 쓰지 않는다.
  - 머지 전에 `npm run check:fast`를 끝까지 통과시킨다. 결제 게이트 스위트가 실패하면 그 뒤 단계가 돌지 않는다. 출력 끝의 `BLOCKED`를 반드시 확인한다.
  - 관리자 화면은 색인되지 않으므로 SEO 영향이 없다. 커밋 메시지에 그렇게 적는다.

### B. 22: 상품 이미지·가격 (데이터는 사용자 몫, Codex는 준비만)

- [x] **B1. 입력 시트를 만든다**
  - 파일: `D:/codedestiny-qa/coupang-ctr-20261023/products-to-fill.csv`(UTF-8 BOM, 엑셀에서 열리게).
  - 열: `id, title, category, imageUrl, imageSource, price, priceVerifiedAt`. 값이 비어 있는 열은 빈칸으로 둔다.
  - 기준은 JSON 스냅숏이다. 운영 DB 현재값과 대조하려면 먼저 사용자 승인을 받는다.
  - 시트 머리에 규칙을 한 줄 적는다: 이미지는 coupangcdn 주소만 쓰고 근거를 함께 적는다.
- [ ] **B2. 사용자에게 결정을 받는다** (질문만 하고 혼자 정하지 않는다)
  - 수동 입력한 가격은 24시간 뒤 화면에서 사라진다. 그래서 수동 가격은 하루짜리다.
  - 권장안: 가격은 비우고(CTA "현재 가격 확인"이 대신한다) 이미지만 채운다.
  - 자동 가격 갱신에는 쿠팡 파트너스 API 승인과 키가 필요하다. `coupang-foundation.md:11`이 금지하고 있으니 별도 요청 때만 연다.
- [x] **B3. 입력 경로를 안내한다**
  - 입력은 사용자가 `/admin/recommendations`에서 직접 한다. Codex는 운영 DB에 쓰지 않는다.
  - 이미지 다운로드, 상품 사진 생성, 상품 설명·후기 복사는 하지 않는다(`coupang-foundation.md:47`).

### C. 23-subId (사용자 조치 대기)

- [ ] **C1. subId 발급·링크 형식은 사용자가 확인한다.** 받기 전에는 코드를 바꾸지 않는다.
  - 받으면 공식 링크 형식의 근거를 `coupang-foundation.md`에 남기고, `validateAffiliateUrl` 허용 키에 추가한 뒤 테스트를 붙인다.
  - 기존 링크 뒤에 파라미터를 임의로 붙이지 않는다. 검증기가 거부하고 수익 귀속이 깨질 수 있다.
  - subId는 공식 리포트(수동 입력) 쪽 숫자를 나누는 용도다. 자체 CTR은 A로 이미 볼 수 있다.

### D. 범위 밖 기록 (사용자 지시 없이는 하지 않는다)

- `docs/handoff/ux-followups-20261023.md` 끝의 H1~H21은 이전 세션이 발견만 하고 고치지 않은 기존 결함이다.
- 이 중 H17(모바일 하단 탭 가드가 main에서도 실패)과 H21(레거시 추천의 관심사 선택이 닿지 않음)은 이 영역과 가깝다. 손대기 전에 사용자에게 묻는다.

## 완료 기준

- A1~A3을 체크한다. `check:fast` 전 단계가 통과하고, 로컬 main에 ff 머지돼 있다.
- B1 시트 경로를 보고하고, B2 질문을 사용자에게 한다.
- 이 문서를 갱신한다.
  - C가 남으면 `status: blocked`, 남은 게 없으면 `status: done`.
  - `next`에는 다음 행동을 적는다.
- 끝나면 자기 워크트리를 배수한다(AGENTS.md).
  1. node_modules 정션부터 끊는다: `(Get-Item -LiteralPath '<워크트리>\node_modules' -Force).Delete()`.
  2. `git worktree remove --force <워크트리>`.
  3. `git branch -d <브랜치>`.
- push는 하지 않는다.

## 기록

### 2026-10-24 구현·검증 기록

- 사용자가 현재 상태에서 안전하게 진행하도록 승인했다. 지정했던 b9c2bbc88은 현재 main da8f766dd8048929ac8d5fd8e519917953be5f9d의 조상이며, 추천 관련 소스 차이는 없었다. 새 워크트리는 `D:/Development/codedestiny-worktrees/coupang-ctr-20261024-014132`, 브랜치는 `wt/coupang-ctr-20261024-014132`다.
- 루트는 다른 세션의 `feat/world-cast-page`다. 위의 루트 merge 명령을 그대로 실행하지 않는다. 실제 main 체크아웃은 `C:/Users/user/Documents/Codex/worktrees/mobile-clarity-20261023-122535`이며 다른 세션의 미커밋 파일을 보존한다.
- A1 결정: (a) 상품마다 이벤트 1건. 결과 최대 2개와 실제로 보인 둘러보기 카드만 전송한다. 기존 1KB 본문·600건/분·day|service|placement|productId|event 키를 유지한다. 묶음 배열의 별도 검증·부분 수락 규칙 없이 카드별 50%·1초 조건을 그대로 적용한다. 한도에 걸리면 누락될 수 있는 자체 참고 지표다.
- Surface/Browse/legacy는 실제 article을 관찰한다. 표시 세션의 Set으로 같은 상품의 새로고침·필터 재표시를 중복 집계하지 않는다. React effect는 service·상품 ID 목록에 의존하고 매번 생성되는 context에는 의존하지 않는다. 미리보기 통계와 외부 링크는 비활성 상태를 유지한다.
- impression에 실상품 ID를 요구한다. 기존 block 노출은 추가 수집·자체 노출 합계·CTR 분모에서 제외한다. 과거 클릭은 남기므로 수집 전환 초기 CTR의 한계를 화면에 안내한다.
- A2: Mongo aggregate가 30일 기록을 서비스·위치·상품으로 먼저 묶고 이벤트별 합계를 반환한다. 원시 5,000행 제한을 제거했다. 관리자 상품 제목·ID/노출/클릭/CTR 표, 서비스·위치 필터, 노출 0의 미확인, 빈 상태를 추가했다. 공식 리포트와 분리한다.
- 검증: `node --test "__tests__/ui/recommendations*.test.mjs"` 43/43, `npm run test:jest -- --runInBand __tests__/worker/recommendations.test.js` 22/22 통과. 첫 Worker 실행의 승인 fixture 누락 1건을 수정한 뒤 재검증했다.
- `npm run -s sync:public`, `npm run -s sitemap:generate` 완료. 관리자 noindex 유지, 공개 문구·URL·canonical·robots 변경 없음. 공유 추천 컴포넌트 변경에 따른 sitemap 서명 5개만 갱신했고 날짜는 기존대로다.
- mock 개발 서버+외부 요청 차단 브라우저: 360/390/430/1280px 가로 넘침 0, 실행 오류 0. 필터 CTR·노출 0·미리보기 전송 0·실제 가시성/중복 방지 통과. 화면·JSON은 `D:/codedestiny-qa/coupang-ctr-20261023/`. 실제 제휴 클릭 없음. 작업 소유 mock 서버 종료 완료.
- 디자인 detector 결과 `[]`. 기존 PRODUCT/디자인 메타데이터 노후화는 이번 범위 밖이다.
- `npm run check:fast` 끝까지 통과(종료 코드 0, BLOCKED 없음). paid-gate-suite 90/90, 전체 Node 3,501/3,501, 최종 Jest 424개 스위트·6,757개 테스트 통과. 전체 lint·typecheck·sitemap 일치·Worker dry-run 빌드·인코딩 검사 통과. 검증 뒤 최신 main `fcd9db614`로 재배치했으며 `git range-diff`에서 구현 패치 동일(`=`)을 확인했다.
- 결제 정책·이용권/월정석/단건 결제·인증·DB 스키마는 변경하지 않았다. 추천 이벤트 검증 및 관리자 통계 응답만 요청 범위에서 변경했다. 운영 DB 읽기/쓰기·쿠팡 API·유료 LLM·push·배포는 하지 않았다.
- 구현 커밋 `afba2c7a400f631da75412fcff54f4028b879dab`을 실제 main에 fast-forward 병합했다. 다른 세션의 변경을 되돌리거나 섞지 않았다. 병합 후 실제 main에서 `npm run -s verify:public-mirror-fresh` 종료 코드 0, 생성 결과 변화 없음 확인.
- B1 완료: `D:/codedestiny-qa/coupang-ctr-20261023/products-to-fill.csv`. JSON 스냅숏의 고유 상품 32개, 지정한 7열, 첫 줄 이미지 규칙, UTF-8 BOM 확인. imageUrl·imageSource·price·priceVerifiedAt는 모두 빈칸이며 운영 DB와 대조하지 않았다. 미리보기 렌더로 한글·열 배치도 확인했다. CSV는 첫 줄 안내, 둘째 줄 열 제목이며 데이터 자동 가져오기보다 수동 입력 참고용이다.
- B2 질문을 사용자에게 전달했다. 가격을 비우고 이미지만 입력하는 안을 권장했으나 아직 결정하지 않았다. 기존 24시간 가격 정책은 그대로다.
- B3 안내: 사용자가 `/admin/recommendations`에서 직접 입력한다. 입력 시트는 운영 DB에 자동 반영하지 않는다. 이미지 다운로드·생성, 설명·후기 복사는 하지 않았다.
- C 질문을 사용자에게 전달했다. 발급 subId·공식 링크 원문·형식 근거를 받기 전에는 검증기·링크를 변경하지 않는다. 응답 대기이므로 문서 상태는 blocked다.
- 구현과 검증은 완료됐다. 이 기록을 문서 커밋으로 main에 ff 병합한 뒤 위 완료 기준대로 자기 워크트리와 병합된 브랜치만 배수한다. 후속 작업은 남아 있는 main에서 새 안전 워크트리를 만든다.

### 범위 밖 확인

- K1. 기존 PRODUCT/디자인 스킬 메타데이터가 현재 코드와 맞지 않는 부분은 별도 정리 대상으로 남긴다. 이번 변경 UI의 디자인 detector 결과는 빈 배열이며 이 과제에서 메타데이터를 재작성하지 않았다.
