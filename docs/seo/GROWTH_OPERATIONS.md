# SEO Growth 운영 기록

관측일: 2026-09-08 KST. 운영 공개 SHA `06b0ad911b575abad74e049e4fdef36041fb376b`와 로그인된 GSC·Naver·AdSense 화면을 확인했다. 이 문서의 수정 사항은 별도 PR이며 배포 결과와 구분한다.

## 핵심 판단

AdSense 계정의 실제 거절 사유는 **가치가 별로 없는 콘텐츠**(계정 상태 2026-08-29)다. Google은 특정 거절 URL을 제시하지 않았다. 메타데이터 통과나 글자 수 증가만으로 해결됐다고 판단하지 않는다. 우선순위는 언어별 독립 가치, 체계별 계산 근거, 신뢰 정보, 안전한 광고 화면이다.

| 우선순위 | 근거 | 이번 조치 / 남은 일 |
| --- | --- | --- |
| P0 | 정적 정책 출력에서 한국어 반환 hreflang 누락, 해외 정책 22건 오류 | `/terms`, `/privacy`, `/contact` 정본 모듈을 정적 생성기에 연결. 같은 법률 본문 유지. 로컬 전수 검사 0건, 운영 배포 후 재확인 필요 |
| P0 | 일본어 홈의 신규 버튼·정원·신뢰·탐색 문구가 한국어; 긴 일본어 제목 잘림 | 홈 템플릿을 기존 5개 사전에 연결. 일본어·중국어 줄바꿈 보정. 초대 보상 안내·동적 프로필·모달 전체는 미완료 |
| P0 | AdSense low value; GSC 382개 crawled / 229개 discovered not indexed | 콘텐츠별 독립 가치 검수 유지. 611개를 일괄 noindex하거나 색인 요청하지 않음. 과거 URL과 현재 정본을 분리 |
| P0 | CMP 게시와 실제 지역별 동의 흐름 확인 안 됨 | 광고 활성화·재신청 전 확인. Consent Mode만으로 CMP가 마련됐다고 판단하지 않음 |
| P1 | 숙요·만세력의 4–20위 작은 표본, 네이버 `/vedic/` 61클릭 | 기존 베다 FAQ와 일본어 소개 개선. 숙요/베다 비교 글에 계산 기준과 대조 절차·내부 링크 추가 |
| P1 | Naver title 중복 1,748 / description 중복 1,734 | `/about/?v=…` 과거 버전 쿼리 표본 확인. 현행 canonical·기존 버전 제거 코드 유지. 실제 노출 URL 감소 추적 |
| P2 | GSC 외부 링크 2개, 전문 분야 인용 기반 약함 | 후보 5개 기록(4개 보류, 1개 제외), 맞춤 초안. 검수·발송 없이 후보를 획득 링크로 세지 않음 |
| P3 | 이미 많은 콘텐츠와 계산 도구 존재 | 신규 대량 글 대신 기존 비교 자료·용어·계산 기준 강화. 원자료 없는 운세 통계나 창작 연구 결과 금지 |

## 계정 실측

GSC 웹 검색, 전체 국가·기기, **2026-06-07–2026-09-06**: 클릭 **31**, 노출 **391**, CTR **7.9%**, 평균 순위 **24.5**. 이는 주간 수치가 아니다. 색인 보고서(9/4)는 색인 **276**, 제외 **1,822**. 제외에는 404 765, 리디렉션 280, noindex 105, 대체 canonical 24, robots 18, 403 5, canonical 미선택 중복 5, 기타4xx 2, 5xx 2, 401 1, 크롤링 후 미색인 382, 발견 후 미색인 229, Google 다른 canonical 4가 있다. 의도된 제외도 포함한다.

