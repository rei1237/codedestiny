# 꿀꿀 운세 최종 브랜드 정비 — 2026-10-13

## 현재 상태와 범위
공식명은 모든 언어에서 **꿀꿀 운세**. **꿀꿀운세**는 띄어쓰기 없는 검색 변형이다. 기존 10/13 무띄어쓰기 복원 작업의 후속이며 운영 승격·검색엔진 제출은 하지 않았다. 신규 URL·대량 콘텐츠 생성은 보류했다. 현재 브랜드 탐색은 `/ggulggul/`, 공식 주소·채널·이용 안내는 `/kkul-kkul-unse/`가 담당한다.

사용한 실제 지침: `.claude/skills/seo-audit/SKILL.md`, `content-strategy/SKILL.md`, `programmatic-seo/SKILL.md`. 모두 로컬 설치 확인·읽기 완료. 외부 설치 코드는 실행하지 않았다.

## 1. 원인: 관측과 가설
| 우선순위 | 관측 증거 | 가능한 원인 / 확정 여부 | 수정 및 검증 |
| --- | --- | --- | --- |
| P1 | 운영 홈 title·OG·WebSite가 꿀꿀 사주, 브랜드 안내가 반대 개명을 설명 | 이름 불일치는 확정. 전체 검색 순위 원인이라는 인과관계는 미확정 | 원본·번역·메타·이미지를 꿀꿀 운세로 통일, 운영 반영 후 동일 URL 비교 |
| P1 | 네이버 두 브랜드 질의에서 공식 URL이 나오지만 이전 이름·개명 안내와 AI 브리핑이 표시됨 | 전체 미노출이 아님. 과거 콘텐츠가 현재 식별을 혼동시키는 관측 | 안내 내용 수정 후 수집·색인·검색 제목을 각각 관찰 |
| P2 | 소스 WebSite 별칭에 꿀꿀 사주·Code Destiny 등이 혼재 | 브랜드 신호 혼재 확정, 별칭 정리가 채택을 보장하지는 않음 | 별칭은 꿀꿀운세 하나, Organization 공개명과 legalName 분리 |
| P2 | 소개·문의·다국어 페이지의 공개 제목과 런타임 사전이 이전 이름 사용 | 표시 불일치 확정 | 고유 주제는 보존하고 공개 브랜드만 교정, 원본 HTML/JS 전후 비교 |
| 미확인 | GSC/서치어드바이저 로그인 접근 없음, Google 검색 자동화 확인 | 색인 제외·Google canonical·수동 조치·WAF 봇 차단은 확정 불가 | 로그인 후 URL 검사·실적·보안 보고서 확인 |

홈·사주·타로·안내는 일반 HTTP 요청에서 200/self-canonical/index follow. robots·사이트맵 200, 한국어 XML 454 URL과 대표 4 URL 포함. http/www는 https non-www로, 루트는 `/ggulggul/`로 이동하며 슬래시 없는 대표 경로는 308. 404 표본은 실제 404. 이 표본에서 P0 차단을 확인하지 못했으며 전체 사이트/실제 검색봇 접근을 보장하지 않는다. lastmod 표본 2026-10-12는 관측값이고 새 날짜로 수동 조작하지 않았다.

## 2. 수정 의도와 원본
공통 SEO·브랜드 사전(`lib/seo/siteSeo.ts`, `brand-copy.mjs`), React 헤더/푸터·페이지별 제목, 정적 홈 템플릿·manifest·번역 원본, 공유 카드 생성기를 수정했다. WebSite/Organization 공개 이름을 일치시키고 법적 명칭은 `BUSINESS_IDENTITY.companyName`에서 계속 가져온다. 기존 기술 키·URL·라우팅은 유지했다. 번역기는 정확한 고유명사 ‘꿀꿀 운세’만 한국어 잔존 검사에서 제외하고 나머지 미번역 검사는 유지한다. 기존 키만 갱신하는 생성 옵션으로 core 사전에 불필요한 namespace를 추가하지 않는다.

기사 원문 제목·원문 링크·과거 공개 분석 인용은 보존하고 우리가 작성한 요약·탐색 제목의 현재 서비스 표기만 수정했다. 이미지의 CODE DESTINY는 법적 발행처 표기이며 브랜드 영역은 꿀꿀 운세다.

