---
status: active
updated: 2026-10-30
next: "운영 배포 승인 여부를 사용자에게 받은 뒤, 승인되면 배포 → 서치어드바이저·GSC에 sitemap-index 재제출과 /fortune/2027/ 수집 요청(승인 범위 안에서만) → D+7 관찰"
---

# SEO·AEO·GEO 후속 (2026-10-29 감사 이후)

## 왜

2026-10-29 사용자 요청: 네이버 노출·클릭 급감 → claude-seo로 SEO·AEO·GEO 진단 후 최적화. 이번 세션 범위는 "SEO·AEO·GEO 진단과 최적화만"으로 좁혔고, 나머지(랜딩 디자인·이탈, 마케팅 자동화·리타게팅, 영냥이 'AI 상담' 문구, 개고 표기 버그)는 이 문서로 넘긴다.

- 감사 요약: [2026-10-29-seo-aeo-geo-audit.md](../seo/2026-10-29-seo-aeo-geo-audit.md). SEO Health 68/100.
- 영역별 증거 원본(저장소 밖): `D:\Development\seo-audit\code-destiny-20261029\findings\*.md`, 실행 계획 `ACTION-PLAN.md`, 원자료 `raw\`.
- 이번 세션 변경 기록: [seo-and-adsense.md](../context/seo-and-adsense.md) 2026-10-29 절, [SEO_STATE.json](../seo/SEO_STATE.json) `seoAeoGeo20261029`.

🔴 하락 원인은 확정되지 않았다. 10/03·10/07 title 교체, 10/08 '오늘'→'내일' 치환 콘텐츠와 lastmod 일괄 변경, 자정 발행 지연이 겹친다. **title을 또 바꾸기 전에 D+30 관측을 먼저 본다.**

## 지금 상태

- 이번 세션 구현(main·스테이징까지, 운영 미배포): 2027 띠별 운세 허브 + 12띠 상세, llms-full.txt 신설·llms.txt 정비(G-L1~L3), 스키마 S1·S2·S3·S12, 신년운세 상담 → 무료 2027 허브 링크(C6 일부).
- T5(내일 상세 미래 datePublished)는 고쳤다가 되돌렸다. 아래 D 절을 본다.
- 운영 배포, 서치어드바이저·GSC 제출, 수집 요청은 **하지 않았다**. 사용자 승인 대기.
- 네이버 서치어드바이저·검색광고 키워드도구는 이번 세션에 조회하지 못했다(Chrome 확장 미연결). 키워드 경쟁도는 실측값이 없다.

## 남은 작업

### A. 승인 대기 (RED)

- [ ] **운영 배포** 후 Yeti UA로 `/fortune/2027/`, `/fortune/2027/pig/`, `/llms-full.txt`가 200인지, `/fortune/today/` 허브 JSON-LD `#webpage` 노드가 1개인지 본다.
- [ ] **서치어드바이저·GSC**: sitemap-index 재제출, `/fortune/2027/` 수집 요청. 10/18 재정비 이후 재제출 기록이 없다.
- [ ] **T1 자정 날짜 지연** (`.github/workflows/fortune-daily-publish.yml`)
  - 현상: 00:10 KST cron이 7~26분 늦게 돌고, 릴리스는 31~53분 걸린다. 그 사이 오늘/내일 페이지가 전날 날짜로 나간다. 2026-10-30 00:10 KST에도 오늘=10/29, 내일=10/30으로 서빙 중인 것을 확인했다.
  - 10월에 6일이 "실패"로 찍혔지만 릴리스 런 자체는 성공했다(gh run 로그).
    - 194행 `timeout 25m gh run watch`가 릴리스 소요(19~53분)보다 짧다. 그래서 거짓 실패로 판정하고 두 번째 릴리스를 중복 디스패치한다. 그 뒤의 verify·IndexNow·체크포인트 스텝은 건너뛴다.
    - 206행 신선도 검사의 `--wait-minutes=8`도 짧다.
    - 대기 시간을 실측 소요에 맞추고 중복 디스패치를 막는다.
  - 근본 대책 후보: 자정 전에 다음 날짜 산출물을 미리 빌드해 두고 00:00에 전환한다.
  - 실패 판정: 3일 연속 00:05·00:30·01:00 KST에 Yeti로 본 title이 그날 날짜가 아니면 실패다.
  - 감사 부록 B(00:50 재측정)는 감사 에이전트가 채우지 못했으면 다음 자정에 `raw\`의 `midnight_probe.py`로 다시 잰다.
- [ ] **T2 무슬래시 308 → 301** (`public/_worker.js`)
  - 현상: 슬래시 없는 모든 URL이 Pages 기본 308(상대 Location)로 간다. `?v=`가 붙으면 301→308 2단 체인이다. 원인은 117행 `removePublicContentVersion`이 슬래시를 보정하지 않는 것이다.
  - 제안: `env.ASSETS.fetch(request)` 앞에서 GET/HEAD이고, 경로가 `/`로 끝나지 않고, 마지막 세그먼트에 `.`이 없고, `/api/`가 아니면 `301` + 절대 Location을 낸다. `?v=` 제거 때도 슬래시를 함께 붙여 1단으로 끝낸다.
  - 워커 구조 변경이라 승인 후에만 한다. 실패 판정은 `curl -sI -A Yeti …/fortune/tomorrow/pig`가 301 + 절대 Location이 아닐 때다.

### B. 콘텐츠 정확성 (GREEN, 1주 안)

- [ ] **C1 유료 신년운세의 '전문가 상담' 표기** (`app/new-year-ai-consultation/page.tsx`): 실제 제작 방식(생성형 AI)과 맞춘다. YMYL·결제 화면이다.
- [ ] **C2 비공개 claude.ai 아티팩트 링크**를 '발췌 출처'로 내보낸다. 위치:
  - `js/consultation-sample-guide.mjs:3`(public 사본 포함)
  - `js/feature-detail-panels.mjs:117`(public 사본 포함)
  - `content/product-details/master-love-codex*/manifest.json:119`
  - `app/yeongnyangi/_components/YeongnyangiGuide.tsx:64`
  - 테스트가 이 링크를 고정한다: `__tests__/ui/consultation-samples.test.mjs:11`, `__tests__/ui/feature-visual-details.test.mjs:39,316`
  - 공개 가능한 샘플 페이지로 바꾸거나 링크를 뺀다.
- [ ] **C4 사이코패스 테스트의 "PCL-R 스타일" 표현**: 임상 도구와 문항이 1:1로 대응한다. "임상 진단 아님"을 유지하고 PCL-R 명칭은 뺀다.
- [ ] **C5 내일 페이지에 '오늘' 문구가 섞인다**(10/08 치환 생성의 흔적). 같은 띠 오늘↔내일 5-gram 유사도는 62%다.
  - X-S5와 함께, 내일 페이지에 년생별 문장을 넣는다.
  - 실패 판정: 유사도가 50% 이상이면 실패다.
- [ ] **C11 표기 오류**
  - "게자리 자리": `zodiacNameKoFromEn()`이 이미 '자리'를 붙여 돌려주는데 템플릿이 '자리'를 또 붙인다. 위치는 `lib/fortune/build-view.ts:123`, `lib/fortune/day-relation.ts:260`, `i18n/authored/fortuneTpl-01.json:144,228`이다.
  - "Waning gibbous / 하현 — 기운이 차오름": `i18n/authored/shellRuntime-22.json:74,256,270`. 뜻이 거꾸로다.
  - 🔴 i18n 역인덱스 키가 한국어 원문이다. 한국어를 바꾸면 번역 키도 같이 바꾼다.
- [ ] **띠 출생연도 목록에 오지 않은 해가 들어 있다** (`lib/fortune/sign-profiles.ts` `rangeLabel`)
  - 모든 띠가 1948+i부터 12년씩 7개를 찍는다. 그래서 양띠는 2027년생, 원숭이·닭·개·돼지띠는 2028~2031년생까지 들어 있다. 돼지띠는 1947년생이 빠졌다.
  - 이 목록은 96개 띠·별자리 운세 페이지와 허브에 보인다.
  - 🔴 같이 바꿔야 하는 곳:
    - `scripts/i18n-gen-sign-meta.mjs` → `i18n/authored/shellRuntime-24.json` → 12개 로케일의 `public/i18n/*/shellRuntime.json`
    - `content/fortune/translations/{en,ja,zh-CN,zh-TW}.json`의 rangeLabel
    - `scripts/build-fortune-hub-shell.mjs`의 정적 허브
    - `scripts/verify-fortune-locale-completeness.mjs`

### C. 신규·재색인 랜딩 (1개월 안)

- [ ] **2027 띠별 운세 소유자 검수**: 영역별 해설 문장은 생성형 AI의 도움을 받아 미리 쓴 것이다(페이지에 고지됨). 박병하(네오)가 검수하기 전에는 그가 쓰거나 검수했다고 표기하지 않는다. 검수 후에만 저자 표기를 바꾼다.
- [ ] **X-S4 심리테스트 재색인**
  - 순서: 사이코패스 → 나르시시스트 → HSP → 정신연령 → 공감. 22개 상세 전부 noindex다(2026-07 애드센스 재심사 때 템플릿 81.5% 공유로 막았다).
  - 테스트별 고유 본문을 쓰고, 공유율 <50%를 실측한 것만 index로 바꾼다.
  - 색인 상태를 바꿀 때는 다섯 곳을 함께 고친다(seo-and-adsense.md "🔴 다섯 곳" 절).
- [ ] **X-S3 궁합 조합표**: 띠 궁합 12쪽(삼합·육합·충·원진 결정 관계), 별자리 궁합 허브, `/animal/mbti`의 가시 MBTI 궁합표(데이터가 있을 때만).
- [ ] **휴먼디자인**: `/human-design/guide`를 "휴먼디자인 차트 무료/사이트"의 주 타겟으로 강화하고, 타입별 페이지를 만든다. `/human-design/` noindex 유지 여부는 무료 차트 제공 범위를 보고 정한다.
- [ ] **X-S2·C14 신년운세 의도 분리**: 무료 정보 의도는 `/fortune/2027/`, 유료 상담은 `/new-year-ai-consultation/`이 받는다. `insights/articles.js:4539` 블로그 글이 같은 키워드를 잠식하는지 본다.
- [ ] **C3 홈 title**(정치 인물 적중 주장 → 서비스 쿼리). 🔴 title 교체 이력이 많다. D+30 관측 뒤에 한 번만 바꾼다.

### D. 기술 (1개월 안)

- [ ] **sitemap lastmod 정확도** (`scripts/lib/sitemap-lastmod.mjs`)
  - 서명이 import 폐쇄 전체를 해시한다. 그래서 `lib/seo/entity-registry.mjs`(830개 경로 중 818개)나 `lib/structured-data.ts`(737개)를 한 줄만 고쳐도 거의 전 경로의 lastmod가 오늘로 바뀐다. HEAD 원장도 이미 10-28 254개, 10-29 559개였다.
  - 제안: entity-registry는 경로별 프로필만 `sliceFunction`처럼 잘라 서명에 넣는다(`js-source-slice.mjs`가 이미 있다).
  - 🔴 서명 알고리즘을 바꾸면 그 커밋에서 전 경로가 한 번 더 바뀐다. 한 번에 끝내고, 날짜만 바꾸는 커밋을 따로 만들지 않는다.
- [ ] **T5 내일 상세의 미래 datePublished** (`app/fortune/[period]/[sign]/page.tsx`)
  - 현상: 내일 상세 Article의 `datePublished`가 대상일(D+1) 0시라서, 공개된 날 하루 내내 미래 시각이다. `dateModified`도 없다.
  - 🔴 빌드 게이트 계약 `scripts/lib/fortune-date-contract.mjs:64`가 "Article datePublished = 대상일"을 요구한다. 이번 세션에 발행일(D)로 바꿨더니 `build:cf` postbuild가 내일 24쪽 전부에서 실패했다. 게이트를 약화하지 않고 되돌렸다.
  - 바꾸려면 계약부터 정한다: datePublished를 발행일로 할지, 대상일은 `about`·`temporalCoverage`나 화면 `<time>`이 맡게 할지. 계약·테스트·렌더러를 한 커밋에 같이 바꾼다.
- [ ] T3 한국어 홈 이원화(`/` vs `/ggulggul/`)와 홈 hreflang 묶음, T6 fortune 계열 x-default 누락, T4 HTML ETag 없음(304 불가), T7 로케일 302의 봇 예외가 UA 정규식, T9 중복 `/sitemap.xml`.
- [ ] S4·S6·S7: 유명인 Article의 author·publisher 노드 연결, Person sameAs와 운영사 분리, 꿀꿀 운세 브랜드 노드.
- [ ] **이름 정리 (소유자 결정)**
  - 화면 바이라인은 "Code Destiny 편집팀"이고, JSON-LD `#organization`은 이번에 "CODE DESTINY" 하나로 맞췄다(S2).
  - 영어·중국어 llms 섹션과 i18n lead는 운영사명을 주어로 쓴다. 이번에 "공식 서비스명은 꿀꿀 운세" 문장을 앞에 붙였다(G-L1).
  - 꿀꿀 운세의 로마자 표기(nameLatin)는 소유자가 정하기 전까지 쓰지 않는다.

### E. 성능·랜딩 디자인·이탈 (사용자 추가 요청 1)

- [ ] P-1: 한국어 페이지가 `/i18n/ko.json`(188KiB)을 높은 우선순위로 받는다(`lib/i18n/useT.ts:86` → `dictionary.ts:158`). 지연 로드한다.
- [ ] P-2: 쿠키 동의 배너가 모바일 첫 화면의 약 45%를 덮고, 내일 운세에서는 LCP 요소다.
- [ ] P-3: 렌더 차단 CSS가 5~8개이고, `globals.css`에 serif `@font-face`가 189개 있다.
- [ ] 모바일 LCP: 8쪽 전부 4.8~7.0초(실험실 값)다. 실패 판정은 8쪽 중 4쪽 이상이 4초를 넘을 때다.
- [ ] V-1: 돼지띠 내일 운세의 모바일 첫 화면에 풀이·점수가 하나도 없다. 검색 유입 랜딩의 첫 화면은 검색 의도에 바로 답하고, CTA는 해당 도구로 한 번에 연결한다.
- [ ] IMG-1·2: /psychotest가 960w 카드를 357px 자리에 받는다(4.2MB). /saju 카탈로그가 히어로 원본을 쓴다.

### F. 마케팅 자동화·리타게팅 (사용자 추가 요청 1)

- [ ] GA4 잠재고객(운세 결과 열람·결제 페이지 이탈), 네이버·카카오·메타 픽셀. 🔴 동의 배너 상태를 따른다. 결제·결과 화면의 광고 차단 정책을 지킨다.
- [ ] 2027 신년운세 시즌(11~1월) 알림 자동화: 무료 허브 → 유료 상담 흐름.
- [ ] 네이버 블로그(blog.naver.com/neosaju) 투트랙 발행.

### G. 영냥이·개고 (사용자 추가 요청 2)

- [ ] **영냥이 'AI 상담' 문구 → "대통령 운세를 짚은 명리학자 박병하(네오)가 만든 서비스" 강조**
  - 대상 예: `app/yeongnyangi/_components/QuestionSkyConsultation.tsx:58`, `app/yeongnyangi/1000-won-fortune/page.tsx:117`, `lib/brand/consultation-methods.mjs`.
  - 근거 문구 정본: `app/components/FounderTrust.tsx`, `lib/brand/differentiation-faqs.mjs`, `app/yeongnyangi/_original/home-data.ts`.
  - 🔴 인공지능기본법(2026-01 시행)에 생성형 AI 사전 고지 의무가 있다. 헤드라인에서는 빼도 고지 문구는 최소 1곳 남긴다(법무 확인). "적중 보장 아님"을 유지한다.
- [ ] **개고 표기 버그**: 未가 개고될 때 지장간이 "을목(乙木)"으로 나와야 하는데 "을미"로 나온다.
  - 후보: `worker/lib/saju-ai-prompt.js:820-835`(`buildEarthStorageOpeningSummary`·`buildOpenedHiddenStemsForStorage`), `js/core/saju/reading-depth.generated.js:463`, `app/saju/animal-destiny/engine/localSajuCalculator.ts:1466,1882`.
  - mock으로 재현해 계산 표기 문제인지 LLM 출력 문제인지 먼저 가른다. 그다음 표기를 정규화하거나 프롬프트에 "천간+오행" 표기를 명시한다. 유료 LLM은 호출하지 않는다.

### H. 코드 밖

- [ ] 서치어드바이저 읽기 전용 실측: 페이지별 노출·수집 로그, 중복 title 경고, 리다이렉트 진단(308 잔존). 검색광고 키워드도구로 경쟁도를 잰다.
- [ ] 사이트 밖 권위(GEO Authority 30점): 보도의 운영사명 오기 정정 요청, 외부 프로필 sameAs 통일, 실재 프로필만 연결.
- [ ] AI 답변 기준선: "무료 사주 사이트 추천", "2027 신년운세 무료", "휴먼디자인 차트 무료 사이트", "사이코패스 테스트 무료"를 네이버 AI 브리핑·ChatGPT·Perplexity에서 읽기 전용으로 조회해 기록한다.

## 관찰 계획

운영 반영일을 D로 둔다. D+7은 `/fortune/2027/*` 수집·색인과 내일 운세 노출 추이, D+14는 "2027년 {띠} 운세" 노출 시작, D+30은 정미년 시즌 노출·클릭과 오늘/내일 상세 CTR을 본다. 11/07 D+30 자동화(10/08 배포 기준)와 비교 기간을 섞지 않는다.

## 함정

- 🔴 색인 상태는 다섯 곳이 함께 정한다(`static-canonical-route-map.mjs`, `generate-sitemap.mjs`, `lib/seo/siteSeo.ts`, `public/_headers`, `verify-adsense-readiness.mjs`). 한 곳만 바꾸면 빌드 게이트가 막거나, 더 나쁘게는 통과한 채 어긋난다.
- 🔴 `/fortune/2027/[sign]` 12쪽은 공유 본문 비율을 50% 아래로 유지해야 한다. 공통 문단(절기 월건표 등)을 상세에 다시 넣지 말고 허브 `#months`에 둔다.
- 🔴 `generate-llms-txt.mjs`의 SECTIONS 경로는 `SEO_ROUTE_PROFILES`에 등록된 것만 쓸 수 있다(fail-closed). llms-full.txt는 레지스트리에서만 파생한다. 새 문장을 지어 넣지 않는다.
- 🔴 brand-facts 테스트: 옛 이름(사주 달빛 정원·꿀꿀 사주 등)은 llms 계열 4개 파일의 "## 이름 이력" 절에만 나올 수 있다.
- FAQPage는 Google이 2026-05-07부터 리치 결과를 없앴다. 새로 늘리지 않고, 기존 것을 지우라고 하지도 않는다. HowTo는 쓰지 않는다.
