---
status: done
implementationStatus: shipped-to-main
updated: 2026-10-01
next: 후기 채팅형 UI·후기 확대(docs/handoff/review-chat-ui-2026-10-01.md), 후속 과제 3(Play 콘솔 수동 반영)
---

# 정치 적중 주장 제거 → 실제 1:1 상담 후기·방법론 (2026-10-01)

다음 세션 첫 문장: "docs/handoff/political-trust-to-reviews-2026-10-01.md 를 읽고 후속 과제 2(유명인 데이터 속 정치인)의 범위와 가드 허용목록 숫자부터 잡아줘."

## 결과

| 커밋 | 내용 |
|---|---|
| b1dc1912b | `FounderTrust` 대통령 타임라인 → 실제 1:1 상담 후기(`CustomerReviews`) + 확인된 방법론 6항목 + 헤드라인 "1회 30만원 1:1 상담으로 풀던 사주를, 이제 천원에". 천원 페이지 검색 제목 `30만원 상담 사주를 천원에 \| …` |
| 91f6b7e0f | Consultation 원문 기록 블록, 상담 로케일 문구, ProductGuide, FortuneHome, Room, 스토리(home-data), about 의 대통령 문구 제거 |
| b21102372 | Play 스토어 설명(ko) 문구 교체 — 콘솔 반영은 수동 |
| f468dd0d5 | 꿀꿀 정적 홈(`/ggulggul/`) "두 대통령 적중 기록" → 후기 3건 + 방법론 + 헤드라인. 12개 로케일 `shellCopy-11.json` |
| 94999e2df | 책·편지 상세 founder 패널 → credential + method + `/yeongnyangi/#founder-records` 후기 링크 |
| b099e8a3a | 데이터 삭제(독립 커밋): `lib/brand/prediction-records.json`, `prediction-timeline.ts`, `founder.headline/description` |
| ffed31f7b | 가드 `__tests__/ui/no-political-trust-copy.static.test.mjs` |
| 15a2a5df6 | f468dd0d5 의 authored 병합이 되돌린 ko 셸 키 3개 복원(아래 '범위 밖 발견' 1) |
| 0ca525408 | `verify:krw-copy-canonical` 예외: 300,000 을 offerTitle 이 있는 13개 파일에만 허용 + 정책 주석에 '앱 상품이 아닌 실제 거래 금액' 범주 추가 |
| 9854558f2 | sitemap 원장 재생성 — 서명 488개(운세 480 = 셸 사전을 읽음, index.html 셸 5, about, ggulggul, 천원 페이지) |
| 9123b4b9f | `consultation-locale-copy.ts` 에 키 삭제 뒤 남은 공백 줄 제거(`git diff --check`) |
| e9fc9468c | 정적 셸 화면 교정: 카드 머리 금색 대비, 푸터 날짜 묶음, `.cdh p{margin:0}` 에 눌린 문단 간격 복구 |
| f10745a25 | 후속 과제 1: Consultation 가이드 패널에 대표 후기 2건 접힘 노출(ko 전용) + 사람/AI 구분 고지. `CustomerReviews` 에 `variant="inline"` 추가 |

- 후기 정본: `lib/brand/customer-reviews.mjs` 12건(대표 ★ 024·047·050). 블로그 neosaju/224032671570 캡처를 3회 대조해 원문 그대로 옮겼고 원문 sha256 을 테스트가 고정한다. 게시 동의는 블로그 게시 때 받음(사용자 확인).
  - `visibleReviews()` 는 `consent===true && visible===true` 이고 필드가 온전한 항목만 낸다. 0건이면 화면 섹션 전체가 사라진다.
  - 제외(이미지 번호): 실명·닉네임 008·009·022·038, 정치 027, 재난 예언 019, 가격 006·007·026·046, 최상급 028·030·035·036, 강의 후기 003·005, 후기 문장 없음 042·048·057, 제3자 사생활 013, 판독 불확실 002·037·061. 064·070·074·077·081·083·086 은 1회 판독이라 넣지 않았다.
  - 블로그 링크(evidence)는 화면에 내보내지 않는다. 원문 글에 "세계에서 유일/100%/대통령" 문구가 남아 있어서다.
- 방법론 정본: `lib/brand/expertise-facts.mjs` 6항목. 코드로 확인된 사실만(평균태양시 경도 보정 — 진태양시 아님, 야자시 다음 날 규칙, KASI 는 CI 대조).
- 기록 사례(CASES): 0건 — 블로그 적중 사례가 전부 정치인·연예인이라 섹션을 만들지 않았다.

## 의도적으로 다르게 한 것

