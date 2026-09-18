---
status: active
updated: 2026-09-18
next: P10 착수 예정 — 아직 시작 전. 새 세션에서 이 문서부터 읽고 시작.
---

# SEO 개편 요청 — P10: Core Web Vitals 실측 (원 요청 22개 중 마지막)

## 왜

`docs/handoff/2026-09-18-seo-p8-next-item.md`에서 남은 4개로 잡았던
항목(허브 콘텐츠 재작성/내부링크 재설계/E-E-A-T 강화/Core Web Vitals
실측) 중 앞의 3개를 완료했다(P8 커밋 `50b9676f0`, P9 커밋
`bc1cbac49`). 이 문서는 원 요청 22개 SEO 항목의 마지막 남은 1개를
위한 것이다.

## 다음 세션이 할 일

1. `docs/context/perf-and-visual-measurement-pitfalls.md` 관련 메모리를
   먼저 확인한다 — 이미 알려진 함정들: CrUX 데이터 없음(실사용자
   지표를 직접 얻을 방법이 제한적), `perf:home`은 dist를 잼(빌드
   산출물 기준으로 측정), style-cost 3배 부풀림, rAF로 강제 레이아웃을
   못 피함, CLS는 프로덕션·문서 무게 영향을 받음, 시뮬 LCP는 첫
   페인트 전 JS 몫이 큼.
2. 기존 성능 측정 스크립트가 있는지 `package.json`의 `perf:*` 스크립트,
   `scripts/*.mjs` 중 lighthouse·web-vitals·perf 관련 파일을 먼저
   찾는다(새로 만들기 전에 기존 도구 확인 — 코딩 원칙 6).
3. "실측"이 목표이므로 실제 측정 없이 추정치로 결론 내지 않는다
   (코딩 원칙 8: 실측과 추정을 구분). 로컬/스테이징에서 측정
   가능한 범위와 불가능한 범위(CrUX 등 실사용자 데이터)를 먼저
   사용자에게 명확히 보고한다.
4. 측정 대상 페이지: P8/P9에서 본문을 확장한 6개 SEO 허브
   (`/saju`, `/ziwei`, `/vedic`, `/astrology`, `/sukuyo`,
   `/saju/compatibility`) + `/sukuyo/compatibility` — sections 추가로
   본문 길이가 늘어난 페이지들이라 LCP/CLS에 영향이 있었는지 확인하는
   것이 이번 작업의 실질적 동기와 맞다.
5. 측정 결과를 바탕으로 개선이 필요하면 그 시점에 위험도를
   재판단한다(이미지 최적화·폰트 로딩처럼 국소 수정이면 GREEN,
   빌드 파이프라인·CI 변경이 필요하면 RED로 선보고).
6. 이 항목을 완료하면 원 요청 22개가 전부 끝난다. 완료 후에는 새
   P단계 인수인계 문서 대신, 22개 전체 완료를 알리는 요약을
   `docs/handoff/2026-09-17-seo-p1-followup.md`(또는 그 후속) 흐름에
   맞춰 정리하고 사용자에게 보고한다.

## 위험도

미확인 — 조사(측정) 자체는 GREEN. 측정 후 개선 작업의 위험도는
무엇을 고치느냐에 따라 갈린다.

## 참고

- 원 요청 22개 전체 목록·완료 이력: [2026-09-17-seo-p1-followup.md](2026-09-17-seo-p1-followup.md).
- P8 결과물: [2026-09-18-seo-p8-next-item.md](2026-09-18-seo-p8-next-item.md), 커밋 `50b9676f0`.
- P9 결과물: [2026-09-18-seo-p9-next-item.md](2026-09-18-seo-p9-next-item.md), 커밋 `bc1cbac49`.
- 성능 측정 함정 메모리: `docs/context/perf-and-visual-measurement-pitfalls.md`.

## 다음 세션 첫 문장

`docs/handoff/2026-09-18-seo-p10-next-item.md`를 읽고, Core Web Vitals
실측을 위해 기존 perf 측정 도구부터 찾아보는 것으로 시작.
