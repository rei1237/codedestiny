# AdSense 제출 후 콘텐츠 정정 — 2026-09-26 제출, 09-27 후속 정정

## 현재 계정 상태와 적용 범위

사용자의 즉시 제출 지시에 따라 기존 관찰 기간을 기다리지 않고 검토 요청을 제출했다. 계정 상세 화면에서 `준비 중`, `사이트의 광고 게재 가능 여부 검토 중`, `리뷰가 요청됨`을 확인했다. 승인 완료를 뜻하지 않는다.

확인 방식은 운영 초기 HTML에 있는 `google-adsense-account` 메타 태그와 맞췄다. 공개 `/ads.txt`는 HTTP 200이며 동일한 게시자 ID를 반환했다. 제출 전 목록에 남아 있던 `찾을 수 없음` 표시가 해소되었다고 단정하지 않는다. 새 약관 동의·결제·세금·계정 설정 변경은 하지 않았다.

허브 6개와 우선 글 20편은 운영에 반영되어 있다. 해당 릴리스의 Pages와 Worker SHA는 모두 `aae9918d38611da2d6e7a0b7b8c5d3a687c846b7`이었다. 이번 문서의 후속 정정 6편은 별도 변경이며, main 반영과 운영 승격을 구분한다.

## 후속 진단

`npm run seo:check`: 운영 랜딩 19개, 사이트맵 1,284 URL, 발견 오류 0. 전체 URL의 현재 HTTP·렌더링을 전수 검사한 결과는 아니다. seed 원고 113편은 모두 원본 본문을 사용하며 템플릿 대체 원고는 0편이다. 이는 개별 원고의 전문 검수 완료를 의미하지 않는다.

| 항목 | 확인한 소스와 문제 | 영향도 | 정정 |
|---|---|---|---|
| 숙요 용어 사전·Q&A | `app/insights/articles.js`: 월명숙을 외부 성격으로 단정하여 기존 정정 글과 모순. 자미두수 별 밝기를 숙요의 공통 개념처럼 안내 | 높음 | 정의·문헌·계산 확인을 먼저 안내. 시각·시간대 및 관계 방향의 범위를 구분 |
| 우쇠관계 | `app/insights/seo-growth-articles.js`: 우(友)를 성(成)으로 풀이. 장기 지속·성장·쇠퇴를 관계 이름으로 확대 | 높음 | 우쇠와 성위를 구분. 서비스의 방향 표지와 실제 연락·책임·동의를 분리 |
| 베다 역행 | `app/insights/articles.js`: 교점을 어떤 모델에서도 항상 역행으로 설명. 투자·대출을 역행 종료 뒤로 미루도록 권고 | 높음 | 평균·진 교점과 네이탈·트랜짓을 구분. 재무·관계 결정을 역행 표지로 권하지 않음 |
| 면접·시험 | `app/insights/adsense-ready-articles.js`: 합격률 상승 제목, 운세를 기준으로 준비시간 20~30% 증감 | 높음 | 준비 기록·공식 일정·오답에 근거한 점검. 합격 확률과 임의 효과 수치 제거 |
| 숙요 일상 리듬 | `app/insights/articles.js`: 1~2주 후 상대도 화답한다는 약속과 2주 개선 사례 | 높음 | 개선 기간을 약속하지 않음. 상대의 동의와 가상 예시를 명시. 실제 상담·성과 기록으로 표현하지 않음 |
| 검색·공개 읽기 사본 | `app/insights/seo-titles.js`, `seo-descriptions.js`, `public/data/astro-reading`, `public/data/sukuyo-reading` | 중간 | 본문과 제목·설명 일치, 기존 생성기로 사본 교체 |

새 문구는 각 원고 소스의 기존 ko i18n 키로 관리한다. 출처·가상 예시·해석의 한계를 명시했으며 저자 경력·실제 상담 사례·사람 검수·효과 통계를 새로 만들지 않았다. 길이를 늘리기 위한 일반론이나 새 페이지는 추가하지 않았다.

## 사실 대조 근거