- Query: 만세력 5노출/19.6위, 숙요점 업태 3/8.0, 숙요점 영친 3/8.7. 모두 낮은 표본으로 우선 조사 후보다.
- Page: `/insights/astrology-synastry-compatibility-fun-guide/` 13노출/14위, `/insights/sukuyo/` 11/14.9, `/sukuyo/` 8/9.4. Query와 Page를 임의로 조인하지 않는다.
- 국가 표본: 한국 30클릭/306노출, 일본 0/15, 미국 0/38. 기기: 모바일 22/199, 데스크톱 9/191, 태블릿 0/1.
- GSC 링크: `x.com`, `xploredomains.com` 각 1개, 홈 대상. 전체 인터넷 링크나 이번 주 신규 링크 수가 아니다. 관련 referring domains 증가 미확인.
- GSC CWV: 모바일·데스크톱 모두 데이터 부족. INP/LCP의 실제 사용자 기준 판정 불가.
- Naver 최근 30일(9/7 갱신): UI 반올림 표시 클릭 **7.3백**, 노출 **5.2만**, CTR **1.4%**, 색인 **4.3백**. 정확한 정수로 변환해 비교하지 않는다. 인증/HTTPS/사이트맵 정상. 상위 페이지 `/vedic/` 61/1,428, `/sukuyo/` 36/1,274, `/astrology/` 25/1,518.
- Naver 추가 진단: 색인 제한 57(redirect 48, 접근 불가 9), meta noindex 879, description 누락 11, title 복수 1, H1 복수 41, alt 누락 14. 현재 canonical URL 크롤링과 같은 시점·모집단이 아니다.
- AdSense ads.txt 화면은 ‘찾을 수 없음’이지만 공개 `/ads.txt`는 HTTP 200이며 계정 게시자 레코드와 일치한다. 과거 계정 상태를 현재 파일 부재로 단정하지 않는다. 재검토 요청은 실행하지 않았다.

원시 UI 표본과 기간은 [SEO_STATE.json](SEO_STATE.json)에 저장한다. 전체 Query 68행·국가 22행을 모두 내보낸 것은 아니다. 다음 주에는 최근 28일과 이전 28일을 같은 필터로 비교하고 Query–Page 교차표를 추가한다.

## 사이트·콘텐츠·기술 범위

기존 [서비스 목록](SERVICE_INVENTORY.md), [인사이트 목록](INSIGHT_INVENTORY.md), [유명인 검토](CELEBRITY_CONTENT_AUDIT.md), [검색 의도](SEARCH_INTENT_MAP.md)를 재사용한다. 기존 목록은 홈 서비스 57, 랜딩 19, 인사이트 113, 공개 유명인 156을 포함한다. 이는 수동으로 모든 문장의 정확성을 승인한 수가 아니다. 이번 빌드에는 페이지 템플릿 242, HTML 805, 사이트맵 URL 488이 있다. 정적 셸·정책 별칭·오류·비공개 출력은 HTML 수에 포함되며 모두 색인 대상이 아니다.

공개 HTTP 감사는 498개 경로, 현재 사이트맵 488개, 메타/HTTP 이슈 0건이었다. HTTP→HTTPS, www→non-www는 301, `/saju`→`/saju/`는 308, 임의 없는 경로는 404, 추적 파라미터는 clean canonical이었다. GSC의 과거 765개 404를 현재 사이트맵의 404 765개로 표현하지 않는다. 복수 변형을 조합한 모든 redirect chain은 미검증이다.

초기 HTML 정적 전수표는 [SEO_ADSENSE_AUDIT.md](../../SEO_ADSENSE_AUDIT.md), 언어별 표는 [I18N_TRANSLATION_MATRIX.md](../../I18N_TRANSLATION_MATRIX.md)에 생성한다. 빌드 산출물과 실제 HTTP 검사는 별도다. 구조화 데이터 JSON/타입/빵부스러기 목적지와 내부 인바운드 그래프를 기존 `seo-audit --source=out`으로 검사한다. 새 Person 경력이나 FAQ 리치결과 보장을 추가하지 않았다.

모바일 표본: 12개 경로 × 360/390/430/1280px = 48. 외부·API 요청을 모두 503 mock 처리해 확인했다. 가로 넘침·JS 오류 0, H1 각 1, 사이트맵 경로 488개 200, 없는 URL 404. 화면 이미지도 확인했다. 홈 한국어 잔여에는 브랜드와 보상 안내가 있으며, 번체 일부 신뢰 링크는 한국어로 이동한다. 단순 scrollWidth 검사가 발견하지 못한 일본어 제목 잘림은 이미지 검수로 발견해 줄바꿈을 보정했다. 광고가 실제 제공되는 상태의 CLS·오클릭·겹침은 아직 검증되지 않았다.

### 광고·동의·책임 주체

