# 모바일 홈·정책 페이지 구현 보고서

후속 구현: [달빛 예화 복원·정책 페이지 정적 통합 및 성능 검증](moonlight-static-policy-followup.md). 아래는 최초 구현 기록이며, 정책 페이지의 현재 제공 방식과 최신 측정은 후속 보고서를 따른다.

2026-09-08 · `codex/mobile-home-policy-design` · 기준 `b2244641`

실제 서비스 홈 정본과 정책 페이지에 적용했다. 개발 미리보기는 `http://127.0.0.1:4180/static/index.html`이다. 운영 배포·실결제·실 LLM 호출은 수행하지 않았다.

요청한 `impeccable` 4.2.2 설치를 확인하고 Code Destiny의 실제 홈 정본·가격 데이터·mock 검증·기존 에셋 재사용 규칙에 맞춘 로컬 참조를 추가했다. 원본 스킬을 백업했고 스킬 형식 검증도 통과했다. 전역 제품 디자인 문서는 덮어쓰지 않았다.

## 1. 변경한 파일

- 홈: `index.html`, `templates/home-funnel.html`, `styles/home-funnel.css`, `js/core/home-funnel.js`, `js/core/home-service-finder.js`.
- 공통 내비게이션: `app/_lib/mobile-tabs.ts`, `app/components/MobileBottomNav.tsx`, `js/core/index-inline-runtime.js`, `public/i18n/*.json`의 새 탭 문구.
- 정책 공통: `app/components/PolicyGuide.jsx`, `app/components/PolicyGuide.module.css`.
- 정책 페이지: `app/{terms-of-service,privacy-policy,refund-policy,contact-us,about,faq}/page.js`.
- 생성·정리: `scripts/design/{build-home-funnel,prune-legacy-home,legacy-home-selectors,gen-yehwa-motifs}.mjs`, `scripts/sync-legacy-static-to-public.mjs`.
- 기존 장식 CSS 제거: `styles/{cosmic-main,fortune-ui-home,fortune-ui,yehwa-motifs}.css` 및 홈 인라인 스타일.
- 검증: `scripts/design/{verify-home-funnel.cjs,measure-home-funnel.mjs}`, 홈 모티프 정적 테스트와 firstpaint/mobile/payment UI 가드의 실제 홈 선택자.
- 생성된 `public/` HTML·JS·CSS 미러, 캐시 해시, sitemap/RSS 갱신도 포함한다. 결제·인증 관련 JS의 해시 치환은 로직 변경이 아니다.
- 디자인 기록: [초기 분석](mobile-funnel-audit.md), [화면별 디자인 명세](mobile-home-surface.md). 초기 목업은 `mobile-funnel-preview/`에 보존했다.

## 2. 기존 문제

무료 시작·오늘 운세·추천·카테고리·검색 진입이 여러 군데 중복됐다. 옛 Hero 장식을 `display:none!important`로 덮는 CSS가 여러 차례 누적됐고, 큰 장식 이미지와 검색 목록 작업이 초기 화면에 불필요한 비용을 더했다. 정책 페이지는 본문 중심이라 결제·환불·개인정보 항목을 빠르게 찾기 어려웠다.

## 3. 새 메인 구조

브랜드/계정 → 두 CTA와 꽃돼지 Hero → 질문별 6개 진입 → 이용권 비교 → 전문가의 편지 → 대표 상담 4개 → 검색 한 줄 → 정책/고객센터 링크. 전체 서비스는 별도 화면 상태에서 기존 검색·카테고리·방식·가격 필터를 활용한다. 기존 서비스 레지스트리와 상담 진입 함수를 연결했다.

## 4. 모바일 UX

360·390·430px에서 CTA 둘 다 첫 화면과 하단 내비게이션 위에 표시된다. CTA 높이는 50px이다. 사용자의 추가 요청에 따라 데스크톱도 최대 430px의 중앙 화면과 한 열 카드·동일한 글자/이미지 크기로 통일했다. 홈과 정책 CSS의 모바일 분기를 공통 규칙으로 올리고 중복 선언을 정리했다. 하단 탭은 홈/무료/상담/이용권/마이 다섯 개다. 무료 시작 후 원래 입력폼을 열고 홈 복귀 링크를 제공한다. 기존 고급 입력 접기·프로필 저장·불러오기 기능을 보존했다. 로그인 계정 메뉴의 원래 로그아웃 컨트롤도 접근 가능하다. focus-visible, reduced-motion, 대비, 터치 크기를 보완했다.

## 5. 이용권 가격 메시지

Hero 보조 CTA와 이용권 비교 영역에 반영했다. 5,000원 × 6회 = 30,000원과 스탠다드 9,900원을 비교한다. 숫자는 기존 `lib/payment/pass-pricing.js`, `worker/lib/profile-limits.js`로 생성한다. 건별 가격 상한·기간 내 총 한도·30일 또는 한도 소진 시 종료·자동결제 없음·이용권으로 이용권 구매 불가 조건을 함께 표시한다. 추천 상담 가격과 이용권 가능 여부는 서비스 레지스트리 및 한도로 계산한다.

## 6. 전문가 신뢰 메시지

Hero 신뢰 배지, 이용권 다음 전문가 편지, `/about/#author`에 10년 경력 명리학자의 제작·검수 기준을 표시했다. AI의 표현 보조와 사람이 설계한 해석 기준을 구분하고, 미래 보장이 아닌 선택 참고 자료라는 기존 원칙을 유지했다.

## 7. 정책 페이지

