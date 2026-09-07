# Code Destiny 모바일 홈·정책 UI 분석 및 검토안

작성: 2026-09-08. **구현 전 초기 조사 기록**이다. 이후 사용자의 구현 요청에 따라 실제 서비스에 적용했다. 최종 변경·검증은 [구현 보고서](mobile-funnel-implementation.md)를 참고한다. 아래 목업 단계의 상태는 조사 당시 기록이다.

## 1. 파일과 작업 경계

- 작업 브랜치: `codex/mobile-home-policy-design`
- 격리 경로: `D:/Development/code-destiny-mobile-design`
- 기준 커밋: `b2244641d97ecf4b8e82dcc5309fa255c4f2ae7a`
- 원본 체크아웃 `D:/Development/code-destiny`의 미커밋 변경은 보존했다. `index.html`, 엔진, 설정, public 미러 등 다른 작업의 변경을 덮어쓰지 않았다.
- `npm run worktree:status`: 20개 워크트리, 공통 파일 중첩 확인. 이 숫자는 실행 중인 에이전트 수가 아니다.
- 추가 파일은 `docs/design/mobile-funnel-preview/`의 목업 HTML/CSS/JS, 첨부 이미지 사본, 검증 스크립트, 스크린샷·측정 결과 및 이 분석서다. 서비스 소스는 수정하지 않았다.
- `CLAUDE.md` 코딩 원칙 16: **“큰 화면 개편은 목업 승인 후 구현한다.”** 실제 서비스 적용은 이 목업 확인 후 진행한다.

## 2. 기존 문제와 실제 코드 구조

### 홈 정본과 순서

홈 정본은 `index.html`이다. `app/page.js`를 바꾸는 방식으로는 실제 홈을 안정적으로 수정할 수 없다. `public/`의 HTML은 `sync:public`으로 생성하는 미러다.

주요 마크업 순서는 아래와 같다. 숨겨진 섹션·폼·모달이 섞여 있으며, 이것은 **DOM 순서**이지 모든 항목이 동시에 보인다는 뜻은 아니다.

1. `.moon-hero`: 브랜드, Hero, CTA, 신뢰·탐색 링크, 달·연이 비주얼.
2. `.dp-destiny-panel`, `#destinyCardForm`: 프로필과 접힌 무료 입력폼.
3. `#cdQuickServices`: 무료로 바로 시작하기.
4. `#cdWhyUs`: 왜 Code Destiny인가.
5. `#cdTodayHub`, `#cdTodayPick`: 오늘 운세와 오늘 추천.
6. `#cdSignatureConsult`: 대표 운명 상담.
7. `.membership-recap-cta`: 이용권 안내.
8. `#cdFinder`, `#fortuneGatewayEntry`: 검색과 별도 진입 게이트웨이.
9. `#cdServiceIndex`, 다이어리, `#cdAiFeatures`, `#cdFortunePick`.
10. `#cdConcernPick`, 동물·명상·타로·신탁·우주·꽃·프리미엄 컬렉션.
11. 접힌 이용권 안내, 음악, 피드백, 결과용 화면, 하단 가이드·푸터.

무료 시작은 Hero, 빠른 서비스, 오늘 운세, 무료 선택, 스크롤 후 Sticky CTA에 분산돼 있다. 검색도 Hero 배지·탐색기·서비스 인덱스·전체 운세 탭으로 나뉜다. 각각의 기능 필요성과 별개로, 신규 사용자가 같은 선택을 반복하게 만드는 구조다.

첫 화면 코드는 브랜드·제목·서브 문구·주 CTA뿐 아니라 네 개의 이동 링크와 다층 달 비주얼을 담는다. 프로필·쿠키·테마·탭 접힘 상태에 따라 실제 화면 점유량이 달라진다. **기존 홈의 런타임 모바일 첫 화면 높이는 이번 단계에서 실측하지 않았다.** 아래 모바일 실측은 새 목업에 대한 것이다.

### 입력과 탐색의 중요한 연결

- 폼은 이미 접혀 있고 `_dpBorrowFormIntoSheet`로 프로필 시트에 기존 DOM 노드를 대여한다. 새 폼 복제나 ID 변경은 저장·불러오기·재진입을 깨뜨릴 위험이 있다.
- 현 탭바에는 `사주`, `모든 운세`, `이용권`, `마이` 등의 기존 액션이 배선돼 있다. 레이블과 목적지 변경은 `data-action`, `data-nav-key`, 스크롤·접힘·안전 여백 계약을 함께 검사해야 한다.
- `js/core/service-registry.js`는 가격·고민·방식을 담는다. `home-service-finder.js`는 이 목록과 **기존 컬렉션 DOM 검색 결과를 병합**한다. 컬렉션을 무조건 DOM에서 삭제하면 검색 커버리지가 줄어든다.
- 단순 무료/유료 구분과 실제 이용권 권한 판정은 다르다. UI 배지가 잠금해제를 판단하면 안 된다.

