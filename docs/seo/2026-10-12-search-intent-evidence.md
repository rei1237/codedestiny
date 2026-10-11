# 꿀꿀 사주 검색 의도 개선 — 2026-10-12 관측

관측: 2026-10-12 01:50~02:10 KST. 공식 도메인은 저장소 `lib/seo/siteSeo.ts`, 공개 canonical, GSC 도메인 속성 `sc-domain:code-destiny.com`, 네이버 등록 사이트 `https://code-destiny.com`을 교차 확인했다. 대표 한국어 URL은 `/ggulggul/`이고 `/`는 그곳으로 301 이동한다. 공개 Pages SHA는 `824b903b8cb74ce0a4ade0451ab89396ecfe807e`, buildTime `2026-10-11T15:35:57.799Z`다. 이번 수정의 운영 반영 증거가 아니며 D0는 아직 없다.

## 원자료와 비교 범위

- Google 로그인 UI의 웹 검색 실적 CSV를 내려받았다. `output/seo-20261012/gsc-90d/`는 UI의 3개월인 2026-07-10~10-09, 실제 92일이다. 정확한 90일로 바꾸어 표기하지 않는다. 마지막 갱신은 46시간 전이었다. 10/10~12는 완료 데이터에서 제외한다.
- `gsc-28d/`는 최근 28일/이전 28일 비교다. 날짜별 CSV 합계와 대조하여 09/12~10/09 대 08/15~09/11임을 확인했다. 두 기간은 같은 요일 구성을 갖는다. 비교 CSV에는 같은 열 이름이 반복되므로 열 위치로 구분해야 한다.
- 네이버는 PC+모바일, 갱신 10/10, 30일 및 90일 화면을 읽었다. 제공된 선택지는 1/7/30/60/90일이며 이번 조회에서 정확한 28일 비교와 일별 원자료를 확보하지 못했다. 화면의 반올림 합계를 정확한 정수로 복원하지 않는다. 네이버의 평균 CTR 설명은 페이지 CTR 평균이므로 총 클릭/총 노출과 혼용하지 않는다.
- Google 검색어·페이지·국가·기기는 각각 독립 집계다. 검색어를 특정 방문 페이지와 임의로 연결하지 않았다. 익명화된 검색어 때문에 검색어 행 합계는 전체 합계와 다를 수 있다. 아래 노출은 해당 사이트에서 관측된 값이며 시장 검색량이나 경쟁도 수치가 아니다.

| Google 웹 검색 | 이전 28일 | 최근 28일 |
|---|---:|---:|
| 노출 | 115 | 214 |
| 클릭 | 8 | 11 |
| CTR | 7.0% | 5.1% |
| 평균 순위 | 27.0 | 13.8 |
| 한국 노출 / 클릭 | 94 / 7 | 101 / 9 |
| 한국 CTR | 7.45% | 8.91% |
| 대만 노출 / 클릭 | 0 / 0 | 56 / 0 |
| 모바일 노출 / 클릭 | 67 / 7 | 115 / 9 |
| 데스크톱 노출 / 클릭 | 47 / 1 | 97 / 2 |

Google 3개월은 486노출·30클릭·CTR6.2%·평균순위20.5. 네이버 최근30일은 약83.0만 노출(+708.7%), 약3.7천 클릭(+238.3%), 평균CTR0.4%. 90일은 약93.3만 노출·4.8천 클릭·평균CTR0.5%. 이 장기 합계만으로 최근 네이버 하락을 배제할 수 없다. 재개 조사에서 최근7일 노출 -16.4%, 최근1일 -12%를 확인했다(아래 추가 관측). 일별 Google 최근 표본은 09/30 29노출,10/01 10,10/02 6,10/03 25,10/04 5,10/05 4,10/06 20,10/07 9,10/08 1,10/09 5로 작다. Google의 마지막 며칠만으로 지속 하락을 확정할 수 없다.

## 원인 판정

