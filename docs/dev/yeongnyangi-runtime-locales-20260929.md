---
status: mock-verified-release-pending
updated: 2026-09-29
next: main CI 통과 후 staging 화면과 양쪽 SHA를 확인하고 승인된 1회 production 승격 실행
---

# 영냥이 전체 런타임 언어 연결 검증

## 실제 지원 범위
정본은 lib/i18n/locale-normalize.js의 RUNTIME_LOCALES다.
ko, en, ja, zh-CN, zh-TW, vi, hi, es, fr, de, nl, ms 총 12개.
SEO용 공개 정적 로케일 목록과 런타임 목록은 역할이 다르다. 지원하지 않는 pt-BR·th·id를 임의로 추가하지 않았다. 중국어 간체와 번체는 이미 지원 중이다.

일반·질문·궁합·퓨전에 적용한다. 사용자가 이번 범위에서 제외한 신점·프라슈나/호라리의 한국어 안전 계약과 프롬프트는 유지한다.

## 화면과 결과
홈, 펼친 서비스 안내, 상품 상세, 가격 안내, 상담 입력과 프로필, 결제 전 안내, 결과/차트/공유/복구, 보관함을 로케일별 문구로 연결했다.
사이트 언어와 결과 언어는 기본적으로 같고, 결과만 별도로 바꾸어도 화면 언어는 유지한다. 결과 선택은 native select 하나이며 모든 12개 옵션을 공통 정본에서 가져온다.
외국어 화면의 한국어가 들어간 상품 이미지는 기존 글자 없는 반응 이미지로 표시한다. 사업자 등록상 원문·사용자 이름·원래 명식 용어는 원문 보존 대상이다.
지원하지 않는 화면 언어는 영어로 선택하고 안내를 보여준다. 명시적인 미지원 API 언어는 결제 결과를 몰래 다른 언어로 만들지 않고 거부한다.
결제 전과 저장 결과에서 결과 언어를 확인할 수 있다. 재열람·재시도는 저장된 구매 언어를 사용한다.

## 프롬프트
저장된 구매 스냅샷의 outputLocale, outputLanguageName, userCountryOrRegion, toneProfile, priceLocale을 LLM 요청으로 전달한다.
브라우저 언어의 국가 코드는 선택적 문맥이며 실제 거주지로 단정하지 않는다. KRW 가격·상품표는 그대로다.
결과 언어를 질문 언어보다 우선하고, 한국어 문장 혼입을 거부한다. 일본어 상담체, 자연스러운 영어, 중국어 간체/번체 구분과 현지 표현·과장 방지 규칙을 명시한다.
기존 생성 횟수·예산·복구·저장 규칙을 바꾸지 않았다.

## 검증
- npm run check:fast exit 0: paid mock gates 88/88, Jest 316 suites·4,576 tests 통과.
- 로케일 관련 targeted mock 58/58. 원격 main 통합 후에도 57개 관련 mock 및 123개 계약 조합 invariance 검사 1개 통과.
- 일반/질문/궁합/퓨전 × 12 = 48개 실제 서비스 prepare 경로를 mock 저장소에서 검증.
- 아래 12개 StructuredChapterProvider 요청은 fake LLM 결과로 검증했다. 실제 LLM 호출은 없다.
- incremental TypeScript, changed lint, sitemap 검증 통과.
- 로컬 Next 개발 모드에서 manifest/스크립트 로딩 오류가 재현되어 전체 브라우저 PASS로 기재하지 않는다. CI 정적 staging 산출물에서 scripts/verify-yeongnyangi-locale-browser.mjs로 HTTP/PG/LLM을 차단한 12개 화면 검증을 진행한다.
- staging/production 완료 여부는 릴리스 후 별도 실행 로그와 양쪽 SHA 증거로 보고한다. 이 문서는 사전 검증 기록이다.

## LLM mock 요청
| outputLocale | outputLanguageName | priceLocale |
| --- | --- | --- |
| ko | 한국어 | en |
| en | English | en |
| ja | 日本語 | en |
| zh-CN | 简体中文 | en |
| zh-TW | 繁體中文 | en |
| vi | Tiếng Việt | en |
| hi | हिन्दी | en |
| es | Español | en |
| fr | Français | en |
| de | Deutsch | en |
| nl | Nederlands | en |
| ms | Bahasa Melayu | en |

## 유지 정책과 확인 경계
가격표, Family 이용권/월정석/단건 결제 정책, PG 처리, 로그인 처리, DB 스키마는 이 로케일 변경으로 수정하지 않았다. 출력 문맥만 기존 구매 스냅샷에 추가한다.
기존 main의 동시 변경인 획득 지표·복구 문의 경로·한국어 홈 안내는 보존했다. 확인 대기 상태에서 자동 완성을 약속하는 문구는 모든 언어에서 사용하지 않는다.
실 LLM의 문장 품질, 라틴 문자를 공유하는 언어 사이의 완벽한 판별, 원어민 검수, 실결제, 운영 DB 쓰기, 실제 휴대폰 검증은 수행하지 않았다.
법률 문서 원문은 기존 공개 문서 로케일과 fallback 정책을 유지한다.

