# 달빛 예화 복원과 정책 페이지 정적 통합

2026-09-08 · `codex/home-moonlight-performance`

작업 폴더: `D:/Development/code-destiny-moonlight-performance`.
이전 `code-destiny-mobile-design`의 미커밋 구현을 별도 워크트리에 이어받았으며 원본은 수정하지 않았다.

## 핵심 결과

- 홈에 기존 달빛 예화의 꽃·가지 선화, 초승달, 금빛 구분선과 테두리를 다시 연결했다. 모바일/데스크톱의 430px 캔버스와 CTA 구조는 유지했다.
- 정책 6종은 브라우저에서 React를 실행하지 않는 독립 HTML로 통합했다. 헤더·본문·푸터가 같은 크림/로즈/금빛 톤을 사용하며, 저장된 네오 모드에는 표면과 글자가 함께 대응한다.
- 기존 React 페이지·법적 본문·CMS 데이터는 **빌드 시 정본**으로 보존한다. `renderToStaticMarkup`과 빌드용 Link/Image 어댑터로 HTML을 생성하며, 방문자는 Next 레이아웃·인증/결제 제공자·하이드레이션 번들을 내려받지 않는다.
- 기존 메일 앱 기반 문의 폼에는 작은 DOM 스크립트만 사용한다. 서버 전송 API나 문의 접수 정책을 추가하지 않았다. JavaScript가 꺼져도 본문·목차·FAQ·메일 주소 안내가 동작한다.

## 수정 파일과 의도

| 파일 | 의도 |
| --- | --- |
| `templates/home-funnel.html`, `styles/home-funnel.css` | 홈의 초승달·꽃·가지·섹션 선화 복원. 이미지·외부 폰트·상시 애니메이션 추가 없음 |
| `scripts/design/gen-yehwa-motifs.mjs`, `styles/yehwa-motifs.css`, `public/icons/yehwa-branch.svg` | 새 홈의 마스크 변수 범위를 연결하고 정책용 가지 SVG를 같은 정본에서 생성 |
| `app/components/PolicyGuide.module.css`, `styles/static-policy.css` | 정책 히어로 선화와 독립 헤더·푸터·본문·모바일·네오 스타일 |
| `scripts/design/build-static-policy-pages.mjs` | 기존 6개 페이지·CMS·사업자 정보·메타데이터·구조화 데이터를 정적 HTML로 생성 |
| `lib/navigation/static-policy-routes.mjs` | 정본 주소·별칭·개발환경 매핑·문서 이동 판정을 한 곳에서 관리 |
| `next.config.mjs`, `app/components/ShellHomeHardNavGuard.tsx` | 개발에서도 같은 HTML을 제공하고 React 내부 링크도 정적 문서로 이동. 쿼리·해시 보존 |
| `scripts/sync-legacy-static-to-public.mjs`, `scripts/run-postbuild.mjs`, `scripts/promote-static-policy-pages.mjs` | 미리보기 생성과 최종 배포 산출물 승격을 빌드에 연결 |
| `js/static-policy-contact.js` | 기존 문의 내용으로 mailto를 구성하고 주소 복사 실패 시 대체 안내 제공 |
| `scripts/design/verify-{home-funnel,static-policy}.cjs`, `scripts/design/measure-{home-funnel,static-policy}.mjs`, 관련 UI 테스트 | 화면·별칭·React→정적 이동·무JS 동작·연락 동작·성능 비교 검증 |
| `public/static/policies/**`, `public/styles/**`, `public/js/**`, 셸 미러 | 위 정본에서 생성한 결과. 새 정본을 중복 작성하지 않음 |

## 주소와 생성 흐름

| 정본 URL | 유지한 별칭 | 개발용 생성 파일 |
| --- | --- | --- |
| `/terms/` | `/terms-of-service/` | `/static/policies/terms/index.html` |
| `/privacy/` | `/privacy-policy/` | `/static/policies/privacy/index.html` |
| `/refund-policy/` | — | `/static/policies/refund/index.html` |
| `/contact/` | `/contact-us/` | `/static/policies/contact/index.html` |
| `/about/` | — | `/static/policies/about/index.html` |
| `/faq/` | — | `/static/policies/faq/index.html` |

