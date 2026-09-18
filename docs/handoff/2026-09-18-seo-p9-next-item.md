---
status: active
updated: 2026-09-18
next: P9 착수 예정 — 아직 시작 전. 새 세션에서 이 문서부터 읽고 시작.
---

# SEO 개편 요청 — P9: 원 요청 22개 중 남은 3개 중 다음 항목 선정

## 왜

`docs/handoff/2026-09-18-seo-p8-next-item.md`의 "남은 4개" 중 "허브
콘텐츠 재작성"을 완료했다(커밋 `50b9676f0`). 남은 3개 중 어느 것을
다음으로 할지는 아직 사용자가 지정하지 않음.

## P8 완료 내용 요약

- 범위: 사용자가 AskUserQuestion으로 "본문·FAQ만 확장 (추천)"을 선택.
  title/description/h1/keywords는 손대지 않고, 신규 라우트도 만들지
  않음(351/45/50 쌍별 궁합 페이지 신설은 명시적으로 배제).
- 수정 파일: [lib/seo-landing-pages.js](../../lib/seo-landing-pages.js)의
  `saju`/`ziwei`/`astrology`/`sukuyo`/`vedic`/`sajuCompatibility` 6개
  항목에 각각 `sections` 1개 추가 + `faqs` 1개 교체(공유 템플릿
  `SeoLandingTemplate.jsx`의 5개 FAQ 캡을 넘기지 않기 위해 추가 대신
  교체), [app/sukuyo/compatibility/page.js](../../app/sukuyo/compatibility/page.js)에
  궁합 전용 `sections`/`faqs`를 독자적으로 추가(이전에는 sukuyo 허브의
  본문을 그대로 상속하고 있었음).
- P7 감사 문서([COMPETITOR-SERP-AUDIT.md](../seo/COMPETITOR-SERP-AUDIT.md))
  3절의 확장 키워드 테마(무료/비교/롱테일/궁합)를 본문 산문에 녹였다.
  351개 숙요 쌍별 궁합, 45개 사주 십간 쌍별 궁합은 표 형태 개별 페이지로
  만들지 않고, "거리로 읽는 법"을 설명하는 문장으로만 반영했다.
- 검증: `npm run check:fast` 전체 통과(paid-gate-suite 88/88,
  jest 281 suites/3959 tests), `sitemap:generate`로 lastmod 드리프트
  동기화 완료. `git status` 확인 후 이번 세션이 만든 7개 파일만 커밋—
  세션 시작 시점부터 있던 marketing/* 및 app/points/PointsClient.tsx의
  무관한 미커밋 변경은 건드리지 않고 그대로 둠(다른 작업자의 진행 중
  작업일 가능성).

## 남은 3개 (우선순위 미지정)

1. 내부링크 재설계.
2. E-E-A-T 강화.
3. Core Web Vitals 실측.

## 다음 세션이 할 일

1. 이 목록을 사용자에게 제시하고 AskUserQuestion으로 다음 착수 항목을
   지정받는다(P4~P8 때와 동일한 패턴 — 원 요청이 항목별 구체 범위를
   정하지 않았으므로 추측 금지).
2. "내부링크 재설계"를 고를 경우: 라우팅/공유 동작에 걸치는지 먼저
   확인한다. 단순히 `relatedServices`/`sections` 안의 텍스트 링크를
   추가·조정하는 수준이면 GREEN에 가깝고, 네비게이션 구조나 URL 자체를
   바꾸면 RED로 격상된다. P8에서 건드린 6개 허브 + `/sukuyo/compatibility`
   + `/saju/compatibility`가 이미 서로를 링크하는지부터 점검하면 시작이
   빠르다.
3. "E-E-A-T 강화"를 고를 경우: 저자/출처 정보, 전문성을 드러내는
   문구, 면책·주의 문구(이미 여러 FAQ에 "확정하지 않습니다" 류 문구가
   있음)가 부족한 페이지를 찾는 것으로 시작한다. 결제/의료/법률처럼
   YMYL에 걸치는 페이지가 있는지도 확인 대상.
4. "Core Web Vitals 실측"을 고를 경우: 조사 위주라 GREEN에 가깝다.
   `docs/context/perf-and-visual-measurement-pitfalls.md` 관련 메모리
   (CrUX 없음, perf:home은 dist를 잼, 시뮬 LCP는 첫 페인트 전 JS 몫)를
   먼저 확인.
5. 위험도(GREEN/RED)를 조사 후 먼저 판단·보고, 그다음 구현.
6. 완료 후 이번 문서와 같은 패턴으로 `docs/handoff/<날짜>-seo-p10-next-item.md`
   를 만들어 남은 항목과 다음 세션 시작 문장을 남긴다(사용자 지시 유지: 매
   P단계 완료마다 다음 단계용 인수인계 문서 자동 생성).

## 위험도

미확인 — 항목마다 다름(내부링크 재설계는 네비게이션 구조 변경이면
RED, 단순 텍스트 링크 추가면 GREEN; E-E-A-T 강화는 대체로 GREEN;
Core Web Vitals 실측은 조사 위주라 GREEN). 항목 지정 후 재판단.

## 참고

- 원 요청 22개 전체 목록·완료 이력: [2026-09-17-seo-p1-followup.md](2026-09-17-seo-p1-followup.md).
- P6 결과물: [docs/seo/SEO-CHANGELOG.md](../seo/SEO-CHANGELOG.md).
- P7 결과물: [docs/seo/COMPETITOR-SERP-AUDIT.md](../seo/COMPETITOR-SERP-AUDIT.md).
- P8 결과물: 본 문서 "P8 완료 내용 요약" 절, 커밋 `50b9676f0`.

## 다음 세션 첫 문장

`docs/handoff/2026-09-18-seo-p9-next-item.md`를 읽고, 남은 3개(내부링크
재설계, E-E-A-T 강화, Core Web Vitals 실측) 중 하나를 AskUserQuestion으로
사용자에게 지정받는 것부터 시작.
