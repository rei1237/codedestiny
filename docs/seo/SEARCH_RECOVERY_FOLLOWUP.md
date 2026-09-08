# 검색 회복 후속 실측 — 2026-09-08

기준 소스 `62c72c3a4bf60ea6b8c64bb439c155b48606b234`. 공개 HTTP GET, 로그인된 GSC 화면, 기존 Chrome 세션과 로컬 소스만 읽었다. 운영 승격·색인 생성 요청·WAF 변경·결제·LLM·DB 쓰기는 수행하지 않았다.

## PR와 배포

- [PR #1817](https://github.com/rei1237/codedestiny/pull/1817)은 병합 완료. 병합 SHA `ff2d524c647dc0ebf909d752fa3998b93abd4c62`.
- head `b0b6b5f06fb5dba7563b2720281f411345d264dc`의 PR CI / Paid Flow Gates / Business Identity Gate는 모두 success. PR CI run `34183538720`.
- 처음 확인한 스테이징 Pages·Worker는 모두 `ff2d524c647d`. 다음 문서 PR 배포 후 재측정에서는 둘 다 `62c72c3a4bf6`였다. 두 SHA 모두 SEO 변경을 포함한다.
- 운영 Pages·Worker는 모두 `a6082514bdd20696fc8b81b14369013732506100`. 이번 SEO 변경은 아직 운영 미반영이다. 운영 배포일 D와 D+7/28/90 측정일은 확정하지 않는다.
- 두 호스트 각각 version 2개·robots·HTML 9개, 총 24개 GET이 모두 200. 스테이징 HTML 9개의 HTTP/메타 robots는 noindex,nofollow, robots.txt는 Disallow: /. API version에 X-Robots-Tag가 없는 것은 HTML 검사와 별도로 기록했다.
- [DEPLOYMENT_FOLLOWUP.json](DEPLOYMENT_FOLLOWUP.json)에 관측 시각·URL·상태·SHA·canonical·H1·한국어 표본을 보존했다. 일반 요청 성공을 모든 검색 로봇의 성공으로 확대하지 않는다.

## GSC 추가 수집

속성 `sc-domain:code-destiny.com`, 웹 검색, 국가·기기 필터 없음. 아래 날짜는 비교 프리셋 적용 후 기간 대화상자를 다시 열어 확인했다. 차트 접근성 텍스트에 Invalid Date가 보이므로 그 문자열로 날짜를 산정하지 않았다.

| 기간 | 최근 | 이전 | 클릭 최근/이전 | 노출 최근/이전 |
| --- | --- | --- | --- | --- |
| 7일 | 2026-08-30–09-05 | 2026-08-23–08-29 | 2 / 2 | 20 / 31 |
| 28일 | 2026-08-09–09-05 | 2026-07-12–08-08 | 8 / 9 | 120 / 125 |
| 3개월 | 2026-06-06–09-05 | 2026-03-06–06-05 | 기존 기준선 32 / 194 | 기존 기준선 395 / 약 7,980 |

7일 CTR 10/6.5%, 순위 24.3/30.4. 28일 CTR 6.7/7.2%, 순위 28.4/23.1. 3개월 날짜와 최근 집계 32/395는 이번에 재확인했고 이전 집계는 SEO_AUDIT.md의 선행 관측값이다.

9/4 갱신 색인 보고서의 13개 사유를 모두 펼쳤다. 기존 10개 사유 합계 1,207에 다음 615개가 더해져 미색인 1,822와 일치한다.

| 추가 확인 사유 | 페이지 |
| --- | ---: |
| 크롤링됨 - 현재 색인이 생성되지 않음 | 382 |
| 발견됨 - 현재 색인이 생성되지 않음 | 229 |
| 중복 페이지, Google에서 사용자와 다른 표준을 선택함 | 4 |

이를 모두 장애로 분류하지 않는다. 각 표본 URL의 현재 sitemap·canonical·redirect 정책과 대조해야 한다.

외부 링크 보고서에 표시된 총 2개 모두 상세 화면에서 확인했다. 이는 Google이 보고한 표본이며 인터넷 전체 backlink 목록이 아니다.

| 링크 원본 | 대상 |
| --- | --- |
| https://x.com/jamgem0038/status/2060612275007074511 | https://code-destiny.com/ |
| https://www.xploredomains.com/2026-03-06?page=111 | https://code-destiny.com/ |

CSV 내보내기는 Chrome에서 `ERR_BLOCKED_BY_CLIENT`로 차단되어 파일을 확보하지 못했다. 차단을 해제하거나 우회하지 않았다. 전체 Query–Page export는 미완료이며, 개별 차원 표를 Query–Page 교차표로 취급하지 않는다. 익명화로 숨겨진 검색어는 0으로 채우지 않는다.

### 편집 후보의 교차 조회

`점성술 연애운` exact query, 3개월 비교, 페이지 탭: 최근 노출 1·클릭 0·순위 54의 대상은 **홈 /**였다. synastry 글로 연결되지 않았다. 따라서 synastry 페이지 자체의 28일 노출 9·순위 14.8을 이 검색어 실적으로 설명하면 안 된다. 이 글은 제목 수정 전에 페이지 필터로 실제 검색어를 확보해야 한다.

### 일본어 홈 URL Inspection

`https://code-destiny.com/ja/`는 Google에 등록됨. 최근 크롤링은 화면 표시 기준 2026-09-04 05:52:29, Googlebot 스마트폰, 가져오기 성공·크롤링/색인 허용. 사용자 canonical은 /ja/, Google 선택도 검사된 URL이다.

실제 URL 테스트는 GSC가 “문제 발생 — 문제가 지속되면 몇 시간 후에 다시 시도”를 반환했다. **라이브 테스트 통과가 아니다.** 변경 전 운영 URL의 과거 크롤링 증거이며, 운영 반영 후 재검사가 남는다. CWV 개요는 모바일·데스크톱 모두 데이터 없음이다.

## 해외 홈 번역

- 운영 /en/, /ja/, /zh/, /zh-tw/의 GET HTML은 해당 언어 H1을 포함한다. 기존 운영은 새 `#cdHomeFunnel` 구조가 없어 그 영역의 잔여 수는 null이다. 0개 번역 누락으로 해석하지 않는다.
- 스테이징 4개 로케일은 새 핵심 H1이 번역돼 있다. 그러나 `#cdHomeFunnel`의 한국어 텍스트 leaf가 각 90개다. 로그인·마이·이용권 안내·고민별 카드·상담 소개 등의 표본이 JSON에 있다. 이 수치는 가시성/문장 품질 점수가 아닌 **서버 HTML 잔여 계수**다.
- 현재 사용자 Chrome 세션으로 운영 4개 URL을 각각 열면 title은 현지어지만 실행 후 document.lang=ko, 보이는 H1은 한국어였다. staging /en/도 같은 현상을 확인했다. 새 방문자·저장 언어가 다른 세션의 결과를 의미하지 않는다. 모달 전체 흐름은 미검증이다.
- 소스 `js/core/index-inline-runtime.js`의 `cdReadUrlTranslateLang`은 query `lang`만 읽고 `cdGetExplicitTranslateIntentLang`은 URL query와 명시 저장값을 읽는다. 이 함수 범위에 pathname 로케일 판정이 없다. 이는 조사할 지점이며 전체 초기화 원인을 확정한 것은 아니다.
- 다음 수정은 URL 로케일·명시 선택·저장값의 우선순위를 mock에서 재현한 후 결정한다. `index.html`, template, runtime은 다른 홈 작업과 겹치므로 최신 main과 worktree:status를 다시 확인한다. 정책 문구 번역은 기존 가격 레지스트리 값과 의미를 유지한다. 일괄 noindex는 하지 않는다.

## 인사이트 113개

[INSIGHT_DUPLICATION_FOLLOWUP.json](INSIGHT_DUPLICATION_FOLLOWUP.json)은 실제 seed와 원본 articles/growth 합집합을 슬러그별로 대조한 전수 목록이다. HTML 태그 제거·공백 정규화 후 본문이 원문과 같은 글 113개, 다른 글 0개, 원문 없는 글 0개. 직접 반환된 contentSource도 authored 113개였다.

60자 이상 p 문단의 완전 일치 반복 그룹은 0개였다. buildMysticSections 함수가 존재한다는 사실만으로 현행 113개를 템플릿 글로 분류하지 않는다. 이 검사는 의미가 비슷한 문단·제목만 바꾼 문장·사실 정확성·모바일 가독성을 판정하지 않는다.

현재 편집 순서: ① 해외 홈 언어 초기화/잔여 번역 ② 숙요 가이드의 실제 유입과 통합 URL 재크롤링 ③ synastry 페이지의 실제 Query 확인 ④ 나머지 113개 의미 중복/주장 검수. 신규 URL/자동 통합은 보류한다.

## 검증과 남은 일

문서와 근거 JSON만 변경했다. 공개 기능 코드·계산·결제·인증·API·DB·색인 정책은 그대로다. 임시 GET/소스 조사 스크립트는 외부 스크립트 실행이나 부가 리소스 다운로드 없이 JSDOM으로 HTML을 파싱했다. CSS parser 경고는 스타일 해석 미지원이며 HTTP/텍스트 검증과 별개다.

필수 명령: `npm run check:fast -- --plan`, `npm run check:fast`, `npm run verify:handoff-contract`, `git diff --check`. 이번 문서 변경에 전체 빌드·결제 테스트를 다시 실행하지 않는다. 운영 배포 승인, 전체 export, 실제 URL 테스트 재시도, 12개 원고의 모든 주장·시간 검수, 모바일 SERP 5개씩과 동일 조건 CWV 실험, D+7/28/90 관측은 남는다.