### 결제·이용권 진입

- 상점은 `/points/`. 직접 콘텐츠 결제는 기존 `js/core/checkout-entry.js` 및 기능별 게이트를 거친다.
- 이용권·월정석·단건 결제의 선택과 PortOne 결제수단 단계는 기존 코드가 담당한다.
- 모바일 복귀, 결제 확인, 잠금해제, 이용권 소진은 UI 목업과 분리한다.
- 새 홈에서 단건 체험 CTA는 대표 상담을 고르는 단계로 보낸다. 페이지 진입만으로 결제를 실행하지 않는다.

### 정책 페이지 현황

| 페이지 | 정본 | 현재 표현 | 적용할 개선 |
|---|---|---|---|
| 약관 | `app/terms-of-service/page.js`, `TermsContent.jsx` | `policy-doc`, 목차·전문 | 작은 꽃 배너, 3개 요약, 기존 목차 유지 |
| 개인정보 | `app/privacy-policy/page.js`, `PrivacyPolicyContent.jsx` | `policy-doc`, 항목별 앵커 | 수집 목적·보관·권리 바로가기 |
| 환불 | `app/refund-policy/page.js` | 약관 12조 객체 재사용 | 단건·이용권·결제 오류 요약 |
| 고객센터 | `app/contact-us/page.js`, `ContactForm.jsx` | 정책 문서 톤, 이메일·문의 폼 | 목적별 길잡이, 기존 폼 재사용 |
| 소개 | `app/about/page.js`, `app/_content/about-copy.js` | `cd-main-shell`, 카드, CMS 문구 | 사람·기준·AI 역할을 먼저 배치 |
| FAQ | `app/faq/page.js`, `app/_content/faq-copy.js` | 카드 목록, CMS와 구조화 데이터 | 주제별 요약·아코디언 |

`/terms`, `/privacy`, `/contact` 별칭과 canonical은 유지 대상이다. `styles/globals.css`의 정책 문서는 밝은 글씨와 차가운 청회색 계열이며, 소개·FAQ는 다른 카드 시스템을 쓴다. 전체 globals를 덮지 않고 해당 문서 표면에만 일관된 토큰을 적용해야 한다.

환불 전문은 **약관 12조와 같은 객체를 계속 렌더**해야 한다. 새 설명에 독립적인 환불 규정·기간·보장을 만들지 않는다. 개인정보의 비로그인/로그인 차이·프로필 삭제 효과는 실제 개인정보 및 저장 구현을 더 확인한 뒤 요약해야 한다. 현재 목업은 그 정보가 들어갈 구조를 보여준다.

### 기존 에셋

- `styles/yehwa-motifs.css`: 생성된 달빛 예화 꽃·가지·인장 마스크. 직접 수정하지 않고 기존 변수를 재사용.
- `fuctionassets/자는 연이.webp`: 기존 홈 캐릭터, 10,950바이트.
- `public/icons/code-destiny-moonlight-pass.webp`: 이용권 이미지.
- `public/icons/neo*.webp`, `public/neo-operation-room/`: 네오 자산.
- `docs/context/content-assets.md`: 찻집 스프라이트 및 R2 자산 용도 설명.
- 사용자가 추가 지정한 `C:/Users/user/Desktop/앱 배포/꿀꿀 운세 로고 앱버전.webp`: 512×512, **31,916바이트**, 새 목업 Hero에 원본 그대로 재사용. 새 외부 폰트나 이미지 생성 없이 꽃돼지의 정체성을 보존했다.

### 성능 분석

현재 공유 체크아웃의 `index.html` 원문 측정: **2,948,007바이트, 38,509줄, style 91개, script 107개, img 58개**. `loading="lazy"` 문자열은 45개다. 이것은 원문 정적 집계이며 **압축 전송량·실제 다운로드 수·실제 초기 실행 비용과 같지 않다**.

다수 인라인 스타일·Hero pulse/blur 장식·콜렉션과 결과 마크업·여러 재정의 블록이 초기 비용 검토 대상이다. 실제 중복 CSS 제거는 cascade와 네오 모드를 확인해야 한다. 홈은 바닐라 셸이므로 React client component 축소만으로 해결할 수 없다. 정책 페이지는 서버 페이지가 중심이며, 단순 아코디언에 새 client component를 추가할 필요가 없다.