`npm run sync:public`에서 정적 정책을 생성한다. 프로덕션 빌드에서는 기존 정적 셸 승격 다음, AdSense 검증 전에 9개 주소의 HTML을 승격한다. React 소스는 삭제하지 않으며, 정적 생성기·개발 매핑·승격 단계·문서 이동 분기만 되돌리면 기존 경로로 복원할 수 있다. 한국어 정책 6종에 한정하며 다른 언어 정책과 운세 기능은 변환하지 않는다.

## 성능 실측

이전 보고서의 로컬 프로덕션 빌드 `code-destiny-mobile-build/dist/privacy/index.html`과 새 정적 개인정보 페이지를 비교했다. 같은 로컬 gzip 서버·Lighthouse mobile 설정을 사용하고 외부 요청과 실 API는 차단했다. **운영 사이트 실측이나 실제 단말 측정은 아니다.**

| 지표 | 이전 React 빌드 | 정적 HTML |
| --- | ---: | ---: |
| 성능 | 57 | 100 |
| 접근성 | 96 | 100 |
| SEO | 100 | 100 |
| LCP | 9.97초 | 1.13초 |
| CLS | 0 | 0 |
| TBT | 0ms | 0ms |
| 전송량 | 1,050,068B | 69,787B |
| `/_next/` 요청 | 37 | 0 |

공통 사이트 JSON-LD를 포함한 측정 시점의 수치다. 이후 robots/OG 메타 보존을 보완했으므로 최종 파일 바이트와는 소폭 차이가 있다. 최초 비교에서는 이전 LCP 8.40초·새 LCP 1.13초였고, 이전 페이지의 하이드레이션/사전 요청 수는 측정마다 변동이 있었다. 단일 운영 지표로 일반화하지 않는다. 최종 검증에서 React 요청 0과 본문 보존을 별도로 확인했다.

홈은 이어받은 화면에서 성능 62/LCP 7.05초/CLS 0을 측정했다. 필수 CSS 사전 다운로드는 LCP 개선이 없었고, 기존 비동기 CSS를 낮은 우선순위로 바꾸는 실험은 LCP/CLS가 악화되어 **최종 코드에서 모두 제거했다**. 홈 성능이 개선됐다고 주장하지 않는다. 큰 초기 번들·차단 CSS는 남아 있으며, 기존 배포용 externalize/minify 파이프라인과 구분해 후속 최적화해야 한다.

## 유지한 정책과 검증

