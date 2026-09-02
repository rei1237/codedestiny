---
status: active
updated: 2026-09-03
next: 사용자가 만든 연이 일러스트(작약 화관·진주 목걸이) 를 받아 public/images/fortune-tea-house/yeon-peony-crown.webp 를 덮어쓰고 sync:public
---

# 운명의 문 — 연이 화관 일러스트 교체

## 왜

홈 `#fortuneGatewayEntry` 카드를 "핑크 파스텔 + 아기돼지 연이 한 명(사자·왕관·CUTE FORTUNE 제거) + 작약/장미/벚꽃·금빛 잎 라인아트 + 글로우, 로즈핑크·아이보리·로즈골드" 로 개선해 달라는 요청(2026-09-02). 돼지 머리의 **리본 대신 작약 화관, 자수정/로즈골드 진주 목걸이**는 기존 자산에 없어 외부 생성이 필요하다.

## 지금 상태

- CSS/HTML/가드 쪽은 이 브랜치의 PR 로 끝났다(팔레트·라인아트·글로우·네오 제거·`.logo-area p` 대비 결함 수정). `gh pr list` 로 확인.
- 경로 배선은 끝났다(2026-09-03, 사용자 결정 "기존 이미지 사용"): `index.html` 의 `src` 는 `public/images/fortune-tea-house/yeon-peony-crown.webp` 를 가리키고, 그 파일은 **flower-pig-single-b 의 투명 여백을 잘라 1024×1024 바닥에 세운 임시본**(63.6KB, 하단 여백 1.95%)이다. 즉 그림은 아직 보라 스카프 연이다.
- `?v=` 는 손으로 붙이지 않는다 — `sync:public` 이 `?v=build-…` 로 다시 쓴다(손으로 `?v=20260903` 을 붙였더니 그대로 덮였다).

## 남은 작업

- [ ] 일러스트 1장 생성(아래 프롬프트) → 배경 제거 → **투명 WebP 1024×1024, 120KB 이하**, 발이 캔버스 하단에 닿게 크롭(여백 ≤ 4%). 크롭·리사이즈는 `sharp` 로 하면 된다(이번 임시본이 그 방식: 알파>8 bbox → 하단 20px 남기고 lanczos3).
- [ ] 같은 경로 `public/images/fortune-tea-house/yeon-peony-crown.webp` 에 **덮어쓰기**(src 는 안 건드린다) → `npm run sync:public` → 미러 커밋 → 아래 검증. 됐다의 기준: 데스크탑 1350/모바일 390 × 연이/네오 4장에서 돼지가 안 잘리고 발밑 그림자(`.door-art::after`)에 발이 닿는다.

### 생성 프롬프트(영문, 그대로 붙여넣기)

"A single cute pink baby pig mascot, standing upright, front-facing slightly turned, soft 3D clay / vinyl toy render, big gentle eyes, rosy cheeks. On its head a full-bloom peony flower crown in rose pink and ivory with tiny gold leaves; around its neck a thin pearl necklace with amethyst and rose-gold beads. Soft pastel studio lighting, subtle rim light, premium character illustration, delicate floral detail, no text, no logo, no crown badge, no other characters, plain solid background for easy cutout, centered, full body visible with feet at the bottom."

네거티브: lion, crown badge, text, watermark, ribbon, bow, multiple characters, purple ribbon.

## 정본 예시

`index.html` 의 `<img class="fortune-gateway__door-art-yeon"` 한 줄(주석이 바로 위에 있다) · `styles/fortune-gateway.css` 의 `.fortune-gateway__doors--single .fortune-gateway__door-art-yeon`(object-position 바닥 정렬).

## 함정

- 연이 자산은 화면별 용도 고정 — 다른 화면의 연이 이미지를 이 카드에 돌려쓰지 말 것([docs/context/content-assets.md](../context/content-assets.md)).
- `.logo-area p` 가 이 섹션 `<p>` 의 색을 덮는다 — 새 `<p>` 를 넣으면 `.fortune-gateway__entry-shell` 접두 선택자를 써야 한다(가드: `__tests__/ui/guardian-fortune.static.test.js`).
- 카드 문안 "따뜻한 연이와 직설적인 네오가" 는 그대로 두었다(상담 안 페르소나 설명). 그림과 문안을 맞추려면 사용자 결정이 먼저.

## 검증

```
node --test __tests__/ui/guardian-fortune.static.test.js
npm run verify:hero-contrast && npm run verify:mobile-detail-nonintrusive
```

## 모르는 것

- 생성 도구(어떤 서비스로 만들지)는 사용자 몫. 결과물의 머리 장식이 화관이 아니라 리본으로 나오면 다시 생성 — 코드로는 못 고친다.