기존 `app/components/adsense-route-policy.js`는 홈/로케일 홈, 인증, 결제, 개인 결과, 로딩 등 경로를 차단하고 콘텐츠 경로를 구분한다. `verify:adsense-route-policy`와 mock 테스트를 유지한다. 실제 광고 슬롯과 버튼 간격은 광고 승인·제공 후 별도 확인해야 한다. 허용 경로라는 사실만으로 모든 상태에서 충분한 본문을 보장하지 않는다.

About·편집 정책에 운영 주체와 AI 활용 범위가 있고 대표자는 박병하로 명시되어 있다. 이 작업은 기존 경력을 번역했으며 새로운 자격·감수 이력을 만들지 않았다. 데이터 비교 글에는 재현 절차를 추가했고 결과를 과학적 효과 입증으로 표현하지 않는다.

개인정보/쿠키/광고 설명은 기존 정책을 재사용한다. 코드의 analytics_storage 처리는 확인했으나 인증 CMP 게시 증거와 EEA/UK/Switzerland 동의 전후 광고 동작은 확보하지 못했다. AdSense 개인정보 메시지 화면에서 게시 완료 메시지는 확인되지 않았다. 법률 문구·개인화 광고 설정·계정 설정을 임의로 변경하지 않는다.

## AdSense Ready Score: 63/100 (보수적 내부 편집 평가)

Google 평가나 승인 확률이 아니다. 현재 운영 상태와 확인 한계 기준이며, 미배포 수정으로 점수를 올리지 않았다.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| 콘텐츠 품질 | 14/25 | 설명·도구는 있으나 실제 low value 거절과 수백 미색인, 전체 원고 검수 미완 |
| 독창성 | 8/15 | 여러 계산 체계와 비교 자산 존재, 독자적 연구·외부 인용 증거 부족 |
| 사이트 구조 | 8/10 | 허브·사이트맵·정본 존재, 정책 hreflang 배포 확인 필요 |
| 내비게이션 | 7/10 | 기존 내부 링크, 번체 신뢰 페이지/동적 현지화 한계 |
| 정책 페이지 | 8/10 | 사업자·연락·정책 공개, 지역별 CMP 실행 증거 부족 |
| 광고 배치 안전성 | 7/10 | 경로 차단 코드와 검증, 실제 게재 상태 미검증 |
| 모바일 UX | 5/10 | 표본 레이아웃 확인, 운영 광고 및 field CWV 부족 |
| 다국어 완성도 | 2/5 | 주요 본문 현지화, 홈·동적 상태 일부 한국어 잔존 |
| Technical SEO | 4/5 | 현행 정본 HTTP 정상, 과거 색인 오류·정책 반환 링크 추적 필요 |

재신청보다 먼저: 현지화 잔여와 독립 가치 낮은 주요 진입 화면 검수 → 수정 배포 확인 → CMP/광고 상태 확인 → 동일 정책 아래 재신청 판단. 단순 재신청 반복을 자동화하지 않는다.

## 주제 구조와 인용 자산

새 디렉터리를 중복 생성하지 않고 다음 기존 경로를 연결한다. 유료 상담은 기존 화면의 이용권·월정석·단건 결제 CTA를 사용하며 무료나 평생 정책을 추가하지 않는다.

| 주제 | Pillar / 설명 | Supporting / 근거 자산 | 도구 |
| --- | --- | --- | --- |
| 사주 | `/insights/saju/`, `/saju/guide/` | `/saju/five-elements/`, `/saju/ten-gods/` | `/manse/`, `/saju/` |
| 자미두수 | `/ziwei/guide/` | 기존 12궁·주성 해설 | `/ziwei/` |
| 숙요 | `/insights/sukuyo/`, `/sukuyo/guide/` | `/insights/sukuyo-27-mansions/`, `/insights/sukuyo-compatibility-guide/` | `/sukuyo/`, `/sukuyo/compatibility/` |
| 베다 | `/vedic/guide/` | `/compare/sukuyo-vs-vedic/` | `/vedic/` |
| 점성술 | `/astrology/guide/` | 기존 시너스트리 해설 | `/astrology/` |
| 관계/시기 | `/compatibility/`, `/today/` | 기존 연애·관계 가이드 | 기존 궁합·오늘 운세 입력 |