| 판정 | 원인/가설 | 근거 | 다음 증거 / 확신도 |
|---|---|---|---|
| 확인 | 전체 CTR에 검색어·지역 구성 변화 영향 | 한국 CTR은 상승했지만 대만 신규56노출은 클릭0; `/zh-tw/sukuyo/` 신규54노출 | 국가·페이지 각각의 비교로 확인. 동일 검색어/국가/기기 조합 효과는 미측정 / 높음 |
| 확인 | 로컬 SEO 검사기 오탐 | sitemapindex를 urlset으로 읽고 `/`를 200 landing으로 기대하여958문제 출력; 수정 후19표본/955URL/0문제 | 수집 장애가 아니라 관측 도구 결함 / 높음 |
| 확인 | `/vedic/` 비교 설명 누락 | JS 객체의 중복 `sections`로 첫 비교 문단이 덮임; 공개 HTML에125도 예시 없음 | 누락 복원 단위검사 통과. 검색 손실 기여량은 알 수 없음 / 높음 |
| 미확인 | 10/10 개명으로 순위·노출 하락 | Google 완료 데이터는10/9까지여서 개명 후 비교 불가 | 개명 후 완료28일과 브랜드 변형 검색어 / 낮음 |
| 유력 | 날짜별 페이지 정리/리디렉션의 장기 구성 영향 | 기존 원장에 정리 정책, GSC 제외 사유에 redirect296·404765·noindex107 | 삭제 목록과 전후 URL 일별 실적, 실제 배포일 결합 필요 / 중간 |
| 미확인 | CDN/WAF 현재 차단 또는 서버 장애 | GSC403 표본의 마지막 수집은6/4; 현재 표본1개는 `/ziwei/`로 이동 후200 | edge 로그·크롤러 IP 검증·시간대별403/429/5xx 필요 / 낮음 |
| 미확인 | 실제 순위 하락·계절성·검색 수요 감소 | 전체 평균순위는 개선, 시장 검색량 미확보 | 동일 query/device/country의 충분한 표본, 수요 외부 자료 / 낮음 |
| 확인 | 보고 지연 | GSC46시간 지연, 색인 보고서10/4, 네이버10/10 갱신 | 각 자료의 종료일을 별도로 유지 / 높음 |

Google 공개 상태 대시보드는 10/4~11 구간 `No incidents`였으나 개별 사이트 장애·알고리즘 영향을 반박하는 자료는 아니다. 과거90일 모든 업데이트와 네이버 공식 장애 이력은 이번 기록에서 완전하게 확보하지 못했다.

## URL별 비교 (Google 웹, 최근28일)

| URL 경로 | 이전→최근 노출 | 이전→최근 클릭 | 최근CTR | 최근순위 | 색인 / 변경 / 가설 |
|---|---:|---:|---:|---:|---|
| `/` | 48→31 | 4→3 | 9.68% | 16.74 | 현재301→`/ggulggul/`; 대표 URL 이동 영향 가능 |
| `/ggulggul/` | 0→7 | 0→2 | 28.57% | 3.14 | Google 색인 확인, canonical 일치; 10/10 개명 |
| `/manse/` | 17→25 | 3→2 | 8.00% | 21.76 | 이번 URL검사 미실행; 제목 변경 없음 |
| `/sukuyo/` | 10→11 | 1→2 | 18.18% | 8.27 | 표본 적음; 기존 문서 유지 |
| `/zh-tw/sukuyo/` | 0→54 | 0→0 | 0% | 6.19 | 신규 해외 노출; 이번 정책 변경 없음 |
| `/en/` | 3→35 | 0→0 | 0% | 6.29 | 해외 노출 증가; 미번역 색인 확대 안 함 |
| `/insights/sukuyo-compatibility-guide/` | 1→8 | 0→0 | 0% | 11.88 | 업태·영친 설명 기존 문서; 새 중복 페이지 불필요 |
| `/insights/vedic-dasha-transit-remedy-practical-guide/` | 1→6 | 0→0 | 0% | 6.67 | 작은 탐색 표본, 성과 판정 유보 |

네이버90일 페이지 집계는 `/vedic/` 3180노출·131클릭·CTR4.1%, `/sukuyo/`2855·84·2.9%, `/kkul-kkul-unse/`206·73·35.4%. 네이버 순위·URL별 이전 동기간 비교·개별 색인 판정은 미제공/미확보이며 Google 숫자와 결합하지 않는다.

## 수요 근거가 있는 검색 의도 지도

경쟁 낮음은 아직 확정하지 않았다. 전문 서비스·해설 사이트가 검색 결과에 존재한다. 대형 일반 키워드보다 질문을 좁혀 기존 문서의 실제 결함을 보완하는 우선순위다. 검색량·KD·예상 유입을 지어내지 않는다.

