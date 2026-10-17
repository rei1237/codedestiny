---
status: done
updated: 2026-10-17
next: "완료(6단계 마스터별 고급 상세 포함). push·PR은 사용자 확인 뒤에 한다."
---

# 대표 상담 상세: 마스터 캐릭터·챕터·얻는 효과

## 왜

사용자 요청 원문 (2026-10-16):
> 상세 페이지도 각 대표 캐릭터들의 특징을 잘살리고 대표상담이니 만큼 어떤 챕터 그리고 어떤 효과를 얻을 수 있는지에 대해서 세부적으로 설정되어야하므로

대상은 대표 상담 3종과 각 마스터다(마스터 지정은 커밋 `98fe8adcc`에서 끝났다).

| 상품 | slug | 상세 원본 id | 마스터 (master-profiles 키) |
|---|---|---|---|
| 연애 비책 | `love-secret-ai` | `love-secret` | 연이 `yeoniLove` + 서한비 `hanbiLove` (부를 나눠 쓴다) |
| 신년운세 | `new-year-ai` | `new-year-expert` | 네오 `neoNewYear` |
| 인생의 책 | `life-book-ai` | `life-book` | 윤달 `yunLifeBook` |

이 작업의 범위는 **상세 페이지**다. 상세 페이지는 홈 팝업과 `/features/<slug>/`이고, 같은 렌더러를 쓴다. 상품 페이지(`/love-secret-ai/` 등)의 마스터 스트립과 소개장(`MasterProfile`의 dossier 변형)은 이미 끝났으며, 이번에는 **그 데이터를 재사용만** 한다.

### 🔴 지켜야 할 원칙

1. **가짜 경력 금지.** 캐릭터에 연수, 상담 건수, 수상, 실존 직함을 붙이지 않는다. 권위는 세 가지에서 나온다: 무엇을 근거로 읽는지, 이 상담에서 무엇을 맡는지, 어떤 원칙으로 말하는지.
   - 안내문의 "10년 경력 운세 상담사·명리학자가 만든 서비스"는 **실제 제작자**의 문구다(`lib/brand/founder.ts`). 그대로 두되, 캐릭터의 경력처럼 읽히는 자리로 옮기지 않는다.
2. **효과는 약속이 아니라 결과물로 쓴다.** "연애가 잘 된다", "돈이 들어온다" 같은 성과 보장은 금지다. 대신 "받고 나면 손에 남는 것"을 쓴다. 예: 보낼 문장 초안, 7일 실천표, 계산된 일진으로 고른 날짜, 월별 달력.
   - 건강은 진단이나 처방이 아니다. 날짜는 성공을 보장하지 않는다. 기존 안내문의 면책 문구를 유지한다.
3. **목차는 실제 생성 코드와 같아야 한다.** 손으로 쓴 목차가 코드와 어긋나면 허위 표시다. 반드시 테스트로 고정한다.
4. **카피 사본을 하나 더 만들지 않는다.** 마스터의 칭호, 시그니처, 맡는 부분의 정본은 `components/fortune/master-profiles.ts`(L70~)다. 상세 쪽은 생성 단계에서 이 파일을 읽는다.
5. 공용 렌더러 `js/feature-detail-panels.mjs`는 **상품 70여 개가 함께 쓴다.** 새 필드는 모두 선택 필드로 두고, 필드가 없는 상품의 출력은 바이트 단위로 같아야 한다.
6. 성능
   - 첫 화면에 새로 더하는 이미지는 128px 아바타(약 5KB)까지만 허용한다. 초상은 lazy로 로드한다.
   - 애니메이션은 넣지 않는다. `--cd-*`를 재선언하지 않는다.
   - 연이 모드와 네오 모드 모두 AA 대비를 지킨다.

## 지금 상태 (조사 결과, origin/main `1669c70d1` 기준)

- **작업 워크트리:** `D:\Development\codedestiny-worktrees\signature-detail-handoff-20261016`
  - 브랜치 `wt/signature-detail-handoff-20261016`, origin/main에서 분기했다.
  - 이 문서만 커밋했고 push하지 않았다.
  - 시작 전에 `git fetch origin && git rebase origin/main`를 실행한다.
- **본 저장소 `D:\Development\code-destiny`**
  - 로컬 main이 origin/main보다 뒤처져 있다.
  - 사용자의 미커밋 변경이 있다: `index.html`, `public/*/index.html`, `templates/home-funnel.html` 등. **건드리지 않는다.**

### 데이터 흐름