우선 Linkable Asset은 숙요 27숙 설명, 만세력, 기존 자미 명반, 숙요/베다 비교다. 이번 비교 글은 음력 월일 대응표와 항성황도 달 위치를 같은 결과로 취급하지 않도록 수정했다. 다음 자료는 ‘계산 입력·기준·실제 예시·한계·수정일’을 갖춘 방법론 카드다. 실제 표본 없는 계절별 통계나 AI로 만든 숫자는 PR 소재로 쓰지 않는다.

## 일본 SERP·백링크 운영

검색 표본에서는 宿曜 相性의 본명숙 입력과 관계 조합, インド占星術의 출생 시각·라그나·나크샤트라, 紫微斗数의 명반과 12궁 설명 의도가 확인됐다. 일본어는 ‘베다점’의 직역보다 インド占星術와 ヴェーダ占星術의 실제 용례를 함께 사용했다. 검색 도구의 표본은 일본 현지 Google 순위 측정이나 검색량 자료가 아니다.

후보와 개별 초안은 [outreach/candidates.json](outreach/candidates.json). 大久保占い研究室, omajinai, 八雲院의 실제 해당 글을 읽고 독자에게 필요한 계산 기준 안내를 제안한다. Disquiet에는 경쟁 제품 소개가 존재하지만 UGC 제품 등록과 편집자 획득 링크를 구분한다. hwajin의 경쟁 서비스 언급은 관측했으나 근거·브랜드 적합성이 약해 제외했다. 경쟁자의 링크가 있다는 이유만으로 등록하지 않는다.

점수: 관련성25 + 검색 발견10 + 원고품질15 + 최근성10 + 스팸안전15 + outbound품질5 + 독자증거5 + 자연스러운접점10 + 브랜드5 = 100. 80–100 우선, 60–79 보류, 40–59 낮음, 0–39 제외. 미확인 항목은 점수 0과 `unknown`으로 표시하며, 80점이어도 모든 항목과 편집 검수가 충족되지 않으면 연락 준비 완료가 아니다. 현재 독립 트래픽·실제 검색 노출 수는 미확인이므로 전부 발송 대상 확정 전 단계다. 연락 담당자 실명·주소를 추정 수집하지 않았다.

주 5–20개는 상한을 둔 목표이며 관련 후보가 부족하면 억지로 채우지 않는다. 이메일·댓글·제품 등록을 보내는 코드가 없다. 외부 발송은 별도 명시적 권한이 있을 때만 진행한다. 협찬/대가성은 공개하고 필요한 sponsored/nofollow를 사용한다. 획득 링크는 실제 페이지·관측일·연결 자산·rel·관련성을 확인한 뒤 상태에 기록한다.

Broken Link Building은 대체 가치가 있는 실제 404/410만 후보로 올린다. 이번 조사에서 검증 완료한 대체 링크 후보는 없다. 로그인 요구·403·타임아웃을 broken link로 세지 않는다. 다음 주 후보 글의 본문 링크만 소량 확인한다.

## 반복 자동화

기존 `check-seo-health.mjs`, `seo-audit.mjs`, 번역/광고 검사와 정적 빌드를 재사용한다. PR마다 전체 네트워크 크롤링을 추가하지 않는다.

| 주기 | 실행 | 동작 |
| --- | --- | --- |
| 매일 07:43 KST | GitHub `SEO Operations` | 19개 핵심 랜딩 HTTP·title·description·canonical·meta/header noindex, robots·사이트맵 488개 경로 차단 검사 |
| 월요일 08:19 KST | 같은 workflow | 일일 검사 + 저장된 근거에서 Quick Win/후보 점수/간단 주간 보고서 생성. 오래된 값은 stale 표시 |
| 매월 1일 09:37 KST | 같은 workflow | 일일/주간 + 기존 공개 전체 사이트맵 HTTP 감사 |
| 월요일 09:20 KST | Codex heartbeat `code-destiny-seo-growth` | 로그인 계정 갱신, SERP·후보 직접 조사, 유효하면 기존 글 3–10개 개선, mock 검증/PR. 첫 주기는 월간 수동 품질 검수 포함 |

