---
topic: 홈 전체 서비스 검색 카드 이미지 — 실제 기능 이미지 매칭 + 달 대체 이미지
date: 2026-09-12
status: active
updated: 2026-09-12
next: PR 머지·staging 확인 후 "범위 밖" 남은 2~6번(사이빌 달 대체, 가격 치환 등)을 필요시 조사한다
---

## 후속 — 닫힌 컬렉션 카드 스크랩 결함 수정 (아래 "범위 밖" 1번)

- 원인(실측): 모바일은 닫힌 컬렉션 카드를 DOM 에서 떼어 `collection.__cdLazyCards`에만
  둔다(`index.html` `prepareCollectionLazyMounts`/`unmountCollectionCards`). 검색 카탈로그를
  만드는 `scrapeTiles()`는 `document.querySelectorAll(TILE_SELECTOR)`로 연결된 DOM 만 훑어서
  이 카드들이 통째로 빠졌다.
- 수정(`js/core/home-service-finder.js`):
  - `lazyCollectionCards()` 헬퍼를 추가해 `.feat-collection, .tarot-collection`의
    `__cdLazyCards` 중 미연결(`isConnected === false`) 카드를 모은다.
    `featureTileImage()`의 기존 인라인 루프를 이 헬퍼로 교체(중복 제거).
  - `scrapeTiles()`가 연결된 타일 + `lazyCollectionCards()`(클래스만으로 재판정,
    `#inputPage` 조상 조건은 부모 없는 카드에 성립하지 않는다)를 합쳐 훑는다.
- 범위: `.tarot-tile`/`.prem-card` 등 `TILE_SELECTOR`가 이미 다루는 클래스만 포함한다.
  `.sibyl-entry-tile` 등은 원래도 `TILE_SELECTOR` 밖이라 이번에도 밖(아래 범위 밖 2번, 별개).
- 검증: `__tests__/ui/home-service-finder.test.js`에 닫힌 컬렉션 카드 회귀 테스트 1건 추가,
  `node --test` 19/19 통과. `npm run check:fast` 통과(jest 228 suites/2686 tests, build:worker
  dry-run 포함). staging 실측(390/1280 결과 건수)은 머지 후 확인 필요.

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

## 후속 — staging 실측과 R2 폴백 (PR #1928 머지 d00737dd1 이후)

- staging d00737dd1: `delivery:verify-batch` PASS, `#services` 진입 시 홈 유지·검색 노출(390·1280),
  "타로" 12/12 기능 이미지 로드. 단 `🐾 AI 반려동물 사주` 는 달로 떨어졌다 — 위 로컬 추정(cdn-cgi) 은 틀렸다.
- 원인(실측): 타일 `data-img-src` 는 `/fuctionassets/반려 동물 사주.webp` 인데 Pages 에는 없고(404)
  R2 `https://assets.code-destiny.com/…` 에만 있다(200). 홈 타일은 `resolveCollectionImageSrc` 로 R2 에서 받는다.
- 수정: `appendServiceImage` 의 onerror 를 순서 있는 폴백으로 — 로컬 경로 → R2 원본(`/fuctionassets/` 일 때만) → 달.
  테스트에 두 단계 폴백 단언 추가(R2 단계를 끄는 변이로 실패 확인).

## 범위 밖(보고만)

1. 모바일 검색은 닫힌 컬렉션 카드를 스크랩하지 못한다(`scrapeTiles` 가 DOM 만 훑음) — "사주" 결과 390: 7건 / 1280: 10건.
2. `사이빌 전문가 상담` 은 모바일에서 달로 나온다 — `.sibyl-entry-tile` 이 모바일 DOM 에 없다(1280 에서는 sybila.webp).
3. 1280 "사주" 결과의 `🌸 운명의 꽃` 스크랩 카드 가격 줄에 `해금 {amount}원` 이 치환 없이 찍힌다(기존 결함, visual-checker 판정).
4. `사주 가디언 소환진` 원본 이미지 오른쪽에 약 20px 남색 띠가 있다(원본 자산 여백, 기존).
5. 달 이미지가 한 화면에 여러 장 반복된다 — 필요하면 변형 2~3종으로 나눈다(선택).
6. 대체 경로의 원천 `index.html` 상세 프리뷰 맵(`var D`, 액션별 img)은 클로저 안이라 쓰지 않았다.