## 변경 파일
- `__tests__/ui/legacy-home-target.test.mjs`
- `__tests__/ui/yeongnyangi-all-locales.test.mjs`
- `__tests__/ui/yeongnyangi-reading-invariance.test.mjs`
- `__tests__/ui/yeongnyangi-reading-v7-copy.test.mjs`
- `__tests__/ui/yeongnyangi-spirit-service.test.mjs`
- `__tests__/ui/yeongnyangi-ui-locale-copy.test.mjs`
- `app/checkout/CheckoutClient.tsx`
- `app/checkout/checkout-copy.ts`
- `app/checkout/checkout-locales.ts`
- `app/components/CurrentLocationButton.tsx`
- `app/components/LocaleSwitcher.tsx`
- `app/components/LocalizedServiceSummary.tsx`
- `app/page.js`
- `app/yeongnyangi/1000-won-fortune/page.tsx`
- `app/yeongnyangi/_components/Consultation.tsx`
- `app/yeongnyangi/_components/Experience.tsx`
- `app/yeongnyangi/_components/FishReceipt.tsx`
- `app/yeongnyangi/_components/Library.tsx`
- `app/yeongnyangi/_components/LocalizedFortuneHome.tsx`
- `app/yeongnyangi/_components/LocalizedGuideScreen.tsx`
- `app/yeongnyangi/_components/LocalizedProductGuide.tsx`
- `app/yeongnyangi/_components/ProductGuide.tsx`
- `app/yeongnyangi/_components/ProfileForm.tsx`
- `app/yeongnyangi/_components/ReadingIdentity.tsx`
- `app/yeongnyangi/_components/ReadingLanguageSelect.tsx`
- `app/yeongnyangi/_components/Result.tsx`
- `app/yeongnyangi/_lib/account-locale-copy.ts`
- `app/yeongnyangi/_lib/ask-phase5-copy.ts`
- `app/yeongnyangi/_lib/chart-limitation-locales.ts`
- `app/yeongnyangi/_lib/chrome-copy.ts`
- `app/yeongnyangi/_lib/consultation-input-copy.ts`
- `app/yeongnyangi/_lib/consultation-input-locales.ts`
- `app/yeongnyangi/_lib/consultation-locale-copy.ts`
- `app/yeongnyangi/_lib/current-location-copy.ts`
- `app/yeongnyangi/_lib/jong-check-copy.ts`
- `app/yeongnyangi/_lib/jong-check-locales.ts`
- `app/yeongnyangi/_lib/journey-copy.ts`
- `app/yeongnyangi/_lib/reading-chart-copy.ts`
- `app/yeongnyangi/_lib/reading-chart-locales.ts`
- `app/yeongnyangi/_lib/reading-copy.ts`
- `app/yeongnyangi/_lib/reading-screen-locales.ts`
- `app/yeongnyangi/_lib/reading-v7-copy.ts`
- `app/yeongnyangi/_lib/reading-v7-locales.ts`
- `app/yeongnyangi/_lib/result-state-copy.ts`
- `app/yeongnyangi/_lib/share-copy.ts`
- `app/yeongnyangi/_lib/share-locales.ts`
- `app/yeongnyangi/_lib/tarot-ritual-copy.ts`
- `app/yeongnyangi/_lib/tarot-ritual-locales.ts`
- `app/yeongnyangi/_lib/use-reading-language.ts`
- `app/yeongnyangi/_original/FortuneHome.tsx`
- `app/yeongnyangi/_original/ServiceNavigation.tsx`
- `app/yeongnyangi/_original/SessionControls.tsx`
- `app/yeongnyangi/layout.tsx`
- `app/yeongnyangi/readings/[domain]/page.tsx`
- `config/sitemap-lastmod.json`
- `docs/handoff/growth-execution-2026-09-29.md`
- `lib/navigation/legacy-home-target.mjs`
- `public/data/ziwei-reading/index.json`
- `public/data/ziwei-reading/ziwei-career-palace-action-268224ba8b3f.json`
- `public/data/ziwei-reading/ziwei-career-palace-action-802b44b8f4b8.json`
- `public/sitemap-ko.xml`
- `public/sitemap.xml`
- `scripts/verify-yeongnyangi-locale-browser.mjs`
- `sitemap-ko.xml`
- `sitemap.xml`
- `worker/yeongnyangi/fortune/reading-locale.ts`
- `worker/yeongnyangi/providers/chapter.ts`
- `worker/yeongnyangi/service.ts`