GitHub schedule은 이 PR이 기본 브랜치에 합쳐진 뒤 동작한다. heartbeat는 생성·활성화했으며 다음 예정은 2026-09-14 09:20 KST다. 머신/계정 세션 가용성에 따라 실행이 지연되거나 데이터 접근이 필요할 수 있다. 인증 정보는 저장하지 않는다. 심각한 변화가 없으면 알림/코드 변경 없이 종료하도록 설정했다.

CI는 읽기 전용 권한, 별도 concurrency, 45분 제한, 새 npm 의존성 없음, 결과 artifact 90일 보관이다. 실패하면 GitHub 실행 실패로 드러난다. 상태 파일은 자동으로 오래된 수치를 새 날짜로 덮지 않으며, heartbeat가 실제 관측 후 갱신한다. metadata·번역·끊긴 내부 참조처럼 범위가 명확한 수정도 격리 브랜치에서 검증/PR로 제안한다. robots/noindex/redirect 대량 변경, 병합·배포, 실제 LLM·결제·운영 DB 쓰기, 연락 발송은 자동 실행하지 않는다.

검사 역할과 한계:

- HTTP/robots/sitemap/canonical/noindex/title/description: 매일 표본, 매월 전수.
- H1·중복 메타·hreflang·JSON-LD·고아: 기존 빌드 산출물 감사. 정본 아닌 별칭은 hreflang 반환 대상으로 강요하지 않도록 오탐을 수정했다.
- 모든 내부 링크·이미지의 HTTP 상태, 이미지 용량/WebP·AVIF 전환: 월간 편집 작업에서 기존 이미지 도구와 산출물을 조사. 현재 일일 스크립트가 전부 검사한다고 주장하지 않는다.
- LCP/CLS/INP: 기존 측정 도구와 GSC field 자료를 별도 사용. 로컬 mock CLS를 운영 CWV로 보고하지 않는다.
- Thin/AI/언어 품질: 본문 문자 수는 선별 신호만 제공. 독립 가치·중복 결론·사실 근거·가독성을 직접 검수한다.

## 실행 명령과 다음 주

```powershell
node --test scripts/seo/*.test.mjs
node scripts/check-seo-health.mjs
node scripts/seo/growth-cycle.mjs
$env:SEO_AUDIT_BASE_URL='https://code-destiny.com'
node scripts/seo-audit.mjs --crawl-sitemap
npm run check:fast -- --plan
npm run check:fast
npm run build:cf
npm run seo:audit:complete -- --strict
$env:SEO_AUDIT_OUT_DIR='dist'
node scripts/seo-audit.mjs --source=out --crawl-sitemap
node scripts/seo-public-smoke.mjs
```

주간 출력: `seo-qa/operations/weekly.md`와 JSON. 숫자 미확인은 null/미확인으로 남긴다. KPI는 관련 referring domains, organic clicks, non-brand impressions, Top3/10, 색인된 가치 있는 페이지, 자산별 인용 도메인, 브랜드 검색이다. 현재 Top3/10·non-brand 분리·신규 도메인은 기준값 미확보다.

다음 주 우선순위: ① 배포된 정책 반환 hreflang·홈 현지화 확인과 GSC 28일 비교 ② 보상 안내/프로필 등 잔여 현지화·CMP 실행 증거 ③ 숙요 관계 글의 Query–Page 매칭 후 기존 글 개선 및 일본 후보 재검수. 외부 연락은 발송하지 않는다.

## 정책·조사 출처

- [Google 스팸 정책](https://developers.google.com/search/docs/essentials/spam-policies): 링크 조작·scaled content abuse를 피한다.
- [AdSense 저가치 콘텐츠](https://support.google.com/adsense/answer/10015918?hl=en): 독자적 가치와 사용성 기준.
- [Google 인증 CMP 요구사항](https://support.google.com/adsense/answer/13554116?hl=en): EEA/UK/Switzerland 개인화 광고 조건 확인.
- [공개 편집 정책](https://code-destiny.com/editorial-policy/): 운영 주체·AI 활용 범위.
- [숙요 도구 표본](https://www.senjutsu.jp/labo/shukuyo-calc/aishou-love), [숙요 설명 표본](https://omajinai.co.jp/shukuyo/), [八雲院 사용 안내](https://yakumoin.net/support/how_to_use): 후보별 실제 콘텐츠 근거.

계정 원본과 산출물은 관측 시점의 증거이며 이후 수치·정책·운영 상태가 바뀔 수 있다.
