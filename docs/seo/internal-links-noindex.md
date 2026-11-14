# 색인 불가 페이지로 가는 내부 링크 (묶음 2-3, K4)

작성일 2026-11-14. 결론부터: **코드는 바꾸지 않았다.** 링크를 바꿀 만한 "같은 목적의 색인 가능한 페이지"가 없었다. 아래는 위치와 판단 근거다.

## 1. 어떻게 셌나
묶음 1 빌드 결과(`dist/`)의 HTML 1,917개에서 `robots` 메타를 읽어 색인 대상(1,094개)과 noindex를 나누고, 색인 대상인 한국어 페이지의 `<a href>`가 noindex 페이지를 가리키는 경우를 셌다. 숫자는 "그 링크가 들어 있는 페이지 수"다.

## 2. 결과

| 링크 대상(noindex) | 링크가 있는 페이지 수 | 링크가 나오는 곳 | 대상의 성격 |
|---|---|---|---|
| `/records/` | 613 | 공통 푸터, 홈(`app/page.js`) | 내 기록(개인 화면) |
| `/tarot/crystal-soul/`, `/oracle/royal-tea/`, `/oracle/sikojen-povailu/` | 각 595 | 공통 푸터(`app/components/SiteFooterHub.jsx`) | 바로 실행하는 도구 화면 |
| `/consultations/` | 594 | 공통 푸터("프리미엄 운세 리포트") | 유료 상담 고르기 |
| `/flower/destiny/`, `/flower/astrology/`, `/flower/jamidusu/`, `/flower/sukuyo/` | 각 593 | 공통 푸터 | 운명의 꽃 실행 화면 |
| `/reviews/` | 593 | 공통 푸터 | 후기(현재 noindex) |
| `/fusion-fortune/` | 343 | `app/components/FusionCrossSell.tsx` 등 | 실행 화면 |
| `/nakshatra/calc/` | 29 | 낙샤트라 글 | 계산기 |
| `/yeongnyangi/library/` | 16 | 홈, `app/components/SeoLandingTemplate.jsx`("내 상담 기록") | 내 서재(개인 화면) |
| `/human-design/` | 11 | 관련 글 | 실행 화면 |
| `/account/delete/` | 9 | 정책 페이지 | 계정 삭제 |
| `/neo-consultation/` | 7 | 일부 페이지 | 상담 신청 |
| `/points/` | 5 | 홈(`/points/#moonlight-plans`) 등 | 이용권 구매 |
| `/consultations/<상담>/` 13종 | 각 3 안팎 | 홈 | 유료 상담 상세 |

이 밖에 noindex로 둔 유명인 사주 글로 가는 링크가 인사이트 목록에 있다.

## 3. 판단

| 묶음 | 판단 | 근거 |
|---|---|---|
| 개인 화면(`/records/`, `/yeongnyangi/library/`, `/points/`, `/account/delete/`) | 그대로 둔다 | 로그인한 사람이 쓰는 화면이라 검색에 나올 이유가 없고, 대신 보낼 색인 페이지도 없다. 링크를 없애면 사용자가 길을 잃는다 |
| 실행 화면(`/tarot/crystal-soul/`, `/oracle/*`, `/flower/*`, `/fusion-fortune/`, `/nakshatra/calc/`) | 그대로 둔다 | 눌러서 바로 쓰는 도구다. 안내 페이지로 바꾸면 한 번 더 눌러야 한다 |
| `/human-design/` | 그대로 둔다 | 색인 가능한 `/human-design/guide/`가 있지만 안내 글이다. 실행하러 가는 링크를 안내 글로 돌리면 목적이 달라진다 |
| `/consultations/`와 하위 13종 | 그대로 둔다. **색인을 열지는 사용자 결정** | `app/consultations/page.tsx`가 `index: false, follow: false`를 직접 지정한다. 색인 가능한 `/consultation-samples/`("사주·운세 상담 비교")가 있지만 견본 비교 페이지라 "상담 고르기" 링크의 대체가 아니다 |
| `/reviews/` | 그대로 둔다 | 대체 페이지 없음. 후기 색인 여부는 가짜 신뢰 신호 금지 원칙과 얽혀 있어 이번 범위 밖 |

푸터 링크는 `app/components/SiteFooterHub.jsx` 한 곳에서 나오고, 정적 테스트와 `scripts/build-static-policy-pages.mjs`가 그 목록을 고정하고 있다. 바꾸면 여러 테스트와 생성물이 함께 바뀐다.

## 4. 검색엔진 쪽에서 본 영향
- noindex 페이지로 가는 링크 자체는 불이익이 아니다. 로봇이 그 페이지를 한 번 더 읽는 정도다.
- 신경 쓸 만한 것은 `/consultations/` 하나다. 590여 쪽이 푸터에서 링크하는데 그 페이지가 `nofollow`까지 걸려 있어, 로봇이 거기서 상담 상세로 더 나아가지 못한다. 유료 상담 13종을 검색에 내놓고 싶다면 이 설정을 풀어야 한다.

## 5. 사용자 결정이 필요한 것
- **`/consultations/`를 색인에 열 것인가.**
  - 가: 지금처럼 noindex·nofollow(추천, 당장은). 상담 상세 13종의 내용이 서로 비슷한지, 가격 표기가 정본과 맞는지 먼저 봐야 한다.
  - 나: 목록 페이지만 `index, follow`로 연다. 하위 13종은 그대로.
  - 다: 목록과 하위 모두 연다. 사이트맵·구조화 데이터·가격 문구 검수가 함께 필요하다.