참고 사이트 [사주아이](https://saju-kid.com/)는 짧은 서비스명·한 줄 효용·가격·바로가기 패턴을 사용한다. 선택 구조만 참고하고 캐릭터·색상·레이아웃은 복제하지 않았다.

## 3. 새 홈 구조

Hero(무료·이용권 2 CTA) → 질문별 6개 진입 → 이용권 비교 → 명리학자 신뢰 → 추천 4개 → 검색·전체 서비스 → 정책 푸터.

질문별 카드는 모바일 1열이다. 대표 상담은 초융합, 운명의 찻집, 연애 비책, 무료 나크샤트라로 제한한다. 각 카드에 가격과 결과 형태, 해당 등급 이용권의 조건부 사용 가능성을 표시한다.

실제 전환에 중요한 무료 입력·상담 선택·가격 이해·검수 기준을 앞에 놓는다. 상세 컬렉션·다이어리·음악·피드백은 전체 서비스나 하단에서 접근하게 한다. 기능 자체는 삭제하지 않는다.

## 4. 모바일 UX

- 화면을 100vh로 채우지 않는 Hero. 360×640에서도 두 CTA 하단이 탭바보다 위에 있다.
- 첨부 꽃돼지 그림은 텍스트 아래, 데스크톱에서는 옆으로 이동한다.
- 하단 메뉴: 홈·무료·상담·이용권·마이. 안전 영역 여백을 둔다.
- 메인 CTA 높이 49.5/51.5px, focus-visible과 reduced-motion, dialog Escape 닫기를 확인했다.
- 정책 목차는 가로 이동, 요약 카드는 모바일 1열, 상세는 native details/summary.
- 실제 생년 입력폼 및 고급 입력 접기는 승인 후 기존 프로필 시트 계약을 활용한다. 목업에서 개인정보를 입력받지 않는다.

## 5. 1/3 가격 메시지와 정본

Hero 보조 CTA와 Moonlight Pass 비교 섹션에 표시한다.

- 가격: `lib/payment/pass-pricing.js`의 `PASS_MONTHLY_WON.standard` = 9,900원.
- 건당: `worker/lib/profile-limits.js`의 `PASS_LIMITS_KRW.standard` = 5,000원.
- 월 한도: 같은 파일의 `MONTHLY_PASS_LIMITS_KRW.standard` = 30,000원.
- 5천원급 리딩만 이용하는 비교: 6회 × 5,000원 = 30,000원 대비 9,900원, 약 1/3.
- 30일 또는 한도 소진 시 종료, 다른 리딩 사용 시 가능 횟수 변동, 이용권으로 이용권 구매 불가를 함께 안내한다.
- 목업은 위 상수를 직접 import한다. 실제 셸 적용에서는 기존 상점·가격 배선과 빌드 미러 계약에 맞춰 공급하고 새로운 가격 정본을 만들지 않는다.
- 초융합·연애 비책은 레지스트리상 각 30,000원으로 패밀리 등급 한도 내 대상이다. 찻집은 5,000~20,000원 범위라 통합 카드에는 전체 범위를 커버하는 VVIP 이상을 보수적으로 표시했다. 개별 상담 선택 후 실제 가격에 맞는 등급을 표시해야 한다.
- 나크샤트라는 레지스트리상 무료다. 무료 카드에 유료 배지를 붙이지 않았다.

## 6. 10년 명리학자 메시지

Hero 제목·신뢰 배지·ExpertTrust 섹션·소개 페이지 미리보기에 표시했다. `app/_content/about-copy.js`의 제작자 박병하 설명에서 10년 공부·상담 및 문안 작성/최종 검수 설명을 확인했다. 모든 AI 개별 결과를 사람이 실시간 검수한다는 주장은 추가하지 않았다.

## 7. 정책 페이지 개선 범위

6개 문서 유형의 배너·3개 요약·탭·아코디언을 목업으로 제공한다. **현 목업의 본문은 레이아웃 설명용이며 법적 전문을 대체하지 않는다.** 실제 적용 시 시행일, 조문, 개인정보 보관/삭제 고지, 연락처, CMS 접근자, JSON-LD를 그대로 유지한다.

## 8. 성능 반영과 남은 구현

목업에는 외부 폰트·실 API·LLM·결제 SDK·차트·리포트가 없다. Hero 이미지는 1개이며 크기를 명시했다. CSS 꽃 장식은 기존 마스크를 읽고, 동작 없는 장식을 사용했다.

실제 앱의 대형 모듈 lazy load, 검색 DOM 유지 또는 안전한 지연 생성, 중복 초기 권한 조회 확인, CSS cascade 정리는 **아직 구현하지 않았다**. 권한 조회 타이밍 변경은 UI 수정에 섞지 않고 별도 근거와 테스트가 필요하다.

## 9. 검증 결과

| 항목 | 결과 |
|---|---|
| 목업 360×640, 390×844, 430×932, 1280×900 | CTA 2개 모두 첫 화면 노출, 수평 넘침 없음 |
| 레지스트리 검색·가격 필터·검색 결과 없음 | 통과 |
| 정책 6탭·아코디언·데모 dialog Escape | 통과 |
| 브라우저 JS 오류·외부 네트워크 요청 | 각각 0 |
| 무료 시작·로그인·프로필·이용권·상담 실제 동작 | 미검증. 목업 안내 dialog만 연결 |
| PortOne/KG·카카오페이·모바일 resume·잠금해제 | 서비스 코드 미변경. 실제 회귀 테스트는 적용 단계에서 수행 |
| 실제 LLM/API·결제·운영 DB 호출 | 하지 않음 |
| Lighthouse 모바일 목업 | 성능 92, 접근성 100, SEO 54, LCP 2.7초, CLS 0, TBT 0ms |

SEO 54는 검토 페이지의 의도적인 `noindex`와 미설정 description을 포함한다. 서비스 SEO 점수가 아니며, 서비스를 적용한 후 별도로 측정해야 한다. 원본 홈과 동일 환경 A/B 측정을 하지 않았으므로 **LCP가 개선됐다는 결론을 내리지 않는다**.

Lighthouse는 위 점수의 JSON 보고서를 생성했지만 종료 시 Windows 임시 Chrome 프로필 폴더 정리에 `EPERM`이 발생해 CLI 종료 코드는 1이었다. 측정 결과 생성과 명령 전체 성공을 구분한다. 서비스 결함으로 단정하지 않으며 임시 폴더를 강제로 삭제하지 않았다. 정책 아코디언은 별도 Playwright 실행에서도 열기·닫기 PASS를 확인했다.

실행 명령:

```powershell
npm run worktree:status
node docs/design/mobile-funnel-preview/verify.cjs
Get-Content docs/design/mobile-funnel-preview/preview.js -Raw | node --input-type=module --check
npm run check:fast -- --plan
npm run check:fast -- --base=HEAD --plan
npm run check:fast -- --base=HEAD
node D:/Development/code-destiny/node_modules/lighthouse/cli/index.js http://127.0.0.1:4178/docs/design/mobile-funnel-preview/index.html --chrome-flags="--headless --disable-gpu" --only-categories=performance,accessibility,seo --output=json --output-path=docs/design/mobile-funnel-preview/lighthouse.json --quiet
```

`check:fast --base=HEAD`는 이 작업의 신규 문서·목업만 검사하기 위한 범위다. 기본 계획은 기존 브랜치와 origin/main의 선행 차이까지 포함했으므로 따로 남겼다. 최종 실행은 whitespace 및 `verify:doc-freshness` 통과. 빌드·타입·실제 서비스 회귀 검사가 통과했다는 의미가 아니다. 처음 `node --check preview.js`는 저장소 CommonJS 분류로 실패했으며, 브라우저 ES module 방식에 맞춰 `--input-type=module --check`로 구문 확인을 통과했다.

## 10. 적용 순서·회귀 위험·후속 확인

1. 디자인 확인 후 최신 base와 다른 작업의 공통 파일 변경을 순서대로 통합한다.
2. 홈 표시 레이어와 CTA만 변경한다. 기존 DOM ID·액션·프로필 대여 구조·실제 결제 게이트는 유지한다.
3. 정책 공통 표현을 추가하되 조문·CMS·구조화 데이터·별칭 라우트는 유지한다.
4. 카테고리 탐색을 분리할 때 레지스트리 밖 컬렉션도 검색되는지 확인한다. 홈에서 감추는 것만으로 초기 다운로드가 줄었다고 주장하지 않는다.
5. mock 네트워크 차단 하에 로그인/회원가입 링크, 프로필 저장·불러오기, 무료 시작, 구매 취소, 단건 진입, 기존 resume fixtures와 잠금 상태를 검증한다.
6. `check:fast -- --plan`에 따라 실제 변경 범위 검증, mirror sync, `verify:mobile-detail-nonintrusive`, `verify:hero-contrast`, 필요한 결제 회귀 가드를 수행한다.
7. 실제 홈의 360/390/430px 스크린샷과 Lighthouse 전후 비교, 다크/네오·쿠키·프로필 상태별 검증을 남긴다.

현재 주요 위험은 index.html 공통 파일 중첩, 입력폼 DOM 이동, 검색 DOM 의존, CTA 액션 가로채기, 테마 cascade다. 목업 승인 전에 해당 서비스 경계를 변경하지 않았다.
