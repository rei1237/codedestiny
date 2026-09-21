---
status: active
updated: 2026-09-21
next: 12개 랜딩 관측표를 기준으로 숙요 연애·결혼 글과 나크샤트라의 미검증 주장을 계산·출처와 대조해 P1 개선을 이어간다
---

# Google SEO 구조 개선 재개

## 목표와 현재 상태

### 9/21 후속 작업: 핵심 12개 조사와 P0 수정 완료

- 구현 커밋: `fc3f86a39006212e0753e575b1685059b7fc1a91` (`fix(seo): align sukuyo landing claims with service scope`). 기반 main `bb1c22f25`까지 보존했고 기존 `D:\wt\seo-20260921-121321`를 재사용했다. 마케팅 미커밋 파일은 수정·스테이징하지 않았다.
- 정본 근거: [12개 대조표](../seo/core-landings-20260921.md), [HTTP·GSC 관측 JSON](../seo/core-landings-20260921.json). 12개 모두 운영 HTTP 200·self-canonical·index/follow·사이트맵 포함. 언어 대체본 24개도 200·self-canonical·상호 hreflang 확인.
- GSC 저장 검사는 9개 색인, 베다·점성술 가이드 2개 발견됨·미색인, 자미두수 명반 1개 과거 noindex. 후자는 7/26 크롤링 기록이며 **실시간은 등록 가능**이다. 사주·숙요 궁합 및 미색인 3개, 총 5개 실시간 검사 통과. 나머지 7개 실시간은 미실행. 색인 생성 요청은 하지 않았다.
- P0: 숙요 궁합의 ‘무료’ 안내를 실제 유료 레지스트리·게이트와 일치시켰다. 무료 1인 본명숙·공개 안내와 별도 유료 기본/정밀 궁합을 구분했다. 가격·결제 로직 변경 없음.
- P1: 궁합 페이지의 1인 소개·입력폼 상속을 제거하고 2인 안내·계산 예시·FAQ를 구성했다. 동일 관계/반대 역할 설명을 실제 코어와 맞췄고, 본명숙 허브의 빈도·강도 단정을 정리했다. 관련 링크 세 목적지의 모호한 이름도 수정했다.
- 검증: `npm run check:fast -- --plan`, `npm run check:fast` exit 0(Jest 288 suites/4,039 tests), 신규 scope/계산 예시 테스트 2/2, sitemap 1,283 URL 유지, `verify:doc-freshness`, `verify:seo-entity-registry` 통과. SSR FAQ 5개와 JSON-LD 답변 일치, 360/390/430/1280px 가로 넘침 0. SSR 미리보기는 외부·API·스크립트를 차단했으며 실결제·LLM 동작 검증이 아니다.
- 전달 완료: `8fa480791dd1a95aa0c869a889a168f1174d7619`까지 main fast-forward·push 완료. [main CI 35589770641](https://github.com/rei1237/codedestiny/actions/runs/35589770641)의 `CI required` 포함 모든 필수 잡 성공. 통합 전후 마케팅 미커밋 diff·status 동일 확인. 이 줄은 해당 코드·관측 전달의 완료 기록이며 후속 문서 커밋 자체의 CI와 구분한다.
- 운영 배포·유료 LLM·광고 활성화·AdSense 재신청은 미실행. 로컬 검사 서버는 종료했다. SEO 워크트리는 기존 삭제 제한에 따라 디스크에 보존하며 미전달 구현 변경은 없다.

아래는 이전 인수인계의 기준과 잔여 범위다. 관측·수정이 겹치면 위 후속 기록과 12개 대조표를 우선한다.

사용자는 Google 노출 확대와 AdSense 품질 개선을 위해 근거 있는 구조 재설계까지 허용했다. 검색 1페이지·승인은 보장하지 않는다. 컨텍스트가 길어 이번 전달은 후속 작업 인수인계다.

- 코드 기준 `f2095c81128ad9a3572e79827d912d79769d5955`, main push 완료. [main CI 성공](https://github.com/rei1237/codedestiny/actions/runs/35561082390). 운영 미배포.
- 숙요 8개 페이지의 실제 계산 방식·예시·한계·내부 링크 수정 완료. 다국어 달 위상 수정과 sitemap 검사 오탐 수정도 완료. 반복하지 않는다.
- 관측·기간·변경 이력 정본: [SEO_STATE.json](../seo/SEO_STATE.json), [GROWTH_OPERATIONS.md](../seo/GROWTH_OPERATIONS.md).

## 판단 근거

9/21 관측 GSC 3개월(6/19~9/18): 30클릭/356노출/평균 25.4위. 색인 보고서 갱신 9/18: 색인 292, 제외 2,633, 발견됨-미색인 1,023. 수동 조치·보안 문제 없음. 날짜·번역 URL 증가가 제외 증가에 기여했을 가능성은 있으나 전체 원인으로 확정하지 않는다. 네이버는 실제 날짜별 운세 유입이 있어 일괄 삭제하면 손실 가능성이 있다.

AdSense 계정 사유는 낮은 가치 콘텐츠이며 URL별 거절 목록은 없다. 기존 63점은 9/8 내부 평가이며 최신 승인 가능성이 아니다.

공식 기준: [시작 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [유용한 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [스팸 정책](https://developers.google.com/search/docs/essentials/spam-policies). 정책은 실행 시 최신 원문을 확인한다.

## 남은 작업과 완료 조건

- [x] P0: 핵심 랜딩 12개를 고정하고 공식 기준·실제 HTML·GSC 저장 12개/실시간 5개 대조표 작성. 확인된 무료 범위 불일치부터 수정·회귀 검사 완료. 미실행 실시간 7개는 JSON에 null로 기록.
- [x] P0 표본: 날짜 운세 2개와 사주 로케일 4개를 검수했다. 날짜별 계산값·본문 차이와 공통 문장 반복, 30일 생성 정책 확인. 독립 가치 부족이 미색인의 원인이라는 결론은 내리지 않았다. 통합·삭제가 필요하면 URL별 트래픽과 대응표부터 추가 확인하며 이번에는 URL 정책을 유지했다.
- [ ] P1: 숙요 연애·결혼 글의 근거 없는 빈도/안정성 주장부터 수정하고 다른 체계도 실제 계산·기능과 대조한다. 3~10개라는 수량보다 검증 가능한 사례·출처·한계와 검색 의도 일치를 우선한다. 본문·메타·FAQ·생성 읽기 자료가 일치해야 완료다.
- [ ] P1: 핵심 허브→설명 글→기존 도구 연결을 보강한다. JS 렌더링, 모바일, 실제 구조화 데이터, 로케일 완결성, 정책/CMP를 점검한다. 가짜 저자 경력·검수 이력은 금지하고 `humanReview: unconfirmed`, `adsAllowed: false`를 임의 승격하지 않는다.
- [ ] P2: 기존 자료를 인용 가능한 계산 예시·체계 비교로 개선한다. 후보는 기존 outreach 파일에 증거·개별 초안만 기록한다. 자동 이메일·댓글·링크 구매 금지.
- [ ] 실제 운영 반영일 이후 동일 URL군의 28일 클릭·비브랜드 노출·상위 3/10위·관련 referring domains를 비교한다. 별도 Query/Page 집계를 교차표로 만들지 말고 미접근 수치는 null로 둔다. 기존 주간 자동화를 중복 생성하지 않는다.

## 코드 정본·검증·경계

숙요 계산 정본은 `js/core/sukuyo-astronomy.js`와 `worker/lib/sukuyo-coordinate.js`의 Lahiri 항성황도 달 경도다. 과거 음력표 설명으로 되돌리지 않는다. SEO는 `lib/seo/siteSeo.ts`, `scripts/generate-sitemap.mjs`, `public/_headers`; 홈은 `index.html`. 실제 글 렌더 분기는 `app/insights/seed-articles.js`도 확인한다.

`CLAUDE.md`와 `docs/context/delivery-and-ci.md`를 우선한다. 변경에 필요한 생성 명령 후 `npm run check:fast -- --plan`, `npm run check:fast`; 문서는 `npm run verify:handoff-contract`. 해당 변경만 커밋·main push·CI 확인한다. 운영 배포·실 LLM·실결제·운영 DB 쓰기·광고 활성화·재신청은 이번 허용 범위가 아니다.

## 재개 명령

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\google-seo-rebuild-20260921.md와 CLAUDE.md를 읽고, 구현 커밋 fc3f86a39006212e0753e575b1685059b7fc1a91 이후 main 변경과 미커밋 작업을 보존하라. docs/seo/core-landings-20260921.md의 관측표를 기준으로 숙요 연애·결혼 글의 빈도·안정성 주장과 나크샤트라 체계 대응 설명을 실제 계산·출처와 대조하는 P1부터 이어서 진행하라. 동시 쓰기가 있으면 기존 D:\wt\seo-20260921-121321의 상태를 확인해 재사용하고, 검증·커밋·main push·CI 확인까지 완료하라. 운영 배포·유료 LLM·광고 활성화·AdSense 재신청은 실행하지 마라. 기존 워크트리 삭제 제한을 우회하지 마라.
```