- 이전 프로덕션 빌드와 6개 페이지의 `main` 텍스트를 비교했다. 공백 정규화 후 전부 동일했다: 약관 10,821자, 개인정보 4,540자, 환불 2,173자, 고객센터 1,594자, 소개 3,940자, FAQ 1,648자.
- 이용권·월정석·단건 결제, 가격·한도·만료·환불 조건, 결제 승인·모바일 복귀, 인증 로직·API 응답·DB 스키마를 수정하지 않았다.
- `npm run worktree:status`: 공통 셸/미러 중첩 확인. 원본과 다른 작업의 변경은 보존했다.
- `npm run sync:public`, 홈 생성기 `--check`, 예화 생성기 `--check`: 통과.
- `npm run check:fast -- --base=HEAD --plan`, `npm run check:fast -- --base=HEAD`: 계획 확인 및 전체 변경 검사 통과. Node 882/882, Jest 217개 묶음·2,402개 테스트 통과. 기존 mock 라우팅 테스트는 정책 별칭 추가를 반영하면서 API 차단 검증을 보존했다.
- 마지막 문서 이동 보완 후 `npm run typecheck`, 변경 TSX ESLint, 정책·mock·셸 이동 관련 Node 테스트 15개: 통과.
- `node scripts/design/verify-home-funnel.cjs` (`HOME_UI_ORIGIN=http://127.0.0.1:22740`): 홈 360/390/430/1280px, CTA, 무료 입력, 검색/필터/빈 상태, 계정·프로필 mock 저장/불러오기, 정책 6종 통과.
- `node scripts/design/verify-static-policy.cjs`: 9개 주소·4개 화면 폭, 무JS 본문/FAQ/문의 대체 안내, React→정적 문서 이동 및 쿼리/해시 보존 검사.
- `npm run verify:hero-contrast`, `npm run verify:mobile-detail-nonintrusive`, `git diff --check`: 통과.
- `node scripts/design/measure-static-policy.mjs --baseline-root=D:/Development/code-destiny-mobile-build/dist`: 위 Lighthouse 비교. 원시 결과 `build-cache/static-policies/lighthouse-*.json`.
- 전체 빌드는 `D:/Development/code-destiny-moonlight-build`에서 네트워크 가드와 합성 API 주소 `https://mock.code-destiny.invalid`로 검증한다. 공유 node_modules만 연결하며 `.next`·`dist`·`out`은 개발창과 별도다. 초기 시도는 개발용 mock 플래그가 API 설정을 비워 기존 프로덕션 assertion에서 실패했다. 앱 로직은 바꾸지 않고 빌드 환경만 분리했으며, 외부 통신 차단은 계속 적용했다. 전역 프로세스 검사에 다른 워크트리의 개발 서버가 잡히는 경우에는 독립 `.next` 경로를 확인하고 이 빌드에만 `ALLOW_DEV_SERVER_DURING_BUILD=1`을 사용했다.
- `npm run build:cf`: 컴파일·724개 정적 페이지 생성 완료. 첫 후처리에서 정책 HTML의 명시적 robots 메타와 canonical 끝 슬래시가 기존 게이트에 걸렸다. 검증기는 바꾸지 않고 생성기를 기존 SEO 정본(`toCanonicalUrl`)에 연결하고 메타를 보존하도록 수정했다. `npm run postbuild` 재실행 **종료 코드 0**: 정책 6종·별칭 3개 승격, AdSense·정책 본문 검증, 기존 JS/CSS minify·HTML 주석 정리 통과. 변경은 후처리 생성기에 한정되어 Next 컴파일 산출물은 재사용했다.
- 기존 `i18n:check`는 비차단 경고로 남았다. 전체 다국어 번역과 공유 의존성의 독립 설치는 이번 완료 범위에 포함하지 않는다.
- 최종 `dist`를 로컬 정적 서버에서 제공한 뒤 `verify-static-policy.cjs` 재실행: **통과**. 9개 URL의 HTTP 200, 4개 폭, 무JS 읽기/FAQ/문의 안내, React→정적 문서 이동 및 쿼리·해시 보존을 최종 산출물에서도 확인했다. [산출물 검사 결과](moonlight-results/production-verification.json).

## 결과 보기

- 미리보기: [정적 개인정보 페이지](http://127.0.0.1:22740/privacy/), [홈](http://127.0.0.1:22740/static/index.html).
- 캡처: [홈](moonlight-results/home-390.png), [정책 헤더·본문](moonlight-results/privacy-policy.png), [정책 푸터](moonlight-results/privacy-footer.png).
- 증거: [Lighthouse 요약](moonlight-results/lighthouse-summary.json), [무JS·별칭·문서 이동 검증](moonlight-results/static-verification.json).

## 남은 확인

운영 배포·실결제·실 LLM·운영 DB 검증은 하지 않았다. 이전 구현과 이번 후속 수정 모두 미커밋 변경을 포함하므로, 공유 셸과 생성 미러를 다른 작업에 합칠 때 순차 통합이 필요하다. 홈 초기 번들 분리와 실제 단말/운영 지표는 후속 대상이다. CI 독립 설치 검증도 남아 있다.