- 정적 셸은 "천원" 대신 "1,000원"(ja·zh 는 "300,000")으로 쓴다. `verify:i18n-price-drift` 가 "천원·30万" 을 금액으로 못 읽어 가격 대조에서 실패하기 때문이다. App Router(ko 전용)는 "천원에" 를 유지한다.
- 정적 셸 블록은 기존 접힘 영역(`cdhMore`) 안에 그대로 둔다. 자리 이동은 홈 구조 변경이라 범위 밖.
- 카드별 "더 보기" 접기는 없다. 대표 3건 + "후기 N개 더 보기" 한 번만(App Router). 정적 셸은 대표 3건만 싣고 더 보기 없이 영냥이 후기 섹션으로 보낸다.
- 정적 셸 카드는 높이를 맞추지 않는다(원문 길이가 달라 행마다 높이가 다름). 비ko 로케일은 말풍선마다 표시하지 않고, 도입 문장 한 줄이 "한국어 원문 그대로 인용"임을 알린다.
- 데이터는 `.json + .ts` 대신 `.mjs` 모듈(정적 셸 빌더와 App Router 가 같이 import).
- `verify:krw-copy-canonical` 의 예외 정책을 넓혔다(가드 정책 변경). 기존 주석은 "정본 두 값의 산술 합계만" 허용했는데, 30만원은 앱 상품이 아닌 네오 1:1 사람 상담의 실제 판매가라 정본 집합에 넣을 수 없다. 예외는 (파일, 300000) 13쌍으로 좁혔고, 다른 키에 30만원이 새로 들어와도 같은 파일 안이면 걸리지 않는다는 한계가 있다(가드가 키 단위 예외를 지원하지 않음).

## 후속 과제

1. ~~**Consultation(결제 직전) 화면 후기 노출**~~ — **완료(f10745a25, 2026-10-01 승인).**
   - 자리: `aside.consultationGuide` 의 `guideNote` 바로 아래(91f6b7e0f 가 대통령 블록을 지운 슬롯). 결제 버튼·`prepare()`·이용권 판정은 무변경, `config/payment-freeze.json` 대상 파일 없음.
   - `<details>` 기본 접힘, `siteLocale==='ko'` 이고 `visibleReviews()` 가 1건 이상일 때만. 고지 "네오가 사람 1:1 상담에서 받은 후기예요. 여기서 고르는 상담은 AI가 작성해요." 가 카드보다 먼저 나온다. 금액·블로그 링크 없음.
   - `CustomerReviews` `variant="inline"`: 제목·"더 보기" 없음, 1열. 기본 `section` 은 그대로라 FounderTrust 무변경.
   - 설계안 문구 "계산 엔진과 AI 해설" 대신 "AI가 작성해요" — 타로 상품에도 맞게.
2. ~~**유명인 데이터 속 정치인(그룹 B)**~~ — **하지 않음(2026-10-01 사용자 결정).** 정치인은 신뢰 문구가 아니라 인물 데이터라 유지한다. 가드 허용목록 6파일·32건은 그대로 고정하고 사유만 "인물 데이터, 유지"로 바꿨다. 조사 기록(다시 열 때 출발점): 정치인은 `js/saju-engine.js` 37명(+ `se_23285~23300_prop_label`), destiny-bias '정치인' 10명, bootstrap 4명(박정희·김대중·마오쩌둥·오바마), famous-saju 8명(모두 noindex, sitemap 미등재), `public/famous/` 오바마 카드, `AnalysisEngine.js` 관상 예시 1명. 현대 정치인만 지우면 허용목록은 3파일·5건(마윈 es `expresidente` 1, 김구 임시정부 주석 3, "class president" 1)이 된다.
3. **Play 콘솔** — `store-assets/google-play/yeongnyangi-20260930/{short,full}-description-ko.txt` 를 콘솔에 수동 반영.
4. **블로그 원문 글** 224032671570 의 "세계에서 유일/100%/대통령" 문구 수정 권장(사용자 판단). about 의 '원문 모음' 링크가 이 글을 가리킨다.
5. **"1회 30만원" 근거 보관** — 표시광고법상 실제 판매 근거(입금·상담 기록)를 보관해야 한다. 검색 제목에는 고지문을 붙일 수 없다.

## 범위 밖 발견 (보고만)