| 무엇 | 위치 |
|---|---|
| 상세 원본 (편집) | `content/product-details/<id>/panels.cjs`. 패널 그림의 글과 레이아웃이고, `layout.css`·`한글-원고.md`와 같은 폴더다. |
| 상세 원본 (산출 manifest) | `content/product-details/<id>/manifest.json` (id, featureKey, title, hook, chaptersLabel, chapters, notice, panels) |
| slug → 상세 연결 | `content/product-details/catalog.json`의 `introductions` |
| 생성기 | `scripts/lib/build-visual-details.mjs`의 `craftedIntroductions(slug)`. manifest를 읽어 가격을 붙인다. |
| 생성물 | `lib/marketing/feature-visual-details.generated.json`, `public/feature-details/<slug>.json` |
| 생성 명령 | `npm run sync:marketing-copy` (`sync:public` 체인에도 들어 있다) |
| 렌더러 (공용) | `js/feature-detail-panels.mjs`: `renderChapters`(L31), `renderCraftedDetail`(L46), 카드(L99) |
| 렌더러 소비자 | `app/components/CraftedProductDetail.tsx`, `FeatureVisualDetail.tsx`, `app/features/[slug]/page.tsx`, 그리고 `js/core/*/crafted-details.mjs` 6곳 |
| 패널 그림 재출력 | `node scripts/render-crafted-detail.cjs <id>`. 로컬 서버만 쓰고, 잘림·비율 위반이 있으면 렌더 단계에서 실패한다. |
| headline·benefits·contents·method | `index.html` 인라인 `FEATURE_VISUAL_DETAILS`가 정본이다(L34373 `life-book-ai`, L35307 `new-year-ai`, L35409 `love-secret-ai`). 🔴 사용자의 미커밋 `index.html`과 충돌하므로 **이번 작업에서는 고치지 않는다.** 필요한 문구는 manifest 쪽에 둔다. |

### 3종의 실제 빈틈

| | 연애 비책 | 신년운세 | 인생의 책 |
|---|---|---|---|
| `introductions` 연결 | 있음 | 🔴 **없음**. 상세에 목차와 패널이 전혀 안 뜬다. | 있음 |
| hook / chaptersLabel | 있음 / 기본값("받게 될 상담지 목차") | 🔴 둘 다 없음 | 있음 / "받게 될 인생의 책 목차" |
| 목차 | 28개 (detail = 그룹 label) | 🔴 0개 | 17개 |
| 패널 10장에서 마스터 언급 | 0 | 0 (검색에 걸린 "연이"는 "연이어"였다) | 0 |
| 장별 "얻는 것" | 없음 | 없음 | 없음 |
| 화자 표시 | 없음 (그룹별 화자가 있는데도) | 없음 | 없음 |

- 신년운세 안내문(`new-year-expert/manifest.json`의 notice)은 "최대1,000자이며", "6부분이며"처럼 띄어쓰기가 빠진 한 덩어리라서 읽기 어렵다.
- 신년운세 패널 08과 연애 패널의 "실제 AI 결과 원문 발췌"는 마스터 페르소나를 적용하기 전의 생성 결과라서, 말투가 마스터와 다르다.
  - 🔴 **사용자 확정 (2026-10-16): 교체하지 않는다.** 발췌 패널은 그대로 두고, 실제 유료 생성도 하지 않는다.
  - 마스터의 말투는 새로 넣는 텍스트 섹션(마스터 소개, 장별 화자, 얻는 것)에서만 드러낸다.
  - 발췌문을 마스터 말투로 고쳐 쓰는 것도 금지다. "고치지 않은 실제 결과"라는 표기와 어긋나기 때문이다.

### 목차의 코드 정본

| 상품 | 정본 | 구조 |
|---|---|---|
| 연애 비책 | `worker/lib/love-secret-ai-prompt.js:129` `LOVE_SECRET_AI_GROUPS` | 6그룹: core, self, partner, risk, timing, action. 각 그룹의 `sections[].title`과 `guide`. |
| 연애 화자 | 같은 파일 `:249` `LOVE_SPEAKER_BY_GROUP` | core, self, action은 연이. partner, risk, timing은 서한비. |
| 신년운세 | `worker/routes/new-year-ai.js:77` `NEW_YEAR_AI_SECTIONS` | 6부: 질문과 타고난 성향 / 올해의 총운 / 재물과 직업 / 애정과 대인관계 / 1월~12월 월별 흐름 / 건강과 개운법. 각 부에 `heading`, `categories`, `covered`가 있다. |
| 인생의 책 | `worker/routes/life-book-ai.js:183` `LIFE_BOOK_CHAPTER_TITLES` | 10장. 장별 근거 문장은 바로 아래 `LIFE_BOOK_CHAPTER_GUIDES`에 있다. |

