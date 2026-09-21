# 핵심 랜딩 12개: Google SEO·AdSense 근거 대조

관측일: 2026-09-21 KST. 코드 시작점: `bb1c22f25f03013e21847e5ecce9dbb848470f2e`(인수인계 `b8d07ec864685c8f33060e3137a77275ca5fd09e` 이후 main 보존). HTTP·GSC 관측은 **수정 전 운영**, 수정 검증은 **로컬**이다. 운영 배포는 하지 않았다.

## 범위와 방법

대표 체계 6개(사주·만세력·숙요·자미두수·베다·서양 점성술)의 입문 허브, 계산 도구, 설명 가이드를 섞어 아래 12개를 고정한다. 트래픽 상위 12개라는 뜻은 아니다. 날짜별·로케일별 전수 품질 판정으로 확대하지 않는다.

실제 응답은 Node fetch로 GET하고 JSDOM으로 head/main을 분리했다. 응답 코드·최종 URL·canonical·robots·h1·hreflang·a[href]·본문 일부·운영 sitemap 포함 여부를 [JSON 근거](core-landings-20260921.json)에 기록했다. 스크립트 실행 없이 추출한 HTML이므로 전 페이지의 hydration 성공 증거는 아니다. GSC는 로그인된 `sc-domain:code-destiny.com`의 URL 검사 화면을 사용했다. 색인 생성 요청은 누르지 않았다. 미실행 실시간 검사와 미확인 마지막 크롤링 날짜는 null이다.

## 공식 기준