| 우선순위 / 의도 | 대표 키워드 | 대표 URL | 검색 근거 | 부족점 / 실행 또는 유지 | 관련 링크 |
|---|---|---|---|---|---|
| P1 체계 비교 | 베다 서양, 인도 점성술 별자리 차이 | `/vedic/` | Naver90: 베다 서양111노출20클릭CTR18% | 덮여 사라진 비교·각도 예시·조건 복원; 제목 유지 | `/compare/sukuyo-vs-vedic/`, 나크샤트라 도감 |
| P1 서비스 이해 | 인도 점성술, 베다 점성술 | `/vedic/` | Naver90: 인도 점성술363노출22클릭6.1%; Google 베다 점성술2노출 | 기존 라그나·다샤 안내 유지, 서로 다른 체계 구별 | `/insights/vedic-dasha-transit-remedy-practical-guide/` |
| P2 관계 의미 | 숙요점 업태 | `/insights/sukuyo-antai/` | Google3개월3노출0클릭순위8 | 기존 충분한 해설 유지, 표본 늘어난 뒤 CTR 평가 | 숙요 궁합 가이드, `/sukuyo/` |
| P2 관계 의미 | 숙요점 영친 | `/insights/sukuyo-compatibility-guide/` | Google3개월3노출0클릭순위8.7 | 기존 영친 표·사례 활용, 얇은 신규문서 만들지 않음 | 업태·안괴 해설 |
| P2 체계 비교 | 숙요 나크샤트라 차이 | `/compare/sukuyo-vs-vedic/` | Google3개월1노출0클릭순위8 | 출생시간 미상과 계산법 차이에 관한 오해를 수정 | `/vedic/`, `/sukuyo/` |
| P2 도구 탐색 | 숙요점 사이트 | `/sukuyo/` | Naver90:1035노출35클릭3.4% | 본명숙 기본 안내와 별도 유료 궁합 경계 유지 | 기존 본명숙 찾기·27숙 안내 |
| P3 일반/날짜 | 사주 풀이, 오늘/내일 운세 | `/manse/`, `/fortune/today/`, `/fortune/tomorrow/` 각각 의도별 유지 | Naver 내일 운세17261노출27클릭, 내일의 운세16995·22 | 기존10/3·10/8 제목 실험 유지. 전체CTR만 보고 동시 수정 안 함 | 일간/주간 안내 |
| P3 신년·학업·연애·재물 | 신년운세, 시험운, 재회, 재물운 | 기존 서비스별 URL 재점검 대기 | 이번 추출에서 충분한 수요 행 미확보 | 숫자/수요 주장 없이 유지; 추가 데이터 전 신규페이지 보류 | 기존 서비스 안내 |
| P5 오행·요리·천연석 | 오행 맛, 오행 요리, 천연석 관리 | 별도 미통합 `/recipes/`, `/crystals/` | 이번 검색 실적에서 수요 증거 미확보 | 별도 세션10레시피·2D WebP 작업을 중복하지 않음 | 해당 세션 인수인계 참조 |

검색 결과 관찰은 web 도구, 10/12 KST, 한국어 질의이며 엔진/개인화/지역을 한국 Google 또는 Naver로 고정한 SERP가 아니다. 브랜드 5변형과 위 비교 질의를 관찰했고 오래된 브랜드·파라미터 URL 및 관련 전문 서비스가 나타났다. 한 번의 결과로 전체 색인 또는 경쟁점수를 추정하지 않았다.

## 제목 후보와 변수 통제

`/vedic/` 현재 title: **베다점 | 인도 점성술로 읽는 기질과 시기 | 꿀꿀 사주**. 후보1 현재 유지, 후보2 `베다 점성술 | 서양 별자리와 다른 이유 - 꿀꿀 사주`, 후보3 `인도 점성술 베다점 | 라그나·다샤 이해하기 - 꿀꿀 사주`. 최종은 현재 유지다. 10/10 브랜드 제목 배포와 기존 실험의 효과를 분리하고 이번에는 누락 본문만 고친다. 후보2는 비교 의도를 강조하지만 전체 서비스 의도를 좁히므로 추후 충분한 데이터에서만 검토한다. description·H1·첫 문단은 기존 검증된 서비스 설명을 유지한다. 변경 전은 비교 section이 런타임에서 사라졌고, 후는 질문→직접 답변→125도/24도 가상 계산 예시→출생정보·아야남샤 조건→해석 한계로 읽힌다. 가상24도는 모든 날짜의 고정 보정값이 아니다.

측정은 `/vedic/` 및 비교 URL 각각을 독립 관측하고 query 표도 독립 유지한다. 운영 확인 D0 뒤 D+14는 탐색, D+28은 완료된28일 비교. 클릭 표본 부족이면 개선 결론을 내리지 않는다. 순위·국가·기기·다른 배포와 계절성을 같이 기록한다. 기존 CTR/SEO 자동 작업을 재사용하며 새 예약은 만들지 않았다.

## 제출·색인 증거

| 엔진 / 속성 | 파일 / 동작 / 시각(KST) | 접수 | 처리 | 색인 증거 |
|---|---|---|---|---|
| Google / sc-domain:code-destiny.com | sitemap-index.xml 기존 등록 유지(제출10/7, 읽음10/9) | 기존 등록 확인 | 성공,955페이지,동영상0 | 파일 성공과 URL색인 별개 |
| Naver / https://code-destiny.com | sitemap-index.xml 신규 제출10/12 01:59:45 | 등록 목록에서 확인 | 화면 미제공; 대기/미확인 | 별도 색인 증거 없음 |
| Naver 동일 속성 | `/ggulggul/` 수집 요청02:03:06, `/kkul-kkul-unse/`02:04:01 | 수집 요청 표에서 확인 | 미확인 | 미확인 |
| Google 동일 속성 | `/ggulggul/`, `/kkul-kkul-unse/` 색인 생성 요청10/12 | 각각 ‘색인 생성 요청됨’ 모달 | 크롤링 대기열 | 요청 전 두 URL 모두 색인됨. 새로운 브랜드 문구 수집 완료는 아님 |
| Bing / https://code-destiny.com/ | sitemap.xml 기존 등록 유지(제출8/13, 수집10/9) | 기존 등록 확인 | Success,955 URL,오류0·경고0 | 개별 URL색인과 별개 |

