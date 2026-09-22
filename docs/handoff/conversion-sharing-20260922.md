---
status: active
updated: 2026-09-23
next: "홈 검색→상세→입력 동선 검증을 바탕으로 마스터 인연의 서 등 다른 전문가 상담 UI·결과 공유와 구매/SEO 후속을 진행한다. 전체 목표는 미완료다."
---

# 경쟁사 대비 전환·신뢰·SEO·상담 공유 후속 작업

## 최우선: 전체 목표를 축소하지 않는다

사용자는 2026-09-23에 컨텍스트가 길어지면 인수인계를 남기되 **진행 중인 목표가 가장 중요하다**고 재차 지시했다. 책·편지 UI 일부 개선, 테스트 통과, 인수인계 작성만으로 전체 목표를 완료 처리하지 않는다. 아래의 구현 상태와 운영 성과를 구분하고, 원래 요구 전부를 이어간다.

| 목표 | 지금 확보한 근거 | 아직 필요한 작업 |
|---|---|---|
| 경쟁사 대비 구매 전환 | docs/conversion-sharing-plan-20260922.md의 비교·우선순위, 홈 가격/예시/신뢰 개선, 책·편지 진입·상세 개선 | 첫 방문→상품 발견→상세→가격→저장 결과 재열람 동선별 확인. 실제 전환 성과는 미검증 |
| 네오 강점 강화 | 10년 경력·공개 예측 세 원문의 정본, 홈/영냥이 랜딩, 두 상품 상세에 날짜·원문 링크 연결 | 다른 고가 상담의 구매 전에도 적절히 재사용. 활동명·기존 링크·게시일을 다시 묻지 않는다 |
| 고가 상담 UI | 인생의 책/연애 비책 결과·진입·입력, 이번 상세 페이지/팝업 표시 | 마스터 연애·카르마·서양점성·베다 및 나머지 상담군. 이름만 바꾼 동일 장식으로 복제하지 않는다 |
| 모든 결과의 공유/바이럴 | 영냥이와 찻집·네오, 책/편지 이미지의 일부 개선. 기능 키별 적용표는 docs/consultation-sharing-coverage-20260923.md | 미연결 상담군 어댑터, 이름 숨김/문구 편집/미리보기, 수신 페이지와 실기기 카카오 확인. 모든 결과 적용 완료 아님 |
| SEO | 홈/영냥이 문구·OG·메타 개선, 기존 12개 랜딩 조사 인수인계 | docs/handoff/google-seo-rebuild-20260921.md의 남은 항목과 실제 배포 후 동일 URL 측정. 순위/색인/수익 성과 미검증 |

## 최신 재개 위치 — 실제 홈 검색·필터 → 상세 → 입력