1. **`i18n-merge-authored --core --namespace shellCopy` 가 ko 키를 낡은 값으로 덮는다.** `i18n/authored/shellCopy-09.json` 의 `home.searchEntry.title`·`home.searchEntry.fusion`·`home.homeGuide.lead` 가 `public/i18n/ko.json` 현재값보다 낡았다. 병합을 돌리면 `shell-dictionary-parity` 가 깨진다. 이번엔 ko.json 만 되돌렸고 authored 원본은 그대로다 — 다음에 shellCopy 병합을 돌리는 세션도 같은 덫을 밟는다.
2. `verify:krw-copy-canonical` 추출기가 fr 의 `300 000 ₩`(공백 천 단위 + 뒤 ₩)를 금액으로 못 읽는다. fr 는 1,000원 표기도 같은 형식이라 가격 대조에서 빠져 있다.
- `js/saju-engine.js:592` "진태양시 자동 변환 적용" 라벨 — 실제는 평균태양시(경도) 보정.
- `i18n:check` 체인이 없는 스크립트 `verify:i18n` 을 참조한다.
- `scripts/build-purchase-journey-review.mjs --check` 가 main 에서 이미 drift(appRoutes 243→268 등) — 이번 변경 무관.
- KASI prefetch 미사용(엔진 동결 대상이라 손대지 않음).
- 후기 말풍선의 "…"(U+2026) 이 1280 에서 한 줄에 홀로 남는다. 공유 카드(`CustomerReviews`) 동작이라 FounderTrust 에도 있고, 원문 해시가 걸린 문자열이라 손대지 않았다. 고치려면 CSS(`text-wrap: pretty` 등)로.
- (추정, 코드 근거) 비ko 로케일에서 Consultation 후기 블록이 첫 SSR 에 ko 로 그려졌다가 `?lang=` 판독 뒤 사라질 수 있다. `useReadingLanguage` 가 ko 로 시작하는 기존 ko 전용 요소와 같은 동작이다. 로드 완료 뒤 `?lang=en` 블록 0건은 실측했다.

## 검증 (실측)

- `node --test __tests__/ui/customer-reviews.test.mjs __tests__/ui/feature-visual-details.test.mjs`: 17/17 통과.
- 가드: 통과 + 변이 2회(ProductGuide 에 정치 문구 추가 / 허용목록 파일 개수 변경) 모두 실패 확인.
- `npm run typecheck`: exit 0 (삭제 후).
- sync:public 수렴(내용 해시 2회 동일), `build-home-funnel --check` current.
- i18n: ko-coverage·no-fallback·price-drift·locale-main-sync·rendered-korean·public-parity·locale-text-fit 통과.
- 하드코딩 한국어 래칫: OK. 이번 변경 순증 +12(후기 원문 13·방법론 6 은 ko 전용 데이터). 기준선은 올리지 않음.
- `npm run check:fast -- --base=<origin/main 8c878a41f>`: exit 0 — critical 등급, 유료 게이트 88/88, test:node 2185 통과, jest 328 스위트/4915 통과. (base 를 안 주면 작업 트리 변경만 보므로 커밋 범위가 빠진다.)
- `node scripts/generate-sitemap.mjs --check`: OK(URL 1300). `build-home-funnel --check`: current.
- 화면(visual-checker, 요소 캡처 360·640·960·1280, 고정 요소 숨김): 영냥이 홈·천원 페이지 PASS. 꿀꿀 정적 셸은 1차 판정에서 나온 3건을 고쳤다 — 카드 머리 금색 대비 4.29→약 5.8:1(`color-mix` 로 잉크 25% 섞음), 푸터 "2025.03 블로그 게시" 줄바꿈 고아(`nowrap` 묶음), en 에서 줄 끝 "·" 매달림. 2차 판정에서 대비 5.81:1·푸터 PASS, 그리드 1/2/3열 PASS, 정치어 0. 마지막 카드↔고지 간격 4px 이 남아 원인을 계측했다 — `.cdh p{margin:0}`(0,1,1)이 `.cdh-kakao-fine` 등(0,1,0)을 이겨 문단 margin 이 전부 0 이었다. `.cdh-trust-offer` 접두로 올린 뒤 DOM 계측으로 lead 아래·fine 위·note 위 12px 적용 확인(360·640).
- 남겨 둔 것: en 640 에서 제목이 "one-" / "on-one" 으로 하이픈 뒤 줄바꿈 — 영어 조판상 정상이고, 고치려면 12개 로케일 사전과 원장 488 서명을 다시 건드려야 해서 두었다.
- 미실행: `verify-conversion-sharing`, `verify-premium-detail`, `verify-premium-finder`(서버 필요) — 문법 검사만.

### 후속 과제 1 (f10745a25)

- `node --test __tests__/ui/customer-reviews.test.mjs`: 7/7. 변이 2회(ko 가드 제거 / inline 에 "더 보기" 복원) 모두 실패 확인.
- `npm run check:fast`: exit 0 — critical 등급 33단계(결제 검증기 포함), test:node 2192, jest 328 스위트/4915. 하드코딩 한국어 래칫 OK(기준선 유지).
- `node scripts/generate-sitemap.mjs --check`: OK(URL 1300). 원장은 천원 페이지 서명 1개만 바뀜(lastmod 불변).
- 화면(mock dev, `/yeongnyangi/fortune/?domain=saju`): 360·768·1280 카드 1열·가로 넘침 없음, summary 44px. 1280 에서 펼쳐도 결제 버튼 y 불변. `?lang=en` 블록 0건. 대비 summary 10.46:1·말풍선 16.43:1·고지 10.25:1. visual-checker 1차에서 마커 사라짐(summary `display:flex`)·단어 중간 줄바꿈 2건을 고쳤고 2차 PASS.
- 미실행: 스테이징 확인(결제 로직 무변경이라 생략), 실제 결제 진행(mock 은 프로필이 없어 버튼 비활성).
