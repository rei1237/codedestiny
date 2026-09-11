---
topic: 홈 전체 서비스 검색 카드 이미지 — 실제 기능 이미지 매칭 + 달 대체 이미지
date: 2026-09-12
status: active
updated: 2026-09-12
next: PR 머지·staging 확인 후 모바일 검색에서 스크랩 타일이 빠지는 결함(아래 범위 밖 1)을 조사한다
---

# 홈 검색 카드 이미지 — 실제 기능 이미지 매칭

## 요청

"이미지를 그냥 실제 기능과 동일하게 매칭시켜주고 없는 것은 고급스러운 달 컨셉 이미지를 넣어 달라."

## 한 일

- `js/core/home-service-finder.js`
  - `featureTileImage(item)`: 같은 기능을 여는 홈 타일(`data-action` → `data-feature-key` → `href` 순)의
    이미지를 문서 순서상 첫 번째로 빌린다. 레지스트리에는 저장하지 않는다(파생값 금지).
  - 타일 이미지 판독 `tileImageOf`: 지연 타일 `[data-img-src]`, 정적 타일 `<img>`(data-lazy-src·src).
    스크랩 항목도 같은 판독을 쓴다(기존에는 `<img>` 만 읽어 지연 타일 이미지를 놓쳤다).
  - 모바일은 닫힌 컬렉션 카드를 DOM 에서 떼어 `collection.__cdLazyCards` 에 둔다
    (index.html `prepareCollectionLazyMounts`) — 이 카드도 색인에 넣는다.
  - 색인은 렌더마다 다시 만든다(모바일 지연 마운트로 타일이 부팅 뒤에 붙는다).
  - href 키는 쿼리를 남긴다(`/index.html?action=…` 가 하나로 뭉치지 않게).
  - 대체 이미지 `DEFAULT_SERVICE_IMAGE` = `/images/home/finder-moon.svg`(새 손저작 SVG, 남색 밤하늘·금빛 초승달).
- `scripts/verify-home-service-registry.mjs`: 주석·메시지만 새 규칙으로 갱신(항목별 정적 이미지 금지는 유지).
- `__tests__/ui/home-service-finder.test.js`: 타일 이미지 차용 + 달 대체 1건 추가.

## 검증

- `node --test __tests__/ui/home-service-finder.test.js` 18/18 통과.
- `node scripts/verify-home-service-registry.mjs` OK.
- `npm run check:fast` 통과(jest 228 suites / 2686 tests).
- 로컬 정적 서버 + Playwright(390·1280): 기본·"사주"·"타로" 결과 카드 모두 로드 성공.
  - 레지스트리 57개 중 정적 조사 기준 44개가 기능 이미지, 13개가 달(연애 비책·사주·만세력·오늘의 운세 허브 등).
  - 로컬에서 `타로`·`AI 반려동물 사주` 가 달로 떨어진 것은 `/cdn-cgi/image/…` URL 이 로컬 서버에 없어서다
    (onerror 폴백 확인). Cloudflare 에서는 홈 타일과 같은 URL 이라 로드된다 — staging 에서 재확인.

## 범위 밖(보고만)

1. 모바일 검색은 닫힌 컬렉션 카드를 스크랩하지 못한다(`scrapeTiles` 가 DOM 만 훑음) — "사주" 결과 390: 7건 / 1280: 10건.
2. `사이빌 전문가 상담` 은 모바일에서 달로 나온다 — `.sibyl-entry-tile` 이 모바일 DOM 에 없다(1280 에서는 sybila.webp).
3. 1280 "사주" 결과의 `🌸 운명의 꽃` 스크랩 카드 가격 줄에 `해금 {amount}원` 이 치환 없이 찍힌다(기존 결함, visual-checker 판정).
4. `사주 가디언 소환진` 원본 이미지 오른쪽에 약 20px 남색 띠가 있다(원본 자산 여백, 기존).
5. 달 이미지가 한 화면에 여러 장 반복된다 — 필요하면 변형 2~3종으로 나눈다(선택).
6. 대체 경로의 원천 `index.html` 상세 프리뷰 맵(`var D`, 액션별 img)은 클로저 안이라 쓰지 않았다.
