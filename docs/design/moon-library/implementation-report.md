# 꿀꿀 사주 달빛 서재 구현·검증 기록

기준 커밋: `6325e4af93034c2c1e720bd5be926d15db5a1025`. 운영 승격은 실행하지 않았다.

## 구현 경로와 보존 범위

- Next 15 App Router: `app/insights/`, 정적 홈: `templates/home-funnel.html` → `index.html` → `public/` 미러. 새 아카이브를 복제하지 않고 기존 검색·페이지·원고를 사용했다.
- 인물 정본 `lib/famous-saju/celebrity-data.ts`, 고유 원고 `celebrity-editorial.js`, 기존 계산 `celebrity-saju-service.ts` → `localSajuCalculator`. 공개 날짜·원기록과 계산 후보는 `archive.ts`에서 분리한다.
- `cycle.ts`의 60개 순환만 분류한다. 일간별 6개, 정확한 일주 필터, 분야와 국가 분리, 이름·별칭 검색, URL 상태·뒤로가기·스크롤 복원, 편집 추천·이름순, 12개 페이지 표시를 구현했다.
- 새 경로 `/insights/famous-saju/ilju/cycle-01/` … `cycle-60/`. 기존 상세 URL은 유지한다. 검증된 인물은 0명이며 모두 noindex/follow, 사이트맵 제외다. 후보 비교는 별도 접기 영역에서 월주와 함께 제공한다.
- 인사이트 원고·분야 허브·기존 안내를 보존하고 밝은 종이색, 검색 우선 배치, 접는 분야·태그·정렬, 실제 분량 읽기 시간, 읽기 진행률·기기 내 북마크를 추가했다. 북마크는 계정 동기화가 아니다.
- 홈 한국어 진입부는 ‘연예인·인물 사주 / 스타의 재능부터 위인의 삶까지’, ‘운세 인사이트 / 내 사주를 이해하는 달빛 지식 서재’로 변경했다. 한국어 사전도 함께 변경했고 기존 번역 경로를 유지했다.
- 로그인·결제·회원 DB·상품 ID·이용권·월정석·가격·결과 저장 API는 변경하지 않았다. `AppVersionGuard`의 기존 유료 시도 복원과 차단 상태 판정을 공통 런타임에 연결했다.

## 자산 지도

| 용도 | 실제 자산 |
|---|---|
| 10일간 | `public/images/saju/nature/{gap,eul,byeong,jeong,mu,gi,gyeong,sin,im,gye}-{480,960}.webp` |
| 기존 인물 허브 | `public/images/feature-details/famous-saju-hero-v2.webp` |
| 인사이트 표지 | `public/images/feature-details/fusion-fortune-hero-v2.webp` 및 기존 원고 표지 |
| 영냥이 설치·편지 | `public/assets/yeongnyangi/original/hero-800.webp` |
| 60일주 | `public/images/saju/ilju/cycle-01.svg` … `cycle-60.svg` |

60개 표지는 직접 작성한 경량 SVG다. 일간의 나무·등불·산·금속·물 모티프와 지지별 전경·달 위치를 조합했다. AI 생성 이미지나 인물 사진이라고 표시하지 않는다. 기존 캐릭터 얼굴과 비율을 수정하지 않았다. 허브는 1/2/3열, 독서 폭 720px, 본문 잉크 대비 14.53:1, 보조 글자 대비 6.28:1이다. 디자인 detector는 13/15px 보조 문구가 기존 타입 램프 밖이라는 advisory 2건만 보고했다.

## 실제 데이터 감사

재현: `npm run verify:moon-library`. JSON: `data-audit.json`, `insight-audit.json`.

- 유명인 156명, 공개 156명, 중복 slug 0. 고유 원고 12건, 기존 검수 표시 9건, 재검수 초안 3건, 고유 원고 없는 기존 레코드 144건.
- 기존 엔진에서 날짜 기준 일주를 계산한 후보 136명. 출처·역법·날짜 경계 검토 대상 156명. 출생자료 링크 연결 7명은 정확한 일주 검증 완료를 뜻하지 않는다.
- 근거가 확인되지 않은 저장 시각은 `reportedBirthTime`으로 보존하고 계산 입력 `birthTime=null`로 분리했다. 정오를 실제 시각으로 노출하지 않는다. 목록과 상세의 계산 후보 일치 검사를 실행한다.
- 아이유·손흥민·한강 원고를 자료와 해석을 분리해 수정하고 검수일을 null로 두었다. 기존 세 원고는 `editorial-before.json`에 보관했다. 나머지 기존 원고를 일괄 삭제하지 않았다.
- 인사이트 원본 114건, 공개 114건, 초안 0건, 중복 slug 0. 기존 룬·기타를 포함한 분류를 보존했다. 이 수치는 로컬 정적 원고 기준이며 운영 DB를 조회하지 않았다.

## 설치·업데이트

`js/pwa-lifecycle.js`는 정적 홈과 Next에서 한 번만 초기화한다. 설치 이벤트는 메모리에 보관하고 명시적 클릭에서만 1회 소비한다. 8초·세션 1회·닫기 14일·실제 제안 거절 30일은 분리된 사이트 정책이다. accepted와 appinstalled 지표는 분리했다. 저장 플래그만으로 설치 완료를 주장하지 않는다. iOS·미지원 환경은 실제 브라우저 메뉴 안내, 이미 추가했어요·나중에·주소 복사를 제공한다. 공개되지 않은 스토어 링크는 추가하지 않았다.