## 설계 (사용자 요청에서 확정된 범위이므로 다시 묻지 않는다)

### A. manifest 계약 확장 (모두 선택 필드)

```js
// content/product-details/<id>/panels.cjs → manifest.json
masters: ['yeoniLove', 'hanbiLove'],    // master-profiles.ts 키 (yeoniLove·hanbiLove·neoNewYear·yunLifeBook)
chapters: [{
  title, detail,                        // 기존 필드
  gain: '이 장을 읽고 나면 …',            // 새 필드: 이 장에서 얻는 것 (한 문장, 40자 안팎)
  master: 'yeoniLove',                  // 새 필드: 이 장을 쓰는 화자 (연애는 그룹으로 정해진다)
}],
outcomes: [{ title, text, evidence }],  // 새 필드: 받고 나면 손에 남는 것 3~5개. evidence는 결과 화면 코드 경로
```

- `gain`은 그 장의 실제 지시문에서 뽑는다. 연애는 `sections[].guide`, 신년은 `heading`과 `covered`, 인생의 책은 `LIFE_BOOK_CHAPTER_GUIDES`다. 지시문에 없는 효과는 쓰지 않는다.
- `outcomes`는 결과 화면에 실제로 있는 산출물만 쓴다. 후보:
  - 연애: `app/love-secret-ai/result/LoveSecretChecklist.tsx`의 실천 체크리스트, 대화 문장, 좋은 날짜, 30일 흐름
  - 신년: 월별 달력, 편지, PDF
  - 인생의 책: 디지털 책, 장별 다시 읽기
  - 각 후보의 `evidence`에 경로를 적는다.

### B. 생성기: 마스터 데이터 붙이기

- `scripts/lib/build-visual-details.mjs`의 `craftedIntroductions()`에서 `manifest.masters`가 있으면 `loadTsModule('components/fortune/master-profiles.ts')`로 읽는다.
- 그중 필요한 필드만 붙인다: `{key, name, epithet, signature, role, avatar, portrait, portraitSrcSet}`와 dossier의 "이 상담에서 맡는 부분" 행. 이렇게 하면 문구 사본이 생기지 않는다.
- 키가 master-profiles에 없으면 throw한다(fail-closed).
- 아바타 경로는 `productMasters`, 즉 `public/images/master-profiles/avatars/`에 있는 것을 쓴다.

### C. 렌더러 `js/feature-detail-panels.mjs`

- `renderCraftedDetail` 맨 위, 목차보다 앞에 **마스터 섹션**을 둔다. 구성 요소:
  - 128px 아바타(eager, 약 5KB)
  - 칭호(금색 자간)
  - 이름(serif)
  - 시그니처 한 줄(serif 인용)
  - "이 상담에서 맡는 부분" 한 줄
- 연애 비책은 두 사람을 나란히 놓고 "두 마스터가 부를 나눠 씁니다"를 한 줄 붙인다. 모바일에서는 세로로 쌓는다.
- `renderChapters`
  - `detail`이 같은 장끼리 묶어 소제목을 단다(연애 6그룹, 인생의 책 기본·10장·깊은 판독).
  - 장마다 `gain`을 보조 줄로 넣는다.
  - `master`가 있으면 묶음 소제목 옆에 화자 칩(아바타와 이름)을 단다.
  - 28장이 넘는 목록은 첫 묶음만 펼치고 나머지는 `<details>`로 접는다. 스크롤 부담을 줄이려는 것이다. 단, 목록 자체는 SSR 텍스트로 남긴다(SEO, 접근성).
- `outcomes`는 목차 다음에 "받고 나면 손에 남는 것" 카드 3~5개로 렌더한다.
- 🔴 새 필드가 없는 상품의 출력은 기존과 같아야 한다. 스냅샷 테스트로 고정한다.
- `js/feature-detail-panels.d.mts`의 타입도 같이 늘린다.
- 스타일 두 곳: `app/components/crafted-product-detail.module.css`(페이지)와 `styles/feature-visual-detail.css`(팝업). 예화 토큰을 쓰고 AA 대비를 지킨다. 이미지에는 aspect-ratio·object-fit 금지 테스트가 있으니 깨지 않는다.

### D. 상품별 문구 방향 (말투는 페르소나와 같게)

