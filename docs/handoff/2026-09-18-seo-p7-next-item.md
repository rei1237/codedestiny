---
status: done
updated: 2026-09-18
next: P7 완료. 다음은 docs/handoff/2026-09-18-seo-p8-next-item.md 참고.
---

## 완료 결과 (2026-09-18)

네이버 SERP 직접 수집(`WebFetch`)이 환경 정책상 차단되어 v1 방법대로
진행할 수 없었다. 사용자에게 보고하고, 사용자가 직접 확인한 자료 +
AskUserQuestion 2회로 범위를 "문서화까지만, 검색의도 키워드 대폭 확장"으로
재조정. 결과물: [docs/seo/COMPETITOR-SERP-AUDIT.md](../seo/COMPETITOR-SERP-AUDIT.md)
(20개 감사 대상 키워드 + 수동 채움 템플릿 + 숙요 27수 쌍별 궁합 351개 +
사주 십간 조합 95개 등 검색의도 확장). 천원사주 계열은 경쟁사가 아니라
자사 브랜드임을 정정 반영. 페이지 title/meta 실제 반영은 하지 않음(다음
단계 "허브 콘텐츠 재작성"으로 이연). `SEO-CHANGELOG.md`에 한 줄 추가.


# SEO 개편 요청 — P7: 경쟁사 SERP 조사

## 왜

`docs/handoff/2026-09-17-seo-p1-followup.md`의 "원 요청 22개 항목 중 미착수"
목록에서 P6(`SEO-CHANGELOG.md` 신규 작성, 완료
[2026-09-18-seo-p6-next-item.md](2026-09-18-seo-p6-next-item.md) 및 결과물
[docs/seo/SEO-CHANGELOG.md](../seo/SEO-CHANGELOG.md))까지 끝남.

남은 5개 중 사용자가 P6 착수 시점에 이미 **다음 항목으로 "경쟁사 SERP 조사"를
지정**했다(AskUserQuestion 답변, 2026-09-18). 따라서 P5/P6 때와 달리 이번엔
항목 재질문이 필요 없다 — 바로 착수.

## 남은 5개 (경쟁사 SERP 조사 제외, 우선순위 미지정)

1. 허브 콘텐츠 재작성.
2. 내부링크 재설계.
3. E-E-A-T 강화.
4. Core Web Vitals 실측.
5. (경쟁사 SERP 조사는 이번 P7에서 착수)

## 다음 세션이 할 일

1. "경쟁사 SERP 조사"의 정확한 범위를 사용자에게 확인한다 — 원 요청은
   항목명만 있고 세부 규격(어떤 키워드 세트를 조사할지, 어떤 경쟁사를
   기준으로 할지, 결과물을 어디에 남길지)이 없다. `docs/seo/SEO-KEYWORD-MAP.md`
   (P5 결과물)나 `docs/seo/SEARCH_INTENT_MAP.md`에 이미 타겟 키워드 후보가
   있는지 먼저 확인하고, 그걸 기준으로 조사할지 물어본다.
2. 결과물 위치도 먼저 확인 — 신규 문서(`docs/seo/COMPETITOR-SERP-AUDIT.md`
   등)로 만들지, 기존 `docs/seo/SEO_STATE.json`이나 `SEO-KEYWORD-MAP.md`에
   병합할지는 사용자 선택 사항.
3. 조사는 코드 변경이 아니므로 기본적으로 GREEN. 단, 조사 결과에 따라
   실제 페이지·메타 변경을 이어서 하게 되면 그 변경은 별도 위험도 판단.
4. 완료 후 같은 패턴으로 `docs/handoff/<날짜>-seo-p8-next-item.md`를 만들어
   남은 4개와 다음 세션 시작 문장을 남긴다(사용자 지시 유지: 매 P단계
   완료마다 다음 단계용 인수인계 문서 자동 생성).

## 위험도

GREEN에 가까움(조사·문서 작성 위주). 조사 결과를 코드에 반영하는 단계가
생기면 그 범위만 재판단.

## 참고

- 원 요청 22개 전체 목록·완료 이력: [2026-09-17-seo-p1-followup.md](2026-09-17-seo-p1-followup.md).
- P5 결과물: [docs/seo/SEO-KEYWORD-MAP.md](../seo/SEO-KEYWORD-MAP.md).
- P6 결과물: [docs/seo/SEO-CHANGELOG.md](../seo/SEO-CHANGELOG.md) — 이 항목도 완료 시
  한 줄 추가 대상.

## 다음 세션 첫 문장

`docs/handoff/2026-09-18-seo-p7-next-item.md`를 읽고, "경쟁사 SERP 조사"의
범위(기준 키워드 세트·비교 대상·결과물 위치)를 사용자에게 확인하는 것부터
시작.