Google `/ggulggul/` 최근수집10/9 05:29:49, 이전브랜드 안내10/9 19:33:27. 모두 Googlebot 스마트폰·가져오기 성공·색인 허용·선택 canonical 자기 자신. 개명 공개보다 이전 수집이어서 두 URL만 정상 갱신 요청했다. API 조회를 색인 요청으로 대체하지 않았다. Google 정상 파일 삭제/재등록, 폐기된 ping, 일반페이지용 Indexing API, 유료 호출은 안 했다. 신규 로컬 수정은 아직 운영에 없으므로 제출했다고 보고하지 않는다.

Google 색인 집계는10/4기준370색인·2402미색인이다. 리디렉션296,404765,noindex107,대체canonical19,robots18,4035,canonical미지정중복4,기타4xx2,5xx2,4011 등. 전체 제외를 오류로 취급하거나 noindex를 일괄 풀지 않았다. 필드 CWV는 모바일/데스크톱 데이터 없음. 실험실 성능은 별도 미측정이다.

## 사이트맵·브랜드·구조화 데이터 정책

운영 index5파일은 ko454/ja128/en127/zh127/zh-tw119, 총955 URL. flat sitemap.xml도955. 각 파일 XML 파싱 성공, 중복·타도메인0. largest flat639844bytes. 이번 생성의 URL추가0/제거0이며 원본 generator를 실행했다. 실제 generator 기준17공유경로 signature만 갱신했고 lastmod 날짜를 일괄 오늘로 바꾸지 않았다. robots의 선언은 sitemap-index.xml, 비공개/개인화 차단과 기존 다국어 색인 정책을 유지했다.

대표 이름·Organization·WebSite·sameAs는 기존 `siteSeo.ts` 및 개명 구현을 재사용한다. 이전브랜드 설명은 `/kkul-kkul-unse/`에 유지하며 모든 페이지에 반복하지 않는다. 기존 Naver blog 계정명 neosaju를 새 계정으로 꾸미지 않는다. 캐릭터를 실제 전문가로 만들지 않는다.

이번 수정은 새로운 schema 유형을 추가하지 않는다. HTML과 JSON-LD 공통 콘텐츠 객체를 유지하고 문법 검증과 Rich Results 적격성을 분리한다. Google Rich Results Test와 Naver 확장노출 적격성은 이번에 검증하지 않았다. FAQ 마크업만으로 확장노출을 보장하지 않는다. Naver 화면에서 FAQ 구조화결과 종료 공지(2026-07-08)를 관찰했다.

