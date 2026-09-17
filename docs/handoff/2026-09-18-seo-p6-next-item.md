---
status: active
updated: 2026-09-18
next: P6 착수 예정 — 아직 시작 전. 새 세션에서 이 문서부터 읽고 시작.
---

# SEO 개편 요청 — P6: 원 요청 22개 중 남은 6개 중 다음 항목 선정

## 왜

`docs/handoff/2026-09-17-seo-p1-followup.md`의 "원 요청 22개 항목 중 미착수"
목록에서 P5(`SEO-KEYWORD-MAP.md` 신규 작성, 완료
[2026-09-18-seo-p5-next-item.md](2026-09-18-seo-p5-next-item.md) 및 결과물
[docs/seo/SEO-KEYWORD-MAP.md](../seo/SEO-KEYWORD-MAP.md), 커밋 `31fb5365f`
+ 체크리스트 반영 `013f527c1`)까지 끝남. 남은 6개 중 어느 것을 다음으로 할지는
아직 사용자가 지정하지 않음.

## 남은 6개 (우선순위 미지정)

1. `SEO-CHANGELOG.md` — 문서 신규 작성.
2. 허브 콘텐츠 재작성.
3. 내부링크 재설계.
4. E-E-A-T 강화.
5. 경쟁사 SERP 조사.
6. Core Web Vitals 실측.

## 다음 세션이 할 일

1. 이 목록을 사용자에게 제시하고 AskUserQuestion으로 다음 착수 항목을
   지정받는다(P4·P5 때와 동일한 패턴 — 원 요청이 항목별 구체 범위를 정하지
   않았으므로 추측 금지).
2. 지정받은 항목의 현재 상태를 실측(코드/문서 grep)부터 확인 — 이미 일부
   존재하는지, 완전히 새로 만들어야 하는지 단정하지 않는다. 특히
   `SEO-CHANGELOG.md`는 P5 때 `SEO-KEYWORD-MAP.md`가 이미 `SEARCH_INTENT_MAP.md`
   와 겹쳤던 것처럼, `docs/seo/` 안에 이미 이력·변경 기록 성격의 문서
   (`SEO_STATE.json`의 `history` 배열, `docs/handoff/*seo*` 시리즈 등)가
   있는지 먼저 확인할 것 — 겹치면 사용자에게 구성 방식을 먼저 물어본다.
3. 위험도(GREEN/RED)를 조사 후 먼저 판단·보고, 그다음 구현. 내부링크
   재설계는 라우팅/공유 동작에 걸치면 RED로 격상될 수 있다.
4. 완료 후 이번 문서와 같은 패턴으로 `docs/handoff/<날짜>-seo-p7-next-item.md`
   를 만들어 남은 항목과 다음 세션 시작 문장을 남긴다(사용자 지시: "앞으로
   계속 이렇게 해" — 매 P단계 완료마다 다음 단계용 인수인계 문서를 자동으로
   생성한다).

## 위험도

미확인 — 항목마다 다름(문서 신규 작성은 GREEN에 가깝고, 내부링크 재설계는
라우팅/공유 동작에 걸치면 RED일 수 있음). 항목 지정 후 재판단.

## 참고

- 원 요청 22개 전체 목록·완료 이력: [2026-09-17-seo-p1-followup.md](2026-09-17-seo-p1-followup.md).
- P4 완료 기록: [2026-09-17-seo-p4-structured-data.md](2026-09-17-seo-p4-structured-data.md).
- P5 완료 기록: [2026-09-18-seo-p5-next-item.md](2026-09-18-seo-p5-next-item.md),
  결과물 [docs/seo/SEO-KEYWORD-MAP.md](../seo/SEO-KEYWORD-MAP.md).

## 다음 세션 첫 문장

`docs/handoff/2026-09-18-seo-p6-next-item.md`를 읽고, 남은 6개
(`SEO-CHANGELOG.md`, 허브 콘텐츠 재작성, 내부링크 재설계, E-E-A-T 강화,
경쟁사 SERP 조사, Core Web Vitals 실측) 중 하나를 AskUserQuestion으로
사용자에게 지정받는 것부터 시작.