- 시작 기준은 사용자 전달 커밋 `1da42df3bb76156a520ce483f24843eb1ad61f16`이다. main의 동시 `marketing/**` 변경을 보존하기 위해 `D:\Development\codedestiny-worktrees\premium-finder-20260923-030414`에서 격리했다. 전달 후에는 원본 main에서 재개한다.
- 실제 `/ggulggul/` 셸의 검색 펼치기에서 두 상품을 찾고, 가격·고민·AI 방식 필터를 조합해 상세와 상담 입력으로 들어가는 경로를 검증했다. 인생의 책은 10,000원/1만원대, 연애 비책은 30,000원/프리미엄(`vvip`)이며 가격 정책은 그대로다. 루트 `/` 영냥이 홈과 이 셸을 혼동하지 않는다.
- 재현한 결함: `연애비책` 검색 0건, 모바일에서 두 상품이 공통 달 이미지로 표시됨, 데스크톱 상세 닫기 1회에 뒤로가기 2회로 이전 페이지까지 이탈함.
- `home-service-finder.js`는 검색어·색인의 공백을 같은 방식으로 정규화하고, 모바일 lazy mount의 읽기용 `peek`로 DOM 밖 `resultPage`의 원본 이미지를 읽는다. 결과 페이지를 강제 마운트하거나 이미지 경로를 registry에 복제하지 않았다. DOM 스크래핑 검색 범위를 유지했다.
- `service-registry.js`의 두 이미지 대체 설명을 실제 책·편지로 맞췄다. `index.html`은 lazy mount 조회와 닫기 버튼의 중복 `pointerup`/`touchend` 연결 제거만 변경했다. 네이티브 click이 터치·마우스·키보드를 처리하며 기존 상세/가격/상담 CTA를 재사용한다. public 미러는 `sync:public` 생성물이다.
- `scripts/verify-premium-finder.mjs`: 실제 셸·실제 입력 route, 360/390/430/1280 light와 390 dark × 두 상품 **10/10**. 공백 유무 검색·고민/가격/방식 조합·빈 결과/검색 지우기·원본 이미지·상세 네오 원문 3개·닫기/포커스/조건 유지·Escape·상담 입력 200을 확인했다. 모바일에서는 실제 touch를 사용했다. fixture 카드나 강제 노출로 대체하지 않았다.
- Node targeted 27/27, 가격 registry 57개 대조, payment-freeze, mobile lazy mount, mobile-detail-nonintrusive, hero-contrast 통과. 첫 `check:fast`는 paid gate 88/88와 lint 뒤 sitemap 소스 서명 드리프트에서 중단했다. 정본 생성으로 5개 셸 경로의 서명만 갱신한 뒤 최종 `check:fast` exit 0, Jest 290 suites/4078 tests 통과를 확인했다. 공식 전달은 이 변경을 담은 main HEAD의 `CI required` 결과로 판정하며, 앞선 커밋의 CI를 대신 쓰지 않는다.
- 증거 보존: `D:\Development\code-destiny\build-cache\premium-finder-20260923\`. mock 네트워크 차단과 공개 서체 로컬 캐시를 사용했다. 유료 생성·결제 요청 0회. 운영 배포·실제 전환 성과·실기기 카카오 전송 증거는 아니다.
- 이번 완료 범위는 두 상품의 홈 검색/필터→상세→입력이다. 위의 구매 전환·SEO·네오 신뢰·다른 전문가 상담 UI·모든 결과 공유 목표를 축소하거나 완료 처리하지 않는다. 다음은 적용표의 마스터 인연의 서/카르마/서양점성/베다 등 미연결 상담군과 저장된 요약 공유 어댑터다. 활동명·원문·게시일은 다시 묻지 않는다.

## 이전 재개 위치 — 상세·예시·제작자 근거

- 기준 main: `7770a50dee60618eeb6d4d1ef1ff21f5bf7ed8be`, 공식 CI 35758957280 success 확인. 이전 진입/입력 작업은 전달 완료다.
- 이번 작업은 `D:\Development\codedestiny-worktrees\premium-detail-20260923-20260923-022104`, `wt/premium-detail-20260923-20260923-022104`에서 격리했다. main의 marketing/** 변경을 보존한다. 워크트리 배수 뒤 다음 세션은 main에서 시작한다.
- index.html의 FEATURE_VISUAL_DETAILS 정본에 두 상품의 book/letter 재질을 지정했다. 공용 renderer·CSS가 같은 실물과 HTML 제목, 종이 결과 예시를 그린다. 기존 서사 문구는 유지하고 이전 달빛/장미 이미지만 교체했다.
- generator가 기존 founder.ts/prediction-records.json을 읽어 경력·예측 원문을 연결하고, 카드/OG 파생 이미지는 자르지 않고 여백을 둔다. 원본 프롬프트와 파생 출처 sidecar 8개를 보존했다. 새 이미지 생성은 없다.
- 실제 standalone 10개(두 상품×360/390/430/1280 light, 390 dark) 및 실제 팝업 템플릿/모듈의 mock 컴포넌트 4개(두 상품×390/1280)가 통과했다. 원본 CTA로 1회 위임·가격·비율·출처를 확인했다. **팝업 컴포넌트 검사는 홈 목록→팝업 실사용 진입, 닫기/포커스 복원, 실제 결제 검증이 아니다.**
- 조사에서 /app는 이 두 상품을 노출하지 않고, /ggulggul의 기존 타일은 resultPage 안에 있다. 모바일 모든 운세→VVIP를 열어도 기존 .lifebook-tile/.lovebible-tile을 선택하지 못했다. 강제 표시로 성공을 만들지 않았다. 다음 첫 작업은 실제 노출/진입 경로를 파악하고 상품 발견 문제를 개선하는 것이다. 이 관찰만으로 운영 전체에서 접근 불가라고 단정하지 않는다.
- 테스트: scripts/verify-premium-detail.mjs, __tests__/ui/feature-visual-details.test.mjs와 feature-detail-preview.test.mjs. 검사 서버는 mock API base이고 외부 API/과금 동작은 차단한다. 개발에 없는 version.json은 404 mock으로 유지해 Next locale catch-all 컴파일 경쟁을 피한다. 실제 상세 route의 200 검사는 유지한다.
- 구현 커밋: `65ab0d083ef585ee1bf1e3498f96c5947e3f3a93` (`feat: connect premium product details with founder evidence`). 이 문서 정리까지 묶어 main에 push하며 그 HEAD의 CI required로 전달을 확정한다. 독립 마감 판정은 위 14개 화면/컴포넌트 범위에서 ship이다.
- check:fast 첫 실행은 sitemap 서명 드리프트에서 중단됐다. 정본 생성 후 재실행은 exit 0, 290 suites/4078 tests 통과. 공용 상세 단위 검사 16/16, 최종 변경 lint, sitemap-drift, handoff-contract, doc-freshness 통과. detector의 단일 primary는 버튼 chevron의 2px 선을 카드 측면 장식으로 인식한 것이며, 글자 크기 advisory는 지역 디자인 범위와 실제 캡처로 검토했다.
- 원본 증거 보존 위치: D:\Development\code-destiny\build-cache\premium-detail-20260923\. main-ci.json은 해당 전달의 실제 완료 결과로 저장한다. 운영 승격은 하지 않는다.

## 최신 재개 위치 — 구매 전 화면 확장

앞선 결과 화면 개선에 이어 두 상품의 실제 진입/입력 화면을 같은 책·편지로 맞췄다. 코드 정본은 app/life-book-ai/LifeBookAiClient.tsx, app/love-secret-ai/LoveSecretAiClient.tsx와 각 스타일, 공용 PremiumConsultationIntro.module.css다. 기존 생성 WebP를 재사용했고 새 에셋은 만들지 않았다. 이 절을 아래의 이전 구매 전 작업 예정 기록보다 우선한다.

- 첫 화면에서 결과물 형태·상담 범위·registry 가격·폼 이동 CTA를 보여준다. 리포트 모드 변경 시 기존 가격 소스를 유지한다.
- 연애 비책은 소개 카드와 고정 CTA를 입력 grid 밖으로 옮겨 실제 폼이 넓은 열, 안내가 좁은 열에 놓이게 했다. 입력 상태와 핸들러는 보존했다.
- 인생의 책 폼 제목/설명은 첫 행 전체 폭을 쓰고 프로필 버튼과 상태는 다음 행에 둔다. AppChrome 뒤로가기의 잘못된 Tailwind opacity 문법을 고쳐 밝은 종이 위에서도 대비를 확보했다. 두 상품 copy hook과 useServerPrice의 최초 가격 형식은 SSR과 첫 client render가 같은 locale을 사용하며 금액 계산은 바꾸지 않았다.
- mock 진입 검사 12/12와 가격 회귀 9/9, overseas-payment-notice를 통과했다. check:fast는 exit 0(290 suites / 4078 tests)이지만 이후 위 검수 수정이 있어 최종 파일 전체의 단독 증거로 삼지 않는다. 최종 변경 lint는 오류 0/기존 경고 1, incremental typecheck는 exit 0이다. 공식 판정은 아래 전달 커밋의 main CI다.
- 최종 화면 24장과 결과 JSON/로그는 원본 D:\Development\code-destiny\build-cache\premium-entry-20260923\에 보존한다. 운영 배포와 전환율 상승은 검증하지 않았다.
- 비교 기준은 dcdd7feef4cac886972ce9777b1372257a1cad28. 작업용 격리는 D:\Development\codedestiny-worktrees\premium-entry-20260923-013207, branch wt/premium-entry-20260923-013207. 다음 세션은 main의 최신 상태를 먼저 확인하며 이미 배수된 워크트리의 존재를 가정하지 않는다.
- scripts/verify-premium-consultation-entry.mjs가 360/390/430/1280, dark 및 영어 화면의 이미지 비율·가격·키보드 폼 이동·입력 폭·모드/단계 전환·유료 API 미호출을 mock으로 검사한다. 공개 서체 캐시 build-cache/premium-fonts가 필요하다. 최종 결과는 디자인 문서와 build-cache/premium-entry/results.json을 확인한다.
- 검증된 코드 커밋은 `981fadf0f3ce05ab6dfc1a767350826da6921d0b` (`feat: align premium consultation entry with report design`)이다. 이 문서 정리 커밋까지 묶어 main에 push하며 실제 전달 판정은 그 main HEAD의 CI required를 확인한다. 앞선 결과 UI의 CI를 이 변경의 증거로 쓰지 않는다. 두 상품 구매 전·입력 범위 독립 마감 판정은 ship이며 전체 상담군 완료를 뜻하지 않는다.
- 다음은 생성 정본을 통한 상세 팝업/결과 예시의 시각적 일치, 구매 전 제작자 근거 연결, 마스터 연애 등 다른 전문가 상담의 디자인과 요약 공유다. 사용자 요청 전체는 아직 완료가 아니다.

## 최신 재개 위치 — 2026-09-23

이 절과 docs/premium-consultation-design-20260923.md를 아래의 이전 기록보다 우선한다. 사용자가 단순한 고급 색상 조정을 거부하고 인생의 책은 **실제 책**, 연애 비책은 **비밀 연애 편지**, 다른 전문가 상담도 각 성격에 맞는 고급 UI로 바꾸도록 추가 지시했다. 이미지 제작도 허용했다.

- 앞선 찻집·네오 구현 f828f33f55f11067467781a4552d905f6dcbd4dc의 빌드/타입/critical 잡은 성공했으나, KST 자정의 날짜 URL 교체와 찻집 소스 서명 때문에 sitemap guard가 실패했다.
- 생성 정본을 그대로 실행해 a967b1f14bbcab8c68737bd23005e796966c9479로 갱신했고 main push 및 CI 35747813782 성공을 확인했다. 날짜만 갱신된 원장 376개와 찻집 서명 1개다. 사이트맵 정책을 바꾸지 않았다.
- 작업은 D:\Development\codedestiny-worktrees\cs2-20260922-235536, wt/cs2-20260922-235536에서 격리했다. main의 marketing/** 변경을 보존했다. 다음 세션은 원본 main에서 시작하고 동시 편집 중이면 새 safe worktree를 만든다. 로컬 QA 서버 14123은 종료했다.
- 인생의 책/연애 비책의 실제 결과 UI·공유 카드·공개 URL·취소·미저장 공유 방지, 생성 WebP 2개와 출처 sidecar, scripts/verify-book-card-sharing.mjs를 구현했다.
- 코드 커밋 78015f852는 다른 세션의 pass 변경을 보존한 병합 fc12eb6a5fd99a4931d93037ddd6e7ac8d0f1690으로 main push했다. 해당 공식 CI 35752264003의 CI required success를 확인했다. Build Pages and Worker, Typecheck and lint, Static guards 모두 success이며 Critical checks는 변경 티어 판정에 따라 skipped다. 앞선 커밋의 CI를 이 구현의 증거로 오해하지 않는다.
- mock 브라우저 35/35와 최종 360px 봉인 겹침 수정 캡처, 독립 마감 ship 판정을 확보했다. D:\Development\code-destiny\build-cache\premium-consultation-20260923\에 증거, build-cache\premium-fonts\에 로컬 검증용 공개 서체 캐시가 있다.
- 다음은 두 상품의 **구매 전 상세/예시 → 실제 책·편지 결과의 일치**, 이름 숨김/문구 편집/미리보기, 다른 전문가 상담 UI와 결과별 공유 어댑터다. 기능 목록과 완료 기준은 두 적용표/디자인 문서에 있다.
- 브랜드·네오 활동명·3개 예측 원문·게시일을 다시 묻지 않는다. 가격/권한/실과금/운영 배포 경계와 다른 세션의 변경을 보존한다.
- 구 워크트리 conversion-sharing-20260922-230110의 긴 경로 삭제가 자동 승인 검토에서 거절된 이력이 있다. 우회 삭제하지 않는다. 이 현재 작업의 전달과 별개다.

## 사용자 지시와 완료 경계

경쟁 서비스 포스텔러·청월당·점신과 비교해 부족한 구매 전환·SEO·UI/UX를 계속 보완한다. 10년 경력 상담사·명리학자 **네오**가 만든 서비스와 대통령 예측 기록을 적극 활용한다. 모든 상담 결과를 공유에 특화하되 영냥이를 우선한다. 너무 길어지면 다른 세션이 바로 이어갈 수 있는 문서를 남긴다. 전체 목표는 아직 완료가 아니다.

상담사 이름·원문 링크·게시일을 사용자에게 다시 묻지 않는다. 이미 정본 `lib/brand/prediction-records.json`에 있으며 세 글 모두 이번에 모바일 네이버 블로그에서 직접 읽었다. 사용자의 명시 요청으로 `C:\Users\user\.codex\memories\extensions\ad_hoc\notes\20260922-231700-neo-founder-prediction-records.md`에 기록했다. 승인된 개선 범위는 재확인하지 않는다. 실결제·유료 LLM·운영 DB 쓰기·메시지 발송·운영 승격은 이번 승인에 포함하지 않는다.

## 현재 작업 위치와 전달 상태

- 원본: `D:\Development\code-destiny` · main.
- 동시 세션의 `marketing/**` 미커밋 변경 때문에 `scripts/create-safe-worktree.ps1`로 격리했다. 원본 마케팅 변경은 수정·stage·commit하지 않았다.
- 이번 코드: `8adca602b` 신뢰/SEO, `9d15a1ded` 영냥이 공유.
- 계획 포함 main push: **`74413af4c3bf1228f4b86f10ae5c1a9ce2e6f6d2`**. 원본 main에 ff 병합하고 push 완료.
- 공식 코드 CI: [35739650623](https://github.com/rei1237/codedestiny/actions/runs/35739650623). 아래 전달 결과 절을 우선 확인한다.
- 이후 다른 세션의 가격 작업 `346557ba1`이 병합된 main `4da547fce131435c4becea53962ac40752c644c5`를 ff로 수용했다. 이번 개선에서 가격 정책을 바꾼 것으로 혼동하지 말고 다른 세션의 커밋을 보존한다.
- 전략과 상세 근거: `D:\Development\code-destiny\docs\conversion-sharing-plan-20260922.md`.

## 구현된 내용

1. `lib/brand/founder.ts`, `app/components/FounderTrust.tsx`, 대응 CSS: 경력·공개 예측 게시일·원문·AI 해설과 제작자의 역할을 한곳에서 관리한다.
2. `app/yeongnyangi/_original/FortuneHome.tsx`, `app/page.js`: 첫 화면 경력과 가격, 공개 기록 링크, 구매 전 상담 예시 링크, SEO 설명을 개선했다. 현재 실제 루트는 영냥이 React 홈이다. ARCHITECTURE/SEO 상세 문서의 오래된 ‘루트는 index.html’ 문장을 그대로 따르지 말고 최신 CLAUDE와 실제 빌드 경계를 확인한다.
3. `app/yeongnyangi/1000-won-fortune/page.tsx`: 신뢰 자료와 영냥이 OG 이미지, 본문과 일치하는 설명. URL·canonical·색인 정책·가격 registry 유지. sitemap lastmod 2개 경로 갱신.
4. `app/yeongnyangi/_lib/result-share.ts`: 28개 상품·신점·호라리의 공개 재진입 URL, 허용값만 들어가는 공유 UTM, 무료 요약 어댑터, 짧은 문구 1080×1080 큰 글씨 이미지.
5. `ResultSharing.tsx`, `FreeFortune.tsx`, `Result.tsx`, `SpiritResult.tsx`: 무료·유료·질문형 결과에 공유 편집기. 질문 기본 제외, 문구 편집·180자 줄이기, 카카오·네이티브·문구 복사·이미지 공유/저장, 취소/실패 안내, 기존 익명 소개에 공개 링크 추가.
6. `fortune_share_action`: 기존 동의 기반 `trackEvent`를 통해 채널/상태만 전달. 결과 본문·질문·주문 ID·프로필 미포함. `opened/shared`는 수신자 전달 증거가 아니다.

## 실제 검증과 한계

- `node --test __tests__/ui/yeongnyangi-result-share.test.mjs`: 8/8. 28개 상품마다 URL 검사. 모든 상품의 실제 기기 전송을 28회 했다는 뜻은 아니다.
- `YEONGNYANGI_TEST_BASE=http://127.0.0.1:14122 node scripts/verify-conversion-sharing.mjs`: 390·1280 × 홈/SEO·무료·신점·호라리 = 8 시나리오. 외부 네트워크/API fail-closed mock.
- 같은 base로 `node scripts/verify-yeongnyangi-result-sharing.mjs`: 360·390·430·1280 모두 통과. 이미지·문구·카카오 mock·취소·클립보드 거부·불완전 결과 숨김.
- 실제 화면을 배치로 확인하고 짧은 카드 글씨/편집기 여백을 한 번 수정한 뒤 재확인. 추가 무한 폴리싱 금지.
- 스크린샷·검사 로그는 `D:\Development\code-destiny\build-cache\conversion-sharing-20260922\`에 복사해 보존했다. `conversion-sharing/home-390.png`, `home-1280.png`, `daily-390.png`, `trust-390.png`와 유료 공유 크기별 이미지가 있다. 이 경로는 이번 작업의 명시적 검증 산출물이며 전체 reports/archive 검색과 무관하다.
- `check:fast` 자동 승격 paid suite 88/88, lint 통과. TypeScript의 `navigator.share` 존재 조건에서 중단했으며 `typeof ... === 'function'`로 수정하고 `npm run typecheck` 재실행 통과. 원래 check:fast 전체 실행을 성공으로 적지 않는다.
- `npm run test:node`: 1,587/1,587. `verify:doc-freshness`, 최종 `verify:sitemap-drift` 통과.
- Impeccable 변경 UI 기계 탐지 결과 `[]`. 사이트 전체 WCAG 점수나 성능 실측은 아님.
- 실제 고객 전환율·검색 순위·매출·수신자 반응·카카오 실기기 전송은 미측정. 운영 반영 전 코드 전달이며 실결제·LLM·운영 쓰기·SNS 게시 0회.

## 2026-09-23 후속: 찻집·네오 공유

찻집과 네오에 `components/fortune/ConsultationShare.tsx`를 연결했다. 공유 상태·허용 필드·공개 URL·기능 키·검증 범위 정본은 `docs/consultation-sharing-coverage-20260923.md`다. 찻집 정본 5개 상품과 네오 4개 명리 체계에 요약 선택·편집·문구/카카오/이미지 공유를 추가했다. 완료 전·실패·pending 수정본을 공유하지 않는다. 결제·생성·저장·보상·PDF 권한은 변경하지 않았다.

아래 찻집·네오 행은 처음 조사할 때의 위치 기록이다. 두 기능의 공유 UI를 다시 만들지 말고 새 적용표부터 읽어라. 다음 구현은 **기존 셸 공유 호출부와 개별 AI 결과의 저장된 요약 어댑터**다. main CI는 후속 커밋 SHA로 직접 조회하고, 앞선 영냥이 커밋의 초록 CI를 후속 변경의 증거로 쓰지 않는다.

## 다음 구현 순서: 기존 상담군 공유

찻집·네오 다음 단위에서도 기존 결과/결제 상태를 유지하고 완료된 결과 표시 위치에 얇은 공유 어댑터를 붙인다. `ConsultationShare`와 `js/share-service.mjs`의 채널·취소·실패 동작을 재사용한다. 개인 결과 주소를 `ShareWidget`에 넘겨 noindex를 풀지 않는다.

| 대상 | 확인한 위치·상태 | 다음 행동 |
|---|---|---|
| 찻집 전체 모드 | `src/features/fortune-tea-house/components/TeaHouseResultSheet.tsx` 634 근처 텍스트 저장, 하단 resultActions. `synthesis.summary`, `closingLine`, 선택 찻잔의 구조가 있음 | 선택한 한 줄+현실 조언+연이 이미지. `questionSummary`는 자동 포함하지 말 것. `FortuneTeaHousePage.tsx`의 완료·저장 상태에서만 공유 노출 확인. |
| 네오 | `src/features/neo-war-room/NeoOperationRoomResultPage.tsx`: `isGenerating`, `isFailed`, `session.status`, `ResultSummaryCover`, 하단 actionBar | `frontlineSummary` 또는 refined verdict/첫 실행을 사용자가 선택·수정. 완료 전/실패 공유 숨김. 로컬 `?neoPreview=briefing|refined|loading` 미리보기 재사용. 네오 인물과 영냥이/연이 자산을 혼용하지 말 것. |
| 기존 셸 사주·타로·점성술·숙요·자미두수 | `js/share.js`에 개별 `share*Kakao`, `cdBuildShareUrl`, `cdShareFortuneKakao`, `cdShareResultCardImage` 있음 | 실제 호출부와 공개 진입부터 테스트. `cdShareFortuneKakao`는 공용 선언 외 사용 범위가 제한적. 공유 보상/리퍼럴 정책이나 인증 API를 임의 변경하지 말 것. |
| 운명 나침반 | `app/destiny-compass/_components/ReportActions.tsx`는 `DeferredShareWidget` 사용 | 소개 링크와 실제 결과 요약의 차이를 확인하고 어댑터 적용. |
| 개별 AI 결과 | 아래 목록 | 저장된 결과 스키마와 완료 상태를 읽은 뒤 모듈별 어댑터·회귀 케이스 작성. 일괄 DOM 텍스트 캡처 금지. |

개별 AI 결과 확인 대상(파일 존재 확인, 공유 동작 미검증):

- `app/life-book-ai/result/LifeBookAiResultClient.tsx`, `_components/ResultActionDock.tsx`
- `app/love-secret-ai/result/LoveSecretAiResultClient.tsx`
- `app/master-love-codex/result/MasterLoveCodexResultClient.tsx`
- `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx`
- `app/astrology-ai/result/AstrologyAiResultClient.tsx`
- `app/vedic-ai/result/VedicAiResultClient.tsx`
- `app/nakshatra/result/NakshatraResultClient.tsx`, `lord-report/LordReportClient.tsx`, `compat/CompatResultView.tsx`
- `app/naming-ai/result/NamingAiResultClient.tsx`
- `app/human-design/report/HumanDesignReportClient.tsx`
- `app/palm-reading/PalmReadingRouteClient.tsx`
- `app/fusion-fortune/FusionResultDock.tsx`, `FusionResultThread.tsx`
- `app/components/ziwei/ZiweiConsultation.tsx`, `app/components/expert-consulting/ExpertConsultationFrame.tsx`
- 수호신 `app/fortune-chat/GuardianShareButton.tsx`와 기존 결과 스냅샷 공유는 별도 권한 계약이 있으므로 그대로 보존하고 먼저 검사한다.

기능 키별 체크 표를 만들고 ‘문구·이미지·공개 URL·취소·실패·개인정보·완료 상태’를 통과한 것만 완료로 표시한다. 모든 상담 적용은 아직 완료하지 않았다. 무료 호라리는 결과 대신 프롬프트를 주는 별도 흐름이라 이번 무료 결과 공유 적용 대상으로 세지 않는다.

## 구매·SEO 후속

- 고민별 홈 진입 → 상품 구성/예시 → 가격 → 결과 재열람을 실제 첫 방문자로 검증한다. 기존 고민 버튼·상품·pricing registry를 재사용하며 새 혜택이나 후기를 만들지 않는다.
- `docs/handoff/google-seo-rebuild-20260921.md`의 12개 핵심 랜딩·동일 URL 28일 측정을 이어간다. 색인 확대/삭제, 얇은 페이지 양산, 공유 결과의 공개 색인을 임의 시행하지 않는다.
- 편집 원칙과 재사용 가능한 마케팅 문구는 계획 문서에 있다. 외부 게시 승인으로 해석하지 않는다.

## 전달 결과

코드 `74413af4c3bf1228f4b86f10ae5c1a9ce2e6f6d2`의 main push와 공식 `CI required` 통과를 확인했다(35739650623). Risk tier·Static guards·Critical checks·Build Pages and Worker·Typecheck and lint 모두 성공이다. 이후 다른 세션 main 변경을 보존하고 이 인수인계만 별도 커밋한다. 운영 승격은 하지 않았다.

로컬 QA 서버는 종료했고 스크린샷·검사 로그는 원본의 `build-cache/conversion-sharing-20260922/`에 보존했다. 다음 세션은 원본 main에서 시작하고, 동시 세션이 있으면 새로운 safe worktree를 만든다. 기존 작업용 워크트리나 실행 중인 서버가 남아 있다고 가정하지 않는다.

## 복사해서 재개

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\conversion-sharing-20260922.md를 먼저 읽어라. 마지막 구현 커밋 65ab0d083ef585ee1bf1e3498f96c5947e3f3a93 및 이후 인수인계 문서 커밋의 main CI를 확인하고 다른 세션의 변경을 보존하라. 전체 목표는 경쟁사 대비 구매 전환/SEO/UI 보완, 네오의 경력·예측 기록 강화, 모든 상담 결과의 공유·바이럴 개선이며 일부 UI로 축소하지 말라. 첫 작업은 책/연애 비책의 실제 홈 노출→상세 진입을 확인하고 개선하는 것이다. 이어서 마스터 연애 등 다른 전문가 상담 UI·공유 어댑터와 SEO 후속을 진행하라. docs/conversion-sharing-plan-20260922.md, docs/consultation-sharing-coverage-20260923.md, docs/premium-consultation-design-20260923.md, docs/handoff/google-seo-rebuild-20260921.md를 해당 범위에서 읽어라. 네오 이름·기존 예측 링크·게시일은 다시 묻지 말고 정본과 원문을 확인하라. 실결제·유료 LLM·운영 DB 쓰기·메시지 발송·운영 승격 없이 mock 검증하고, 작은 커밋 단위로 main push와 CI까지 진행하라.
```
