# 꿀꿀 운세 브랜드 사실 원본

원본 모듈: `lib/brand/brand-facts.mjs` (version 2, reviewedAt 2026-10-16)

서비스 이름·운영자·캐릭터·공식 외부 프로필·과거 이름은 이 모듈에서만 정한다.
2026-10-15 운영자 결정으로 공식 서비스명은 **꿀꿀 운세**다. 붙여 쓴 **꿀꿀운세**는 같은 서비스의 별칭이다.

## 필드

| 필드 | 값 | 쓰는 곳 |
|---|---|---|
| `service.name` | 꿀꿀 운세 | WebSite.name, og:site_name, application-name, title 접미사, 매니페스트 name |
| `service.alternateNames` | 꿀꿀운세 | WebSite.alternateName, 표기 안내 문장 |
| `service.homeUrl` | https://code-destiny.com/ | 공식 대표 홈(루트 200) |
| `service.appEntryPath` | /ggulggul/ | 상담 앱 입구, PWA start_url |
| `operator.name` | CODE DESTINY | Organization.name |
| `operator.nameKo`·`alternateNames` | 코드 데스티니 외 | Organization.alternateName |
| `characters` | 꽃돼지 연이 · 네오 · 영냥이 | 공식 안내 본문, llms.txt |
| `characters.yeongnyangi.serviceName` | 운세보는 영냥이 (별칭: 사주보는 고양이 영냥이 · 운세 보는 영냥이) | /yeongnyangi/ title·H1 둘째 줄·Service.name·Breadcrumb, 루트 영냥이 문, llms.txt. 2026-10-16 사용자 결정. 사이트 별칭(`service.alternateNames`)에는 넣지 않는다 |
| `sameAs` | YouTube · Threads · Instagram · 네이버 블로그 neosaju · X | Organization.sameAs, 푸터 SNS |
| `formerNames` | 사주 달빛 정원 · 사주 달빛정원 · 꿀꿀 사주 · 꿀꿀사주 | 이력 문단에서만 허용. 검색 신호에 나오면 테스트 실패 |
| `protectedNames` | 나의 달빛 정원 | 현재 기능명. 과거명 검사에서 제외 |
| `historyKo` | 이력 한 문단(날짜 없음) | 대표 홈·공식 안내·llms.txt 이력 절 |
| `pendingConfirmation` | 확인 전 항목 목록 | 공개 사실로 쓰지 않는다 |

등록 상호(legalName)·주소·사업자번호는 `lib/site-policy-config.js` 의 `BUSINESS_IDENTITY` 가 정본이다.
이 모듈에 복제하지 않는다(`npm run verify:business-identity`).

## 이름을 쓰는 규칙

- 공식명 자리(title 접미사, og:site_name, application-name, WebSite.name, 매니페스트 name)에는 `꿀꿀 운세` 만 쓴다.
- `꿀꿀운세` 는 별칭 자리(alternateName, "붙여 써도 같은 서비스" 안내)에만 쓴다. 해시태그·검색 키워드 배열은 예외다.
- 운영자 `CODE DESTINY` 는 Organization 에만 쓴다. WebSite 별칭에 섞지 않는다.
- 과거 이름은 이력 문단에만 쓴다. 개명 날짜는 확인된 기록이 없어 쓰지 않는다.
- 카카오톡 채널은 운영자 확인 전까지 sameAs 에 넣지 않는다.

## 파생 지점

| 파일 | 파생하는 값 |
|---|---|
| `lib/seo/siteSeo.ts` | siteName, brandName, alternateName, organization.name, SOCIAL_PROFILES |
| `lib/structured-data.ts` | Organization·WebSite JSON-LD |
| `app/components/SeoJsonLd.jsx` | Organization JSON-LD |
| `lib/seo/entity-registry.mjs` | SEO_BRAND_ENTITY |
| `lib/seo/brand-copy.mjs` | 브랜드 문구 |
| `scripts/sync-legacy-static-to-public.mjs` | 로케일 셸 제목·매니페스트 이름. WebSite·Organization 이름이 원본과 다르면 생성 실패 |
| `scripts/generate-llms-txt.mjs` | llms.txt 서비스명·공식 홈·운영자·이력 절 |
| `index.html` | 정적 셸 head·JSON-LD (생성기가 검사) |
| `scripts/design/build-static-policy-pages.mjs` | 정적 정책 페이지(/about/ /faq/ 등) 헤더 브랜드·og:site_name |
| `app/page.js` | 루트 대표 홈 본문(정의·캐릭터·이력·공식 채널) |
| `app/kkul-kkul-unse/page.js` | 공식 주소·표기 안내와 FAQ 10문항 |
| `app/_content/faq-copy.js` | /faq/ 의 공식 사이트·표기 문항 |

AI 상담 프롬프트(`worker/lib/fusion-fortune-prompt.js`, `worker/lib/saju-compat-prompts.js`, `app/tarot/prompt-maker/utils/buildOraclePrompt.ts`)는 이 원본을 읽지 않는다. 2026-10-15 확인 결과 과거명은 없고 운영자명 "CODE DESTINY" 와 별칭 "꿀꿀운세" 만 있다. 그래서 유료 생성 프롬프트는 이번에 바꾸지 않았다.

## 바꾸는 절차

1. `lib/brand/brand-facts.mjs` 값을 고치고 `version` 을 1 올리고 `reviewedAt` 을 오늘로 바꾼다.
2. 정적 셸 `index.html` 의 title·meta·JSON-LD 를 같은 값으로 고친다.
3. 생성기를 돌린다: `npm run sync:public`, `node scripts/i18n-merge-authored.mjs`, `npm run llms:generate`, `npm run sitemap:generate`.
4. `node --test __tests__/ui/brand-facts.test.mjs __tests__/ui/json-ld-serialize.test.mjs` 와 `npm run check:fast` 를 통과시킨다. 빌드 뒤에는 `node scripts/verify-home-identity.mjs` 로 대표 5개 페이지를, `node scripts/verify-sitemap-canonical.mjs` 로 사이트맵 정본과 내부 링크를 확인한다(둘 다 postbuild 에서도 돈다).
5. 외부 채널 문구는 `external-brand-corrections.md`(같은 폴더) 를 따라 운영자가 직접 고친다.

## 확인이 필요한 항목

- 카카오톡 채널을 공식 외부 프로필(sameAs)로 선언할지
- 네오가 1:1 상담을 새로 받는지(현재 공개 문구: 사이트 상담은 AI 해설, 네오 1:1 상담은 별도 상품 — `lib/brand/founder.ts`)
- 콘텐츠 검수에서 사람이 확인하는 범위
- 마케팅 수신 동의 문구의 "꿀꿀운세(구 꿀꿀운세)" 자기참조: `lib/marketing/email-marketing.mjs` 의 `EMAIL_MARKETING_CONSENT_TEXT`, `lib/marketing/kakao-crm.mjs` 의 `CRM_CONSENT_TEXT`. 동의 문구를 바꾸면 동의 버전과 재동의 절차가 따라와야 해서 이번 변경에서 손대지 않았다. 메일 제목 접두와 전송자 표기(`worker/lib/email-marketing-template.js`, `worker/routes/email-marketing.js`)는 고쳤다
