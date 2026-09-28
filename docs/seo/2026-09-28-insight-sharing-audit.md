# 꿀꿀 운세·영냥이 공유 경험과 검색 진단

측정일: 2026-09-28 KST. 운영 열람은 읽기 전용이다. 개발 검증은 네트워크를 차단한 모의 DB/PG/LLM이다. 운영 결제·환불·고객 상담 생성·메시지 전송을 수행하지 않았다. 이 문서는 표본 진단이며 사이트 전체의 결함이나 전환 효과를 확정하지 않는다.

## 1. 현재 값과 증거

| 도구·범위 | 실제 화면 값 | 해석과 한계 |
|---|---|---|
| Google Search Console, 8/29–9/25, 웹 28일 | 클릭 9, 노출 99, CTR 9.1%, 평균 위치 23.5 | 루트 4/36, /manse/ 3/27, /sukuyo/ 2/12(클릭/노출). 브랜드 변경 전 루트 이력을 영냥이 성과로 귀속할 수 없음 |
| GSC 색인 개요 | 색인 301, 미색인 2,617 | 사유별 상세와 검색 질의별 전환은 미확인. sitemap 1,300개와 기간·모집단이 다름. 미색인 전체를 오류로 부르지 않음 |
| GSC AI 검색 실적 베타, 6/26–9/25 | 노출 23, URL 13행 | 루트 4, 천간지지 설명 3, 자미두수 연애궁합 3 등. 특정 AI 답변의 실제 인용 문구·질의·순위는 미확인 |
| 네이버 서치어드바이저, 최근 30일, 최신 9/27, PC+모바일 | 클릭 2.6천, 노출 40.0만, 평균 CTR 0.6% | 구글과 기간·집계 방식이 다름. 시장 점유율 비교로 해석하지 않음 |
| 네이버 URL | /fortune/tomorrow/tiger/ 150/23,670, rat 139/19,151, ox 134/14,577, /vedic/ 76/2,024 | 무료 날짜 운세와 베다점은 우선 관찰 후보. 오늘 타로의 효과가 입증된 것은 아님 |
| 네이버 질의 | 게자리운세 26/8,974, 숙요점사이트 25/512, 처녀자리운세 21/12,438, 꿀꿀운세 21/54, 베다서양 20/111 | 숙요·베다 사이트 탐색 의도와 날짜 운세 의도가 다름 |
| GA4, 8/31–9/27 | 활성 134, 신규 121, 평균 참여 20분30초, 이벤트 1.3만 | 내부 운영 방문·결제사 referral 흔적이 있어 정제 전 수치를 고객 전환으로 사용하지 않음 |
| GA4 페이지 제목 표 | 꿀꿀 신규 제목 177뷰/8활성, 영냥이 홈 141뷰/6활성 | 페이지 제목과 URL별 기간 혼재. 두 브랜드의 구매 퍼널 비교 근거로 부족 |
| GA4 홈 90일 | 구매 이벤트 4 | 결제 원장·환불과 대조하지 않았으므로 실구매 4건이라고 보고하지 않음 |
| 운영 HTTP 표본 31 URL | 최종 응답 모두 200, sitemap 1,300 URL | hreflang에 실제 있는 일본어 jp 슬러그 사용. 검색에서 발견됐다는 번역 404 원 URL은 특정되지 않아 재현 못함 |