## 3. 콘텐츠 전략
| 검색 의도 | 기존 목적지 | 고유 가치 / 중복 위험 |
| --- | --- | --- |
| 공식 서비스 탐색 | /ggulggul/ | 실제 서비스 선택과 상담 진입; 신규 브랜드 랜딩 불필요 |
| 공식 주소·채널·이용 방법 | /kkul-kkul-unse/ | 공식 링크·FAQ; 홈과 동일한 키워드 나열 금지 |
| 사주 계산·기질 이해 | /saju/, /manse/ | 계산 기준과 도구 연결; 기존 설명을 개선 |
| 연애·재회·선택 고민 | /tarot/ 및 기존 질문별 페이지 | 해석 범위와 실제 시작 링크; 신규 변수치환 페이지 없음 |
| 서비스 신뢰·문의 | /about/, /contact/, /methodology/ | 확인된 운영자·해석 방법·문의 경로 |

programmatic-seo 확장은 보류한다. 브랜드 문제를 새 URL로 해결할 근거가 없고 기존 콘텐츠와 경쟁하는 얇은 페이지가 될 위험이 있다. 기존 유입 페이지 삭제·대량 noindex 없음.

## 4. 검색 기준선과 접근 한계
2026-10-13 16:43–17:14 KST, 연결 Chrome 데스크톱·비로그인 한국어 공개 검색. 순위 숫자는 측정하지 않았다. 브라우저 재연결이 발생해 지속 로그인 환경은 확보하지 못했다.

| 엔진 / 질의 | 확인된 공식 URL·제목 |
| --- | --- |
| 네이버 / 꿀꿀 운세 | /kkul-kkul-unse/ ‘꿀꿀 운세는 이제 꿀꿀 사주예요…’, /ggulggul/ ‘꿀꿀 사주 — 사주·궁합·타로’; AI 브리핑에 이전 개명 설명 |
| 네이버 / 꿀꿀운세 | /ggulggul/ 및 브랜드 안내, 동일한 이전 제목 |
| 네이버 / 꿀꿀 사주 | 브랜드 안내 및 홈, 이전 제목 |
| 네이버 / Code Destiny | /about/ ‘Code Destiny 소개…’, /saju/guide/ |
| 네이버 / code-destiny.com | 브랜드 안내 및 /saju/guide/ |
| 네이버 / site:code-destiny.com | 홈·/en/·/faq/ 표본. 전체 색인 목록 아님 |
| Google / 꿀꿀 운세 | /sorry/ 자동화 확인 화면. 결과 미확인; 나머지 질의도 검색 기준선 미확보 |

Google Search Console은 공개 소개 화면, 네이버 서치어드바이저는 로그인 화면으로 이동했다. 속성/소유권·URL별 수집/색인·선택 canonical·사이트맵 처리·수동 조치·보안·질의별 실적은 미확인이다. 사용자는 로그인 연결 방식을 선택했으며, 연결 후 대표 URL과 보고서를 읽기 전용으로 확인한다. 일반 UA 요청으로 실제 Googlebot/Yeti 성공을 주장하지 않는다.

## 5. 유지한 영역과 잔존 표기
결제 가격·이용권·월정석·단건 결제, 인증·API 계약·DB 스키마·사업자 원문·동의 버전·도메인·기존 URL 유지. 실결제·유료 LLM·운영 DB 쓰기·WAF 변경 없음.

의도적 잔존: 법적 CODE DESTINY/코드 데스티니, 기술 식별자/패키지/외부 계정 URL, 과거 인용·문서, 관리자 내부 문구, 기존 마케팅 동의문 버전과 동의 기록, 검수 해시가 고정된 방법론 원고(`app/insights/methodology-articles.js`, `seo-growth-articles.js`), 기존 곡명·가사·오디오 파일명. 현재 브랜드 안내 FAQ에만 이전 이름 관계를 짧게 남긴다. 마케팅 동의 버전은 인증/동의 계약을 바꾸지 않기 위해 유지하며 별도 동의문 버전 변경 범위로 보고한다.