- **연애 비책**
  - 연이: 다정한 해요체. "마음부터 듣는" 쪽을 맡는다(핵심, 나의 성향, 실천).
  - 서한비: 느리고 정확한 존댓말. "두 사람 사이의 거리"를 맡는다(상대·궁합, 위험 신호, 시기).
  - chaptersLabel 예: "연이와 서한비가 나눠 쓰는 연애 비책 28장"
- **신년운세: 네오**
  - 해라체 반말, 직설. "한 해의 판세를 짜는 운명 사령관"이다.
  - chaptersLabel 예: "네오의 신년 작전 브리핑 목차"
  - 6부 아래에 1~12월을 한 장씩 펼친다. 목차는 6 + 12개다.
  - hook 예: "명식 위에 올해의 세운을 겹쳐, 열두 달 어디에 힘을 쓸지 정해 주는 작전 브리핑"
  - 안내문은 띄어쓰기를 바로잡고, 문장을 나눠 읽히게 고친다. 내용(면책)은 줄이지 않는다.
- **인생의 책: 윤달**
  - 넉살 좋은 해요체. "인생 소설을 읽어 주는 화자"다.
  - 장마다 `gain` 예: "반복되는 역할의 이유를 한 문장으로 갖게 돼요"
- 문구를 쓰는 데 쓸 원료: `master-profiles.ts`의 dossier와 principles, `worker/lib/expert-character-persona*.js`.

## 단계

1. **목차 정합 테스트 (RED 먼저)**
   - `__tests__/ui/feature-visual-details.test.mjs`를 확장하거나, `fortune-tea-house-fallback-titles.test.js` 패턴을 따른다.
   - 확인할 것:
     - 연애 chapters의 title 집합이 `LOVE_SECRET_AI_GROUPS[].sections[].title`과 같은지, detail이 그룹 label과 같은지
     - 신년이 `NEW_YEAR_AI_SECTIONS[].label` 6개와 1~12월을 포함하는지
     - 인생의 책 1~10장이 `LIFE_BOOK_CHAPTER_TITLES`와 같은지
     - 연애 `master`가 `LOVE_SPEAKER_BY_GROUP`과 같은지
   - 신년운세에서 실패하는 것을 확인한다.
2. **신년운세 연결**
   - `catalog.json`의 `introductions`에 `"new-year-ai": ["new-year-expert"]`를 추가한다.
   - `new-year-expert/panels.cjs`에 hook, chaptersLabel, chapters를 넣고 안내문을 정리한다.
   - `npm run sync:marketing-copy`를 실행하고 테스트가 GREEN인지 본다.
   - 홈 팝업에서 신년운세 상세에 목차가 뜨는지 확인한다.
   - 🔴 카드 제목에 "전문가 상담"이 뜨면 `cardTitle`로 "신년운세"를 지정한다. 가격은 resolver가 붙인다.
3. **계약과 생성기**
   - 설계 A·B를 구현한다. 3종의 panels.cjs에 `masters`를 넣는다.
   - 생성 결과 JSON에 마스터 필드가 들어갔는지, 없는 키가 throw하는지 테스트한다.
4. **렌더러와 스타일** (설계 C)
   - 기존 상품의 출력이 같은지 확인하는 테스트를 먼저 둔다.
   - 그다음 3종을 렌더한다.
5. **문구** (설계 D)
   - 3종 전체 장에 `gain`을 쓰고, `outcomes`를 3~5개 쓴다(evidence 포함).
   - 금지어를 grep한다: 경력, 년차, 보장, 반드시, 확실히, 치료.
   - 패널 그림의 글을 바꿨다면 `node scripts/render-crafted-detail.cjs <id>`로 다시 렌더한다. 이번 범위의 기본값은 **패널 그림은 그대로 두고 텍스트 섹션만 추가**하는 것이다.
6. **검증과 커밋**
   - `npm run check:fast`
   - `npm run test:node`와 `npm run test:jest`
   - `node scripts/verify-feature-popup-journey.mjs`: 74개 상품 × 4개 폭, CTA는 첫 화면 안
   - Playwright 스크린샷
     - 폭과 모드: 360, 768, 1280 × 연이 모드·네오 모드(localStorage `fortuneThemeModeStateV1='neo'`)
     - 대상: 홈 팝업 3종(`window._cdOpenTilePreview(tile)`, 타일에 `data-pvw-paid`가 있어야 한다)과 `/features/love-secret-ai/`, `/features/new-year-ai/`, `/features/life-book-ai/`
   - 오버플로, AA 대비, 첫 화면 바이트(아바타 외 증가 0)를 확인한다.
   - 단계마다 커밋한다. 결과 SHA를 이 문서에 적는다.
   - 끝나면 frontmatter를 `status: done`으로 바꾼다. push와 PR은 사용자에게 확인한 뒤에만 한다.