- 숙요 계산 입력: `lib/sukuyo-engine-server.ts`의 `calcSukuyoForServer`, `js/core/sukuyo-astronomy.js`. 읽기만 했다.
- 우·쇠 표지와 관계군: `js/saju-engine-tarot-sukuyo-quantum.js`의 `SY_ROLE_PROFILE`, `SY_ROLE_RELATION` 및 삼구 순서 설명. 읽기만 했다. 코드의 해석 문구를 전통 전체의 학술 정설로 확대하지 않았다.
- [『숙요경』 T1299](https://buddhism.lib.ntu.edu.tw/FULLTEXT/sutra/T/T21n1299.pdf): 날짜표·숙 배정·삼구 관련 부분. 현대 서비스의 천문 계산 및 관계 문구와 구분했다.
- [NASA 역행 설명](https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question46.html): 겉보기 운동과 실제 공전의 구분. 직업·금융·관계 효과의 근거로 인용하지 않았다.
- [Swiss Ephemeris 문서](https://www.astro.com/swisseph/swisseph.htm): 2.2.1 The Mean Node, 2.2.2 The True Node. 교점의 모델과 변동을 구분했다.
- 십성·하우스 해설은 이미 정정한 공개 기초 글과 대조했다. 현실의 채용·시험 결과와 연결되는 인과나 효과를 주장하지 않는다.

## 검증과 보존 영역

콘텐츠·메타·공개 사본·사이트맵 정정 커밋: `f32375f129275a7b18e94c3ababa0d1be7d3c40c fix(content): correct remaining insight claims`.
이어지는 숙요 일상 리듬 정정은 9월27일 수정일을 사용하며, 이미 검증한 계산·레이아웃·기존 24편 검토 상태를 변경하지 않는다.

- `node --test __tests__/ui/phase3-insight-content.test.mjs`: 7개 통과. 후속 정정 회귀, 기존 우선 20편, 허브와 긴 동일 문단 검사를 포함한다. 의미 중복이나 전문 감수 전체를 보장하지 않는다.
- 수정일이 변경되어 원장 검사가 처음에는 이전 sitemap 날짜와 불일치했다. `npm run sitemap:generate` 뒤 `node scripts/verify-editorial-manuscripts.mjs`가 24개 기존 해시와 날짜 정합성을 통과했다. 사람 검수·광고 허용 승격은 없다.
- `npm run sitemap:check`: 1,284 URL의 로컬 정합성 통과.
- `npm run sync:public`: 정본의 astro/sukuyo 공개 사본 생성. 해시가 바뀐 생성 파일은 기존 생성기의 교체 규칙에 따른다.
- `npm run check:fast -- --plan`, `npm run check:fast`: 자동 승격된 mock 회귀 88개와 lint가 통과했으나, 검사 도중 9월27일로 바뀌어 기존 일별 운세 보존 규칙의 sitemap drift에서 종료1로 멈췄다. 전체 check:fast 통과로 기록하지 않는다.
- 9월27일 `npm run sitemap:generate` 후 `npm run verify:sitemap-drift`, `npm run sitemap:check`, `node scripts/verify-editorial-manuscripts.mjs`를 재실행해 통과했다. 일별 URL과 기존 lastmod의 날짜 변경은 생성기의 기존 규칙이며 새 라우팅 정책을 추가한 것이 아니다.
- `npm run typecheck`: exit0. 나머지 전체 선택 검증과 빌드는 공식 main CI 결과로 확인한다. 운영 배포나 실제 LLM·결제·DB 검증으로 해석하지 않는다.

6개 엔진, 사주 어댑터, 타임존·KASI, 결제·인증·API·DB·KV/R2·사용자 자산 포맷을 수정하지 않았다. CSS와 960px 레이아웃도 변경하지 않았다. WAF·Bot·DNS 설정 변경, AdSense 재제출은 없다.

## 남은 외부 확인과 운영 반영

Search Console의 핵심 최신 본문 수집, 계정의 ads.txt 인식, AdSense 심사 결과는 외부 관찰 대상이다. 공개 원고의 사람 전문 검수는 확인되지 않았으며 자동 승인 표시를 추가하지 않는다. 이번 확인은 전체 사이트와 모든 언어의 질적 감사를 완료했다는 뜻이 아니다.

운영 승격은 `CLAUDE.md`의 별도 1회 명시 승인 계약을 따른다. 확인된 변경만 공식 CI에 전달하고, 승인된 릴리스 완료 후 Pages `/version.json`과 Worker `/api/version`의 같은 SHA를 확인해야 운영 반영 완료로 기록한다. 현재 심사 요청을 중복 제출하지 않는다.

롤백은 이번 변경 커밋만 `git revert`한 뒤 동일 전달 절차로 처리한다. 다른 세션의 변경이나 정상적인 이전 콘텐츠 배포를 되돌리지 않는다.
