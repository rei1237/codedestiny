---
status: active
updated: 2026-11-03
next: "승격 28일 뒤 이후 같은 질문 세트로 재측정한다. 그 전에는 아래 소유자 수동 작업만 남는다"
---

# 영냥이 AEO/GEO 개선

## 왜

AI 검색과 검색엔진이 꿀꿀 운세의 영냥이, 특히 5,000원 고등어 상담을 정확한 사실로 찾아 인용할 수 있게 만든다. 추천을 보장하는 작업이 아니다.

## 지금 상태

`ai_source` 라벨은 Next 페이지(`/yeongnyangi/` 포함)에서 아직 동작하지 않는다. `app/layout.js`의 고정 캐시 키가 엣지 캐시의 옛 `analytics.js`를 돌려준다. 키를 올려 재배포하기 전에는 이 라벨로 AI 유입을 집계하지 않는다. 수정과 남은 작업은 `docs/handoff/2026-11-03-aeo-remaining-work.md`에서 잇는다.

코드와 문서는 main에 올렸다. 운영 반영 여부와 SHA는 `docs/handoff/2026-11-01-seo-architecture-rebuild.md`의 "지금 상태"를 본다. 증거는 `D:\Development\seo-audit\code-destiny-20261103\`에 있다. AI 질문 세트 원문은 그 아래 `ai-baseline\`이다.

대운·세운 가이드(`app/insights/adsense-ready-articles.js`)에는 영냥이 링크를 넣지 않았다. 원고가 `docs/adsense/review/ai-editorial-reviews.json`에 해시로 고정되어 있어, 넣으려면 편집 검수를 다시 받아야 한다.

## 소유자 수동 작업

- GA4 맞춤 측정기준 `ai_source` 등록. 등록 전에는 GA4 보고서에 값이 나오지 않는다.
- Bing Webmaster, Copilot 로그인 뒤 기준선 조회. 이번에는 로그인 벽으로 빈칸이다.
- 외부 작업(WordPress 링크, 프로필 정합, 기고, 실제 후기, Cloudflare WAF 실제 봇 처리 확인)은 승인 없이 하지 않는다.

## 묶음 ④로 넘기는 것

11/07 관측 뒤에 판단한다. 지금 바꾸면 관측 원인을 구분할 수 없어 이번에 넣지 않았다.

- `/yeongnyangi/` title 후보: `운세보는 영냥이 | 5,000원 고등어 질문 상담부터`
- `/yeongnyangi/` description 후보: `꿀꿀 운세의 사주보는 고양이 영냥이. 사주·타로 등 한 체계로 고민 하나를 풀어요. 고등어 질문 상담 5,000원, 신규 한국어 질문 기준 8챕터, 추가 질문 없음.`
- 값은 `products`, `EXPANDED_CHAPTERS`, `FOLLOWUP_LIMITS`와 다시 대조하고 넣는다. 위 문안의 효과는 측정되지 않았다.
- 신강·신약·격국 글(E2)은 구매 의도가 낮아 보류했다. 월운 단독 페이지, 재회·이직 프롬프트 글은 수요 데이터 전에는 만들지 않는다.

## 재측정

같은 질문 세트(`docs/seo/2026-10-15-brand-root/aeo-evaluation.csv` Q17~Q24)를 승격 28일 뒤 이후에 다시 돌린다. 기준선은 `docs/seo/SEO_STATE.json`의 `yeongnyangiAeo20261103`이다. 질문당 1회 실측이라 차이가 작으면 변화로 읽지 않는다.
