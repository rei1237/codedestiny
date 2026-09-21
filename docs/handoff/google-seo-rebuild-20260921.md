---
status: active
updated: 2026-09-21
next: 핵심 랜딩 12개를 선정하고 Google 공식 기준·실제 HTML·GSC URL 검사 근거로 결함과 가설을 구분한다
---

# Google SEO 구조 개선 재개

## 목표와 현재 상태

사용자는 Google 노출 확대와 AdSense 품질 개선을 위해 근거 있는 구조 재설계까지 허용했다. 검색 1페이지·승인은 보장하지 않는다. 컨텍스트가 길어 이번 전달은 후속 작업 인수인계다.

- 코드 기준 `f2095c81128ad9a3572e79827d912d79769d5955`, main push 완료. [main CI 성공](https://github.com/rei1237/codedestiny/actions/runs/35561082390). 운영 미배포.
- 숙요 8개 페이지의 실제 계산 방식·예시·한계·내부 링크 수정 완료. 다국어 달 위상 수정과 sitemap 검사 오탐 수정도 완료. 반복하지 않는다.
- 관측·기간·변경 이력 정본: [SEO_STATE.json](../seo/SEO_STATE.json), [GROWTH_OPERATIONS.md](../seo/GROWTH_OPERATIONS.md).

## 판단 근거

9/21 관측 GSC 3개월(6/19~9/18): 30클릭/356노출/평균 25.4위. 색인 보고서 갱신 9/18: 색인 292, 제외 2,633, 발견됨-미색인 1,023. 수동 조치·보안 문제 없음. 날짜·번역 URL 증가가 제외 증가에 기여했을 가능성은 있으나 전체 원인으로 확정하지 않는다. 네이버는 실제 날짜별 운세 유입이 있어 일괄 삭제하면 손실 가능성이 있다.

AdSense 계정 사유는 낮은 가치 콘텐츠이며 URL별 거절 목록은 없다. 기존 63점은 9/8 내부 평가이며 최신 승인 가능성이 아니다.

공식 기준: [시작 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [유용한 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [스팸 정책](https://developers.google.com/search/docs/essentials/spam-policies). 정책은 실행 시 최신 원문을 확인한다.

## 남은 작업과 완료 조건

- [ ] P0: 사주·만세력·숙요·자미두수·베다·점성술 핵심 랜딩 12개를 고정한다. `공식 기준 → 확인된 결함/가설 → URL → 수정 → 회귀 검사` 표를 작성한다. 실제 응답/렌더 본문, canonical, robots/noindex, hreflang, sitemap, 내부 링크와 GSC 저장/실시간 URL 검사를 대조한다.
- [ ] P0: 날짜별·로케일별 페이지군의 독립 가치를 표본 검수한다. 날짜 운세는 30일 후 404가 되는 정책과 네이버 성과를 함께 검토한다. 통합이 필요하면 기존 URL별 대응표와 트래픽 보존 근거를 먼저 만들고 소규모로 검증한다. 발견됨-미색인만으로 일괄 noindex하지 않는다.
- [ ] P1: 숙요 연애·결혼 글의 근거 없는 빈도/안정성 주장부터 수정하고 다른 체계도 실제 계산·기능과 대조한다. 3~10개라는 수량보다 검증 가능한 사례·출처·한계와 검색 의도 일치를 우선한다. 본문·메타·FAQ·생성 읽기 자료가 일치해야 완료다.
- [ ] P1: 핵심 허브→설명 글→기존 도구 연결을 보강한다. JS 렌더링, 모바일, 실제 구조화 데이터, 로케일 완결성, 정책/CMP를 점검한다. 가짜 저자 경력·검수 이력은 금지하고 `humanReview: unconfirmed`, `adsAllowed: false`를 임의 승격하지 않는다.
- [ ] P2: 기존 자료를 인용 가능한 계산 예시·체계 비교로 개선한다. 후보는 기존 outreach 파일에 증거·개별 초안만 기록한다. 자동 이메일·댓글·링크 구매 금지.
- [ ] 실제 운영 반영일 이후 동일 URL군의 28일 클릭·비브랜드 노출·상위 3/10위·관련 referring domains를 비교한다. 별도 Query/Page 집계를 교차표로 만들지 말고 미접근 수치는 null로 둔다. 기존 주간 자동화를 중복 생성하지 않는다.

## 코드 정본·검증·경계

숙요 계산 정본은 `js/core/sukuyo-astronomy.js`와 `worker/lib/sukuyo-coordinate.js`의 Lahiri 항성황도 달 경도다. 과거 음력표 설명으로 되돌리지 않는다. SEO는 `lib/seo/siteSeo.ts`, `scripts/generate-sitemap.mjs`, `public/_headers`; 홈은 `index.html`. 실제 글 렌더 분기는 `app/insights/seed-articles.js`도 확인한다.

`CLAUDE.md`와 `docs/context/delivery-and-ci.md`를 우선한다. 변경에 필요한 생성 명령 후 `npm run check:fast -- --plan`, `npm run check:fast`; 문서는 `npm run verify:handoff-contract`. 해당 변경만 커밋·main push·CI 확인한다. 운영 배포·실 LLM·실결제·운영 DB 쓰기·광고 활성화·재신청은 이번 허용 범위가 아니다.

## 재개 명령

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\google-seo-rebuild-20260921.md와 CLAUDE.md를 읽고, main 상태와 코드 기준 f2095c81128ad9a3572e79827d912d79769d5955 이후 변경을 확인하라. 다른 세션 변경을 보존하며 핵심 랜딩 12개의 공식 기준·실제 HTML·GSC URL 검사 대조부터 시작해 P0부터 수정하고 검증·커밋·push·main CI 확인까지 진행하라. 동시 쓰기가 있으면 저장소 워크트리 절차를 따르되 기존 D:\wt\seo-20260921-121321의 재사용 가능 여부부터 확인하라. 기존 워크트리 정리는 자동 승인 검토에서 거절된 이력이 있으므로 삭제를 우회하지 마라.
```