6개 페이지에 작은 꽃돼지 Hero, 핵심 요약 3개, 주요 안내 이동 링크와 일관된 본문 폭·행간을 적용했다. 개인정보는 비회원/회원·프로필 삭제·문의, 환불은 단건/이용권·사용 콘텐츠·결제 반영 지연/모바일 복귀 안내를 찾기 쉽게 했다. 기존 법적 본문·메타데이터·구조화 데이터·CMS 계약을 유지했고, FAQ는 아코디언으로 정리했다. 새 환불 보장이나 결제 혜택은 만들지 않았다.

## 8. 성능과 불필요한 코드 정리

- 첨부 꽃돼지와 해시가 같은 기존 `/icons/app-logo-512.webp`를 재사용했다(512×512, 31,916바이트). 결제 대기 화면과도 같은 URL을 공유한다. 이미지 preload는 이 한 개뿐이다. 정책 이미지는 lazy-loading이다.
- 수면 연이·zzz·달/타로 장식·옛 섬 배경의 실제 DOM과 전용 CSS·키프레임·낡은 주석을 제거했다. 정본 HTML/CSS에서 약 170KB의 레거시 코드를 삭제했다. 생성기도 정리해 옛 CSS가 다시 출력되지 않는다.
- 전체 서비스 목록 생성·검색 준비는 전체 서비스 화면을 열 때 시작한다. 새 홈 렌더러는 결제·권한 조회를 추가하지 않는다.
- 새 외부 폰트나 원격 이미지 의존성을 추가하지 않았다. 이미지 크기를 명시했고 측정 CLS는 0이다.
- 필요한 입력폼·결과/상담 화면·결제 모달은 단순히 첫 홈에서 안 보인다는 이유로 삭제하지 않았다. 전역 미사용 CSS의 일괄 삭제는 동적 상태를 손상할 수 있어 이번 정리는 퇴역한 홈 비주얼 범위로 제한했다.

## 9. 검증

- 실제 로컬 홈의 Playwright mock 검사: 360×640, 390×844, 430×932, 1280×900에서 가로 넘침 없음, CTA 가림 없음, 무료 입력·검색·필터·검색 빈 상태 통과.
- 6개 정책 URL 응답 200, 요약 카드 3개와 실제 앵커 연결 통과.
- 가상 회원/프로필 API만 사용해 계정 컨트롤, 기존 검색 딥링크, 프로필 저장 1회 및 다시 불러오기 통과. 외부 요청은 차단했다.
- 결제·이용권·PortOne·모바일 resume·유무료 gate는 기존 자동 회귀 검사로 검증한다. 실 PG 앱 복귀나 실제 결제 성공을 테스트한 것은 아니다.
- 최종 Lighthouse mobile 로컬 비교: 성능 55→61, 접근성 94→100, SEO 100→100, LCP 15.47→7.13초, TBT 17→31.5ms, CLS 0→0. 원시 결과는 `build-cache/home-ui/lighthouse-{baseline,current}.json`에 있다. 이전 측정에서는 개선 후 성능 55/LCP 14.54초로 변동이 컸다. 로컬 정적 서버/외부 요청 차단 측정이므로 운영 수치를 뜻하지 않으며 LCP 최적화가 더 필요하다.
- 실행 명령: `npm run worktree:status`, `npm run check:fast -- --plan`, `npm run sync:public`, `npm run check:fast -- --base=HEAD`, `node scripts/design/verify-home-funnel.cjs`, `node scripts/design/measure-home-funnel.mjs`, 격리 빌드 폴더에서 네트워크 가드 적용 `npm run build:cf`.
- 최종 `check:fast -- --base=HEAD` 종료 코드 0: Node 875/875, Jest 217개 묶음·2,402/2,402 통과. lint/typecheck 및 실행된 결제·이용권·모바일 회귀 가드도 통과했다. 생성기 `--check`, firstpaint 가드, `git diff --check` 통과.
- 분리된 빌드 폴더의 `npm run build:cf` 종료 코드 0: 컴파일·724개 정적 페이지 생성·광고/정책 본문 검사·배포 파일 생성 통과. 초기에는 일일 데이터 생성 선행 단계 및 Windows의 다중 preload 인자 문제가 있었고, 정식 prebuild와 빌드 폴더 한정 단일 preload 체인으로 해결했다. 네트워크 차단 가드는 계속 적용했다. 고객센터의 기존 영문 `Contact Us` 본문 표기도 보존했다.
- [실제 홈/입력/정책 캡처와 mock 검사 결과](mobile-funnel-results/verification.json), [Lighthouse 요약](mobile-funnel-results/lighthouse-summary.json)을 함께 보존했다. 테스트 중 개발 서버가 재생성 파일을 읽는 순간 발생한 일시적 JSON 500은 생성 완료 후 재검사하여 6개 정책 모두 200으로 확인했다.

## 10. 유지 정책·위험·후속 작업

이용권/월정석/단건 정책, 실제 가격, 결제 승인·모바일 resume, 인증·API 응답·DB 스키마를 변경하지 않았다. 소스 체크아웃의 다른 미커밋 변경을 덮지 않았다. 개발창과 분리된 작업 폴더에서 빌드한다.

공통 `index.html` 및 생성 미러는 다른 작업과 겹치므로 통합 시 순차 확인이 필요하다. 공유 node_modules의 lock mismatch가 있어 CI의 독립 설치 검증이 필요하다. 큰 기존 초기 번들·차단 CSS가 남아 LCP 후속 최적화가 필요하다. 새 홈의 긴 소개 카피는 한국어이며, 새 탭명 외의 전체 다국어 번역은 후속 작업이다. 운영 배포와 실제 단말의 PG 복귀 확인은 수행하지 않았다.