- **G1 정확성·실질 가치**: [사람 중심 콘텐츠](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)는 독자에게 도움이 되는 고유 정보, 정확성, 제작 방법·출처의 투명성을 권한다. Google이 선호하는 특정 글자 수는 없다. 저장소의 1,800자 검사는 내부 게이트이며 Google 승인 기준이 아니다.
- **G2 링크**: [크롤링 가능한 링크](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)는 실제 a[href]와 목적지를 설명하는 앵커 문구를 권한다.
- **G3 표준 URL**: [canonical 지침](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)에 따라 canonical·사이트맵·내부 링크를 일치시킨다. 중복 정리를 위해 일괄 noindex를 쓰지 않는다.
- **G4 언어 대체본**: [로케일 지침](https://developers.google.com/search/docs/specialty/international/localized-versions)에 따라 존재하는 언어 대체본과 상호 hreflang을 확인한다. 한국어 전용 가이드에 hreflang이 없다는 사실만으로 오류는 아니다.
- **G5 GSC 해석**: [URL 검사 도움말](https://support.google.com/webmasters/answer/9012289)에 따라 저장 색인과 실시간 접근 가능성을 분리한다. 실시간 성공은 색인·순위 보장이 아니다.
- **A1 게시자 콘텐츠**: [Google 게시자 정책](https://support.google.com/adsense/answer/10502938)은 게시자 콘텐츠가 없거나 가치가 낮은 화면의 광고를 제한한다. 아래 결함은 자체 확인한 개선 사항이며 Google이 지정한 URL별 거절 원인이 아니다.

## 12개 대조표

공통 HTTP 관측: **12/12 200, self-canonical, index/follow, no X-Robots-Tag, h1 한 개, 운영 sitemap 포함**. 운영 robots.txt의 일반 크롤러 규칙도 이 경로를 막지 않는다. hreflang이 있는 여섯 허브의 대체본 24개는 모두 200·self-canonical·한국어로 돌아오는 hreflang을 확인했다. 내부 링크는 JSON의 links에 남겼다.

| URL | 역할 / 공식 기준 | GSC 저장 검사 | 실시간 검사 | 확인된 결함과 가설 / 이번 조치 |
|---|---|---|---|---|
| `/saju/` | 사주 허브 / G1–4 | 색인됨, 9/10 크롤링, Google canonical=검사 URL | 등록 가능 | 기술 차단 미발견. 광범위 키워드와 순위의 인과는 가설로 유지 |
| `/saju/guide/` | 읽는 순서 / G1–3 | 색인됨 | 미실행 | 전용 한국어 가이드, 사주 허브와 연결됨. 이번 변경 없음 |
| `/manse/` | 입력·명식 기준 / G1–3 | 색인됨 | 미실행 | 사주 허브와 연결됨. 사주와 검색 의도 중첩 가능성은 가설, 통합 안 함 |
| `/sukuyo/` | 본명숙 허브 / G1·G2·A1 | 색인됨 | 미실행 | 무료 범위에 유료 궁합 포함, 역할·관계 설명 잔존 오류. 범위·본문 수정, 불명확한 앵커 수정 |
| `/sukuyo/compatibility/` | 두 사람 관계 안내 / G1·G2·A1 | 색인됨, 8/27 크롤링, Google canonical=검사 URL | 등록 가능 | 무료 궁합 제목과 실제 게이트 불일치, 1인 소개·폼 상속, 방향 설명 오류. 전용 안내·예시·FAQ·공개/유료 범위로 수정 |
| `/ziwei/` | 자미두수 허브 / G1·G2 | 색인됨 | 미실행 | 명반 링크가 ‘관련 운세 서비스’로 출력됨. 목적지 설명으로 수정 |
| `/ziwei/chart/` | 명반·심화 상담 / G3·G5 | 미색인: noindex, **7/26 X-Robots-Tag** 기록 | 등록 가능 | 과거 차단은 확인, 현재 차단은 재현되지 않음. 현재 헤더를 또 바꾸지 않음 |
| `/vedic/` | 베다 허브 / G1·G2·G4 | 색인됨 | 미실행 | 나크샤트라 앵커가 포괄적 문구로 출력됨. 목적지 설명으로 수정 |
| `/vedic/guide/` | 베다 읽는 순서 / G1·G5 | 발견됨·미색인, 크롤링 이력 해당 없음 | 등록 가능 | 현재 허브에 가이드 링크가 존재함. GSC의 ‘참조 페이지 없음’은 현재 링크 부재의 증거가 아님 |
| `/nakshatra/` | 달 구간 비교 / G1·G3 | 색인됨 | 미실행 | 한국어 전용 self-canonical 정상. 두 체계의 대응·역사 표현 추가 검증은 P1 잔여 |
| `/astrology/` | 서양 출생차트 허브 / G1–4 | 색인됨 | 미실행 | 가이드 링크 존재. 단순 태양궁과 출생차트 구분을 유지, 이번 본문 변경 없음 |
| `/astrology/guide/` | 점성술 읽는 순서 / G1·G5 | 발견됨·미색인, 크롤링 이력 해당 없음 | 등록 가능 | 현재 허브에서 연결됨. 원인을 콘텐츠 품질 하나로 단정하거나 noindex 처리하지 않음 |

## 확인한 결함 → 수정 → 회귀 검사

| 우선순위 | 근거와 결함 | 수정 소스 | 검증 |
|---|---|---|---|
| P0 제공 범위 신뢰 | 운영 궁합 title은 ‘무료 본명숙 궁합’. `SY_PAID_FEATURES.compatibility`, `syRequirePaidSukuyoFeature`, `worker/lib/paid-feature-registry.js`의 `compat-sukuyo-compatibility`는 유료 상품. `/sukuyo` 공개 범위에도 두 사람 궁합이 무료로 기재됨 | `app/sukuyo/compatibility/page.js`, `lib/seo-service-scope.js` | 무료 1인 본명숙·공개 설명과 유료 궁합을 구분. 가격 숫자·결제 게이트 변경 없음. scope 회귀 테스트와 SSR 확인 |
| P1 계산 설명 정확성 | 같은 두 숙의 방향을 뒤집으면 관계 유형까지 달라진다고 설명. 코어는 관계 동일·역할 교환 | 위 page + `lib/seo-landing-pages.js` | 1칸/26칸 예시를 실제 relation 코어와 대조. 양쪽 영친, 친/영 교환 확인 |
| P1 검색 의도 | 궁합 페이지가 `...base`에서 ‘먼저 한 사람의 본명숙’ 소개와 1인 폼·결과 목록을 상속 | 전용 intro·steps·resultItems·guide 링크. 기존 도구 CTA는 유지, 해당 페이지의 단일 입력폼만 사용하지 않음 | 로컬 SSR에 2인 안내와 CTA 존재, FAQ 5개와 FAQPage JSON-LD 답변 일치 |
| P1 설명형 앵커 | 운영 숙요·자미두수·베다 허브에서 대상이 다른 링크가 ‘관련 운세 서비스’로 표시 | `app/components/SeoLandingTemplate.jsx` 기존 라벨 사전에 세 목적지 추가 | 기존 a[href]와 URL 유지, 생성 HTML 대조 |
| 관측상 P0 차단 후보 해소 | 자미두수 명반 GSC 과거 noindex와 현재 응답 불일치 | 코드 수정 없음 | GSC 실시간 ‘등록 가능’으로 현재 noindex 재현 안 됨. 저장 색인은 여전히 미색인 |

‘P0’는 이번 작업의 사용자 오인 방지 우선순위이며 Google 심사 등급이 아니다. 순위 하락·AdSense 거절의 단일 원인을 발견했다는 뜻이 아니다.

## 날짜·로케일 표본

- 운영 사이트맵에서 동일 띠의 인접 두 날짜 `/fortune/date/2026-08-23/dog/`, `/fortune/date/2026-08-24/dog/`를 선택했다. 둘 다 200·self-canonical. 일진(己巳/庚午), 지지 관계, 점수와 일부 행동 문장이 다르며 공통 소개·총운 문장이 반복된다. 날짜만 바뀐 완전 동일 본문은 아니다. 차별 가치가 충분한지는 사용자 만족·URL별 성과와 함께 검토할 가설이다.
- `lib/fortune/daily-data.ts`의 `FORTUNE_ARCHIVE_DAYS=30`, 날짜 페이지의 archive 검사·notFound로 최근 30일 생성 정책을 확인했다. 보존 범위 밖 URL의 현재 HTTP 응답은 이번에 검사하지 않았다. 네이버 기존 유입과 개별 URL 대응표 없이 삭제·통합·일괄 noindex하지 않았다.
- 24개 로케일 대체본은 HTTP·언어 태그·상호 hreflang 검사다. 독립 가치 표본으로 ja/en/zh/zh-TW 사주 본문의 현지화된 설명을 확인했다. 각 언어 사용자에게 접근 가능한 안내 가치가 있으나 공통 안전 안내의 반복이 길다는 관찰을 남긴다. 전체 번역의 원어민 품질이나 계산 예시 충분성을 확인한 것은 아니다.
- 운영 날짜 표본의 옛 달 위상 문구는 이전 커밋의 수정·운영 미배포 상태와 별도로 추적한다. 이번에 같은 수정을 반복하지 않는다.

## 검증과 남은 범위

- `node --test __tests__/ui/sukuyo-landing-scope.test.mjs`: 2/2 통과. 결제·네트워크·LLM 없이 합성된 page 데이터와 실제 관계 코어를 대조한다.
- `npm run sitemap:generate`: 1,283 URL 유지, 공유 SEO 소스 변경으로 lastmod 원장 signature 18개 갱신. 날짜나 URL을 임의 증설하지 않았다.
- 로컬 Next SSR: HTTP 200, title·본문·FAQPage 5개 답변의 일치 확인. 외부 요청·API·스크립트를 CSP로 막은 SSR 미리보기에서 360/390/430/1280px 가로 넘침 0, 390px 주 CTA 높이 48px. 외부 로고·폰트와 클라이언트 동작의 검증은 아니다.
- `impeccable detect`를 변경 UI 두 파일에 실행했다. 출력 없음. 기계 검사만으로 디자인·기능의 완전성을 주장하지 않는다.
- `check:fast -- --plan`은 공유 소스를 critical로 자동 승격했다. 실행은 exit 0으로 완료했고 Jest 288 suites / 4,039 tests가 통과했다. 구현 커밋은 `fc3f86a39`, 관측 문서 포함 전달 커밋은 `8fa480791dd1a95aa0c869a889a168f1174d7619`이며 [main CI](https://github.com/rei1237/codedestiny/actions/runs/35589770641)의 `CI required` 포함 전체 필수 잡이 성공했다. 로컬 전체 검사를 별도로 반복하지 않았다.
- 운영 배포·실 LLM·결제·운영 DB 쓰기·광고 활성화·AdSense 재신청은 실행하지 않았다. 기존 `humanReview: unconfirmed`, `adsAllowed: false` 유지.
- 다음 P1은 숙요 연애·결혼 글의 실증 근거 없는 빈도/안정성 표현, 나크샤트라 체계 대응 설명, 가이드의 계산 예시 보강이다. 운영 반영 이후 같은 URL군의 28일 실적을 비교해야 하며, 반영 전 날짜를 성과 비교 시작일로 삼지 않는다.