GEO는 읽을 수 있는 비교 설명·조건·일관된 명칭을 보완한 것이다. [Google AI features](https://developers.google.com/search/docs/appearance/ai-features)는 별도의 AI 전용 파일/특수 schema를 요구하지 않는다. [OpenAI bots](https://developers.openai.com/api/docs/bots)는 검색용 OAI-SearchBot, 학습용 GPTBot, 사용자 요청용 ChatGPT-User를 구분한다. [Bing 지침](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a)도 발견·수집·색인 가능한 콘텐츠를 기본으로 한다. 학습 접근정책이나 WAF를 변경하지 않았고 llms.txt를 순위수단으로 추가하지 않았다. AI 서비스 고정질의·인용 측정은 실행하지 못했으며 점유율 주장은 없다.

사이트맵 제한은 [Google 공식 문서](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)의 파일당50000URL/압축전50MB와 대조했다. 네이버 실제 접수는 확인했으나 엔진별 한계의 완전한 별도 대조는 남았다. [Google Search Status](https://status.search.google.com/) 확인은 사이트 개별 서버 로그를 대체하지 않는다.

## 전달과 남은 경계

초기 main `96c567e524b071a3cfab5ec25c5526b6786a06a2`의 [기존 CI](https://github.com/rei1237/codedestiny/actions/runs/38156148707)는 `verify:ziwei-chart-detail-view`의 `panel.before is not a function`으로 실패했다. 이번 파일과 무관하며 실패 main 위 push 금지 규칙을 따른다. main 통합/CI/운영 승격은 별도 증거가 필요하다. 결제·이용권·월정석·단건결제·가격·인증·사주 계산·API·DB·개인정보 정책은 수정하지 않았다.

오행 콘텐츠 기존 인수인계: `D:/Development/codedestiny-worktrees/seo-five-elements-20261011-20261011-235701/docs/handoff/seo-five-elements-20261012.md`. 10개 레시피·43단계 안내·2D14이미지, 자체 검증 기록과 미통합 상태를 확인했다. 그 파일/코드/예약은 변경하지 않았다. 월요일9시 기존 예약 `연이의 주간 오행 요리 레시피`가 있어 새 예약을 만들지 않았다.

## 02:20 이후 추가 확보한 Bing·검증 근거

Bing도 사용자의 기존 로그인으로 정확한 속성에 접근됐다. 홈 그래프의 3개월 표시 범위는7/11~10/10이고 실제 일별 접근성 표의 마지막 행은10/9이다. 일별 표를 `evidence/2026-10-12/bing-home-daily.json`에 보존했다. 동일한 완료28일(8/15~9/11 대9/12~10/9)의 합계는 **467→555노출,19→13클릭**, 계산CTR4.07→2.34%다. Bing에서도 전체 노출 급감은 확인되지 않지만 클릭은 감소했다. 그 원인을 키워드별 순위로 분해한 데이터는 아직 없으므로 Google의 구성 효과를 Bing 원인으로 대입하지 않는다.

Bing AI Performance(출처 Microsoft Copilots and Partners,3개월)는 **203인용,평균 인용페이지1**을 표시했다. 일별 표의 같은28일 합계는74→78인용. `Avg. Cited Pages`는 평균 지표이므로 일별 합을 고유 페이지 수로 계산하지 않았다. Pages29개 중 화면 첫25행을 보존했다. 주요 인용URL은 `/insights/cheongan-jiji-complete-explanation/`126, 궁합 기본안내18, 오행 가이드7이다. Grounding Queries는 No data available로 질의·의도·Citation Share가 미제공이다. 표본 집계이며 특정 답변의 브랜드 언급·사실 오류·사용자 원문 질문은 확인할 수 없다. 앞 절의 미측정은 **직접 고정질의를 실행하는 AI 응답 감사**를 뜻하며, Bing의 이 집계 조회와 구분한다. 이번 개선 전의 기준선이고 개선 성과가 아니다.

Bing Keyword Research에서 한국어 `베다 점성술`,3개월,국가·언어·기기 All을 조회했다. `Bing doesn’t have enough data to show trend here` 및 연관키워드0행. 시장 검색량0이라는 뜻이 아니다. Top10에는 Anahana·마이팜리프·나미찌·ZodiAtlas·Mysticos·위키백과·iWeaver·네이버 블로그·soultest와 본 사이트 `/vedic/guide/`가 표시됐다. 따라서 경쟁 낮음을 확정하지 않고, 이미 클릭이 발생하는 네이버 비교 의도를 우선한다. 원문은 `bing-keyword-research.txt`다.

과거403 URL5개를 모두 제한적으로 재조회했고 `/ziwei/` 또는 `/sukuyo/`로301 후200을 확인했다(`historic-403-probe.json`). 일반 HTTP에서 현재403은 재현되지 않았으나 크롤러별 edge 로그는 없으므로 WAF 차단 부재를 확정하지 않는다. 기존 IndexNow 구현과 package script 존재를 확인했지만 로컬 수정이 운영에 없으므로 델타 제출은 실행하지 않았다.

로컬 mock 개발 서버에서 `/vedic/`, 비교 페이지, `/ggulggul/`, `/sukuyo/`가 모두200·H1 1개·자기 canonical·noindex 없음·JSON-LD 파싱 성공이다. 본문 예시가 클릭 전 서버 응답에 포함되고, 비교 FAQ는 HTML/JSON-LD 공통 원천에서 동일 답변을 생성한다. 개발 서버의 streaming metadata 때문에 head만 검사한 초회 보조검사는 실패했고, 전체 서버 응답과 실제 DOM을 확인해 통과했다. 운영19표본의 head 검사는 별도로 통과했다. Vedic 안내는 기존 details를 펼쳐 읽는 구조를 유지했다.

390px/1280px에서 두 수정페이지를 실제로 열어 확인했다. 문단·제목을 읽을 수 있고 페이지 가로 넘침은 없다(390/375,1280/1265 viewport/scrollWidth). 비교표는 기존 내부 가로 스크롤 구조다. 중간 캡처 지연은 새 탭에서 회복했으며 요청 접수와 모바일 화면을 PNG로 보존했다. 이것은 실험실 성능 점수 측정이 아니다.

Vedic의 실제 수정일이 공통 intro의 오래된 날짜로 덮이는 문제도 발견했다. 최종 콘텐츠의 입력·intent·hook 수정일 중 가장 최근 날짜를 선택하도록 고쳐 화면10/12를 확인했다. 제목은 그대로다. 관련9개 테스트 통과, `impeccable detect` 대상2파일 종료0(출력 없음), sitemap 재생성/정합성955URL 통과. 원본 GSC CSV는 임시 output뿐 아니라 `docs/seo/evidence/2026-10-12/`에 보존한다.

## 네이버 상세 진단에서 발견한 실제 이미지 오류

10/10 갱신 진단은 색인 약8.3백, 수집제한43(리디렉션29·접근불가14), meta robots 제외945, description 누락6, title 복수1, 동일title351, 동일description353, H1복수4, alt누락32를 보여 줬다. 최근90일 누적 분류이며 현재 공개 상태와 재대조해야 한다. 원문표를 보존했다. 동일제목·설명·alt 전체 목록의 재검증은 남았으며 모두 이번 결함이라고 단정하지 않는다.

접근불가 표본에 `/og/presidential-public-records.png/`가 있었다. 현재 공개 기사에서 **HTML img·OG는 슬래시 없는 정상주소(200, image/png)**였으나 **Article JSON-LD만 슬래시 있는 주소(404)**였다. `buildArticleJsonLd`가 이미지에도 페이지용 `toAbsoluteUrl`을 적용해 끝에 `/`를 붙이는 것이 확인된 원인이다. `new URL(image, siteSeo.siteUrl)`로 자산 주소를 해석해 파일명·외부 호스트·쿼리를 보존했다. 페이지 canonical의 기존 슬래시는 유지한다. 공통 생성기를 사용하는 Article에 적용되며 새 페이지나 허위 정보는 추가하지 않는다. 로컬 기사 응답의 정상 image URL과 관련2개 테스트를 확인했고 전체 targeted11개가 통과했다. 아직 운영 JSON-LD는 수정 전이다.

이 공통 원천 변경 뒤 생성기의218경로 signature가 추가로 바뀌었다. 전체955 URL의 추가0·제거0와 기존 lastmod 날짜는 유지된다. 앞 절의17경로는 첫 본문 수정 단계의 기록이다. 수동으로 생성물을 고치지 않았다.

접근불가 표본의 과거 날짜 URL `/fortune/date/2026-08-26/dog/`는 현재301→`/fortune/today/dog/`다. 복수title1건은 `/nakshatra/?v=517c0c34e411`의7/20관측이었고 현재200·title1개·query없는 canonical을 확인했다. 오래된 진단 때문에 정상 정책을 되돌리지 않았다.

GSC `/vedic/`도 색인됨, 최근수집10/5 23:20:36·스마트폰·가져오기 성공·색인허용, Breadcrumb 유효항목1개를 확인했다. 로컬의 새 설명은 아직 공개되지 않아 이 URL에 대한 갱신 요청은 운영 확인 뒤로 남겼다. 기존 브랜드 두 URL의 요청 접수와 구분한다.

접수 화면과 시각 검증 캡처는 `evidence/2026-10-12/*.jpg`다. 도구가 반환한 JPEG 바이트의 실제 형식을 확인해 확장자를 맞췄다. 원자료 CSV/DOM표에는 로그인 비밀번호·쿠키·토큰을 저장하지 않았다.

최종 원장 diff는 공통 구조화 데이터 의존성까지 반영한720개 signature 변경이다. lastmod 값 변경0, URL추가0·제거0이며 최종 `verify:sitemap-drift`도955개 일치로 통과했다. 위17/218은 중간 생성 시점의 증분 기록이다.

## 로컬 검증 최종 결과

- `npm run check:fast -- --plan`: critical 자동 승격 계획 확인. 전체 빌드는 공식CI로 이관.
- `npm run check:fast`: 종료0. paid mock88/88, lint, typecheck, Node3172/3172, Jest385 suites·5898/5898, Worker dry-run 및 나머지 계획 검사 통과.
- 이후 발견한 공통 Article 이미지 수정: `node --test __tests__/ui/article-image-url.test.mjs __tests__/ui/sukuyo-landing-scope.test.mjs scripts/seo/health-policy.test.mjs` 11/11, `npm run typecheck` 종료0. 새 범위로 계획을 다시 확인했다. 이미 통과한 무관한 결제 회귀 전체를 반복하지 않았다.
- `npm run sitemap:generate`, `npm run sync:public`, `npm run verify:sitemap-drift`: 성공,955 URL. 생성 원장은 원본과 일치.
- `npm run seo:check`: 운영19표본·955사이트맵URL·0문제. 이는 모든 URL의 HTTP 전수검사가 아니다.
- mock dev HTML 검증4경로, Article 이미지 응답 추가 확인, 모바일390/데스크톱1280 실제 렌더링 확인. JSON-LD 문법과 가시 FAQ 일치 확인. Rich Results Test·현장성능·신규 운영 HTML은 미검증.
- `impeccable detect app/compare/sukuyo-vs-vedic/page.tsx lib/seo-landing-pages.js`: 종료0,출력 없음.
- 경고: env-parity8경고, Browserslist 데이터7개월 경과, Node VM Modules experimental. 이번 수정 원인인 오류는 없었으며 환경값이나 결제 설정은 변경하지 않았다.

## 최종 전달 단계 구분

구현 커밋 `1b71a426d3844888239e4e4131b969b1815dea1c`에서 `check:pre-push`가 통과했다. 마지막에 확인한 최신 main CI는 `7768578e9456f1ce0fe61f86215e97873e72f22f`의 [38159011395](https://github.com/rei1237/codedestiny/actions/runs/38159011395)이며 실패다. 원인은 다른 작업의 `docs/handoff/premium-repricing-20261011.md`에 허용되지 않은 `status: in_progress`가 있는 것이다. 초기 자미두수 실패와 구분한다. 기존 실패 위 push 금지 규칙으로 main 통합/push를 보류하고 검증된 worktree를 보존한다.

| 단계 | 결과 |
|---|---|
| 조사 | 로그인3엔진·주요기술·검색의도 조사 완료; 전체 시장수요·경쟁도·모든진단URL·CDN로그는 미확보 |
| 코드 수정 | 완료, 위 구현 커밋 |
| 로컬 검증 | 완료, 상세 명령/한계는 위 기록 |
| 저장소 전달 | 로컬 커밋·pre-push 완료, main 통합/push는 타작업 CI 실패로 차단 |
| 운영 반영 확인 | 이번 수정 미반영, 기존 공개본만 확인; D0없음 |
| 사이트맵 접수 | Naver 신규접수 확인, Google/Bing 정상기존등록 확인 |
| 사이트맵 처리 | Google/Bing 기존파일 성공; Naver 신규파일 처리 미확인 |
| 실제 색인 | Google3개 기존URL 확인; 새본문/이미지 수정의 재수집은 미확인 |
| 성과 변화 | 수정 전 기준선만 확보; 개선 판정 불가 |

로그인 권한으로 막힌 작업은 없다. 남은 전달 차단은 CI와 운영 승격 경계이며, 시장검색량·CDN로그·현장성능 등 미확보 자료는 제출 접수와 구분한다. 재개 절차는 `docs/handoff/seo-search-intent-20261012.md`에 기록했다.

## 재개 조사: 네이버 단기 하락과 기술 점검 (10/12 02:51 KST)

사용자의 네이버 노출 급감 지적에 따라 기존 로그인 UI에서 PC+Mobile의 최근7일·최근1일을 추가로 읽었다. 갱신 표시는10/10이며 정확한 기간 시작·종료일이나 일별 CSV는 확보하지 못했다. 반올림 합계를 역산해 정수 원자료로 쓰지 않는다.

| 네이버 표시 기간 | 노출 | 직전 기간 대비 | 클릭 | 직전 기간 대비 | 평균 페이지 CTR |
|---|---:|---:|---:|---:|---:|
| 최근7일 | 25.2만 | -16.4% | 1.2천 | +13.8% | 0.5% |
| 최근1일 | 1.9만 | -12% | 1.3백 | -20.4% | 0.6% |

**단기 노출 하락은 확인됐다.** 30일 합계 증가는 이를 반박하지 않는다. 기존 보고의 장기 합계 중심 판정을 위에서 보완했다. 다만 원인별 기여율과 순위·수요 하락은 미확정이다. 최근7일 클릭 상위10개 중9개는 `/fortune/tomorrow/{sign}/`이고 나머지는 `/fortune/today/`였다. 베다 비교 개선과 별도로 이 유입군을 우선 기술 검증 대상으로 삼았다. 원자료 전사는 `evidence/2026-10-12/naver-short-window-observations.json`이다.

- 중복제목351건 중 인사이트 허브20주소 그룹은 `?v=<build>` 또는 `?topic=tarot&v=<build>` 변형이다. 현재 표본은200·`/insights/` canonical·버전쿼리 내부링크0개다. 기존 React/정적셸 버전 갱신 뒤 URL 정리 코드가 이미 있다. 오래된 진단을 없애려 불필요한 제목 변경이나 전체 쿼리 삭제·리디렉션을 추가하지 않는다. 전체351주소 재검증은 아니다.
- 설명누락6건 중 공개 도구5개는 현재200이며 meta와 HTTP 헤더 모두noindex다. 검색용 랜딩이 아닌 의도적 제외 대상이므로 색인을 확대하지 않았다. 나머지1건에는 출생·위치 입력쿼리가 있어 원문 저장·재요청하지 않았다.
- 쥐띠·범띠 내일운세와 오늘 허브는200·H1하나·자기canonical·index follow였다. 현재KST10/12에 오늘10/12·내일10/13 제목/설명이 맞는다. 기존 제목 실험의변수는 바꾸지 않았다.
- 네이버 자체 실시간 URL 검사에서도 쥐띠 내일운세의 200 응답·robots 허용·정상 메타·10/13 제목을 확인했다. 별도 색인 상태는 **색인 성공**이며 저장된 Meta의 날짜는 10/12다. 운영 원본과 색인 스냅샷이 하루분 다르다. 새벽 일간 갱신 직후의 한 표본이므로 장기 수집 실패나 노출 감소 원인으로 단정하지 않았으며, 재제출하지 않았다.
- `seo:check`가 유입 핵심인`/fortune/`를 전혀 검사하지 않고 robots는Googlebot만 판정하던 누락을 보완했다. 기간허브4개와 내일상세4개를 추가하고 Googlebot/Yeti 각각 사이트맵 전체 규칙을 검사한다. 요청은 공식Yeti User-Agent 형태를 사용하며 결과에 실제 크롤러IP·색인을 증명하지 못한다는 한계를 저장한다. 중복title/description도 실패로 검출한다.
- 대상회귀13/13, 공개`seo:check`27페이지·955사이트맵URL·문제0. 결과는`naver-health.json`.955개HTTP전수검사가 아니다.
- 사이트맵제출 화면은 기존2개 등록을, 수집요청 화면은 기존브랜드2개 접수를 유지한다. 처리성공/색인완료 열은 없어 여전히 미확인. 재제출0회.
- 최신확인main은`e419b55bdec7b0aa667b0373323cbd4ee5fbabed`, [CI38159918088](https://github.com/rei1237/codedestiny/actions/runs/38159918088) 실패. Static guards의 꽃무료소개·nakshatra샘플·psychotest이미지·무료추천표식·영냥이타로로컬전용 검사5건이다. 과거의handoff상태오류와 구분한다. 다른세션의결제/UI변경을 이SEO커밋에 섞지 않는다.

네이버 공식 기준: [노출·클릭 제공 범위](https://searchadvisor.naver.com/guide/report-expose-ctr), [중복 URL 정리](https://searchadvisor.naver.com/guide/seo-basic-create), [Yeti 접근과 콘텐츠 원칙](https://searchadvisor.naver.com/guide/seo-basic-intro). 계정UI의 관측일을 보존하며 가이드의 일반지연 안내만으로 실제 날짜를 임의 지정하지 않는다.

### 사이트맵을 직접 확인하거나 제출하려면

사용자의 추가 요청에 따라 기존 Chrome의 [사이트맵 제출 화면](https://searchadvisor.naver.com/console/site/request/sitemap?site=https%3A%2F%2Fcode-destiny.com)을 열어 두었다. `sitemap-index.xml`은 10/12 01:59:45, 기존 `sitemap.xml`은 8/14 06:18:13 등록으로 확인된다. 재등록은 하지 않았다.

1. 위 화면에서 사이트가 `https://code-destiny.com`인지 확인한다.
2. 제출할 주소는 `https://code-destiny.com/sitemap-index.xml`이다. 사이트 주소가 입력란 앞에 고정 표시되는 UI라면 `sitemap-index.xml` 부분만 넣는다.
3. 현재는 이미 목록에 있으므로 그대로 유지한다. 향후 새 사이트 속성에 등록할 때만 URL을 입력하고 확인한다. 파일 첨부 방식이 아니다.

[네이버 공식 안내](https://searchadvisor.naver.com/guide/request-feed)에 따르면 제출된 사이트맵은 주기적으로 다시 방문한다. 소스 변경으로 생성된 최신 XML을 승인된 배포로 같은 공개 주소에 제공하는 것이 갱신 절차다. 같은 URL을 삭제·재등록하는 것과 공개 파일 갱신을 구분한다. 이번 보완은 URL 추가·제거가 없고 공개955개 URL의 선언된 사이트맵 포함 여부가 정상이다. 등록 확인은 처리·색인 완료 증거가 아니다.

운영에 아직 없는 베다 본문·Article 이미지 수정이 우선 전달 대상이다. 확인된 오류를 고치는 것과 노출 회복 성과는 별개다. CI 복구 후 통합·push, 별도 운영 승격 승인 및 공개 HTML/SHA 확인 뒤에만 D0를 기록한다. 네이버 검사 보완 코드는 `ebf75bb31cf6ef05b0623887d31f0670444da2d4`에 따로 커밋했다.

전달 직전 한 번 확인한 최신 main은 `d733a80a818235c479524433d1dc9f3560346c8a`, [CI 38162141155](https://github.com/rei1237/codedestiny/actions/runs/38162141155) **진행 중**이다. 위 e419b55의 실패는 직전 실패 기록으로 보존한다. 복구 성공으로 간주하지 않고 통합·push를 보류하며, CI 완료 대기·반복 폴링은 하지 않는다.

별도 실행한 로컬 `verify:handoff-contract`도 같은 기존 가격작업 문서의 `status: in_progress` 때문에 종료1이었다. 위 `check:fast`와 `check:pre-push`의 성공을 이 문서 게이트 성공으로 확대하지 않는다. 새 SEO 문서는 허용된 `blocked` 상태다.

이번 네이버 검사 보완 후 `npm run check:fast -- --plan`은 critical 분류였다. `npm run check:fast` 종료0으로 paid mock88/88, Node3174/3174, Jest385 suites·5898/5898, lint/typecheck/Worker dry-run 등 통과했다. 별도 대상 회귀13/13 및 공개 `seo:check`27페이지·955URL·문제0과 함께 검증했다. 이는 현재 worktree 기준이며 최신 main 통합 후 검사는 별도로 필요하다.