증거 위치: `build-cache/share-insight/`의 `http-audit.json`, `google-28days.png`, `google-ai-3months.png`, `naver-30days.png`, `analytics-home.png`, `before-home-390.png`, `before-ggulggul-390.png`, `before-sukuyo-390.png`. 화면은 로그인한 사용자 브라우저를 직접 읽었다. 도구 URL: [GSC](https://search.google.com/search-console?resource_id=sc-domain%3Acode-destiny.com), [네이버](https://searchadvisor.naver.com/console/site/report/expose?site=https%3A%2F%2Fcode-destiny.com), [GA4](https://analytics.google.com/analytics/web/#/p526361229/reports/intelligenthome).

## 2. 영향 순 진단

| 문제 | 증거 URL·화면·수치 | 사용자 영향 | 수정 방법 | 예상 효과(가설) | 검증 방법 |
|---|---|---|---|---|---|
| 결과의 문장을 공유해도 링크는 서비스 입구만 가리킴 | [오늘](https://code-destiny.com/today/), [영냥이 결과](https://code-destiny.com/yeongnyangi/result/), ConsultationShare/ResultSharing 소스. 유료 결과는 모의 완성본으로만 확인 | 친구에게 보낸 통찰과 방문 화면이 연결되지 않음 | 고객이 고른 120자 문장만 별도 공개 문서로 저장. 미리보기·동의·만료·폐기 | 수신자에게 맥락 유지, 체험 이유 명료화 | 4폭 생성/취소/수신/폐기, 실제 서버 OG는 별도 검사 |
| 공유 완료·수신·체험·구매를 브랜드별 연결할 근거 부족 | GA4 위 표. 기존 링크는 범용 진입 URL | 공유 클릭을 구매 성공으로 오인할 위험 | ggulggul/yeongnyangi 익명 campaign, 단계별 이벤트, 동의 시 30분 세션 귀속 | 실제 무료 체험까지 이어진 공유를 판단 | 이벤트 payload에 본문·질문·카드ID·폐기키 없음 검사. 구매는 결제 원장 대조 필요 |
| 숙요 허브가 추천·최신·입문에서 같은 글 반복, 12태그 표시 | [숙요 허브](https://code-destiny.com/insights/sukuyo/), before-sukuyo-390 | 다음에 읽을 글 선택이 어려움 | 추천/입문/실전/이어서 읽기 중복 제거, 태그 나열 제거, 앞부분에 실제 계산 기준·한계 | 짧은 탐색 경로, 내용과 검색 질문 일치 | DOM 링크 중복·전후 모바일·sitemap drift |
| 공통 서비스 링크가 많음 | 같은 허브 raw HTML 링크 156개(본문+푸터+중복 포함). 푸터는 모바일 접힌 details | HTML 링크 수만으로 실제 화면을 과밀하다고 단정할 수 없음 | 이번에는 본문 반복만 제거. 전역 푸터 동작 보존 | 관련 글 선택 부담 감소 | 본문 목록별 비교, 푸터 기존 회귀 검사 |
| 영어·일본어·중국어 루트 HTML 큼 | [en](https://code-destiny.com/en/) 757,313B, [ja](https://code-destiny.com/ja/) 769,440B, [zh](https://code-destiny.com/zh/) 749,949B. 한 번의 TTFB 240–269ms | 모바일 비용 후보지만 필드 속도 불량으로 확정 불가 | 이번 새 공유 화면은 작은 별도 진입, 4개 언어 안내. 무료 타로가 한국어임을 표시 | 수신자가 상담 언어를 오해하지 않음 | 4폭 넘침 검사. 실제 저사양 기기·CWV는 미확인 |
| 과거 locale URL이 다른 언어 가이드로 이동 | [/de-de/high-value/](https://code-destiny.com/de-de/high-value/), [/es-es/high-value/](https://code-destiny.com/es-es/high-value/) 최종 /guides/ 한국어 | 기대한 언어와 불일치 | 대응하는 동일 언어 문서 근거 없이 새 임의 redirect를 추가하지 않음. 별도 이관 목록 필요 | 잘못된 대응 확대 방지 | redirect 원장과 실제 유입 URL 확보 후 목적지 또는 명시적 종료 결정 |
| 검색·유료 전환·공유 성공률의 기준선 없음 | 브랜드별 완성 결과/고유 수신자/환불 정제 데이터 미확보 | 개선 성과를 수치로 주장할 수 없음 | 아래 측정 정의로 수집하고 다음 기간 비교 | 허위 성공 보고 방지 | 동일 기간·동일 동의 모집단, 내부 트래픽 제외 |

## 3. 콘텐츠와 이동 경로

꿀꿀: 검색 → 사주/자미/숙요/베다/점성술/궁합 설명 또는 날짜 운세 → 해당 계산·무료 타로 → 상품/이용권 → 결제 → 저장된 완성 결과 → 고객이 고른 공개 문장 → 친구의 무료 타로. 영냥이: 검색 → 루트/1,000원 소개 → 방의 체험/상담 주제 → 상품·프로필·질문 → checkout → 저장된 결과/내 상담 복구 → 공개 문장 → 친구의 무료 타로. 결제 이후는 소스와 모의 데이터로 검증하며 실제 고객 행동률은 아직 없다.

| 체계/검색 의도 | 현재 확인한 진입·해석 근거 | 구분·한계 |
|---|---|---|
| 사주: 내 명식·오행·적성 | /saju/, /manse/, 영냥이 상품. 출생정보 계산 뒤 해석 | 다른 체계와 합쳐 정확도를 보장하지 않음 |
| 자미두수: 명궁·성향·관계 | /ziwei/ 및 인사이트 허브, 명반·궁위 | 다른 명리 체계와 동일 계산으로 설명하지 않음 |
| 숙요: 본명숙·관계 종류 | /sukuyo/, Lahiri 항성 달 황경 27분할 구현·현재 가이드 | 전통 음력 날짜표와 다를 수 있음. 상대 속마음 확정 금지 |
| 베다: 라그나·나크샤트라·다샤 | /vedic/ 실제 유입 76클릭(네이버) | 서양 열대 황도 체계와 혼합 금지 |
| 서양 점성술: 출생차트·행성·하우스 | /astrology/ | 출생시각·위치에 따른 하우스 정보와 한계 |
| 타로·오늘: 지금의 고민과 작은 행동 | /today/#daily-tarot, 실제 고른 카드와 위치별 DAILY_MEANINGS | 출생 계산이 아님. 카드 결과와 무관한 랜덤 성향 문구를 붙이지 않음 |
| 궁합: 차이·대화 질문 | /compatibility/, /sukuyo/ | 상대 정보 공유는 별도 본인 참여/동의 필요. 이번 공유 문서에 상대 필드 없음 |
| 영냥이의 방: 상담 전 체험 | /yeongnyangi/room/ | 인증/개인 공간의 noindex와 canonical 부재를 일반 공개 SEO 오류로 단정하지 않음 |

원문·날짜까지 대조하지 못한 '10년 경력' 및 예측 기록을 이번 개선의 권위 근거로 확대하지 않았다. 기존 홈의 강한 적중 요약은 별도 원문 대조가 남아 있다. FAQ 대량 복제·새 AEO 전용 schema·새 번역 색인 URL을 만들지 않았다. 4개 언어 주요 표본은 self canonical과 hreflang 존재를 HTTP로 확인했지만, 모든 번역 상담 본문의 의미 품질을 검수한 것은 아니다.

## 4. 공유 형식 선정

| 후보 | 구체성/정확성·보낼 이유·받는 재미 | 비용/결정 |
|---|---|---|
| 오늘의 한 문장 | 실제 고른 카드의 위치별 문장+날짜, 친구도 세 장을 뽑아 비교 | 낮음. 첫 검증 대상 |
| 상담의 한 장면 | 완성 리포트의 요약/질문 답변 중 고객이 선택·편집. 내 상황을 설명 | 중간. 기존 연이·네오·영냥이 및 공용 공유 소비 상품에 적용. 전체 분량 유지 |
| 나를 설명하는 한 장 | 오행/명반/숙/행성 등 신호와 일치하는 구체적 성향 | 각 계산기 출력 계약 검증 필요. 범용 유형 카드를 임의 생성하지 않고 다음 확장으로 보류 |
| 함께 해보는 관계 카드 | 둘의 해석을 비교할 동기 강함 | 두 사람 참여·동의·철회 모델 필요. 상대 개인정보를 기존 결과에서 복사하는 방식 제외 |
| 영냥이·연이 초대장 | 선택한 문장을 먼저 보고 무료 행동으로 연결 | 공유 수신 랜딩에 구현. 비한국어는 체험이 한국어임을 명시 |

이미지: 브라우저 로컬 PNG 1:1(1080), 9:16(1080×1920). 링크: 기존 서버 OG 1200×630에 고정 허용 캐릭터 3종을 조합. 사용자의 추가 요청에 따라 영냥이·연이·네오 원본을 참조해 편지를 안은 그림 3종을 내장 이미지 도구로 제작했다. 고객 데이터는 생성 도구에 전달하지 않았다. 정적 그림은 재사용하므로 고객 카드당 추가 AI 이미지·LLM 호출은 없다. 카카오/문자는 공개 URL의 서버 메타데이터 사용. 실제 카카오 캐시/메시지 전송은 수행하지 않았고 native share 반환을 전달 완료라고 기록하지 않는다.

그림 배포 자산은 WebP 각각 96–116KB, 서버용 JPEG 각각 82–94KB. 사용자 요청을 반영해 수신 화면을 크림색 편지지·플럼색 CTA·캐릭터 그림으로 변경했다. 시각 검토자는 새 4폭 화면·3캐릭터·120자·두 비율·OG 3종을 보고 ship 판정했다. 실제 여성 고객 선호나 공유율 상승을 입증한 것은 아니다.

공개 데이터는 브랜드·출처 종류·언어·날짜·선택 문장·만료뿐이다. 비공개 결과/주문/프로필 참조를 저장하지 않는다. 임의 문장에 개인정보가 없다는 완전 자동 보장은 하지 않으며, 기본 빈 선택·사용자 확인·연락처/비밀번호 등 거부를 함께 사용한다. 공개 30일 만료, 같은 브라우저의 비밀키로 즉시 폐기. 생성 응답 유실 전에도 키를 저장한다. 생성보다 폐기가 먼저 도착해도 tombstone으로 지연 생성을 차단한다. 폐기 후에는 본문을 비우고 만료 TTL을 제거해 지연된 생성 요청의 재공개를 막는다. 기존 브랜드·언어·출처·날짜 같은 최소 메타데이터와 불투명 ID/권한 해시는 남는다. 외부 서비스에 저장된 이미지·문구는 회수되지 않는다는 안내를 표시한다.

## 5. 측정 계약·비용

| 단계 | 이벤트/분모 | 성공 판단과 현재 값 |
|---|---|---|
| 결과 노출→편집 | insight_share_available, insight_share_action(stage=preview_opened) | 현재는 노출 기준, 고유 완성 결과당 비율은 별도 completion/중복 제거 필요. 출시 전 값 없음 |
| 편집→공개 | created / preview_opened, create_failed, storage_failed | 실패와 취소를 성공으로 합치지 않음 |
| 전달 | copied, share_returned, cancelled, manual_copy, download_requested | 복사·공유창 반환은 전달 완료가 아님. 메신저 도달률 미확인 |
| 수신→무료 시작 | insight_share_receive → insight_trial_click → 기존 tarot_daily_start | 클릭과 실제 체험 시작 분리. UTM campaign 두 브랜드 구분 |
| 수신→구매 | 동의된 30분 세션 share_campaign + 기존 구매 이벤트 | 원장/환불/내부 방문/결제사 referral 정제 전 실질 전환 미확인 |
| 품질 | image_failed, preview_image_failed, revoke_failed, API 비200 | 민감정보 사고 0건 목표는 관측 시스템 필요. 테스트에서 금지 필드 미전송 확인은 실제 사고율 증명이 아님 |
| 속도 | HTTP TTFB 표본 및 모바일 4폭 | 운영 TTFB 177–544ms(표본). CWV 데이터 부족, 저사양/통신망 실측 아님 |
| 비용 | 생성시 rate-limit+공개 문서 upsert, 조회시 indexed _id 1회, 폐기시 tombstone 1회, OG 기존 렌더 | 원화 단가·실사용 Cloudflare/DB 청구 미확인. LLM 생성 비용 추가 0 호출. 호출량/청구액÷정제된 구매로 측정 |

공유 증가만으로 성공하지 않는다. 동일 동의 모집단에서 수신자의 무료 시작률이 개선되고, 오류·이탈·민감정보 신고가 악화되지 않아야 한다. 표본이 적으면 승패를 유보한다. Google/네이버 질의 CTR과 AI 노출은 별도로 추적하며 보장하지 않는다.

## 6. 검증·전달

- `node scripts/verify-insight-cards.mjs --unit`: 동의·민감정보 거부·최소 필드·폐기 권한·생성/폐기 역전·만료·장애·rate limit·edge OG/no-store 통과.
- `node scripts/verify-insight-cards.mjs`: 360/390/430/1280 화면, 모의 DB 생성·복사·취소·수신·폐기·가로 넘침 통과. 실제 DB/PG/LLM 0.
- 기존 크롬리스/locale footer + 새 공유 node 검사 24/24 통과. 전역 푸터 변경은 철회하여 기존 호출/표시를 유지.
- `npm run check:fast -- --plan`: Worker 추가로 critical 자동 승격. 초기 실행은 푸터 정적 계약 3개 실패. 원인 변경 철회 후 재실행에서 paid gate 88/88, lint 통과. 그 뒤 sitemap drift를 재생성으로 수정했고 중단 이후 계획 항목을 이어 실행했다. 이미 통과한 동일 paid gate 항목은 재사용했다.
- `npm run fortune:build-data`: 로컬 날짜 운세 데이터 생성 통과. Windows C/D 드라이브 의존성 junction 문제는 로컬 의존성 복사로 해결. 앱 설정 우회 없음.
- typecheck, test:node, test:jest(309 suites / 4,515 tests), worker dry-run build, entry encoding 및 계획의 나머지 검사가 통과했다. 캐릭터 추가 이후 typecheck·OG route contract·worker build를 다시 통과했다. 새 backend 단위·4폭 browser·120자 다운로드·3브랜드 수신화면 검사도 통과했다.
- `YEONGNYANGI_TEST_BASE=http://127.0.0.1:14128 node scripts/verify-yeongnyangi-result-sharing.mjs`: 4폭 통과. 기존 테스트의 오래된 loading 문구/alt를 현재 ReadingLoading과 맞췄다. 결제 재확정·완성본 재생성 0, 질문 기본 비포함, 취소, 미완성 공유 미노출 검증. 실제 메시지는 0.
- 로컬 별도 Cloudflare runtime에서 실제 `handleOgRoutes`를 실행해 3캐릭터 PNG 200을 받았다. 고정 자산·공개 폰트 외 결제/상담 API 없이 검사했다. 로컬 런타임이 지원하는 compatibility date만 검사 wrapper에 사용했고 운영 설정은 바꾸지 않았다.
- sitemap 생성·public 동기화·sitemap drift(URL 1,300) 통과. 공유 구현 커밋 `b3367a6c0`. main CI/스테이징/운영 릴리스는 아래 최종 전달 기록에 추가한다. 미확인 단계를 완료로 간주하지 않는다.

다음 확장: 실제 검색404 원 URL·미색인 사유, 공개 예측 원문 대조, 동의한 두 사람 관계 카드, 체계별 계산 신호 카드, 비한국어 무료 체험 본문 검수, 실사용 전환·원가 관측. 기존 결제/인증/유료 생성·복구/DB 결과 스키마는 수정하지 않았고 공개 공유용 별도 collection만 추가했다.

### 전달 실측

- 기능 SHA `456ea72d6816726de95f8bbf406177aa80112c78`: main CI [36382085504](https://github.com/rei1237/codedestiny/actions/runs/36382085504), 스테이징 [36382123366](https://github.com/rei1237/codedestiny/actions/runs/36382123366) 성공. `npm run verify:staging -- --sha=456ea72d6816726de95f8bbf406177aa80112c78`에서 Pages/Worker 모두 일치.
- 2026-09-28 14:46 KST 스테이징의 실제 격리 DB로 합성 문장 시험: POST201 → 공개 HTML200/no-store/noindex → OG PNG200 → 390px 실제 화면 → DELETE200 → API404/공개 페이지404. `staging-share-proof.json`, `staging-receiver-390.png`, `staging-og.png` 보존. 실제 PG/LLM/운영 DB 쓰기 없음. 시험 문장은 고객 상담이 아니다.
- 최초 스테이징 HTML503은 기존 API resolver의 production 기본값 때문이었다. 새 공유 렌더러의 호스트별 origin 분리로 해결했고 두 환경/알 수 없는 호스트 차단 회귀 검사를 추가했다.
- 승격 요청 직전 concurrent main이 `780d0dc8f`로 진행했다. 검증하지 않은 타로 변경까지 승격하지 않도록 [36383458252](https://github.com/rei1237/codedestiny/actions/runs/36383458252)를 취소했다. checkout 단계 취소, 실제 release job 실행 없음을 확인했다. 최신 main CI/스테이징 성공 후에만 다시 정식 승격한다. 운영 성공은 아직 미확인이다.
- 영구 증거 폴더: `C:\Users\user\.codex\visualizations\2026\09\28\01a0e5f0-1bb6-7ad3-8bb7-0bacc04a5703\share-insight`. 조회용 공개 시험 URL은 폐기했으므로 재사용하지 않는다.