### 범위 밖 (하지 않는다)

- 예시 발췌 패널 교체와 실제 유료 LLM 생성. 사용자가 교체하지 않기로 했다.
- 패널 그림(WebP)을 다시 렌더하는 것. 텍스트 섹션 추가만으로 끝낸다.
- `index.html`의 `FEATURE_VISUAL_DETAILS` 문구 수정(headline, benefits, contents). 사용자의 미커밋 변경과 충돌한다.
- 상품 페이지(`/love-secret-ai/` 등)의 소개장. 이미 끝났다.

## 첫 행동

```bash
cd /d/Development/codedestiny-worktrees/signature-detail-handoff-20261016
git fetch origin && git rebase origin/main
sed -n 65,120p components/fortune/master-profiles.ts   # yeoniLove·hanbiLove·neoNewYear·yunLifeBook 필드
sed -n 1,60p js/feature-detail-panels.mjs              # 렌더러 구조
```
그다음 단계 1의 테스트를 쓴다.

## 주의

- 셸 cwd는 호출마다 초기화되므로 매번 `cd`한다.
- Git Bash는 맨 앞이 `/`인 인자를 Windows 경로로 바꾼다. URL 경로는 `/` 없이 넘긴다.
- `npm run build`를 돌리면 sitemap-lastmod, rss, famous-saju-aliases가 다시 쓰인다. 커밋 전에 되돌린다. 운세 데이터가 없으면 `node scripts/fortune-build-data.mjs`를 먼저 실행한다.
- 산출물과 임시 파일은 D 드라이브에 둔다(C 용량 부족).
- 병합할 때 본 저장소의 사용자 미커밋 `index.html` 계열과 충돌하면, 손으로 고치지 말고 `node scripts/design/build-home-funnel.mjs`와 `npm run sync:public`으로 다시 생성한다.

## 결과 기록

| 단계 | 커밋 | 내용 |
|---|---|---|
| 1+2 | `8fce28a6f` | 목차-코드 정합 테스트, 신년운세 연결(`catalog.json`)과 hook·chaptersLabel·18장·안내문 정리. 1단계 RED를 확인한 뒤 2단계와 한 커밋으로 묶었다(실패하는 테스트만 든 커밋을 남기지 않으려고). |
| 3 | `2be2bcc3a` | `masters` 계약. 생성기 `craftedMasters()`가 master-profiles에서 붙이고, 모르는 키·상품에 없는 장 화자는 throw한다. 연애 장마다 `master`를 둔다. |
| 4 (선행) | `c746b22bd` | 새 필드가 없는 상품 출력 고정: 상세 JSON 74개 × 렌더 3종, crafted manifest 154개 × eager 2종을 입력·출력 해시로 기록했다. 렌더러를 바꾸기 전에 기록했다. |
| 4 | `8218c0473` | 렌더러: 마스터 섹션, 묶음 목차(화자 칩·gain·번호 이어 가기), 28장 이상이면 첫 묶음 뒤를 `<details>`로 접기, outcomes 카드. 팝업·페이지 CSS와 `.d.mts`. |
| 5 | `ecbe9c724` | 3종 전체 장의 `gain`, `outcomes` 4~5개(evidence = 결과 화면 코드 경로), 연애 chaptersLabel, 인생의 책 목차 4묶음. 금지어 검사 테스트 포함. |
| 6 | `e73d9abbd` | 마스터별 고급 상세(2026-10-17 사용자 요청 "상세페이지도 고급스럽게 각 마스터 별로"). 마스터 카드에 읽는 근거·맡는 부분 행, `data-master`별 포인트 색(연이=장미·서한비=인디고·네오=남색·윤달=초록, 두 모드의 `--fd-*`), 목차 화자 칩·번호 고리 색, 산출물 로마 숫자 목록, 산출물 뒤 "마스터가 지키는 원칙"과 lazy 초상(좁은 폭 72px, 컨테이너 500px 이상 96px). 문구는 생성기가 master-profiles의 `dossier`·`principles`에서 읽는다. |