## 6. 검증
- Node 브랜드·공통 화면·로케일 푸터·후기·보관함 검사 29개, 번역 생성기의 기존 키 보존/미번역 거부 검사 1개 통과.
- verify:business-identity, verify:payment-freeze, verify-i18n-public-parity --all, verify:seo-entity-registry 통과.
- 로컬 8경우: 홈 JS off/on 390px, JS on 1280px; en JS off/on, ja/zh/zh-tw JS off 390px. 제목·사이트명 일치 및 가로 넘침 없음. 외부 요청 차단/API mock. 상담·결제 기능이나 전체 Next 빌드의 브라우저 검증을 의미하지 않는다.
- 생성: 번역 원본 병합, OG 5언어 렌더, public sync, llms, sitemap. sitemap 955 URL 유지; lastmod는 생성기가 실제 소스 변경을 반영.
- 첫 check:fast는 paid suite 87/88에서 npm test 내 4개 단언이 실패했다. 고유명사 번역 예외, 누락된 사전 브랜드 키를 보완하고 검수 원고를 복구한 뒤 해당 회귀 23개가 통과했다. 두 번째 실행은 paid suite 88/88 통과 후 마지막 편집에 따른 sitemap 원장 드리프트로 중단했다. 생성기를 실행해 정합성을 복원했다. 세 번째 실행은 Node 3,199/3,200 통과 후 이전 siteName 4개를 허용하던 정적 단언 하나가 실패했다. 비한국어 잔여 siteName도 공식명으로 맞추고 예외를 0개로 바꾼 회귀 검사는 통과했다. 통합본 `npm run check:fast -- --committed-head --base=main`은 exit 0으로 완료했다. paid suite 88/88, Node 3,210/3,210, Jest 395 suites·6,033 tests, lint·typecheck·Worker dry-run·인코딩 등 계획된 전체 가드 통과. `check:pre-push`는 브랜드 커밋에서 이미 통과했으며 최종 기록 커밋에서도 재확인한다. 통합 후 pre-push에서는 index-inline-runtime의 병합된 내용 해시가 HTML 캐시 키에 한 번 더 반영되어야 하는 8개 미러 차이를 발견했다. 생성기를 재실행해 캐시 참조만 갱신하고 pre-push를 재검사한다. 원격 push와 CI의 최종 SHA·실행 링크는 전달 응답에 기록한다.

## 7. 전달과 운영
A 코드 수정: 완료(법적 명칭·고정 검수 원고 등 명시한 예외 보존). B 로컬 검증: 통과, 구현 커밋 `b1aec3eed`, main 통합 `5ef271ef4`, 추가 공개 표기 `9d7a92315`. 최종 main push/CI는 이 문서 저장 이후 전달 단계에서 확인한다. C 운영 반영: 미실행. 18:08 KST 재검사에서 홈·사주·타로는 꿀꿀 사주, 안내는 반대 개명 제목이며 Pages/Worker 모두 `63ae9564903a789e867295a1c444520b3881c353`다. D 콘솔 색인: 엔진별 미확인. E 네이버: 이전 이름으로 공식 URL 노출 관측; Google: 미확인. 운영 승격·검색엔진 제출은 별도 승인 후 실행한다. 현재 코드 후보 `9d7a92315`의 운영 기준점 이후 이력은 [release-scope.json](evidence/2026-10-13-brand-final/release-scope.json)에 있다. 운영 승격은 이번 SEO뿐 아니라 기존 main의 결제 복구·영냥이 품질·보안 등 누적 변경도 포함하며, 여기서는 승격하지 않았다.

## 8. 측정 계획
D0는 운영 HTML과 배포 버전 확인일이며 현재 null. D+7 재수집/제목 잔존, D+14 질의별 노출·클릭·CTR·평균 게재순위 및 대표 URL, D+28 배포 전/후 완결 28일 비교. 같은 엔진·검색유형·국가·기기·질의 필터를 유지하고 데이터 지연시 판정을 연기한다. 검색어/페이지 집계 독립 비교, 임의 결합·누락값 0 처리 금지. 기존 10/08 실험과 겹치므로 효과를 이번 변경에 단독 귀속하지 않는다. 자동 예약 없음.

## 9. 근거
- [Google 사이트 이름](https://developers.google.com/search/docs/appearance/site-names): 이름과 페이지 제목의 구분, 신호 일치, 리다이렉트 대상과 재수집 지연.
- [네이버 SEO 기본 가이드](https://searchadvisor.naver.com/guide/seo-help), [제목/설명 갱신](https://searchadvisor.naver.com/guide/faq-serpedit).
- [운영 HTTP 표본](evidence/2026-10-13-brand-final/public-baseline.json), [18:08 운영 버전·HTML 재확인](evidence/2026-10-13-brand-final/production-before-delivery.json), [로컬 브라우저 표본](evidence/2026-10-13-brand-final/local-browser.json).

## 변경 파일 목록
전체 변경 경로는 [changed-files.json](evidence/2026-10-13-brand-final/changed-files.json)에 기록한다. 대부분 공통 브랜드 문구와 그 생성 미러이며, 기능 로직을 재설계하지 않았다. 번역 원본은 `i18n/authored/brandSignals-01.json`, 공유 카드 원본은 `scripts/og/vvip-card.html`, 생성 검사는 `__tests__/ui/brand-search-identity.test.mjs`와 `brand-dictionary-generation.test.mjs`다.