manifest의 대표 진입 `/`, scope `/`를 유지했다. 명시적 id `/`는 이전 start_url 기반 기본 정체성과 같다. 기존 아이콘을 유지한다.

기존 강제 서비스워커 해제·전체 캐시 삭제·강제 리로드를 공통 안전 흐름으로 대체했다. 첫 설치와 waiting 업데이트를 구분한다. `config/app-release.json`의 실제 릴리스 항목을 `write-version-json.mjs`가 포함한다. 일반 콘텐츠 커밋 SHA만 달라져도 팝업이 뜨지는 않는다. 앱 릴리스 시 config id, SW_VERSION, 런타임 baseline을 함께 갱신한다.

사용자 동의 후 동일 출처 문서 응답을 확인하고, waiting worker가 모든 열린 탭에 안전 확인을 요청한다. 미응답·새 탭·미저장 입력·결제/상담 상태이면 전환하지 않는다. 전환 중 입력 이벤트를 잠시 막고 실제 controller 전환 후 동의한 탭만 한 번 갱신한다. 나머지 탭은 강제 리로드하지 않는다. 읽던 URL·스크롤만 sessionStorage에 보존한다. 주문·유료 생성 요청을 재실행하거나 개인정보를 복사하지 않는다. 구 캐시를 즉시 삭제하지 않는다.

## 실행한 검증

- `npm run typecheck`: 통과.
- 변경 React/TS 파일 `npx eslint …`: 오류 0, 기존 및 명시적 img/a 사용 등의 경고 25건. 전체 lint 통과로 해석하지 않는다.
- `npm run verify:moon-library`: 60주기·6분류·156명 일치·표지 존재, 실제 Chromium 서비스워커 waiting/차단/전환 검증 통과.
- `node --test __tests__/ui/pwa-install-prompt.static.test.js`: 4/4 통과.
- `node scripts/verify-famous-saju-editorial.mjs`: 12개 원고의 엔진·분량·출처 연결·중복 검사 통과. 이 검사는 사람의 원고 검수를 대신하지 않는다.
- `npm run smoke:core`: Jest 8 suites/110 tests 및 Node 47 tests 통과. mock 결제/소유권/복구 관련 검사이며 실결제 검증이 아니다.
- `node scripts/verify-moon-browser.mjs`: 320·360·390·430·768·1440px 가로 넘침/이미지, 검색·URL·reload·back, 인물 상세 HTTP 200, 병화 6일주, 새 페이지 noindex, 인사이트 검색 통과. 로컬 천문력은 `SWISS_EPHEMERIS_FILES_BASE_URL=http://127.0.0.1:15734/ephe/`로 저장소 파일을 사용했다.
- `npm run sync:public`, `npm run sitemap:generate`, `git diff --check`: 실행. 커밋 후 `check:pre-push` 결과는 전달 기록에서 확인한다.
- `npm run check:fast -- --plan`: 위험 경로 승격 확인. `npm run check:fast` 전체 실행은 대규모 paid-gate suite에서 완료되지 않아 중단했다. 전체 게이트 통과로 보고하지 않는다.

전후 캡처: `before-live-famous-390.png` → `famous-390.png`, `before-live-insights-390.png` → `insights-390.png`. 추가 `famous-{320,360,430,768,1440}.png`, `ilju-390.png`, `update-fixture-390.png`. 전은 운영·후는 mock 개발 서버이므로 성능 수치를 서로 비교하지 않았다.

## 남은 제약과 릴리스 조건

실제 iPhone/Android/데스크톱 OS 설치창, 설치 후 아이콘, 인앱브라우저, 여러 설치 저장소, 실제 결제 복귀·로그인·회원 결과 복구, 실기기 LCP/INP/CLS 전후 측정은 **미검증**이다. 설치 테스트는 이벤트 fixture이고 업데이트는 실제 로컬 SW다. 서버 장애/오프라인의 모든 조합을 포괄하지 않는다.

기존 144명 고유 원고, 전체 인물의 생년월일·현지 시간대·역법 출처 확인과 사람의 최종 검수가 남아 있다. 60개 일주 설명은 모티프와 지장간에 기반한 초안이며 독립적 검색 콘텐츠의 검수를 완료한 것으로 취급하지 않는다. 일부 기존 유명인 상세 내부 컴포넌트에는 원래의 어두운 시각 영역이 남아 있다. 모든 인사이트의 새 고유 표지를 제작한 것은 아니다. 원자적 운영 배포의 구버전 자산 보존 기간은 이번 로컬 검증으로 증명하지 못했다.

공식 지침 확인: [WebKit 홈 화면 웹앱](https://webkit.org/blog/13878/), [서비스워커 lifecycle](https://web.dev/articles/service-worker-lifecycle). 개별 원고 근거: [손흥민 2021/22 기록](https://www.premierleague.com/en/news/2626553), [한강 노벨상](https://www.nobelprize.org/laureate/1042). 출처 연결 자체를 출생시간 확인으로 취급하지 않았다.

## 롤백

다른 세션 변경을 포함하는 reset을 하지 않는다. 전달된 이 작업의 커밋만 `git revert <해당 커밋>`으로 되돌린 뒤 sync:public·sitemap:generate·check:pre-push·main CI를 적용한다. 운영 승격 후 롤백은 기존 승인·릴리스 절차로 진행한다. 검수 전 원고와 설치 런타임을 되돌릴 때도 회원 기록·결제 원장은 변경하지 않는다.