검증 (2026-10-16)
- `npm run test:node` 3311/3311, `npm run test:jest` 6186/6186, `tsc --noEmit` 통과.
- `npm run check:fast`: 그 안의 `npm test`에서 `__tests__/worker/secret-fail-closed.test.js` 1건이 5초 타임아웃으로 실패했다. 같은 시간에 Next 개발 서버와 Playwright가 함께 돌았다. 단독 재실행은 15/15였고, 이어 돌린 `test:jest` 전체에서도 통과했다. 그 밖의 항목은 모두 ok였다.
- `node scripts/verify-feature-popup-journey.mjs`: 74개 상품 × 4개 폭 PASS.
- Playwright 360/768/1280 × 연이·네오 모드: 홈 팝업 3종(실제 팝업 템플릿 fixture)과 `/features/{love-secret,new-year,life-book}-ai/`(Next dev). 새 섹션 글자의 AA 대비 실패 0, 가로 넘침 0. 신년운세 팝업에 목차 18장이 뜬다.
  - 첫 화면에 새로 붙는 이미지는 아바타뿐이다(yeoni-love 5.4KB, hanbi-love 4.6KB, neo-new-year 5.6KB, yun-life-book 4.7KB).
  - 신년운세는 2단계에서 상세를 연결해 패널 01(40KB)이 새로 뜬다. 이것은 상세가 없던 빈틈을 메운 결과다.
  - 네오 모드 `/features` 페이지 9건(3폭 × 3상품) 중 4건에서 "Invalid or unexpected token" pageerror가 한 번씩 잡혔다. 부하가 빠진 뒤 같은 페이지를 8번 다시 열었을 때는 0건이었다. dev 서버의 청크 타이밍 문제로 보이지만, 운영 빌드로 한 번 더 확인할 만하다.
  - 스크린샷: `D:\Development\codedestiny-worktrees\sd-shots\`

검증 (2026-10-17, 6단계)
- `npm run test:node` 3317/3317, `npm run test:jest` 6355/6355, `tsc --noEmit`, `npm run lint`, 결제 게이트 90/90 통과. 새 필드가 없는 상품의 해시 고정 테스트도 그대로 통과한다.
- `npm run check:fast`는 2번째 단계 `verify:doc-freshness`에서 막혔다. `docs/CURRENT_DEV_BASELINE.md`의 정리일이 15일 전(최대 14일)이라는 날짜 검사라 이번 변경과 무관하다. 그 뒤 단계(lint·typecheck·test:node·결제 게이트)는 위처럼 따로 돌렸다.
- `verify-feature-popup-journey.mjs`: origin/main `e76391603`(꿀꿀 홈 단순화)이 홈에서 `#cdPublicSiteShare`를 빼서 스크립트가 시작부터 멈춘다(main에 이미 있는 고장). 그 직전 `index.html`의 공유 섹션을 끼운 임시 사본으로 74개 상품 × 4폭 PASS.
- Playwright 360/768/1280 × 연이·네오, 팝업 3종과 `/features/*` 3종 36건: AA 대비 실패 0(새 글자 최소 대비 연이 6.23·네오 7.61), 가로 넘침 0, pageerror 0. 아바타 80px, 칩 24px.
  - 연애 상세는 원칙 카드가 첫 화면과 가까워서 Chrome의 lazy 선읽기 거리 안에 들어온다. 그래서 초상 360w 2장(29KB·33KB)이 스크롤 전에 내려온다. 속성은 `loading=lazy`이고 우선순위는 낮다. 신년·인생의 책은 스크롤 전 0건이다.
  - 스크린샷: `D:\Development\codedestiny-worktrees\sd-shots\` (`*-principles.png` 추가), 수치는 `report.json`.

판단과 남은 결정
- "28장이 넘는 목록은 접는다"는 `>= 28`로 구현했다. 연애가 정확히 28장이라 `> 28`이면 아무 상품에도 적용되지 않는다.
- 인생의 책 번호는 목차 전체에 이어지는 번호(01~17)다. 그래서 "1장 타고난 사주의 원형"은 03으로 보인다. 제목은 생성 계획과 같아야 해서 "N장"을 제목에 넣지 않았다.
- 초상(`portrait`)은 첫 화면에 그리지 않는다. 6단계에서 산출물 뒤 원칙 카드에만 lazy로 그린다.
- 연애 상세의 기존 안내문에 "10년 경력 상담사·명리학자가 만든"이 있다. 캐릭터가 아니라 제작자에 대한 기존 문구라서 이번에는 고치지 않았다. 이 표현을 유지할지는 사용자가 정한다.
- push와 PR은 사용자 확인을 기다린다.
