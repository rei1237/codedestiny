---
status: active
updated: 2026-10-29
next: 외부 번역 API 없이 직접 번역을 작성하고 화면·소설 언어 연결을 완료한 뒤 새 앱 검증과 출시 진행
---

# 앱 전체 다국어 출시

## 2026-10-29 후속 담당 진행 상태
- 단독 통합 담당은 현재 대화. 기존 워크트리 그대로 사용한다. 직접 번역 담당 `novel_english`, `novel_japanese`, `novel_chinese`가 각각 authored/en-*, ja-*, zh-* 파일을 작성 중이며 커밋/최종본/출시는 담당하지 않는다. 에이전트 목록의 pending_init 표기와 실제 활성 메시지가 불일치한 적이 있어 상태만으로 완료/중단을 단정하지 않는다.
- `23a1cb455`: 소설 UI 공통 문구 4개 언어, 텍스트 리더 `/stories`/회차 언어 선택 및 localized runtime 연결. 현재 외국어 본문은 미완성이므로 선택 불가. 본문·책갈피·기존 KO SEO 메타데이터 보존. 외국어 텍스트 리더는 전체 번역 본문/목차/이동/창작 안내를 제공하며 기존 한국어 허브의 긴 세계관·아크·로그라인은 아직 별도 외국어 편집이 필요하다.
- `1a552dedc`: 홈 질문 54키 × 나머지 7개 언어 직접 번역. `596c07120`: authored 병합기의 배열 형제 항목 손실 방지(단일 배열 항목 번역 시 나머지 유지). 첫 잘못된 적용은 본인 사전 변경만 되돌린 뒤 재적용했고 14,564키 원복/유지 확인. `45bde93b8`: 상세 상담 공통 안내·FAQ 89키(실제 변경 807값) 직접 번역. 다른 키 변경/키 손실 없음, 가격125키×12언어 검사 통과.
- `8e747187c`: API 없는 소설 authored 병합기. `node scripts/merge-novel-authored.mjs`는 진척만 확인, `--write`도 전체 원문/표시 문구가 완성되어야 최종 파일 기록. sourceTitle/sourceTag 및 문장 source/sourceHash를 검증하며 구판 해시 재인증 금지. 프롤로그 제목·태그 4언어 추가. EN beats 형식, JA/ZH rows/translations 형식을 모두 지원. 원고 담당이 기존 파일 sourceTitle/sourceTag를 보완 중이므로 그 전에는 검사에서 stale metadata로 실패한다.
- 새 모의 테스트: 언어정책/선택/공통UI 10, 텍스트 리더 3, authored 병합 2, 배열 보존 1 통과. `verify-novel-player-start`, `verify-novel-runtime`(73화/7,844비트), `verify-story-text-sync`, typecheck 통과. React 변경 ESLint 오류0 경고4(일반 anchor). 시각 검증 아님.
- `check:fast` 90개 중 npm test/deploy-base-guard/llm-generation-resilience/analysis-basis-contract 4개 실패. 호스트 모의 환경 재검사에서 뒤3개는 각각7/1275/96검사 통과. npm test는434/436 suites,7096/7097 tests 통과: payments-v2.context의 analyticsChannel 기대키 차이, marketing-pg-reconciliation의 node:test/Jest 분류 문제. 이 테스트·결제 파일은 이번 변경에서 수정하지 않았으며 전체 통과가 아니다. 로그 global-locale-audit/novel-host-*.txt. 불필요한 전체 검사 반복 금지.
- 독립 검증 담당 대화 `01a18719-3f72-7472-a2da-3e28dd81dbeb`에서 62개 단위·동작 검사 + AI14규칙 + 12언어 fake provider + browser-contract 통과 보고. 모의 Chromium 390×844 `/yeongnyangi/fortune/?lang=...` 12개 입력 화면: 가로 넘침 없음/pageerror 없음/미정의 API 없음, 외국어11개 선택 언어와 제목 일치. 결과 파일은 `C:/Users/user/.codex/visualizations/2026/10/29/01a18719-3f72-7472-a2da-3e28dd81dbeb/locale-independent-verification.txt`. 실제기기/생성결과 검증은 아님.
- 공개 `/`는 의도적으로 한국어(`app/page.js` data-cd-no-trans)라 기존 전체 로케일 브라우저 검사에서 `#localized-home-title`을 기대하는 경로가 낡았다. 한국어 질문 우선 첫 화면에서 `#reading-language`를 바로 기대하는 검사도 낡았다. 임의로 공개 홈 SEO 정책을 변경하지 않는다. 실제 앱 홈 국가별 표시 경로는 추가 확인 필요.
- main CI `f7c922d6a63b8656e40dbd25fbd9bb99d194863e` 실패 확인: 다른 작업 문서 `docs/handoff/2026-10-29-toss-major-services-migration.md`가 frontmatter 없이 시작해 Static guards 실패(run40853211035). 이 실패 위로 현재 변경을 push하지 않았다. 최신 main 재확인/통합/CI/출시는 남아 있다.

- 추가 완료: `a00a803b4` 자미두수 정본14필드×11 직접 번역; `96d94258a` 소설 기술 단위표시(unit) 4언어/완성검증; `025da5d00` 앱 홈 두 카드·대표 상담 React 언어 연결; `ef1b142f2` 첫 이용 안내23문구×11; `ef4cf5f1b` 상담 탐색21문구×11 + 기존 사전의 정책 링크/면책 재사용. 공개 웹은 KO, 모바일 빌드만 useLocale 반영. 본문·진입 URL·가격 정책 보존. 홈 더 둘러보기 내부의 나머지 소개/FAQ/사업자 라벨은 아직 미완료.
- 새 홈 검증: native-home-copy/guide/home-entry-guide 9개, Babel JSX구문, ESLint 오류0. 실제 Chromium 모의 native flag +390×844 12언어: 제목/튜토리얼/두 서비스링크 일치, 가로넘침0/pageerror0. 320px DE,390px JA,1440px EN screenshot 확인. FR 상담 탐색390px 확인. 실제기기/새패키지 아님. 최초 mock에서 native 신호를 넣지 않아 PriceBadge SSR불일치가 났으나 native 신호를 맞춘12언어 재검사는없음. 외부정적font CDN CORS 오류는 남아 폰트 대체 상태로 검수.
- 현재 mock dev 서버 세션24045,127.0.0.1:18720(front)/18721(API), NEXT_PUBLIC_RUNTIME_TARGET=mobile-app. scripts/dev-with-local-auth.mjs로 외부 API 차단. 종료 시 본인 세션만 종료. Playwright 스크린샷은 D:/Development/code-destiny/.playwright-mcp/native-home-*.png 및 native-discovery-fr-390.png. 도구의 C:artifact 쓰기는 allowed roots 제한으로거부되어 허용된 D:출력폴더 사용.
- 직접 원고 `8996b37dc`: EN/JA EP.13까지, ZH EP.10까지 완료분37파일 커밋. 이후 원고는3담당이 계속 작성. 마지막 재검사 EN2530/JA2313/ZH1859각 비트, 총7844(이후 늘어남). 최종4언어 파일은 아직 교체하지 않았고 미완성 언어 공개금지.

- 20:45 KST 무렵 재확인: origin/main 5d7fcf852c1eab54ff3471d4fea9630c0f4199b7, PR CI 40862258511 success. 이전 f7c922d6a 실패는 f90488fa8에서 문서 수정되어 해결. 최신 main에 기존 npm test 실패2파일 수정도 포함돼 통합 예정. `c10fcb7df` 앱 운세 종류/고민 소개25문구×11 추가; 독일어390px 가로넘침 없음.

## 2026-10-29 최초 출시 담당 인수인계 — 아래는 인수 시점 기록
- 사용자 최신 요청: “앱 출시까지 진행해줘 인수인계를 해서라도 마무리해”. 인수인계 자체를 완료로 보지 말고 실제 출시까지 진행한다. 번역 API 및 별도 LLM API 호출 금지. 직접 번역만 허용된다.
- 소설 번역 범위 확정: 영어·일본어·중국어 간체·번체. 한국어 원문 유지. 그 외 서비스 언어는 영어판. 상세 운세/UI는 기존 지원 12개 언어를 점검한다.
- 마지막 구현 커밋 `56fb0fcf8`와 그 부모 `bbefbc0bd`는 이 작업 트리에만 있고 아직 push하지 않았다. 앞선 `d5cf9ede2`까지 main에 push했다. 현재 원격/CI는 다시 확인해야 한다.
- 소설 메인 `public/codedestiny-novel.html`의 언어 선택 UI와 localized manifest 로딩을 연결했다. `lib/stories/vn/locales.mjs`가 정책 정본, `scripts/lib/novel-localized-runtime.mjs`가 원문 해시/회차/비트 ID/본문/이름/기술명/선택지 검증 후 표시 문구만 교체한다. 빌더는 완전한 최신 번역만 `manifest.availableLocales`에 싣는다. 현재 외국어 원고는 구판이므로 모두 비활성: 기능 구현을 외국어판 제공 완료로 보고하지 않는다.
- `content/novel/translations/authored/prologue-001.json`~`003.json`: 최신 프롤로그 77비트 × 4언어 = 308개 직접 번역 초안. 각 문장 원문과 SHA256 보유. 본문만 작성했고 회차 제목/태그, 화자명 등은 별도 정리 필요. 기존 translations/{en,ja,zh-CN,zh-TW}.json에 아직 병합하지 않았다. 구판 원고를 최신 해시로 덮어 인증하지 않는다.
- 다음 구현: authored 문장 원문 해시를 확인하는 오프라인 병합기를 만든 뒤 남은 72화 직접 번역, 최신 번역 파일 완성. 텍스트 리더 `/stories`와 회차에도 언어 선택/본문 연결 필요. 비주얼 노벨 main/설정/화자/오류 UI의 한국어도 남았다. 선택지 삭제 후 고정 결말을 출력하는 기존 플레이어 문구 역시 언어화해야 한다. 기존 분기 노출 정책을 임의로 바꾸지 않는다.
- 최근 검사: 새 언어 선택·변환 6개 통과, `verify-novel-runtime` 73화/7,844비트 통과, 프롤로그 308개 원문 해시/4언어 확인. 이는 전체 번역·실기기·모바일 렌더·CI·정식 출시 증거가 아니다.
- 앞선 pre-push는 d5cf9ede2에서 통과. 국가 언어 병합 후 21개 검사 통과. 현재 후속 소설 변경은 check:fast 계획/필요 검사, pre-push, main 통합/CI가 남아 있다.
- 병렬 작업은 허용된 인수인계 범위에서 소설 언어별/상세 문구별로 파일 소유를 나누어 진행 가능하다. 다른 세션 루트 파일/브랜치/워크트리를 수정·정리하지 않는다. 본 워크트리는 후속 담당자가 사용하므로 배수하지 않는다.
- 출시 순서: 번역 완료와 모의 언어 검사 → 실제 모바일/국가 기본값/상담 언어 검증 → 승인된 운영 반영 및 Pages/Worker 버전 일치 → 새 서명 Android 번들/실기기 검증 → Play Console 제출 → 심사 통과 후 정식 게시. 외부 심사 대기는 출시 완료라고 말하지 않는다. 기존 managed publishing은 ON이었다. 계정 연결이 끊겼을 때만 사용자에게 필요한 조작을 구체적으로 요청한다.

요청 원문: “앱 안에 번역 안 된 부분들도 전부 마무리하고, 각 나라에서 접속하면 기본 언어랑 상담도 그 나라 언어로 나오는지 확인해 그 이후에 정식으로 출시까지 진행할 수 있도록해줘”

## 현재
- 작업 경로: `D:\Development\code-destiny\.codex-worktrees\app-global-locale-release-20261029-151727`. 다른 세션의 루트 변경을 보존한다.
- 국가 언어 수정: `07de05987414871dab4b5da84fb4a250eb7429ae`. Android 자동 선택은 국가 우선, 명시적 선택은 보존, 오프라인은 OS 언어. 지역 별칭을 웹과 맞추고 FirstVisitGuide의 ProfilePicker 한국어 고정을 해제했다.
- 직접 번역 커밋: `e2cc921a8`(홈 안내·두 서비스 첫 이용 안내), `21be992de`(고민 선택 메뉴), `8b1d98f62`(고민 질문·설명). 영냥이 안내 32키 × 12개 언어, 꿀꿀운세 안내 60키 × 12개 언어가 준비됐다. homeQuestions-01의 109키 중 영어가 남아 있던 7개 언어의 문구를 직접 번역했고 가격 숫자를 보존했다. 나머지 전체 앱 번역은 미완료다.
- 관련 모의 검사 110개, AI 언어 전달 14개 규칙 통과. 변경 파일 ESLint 오류 0. 실제 외국 접속/상담 생성/새 패키지 검증으로 확대 해석하지 않는다.
- check:fast 첫 실행은 localhost EACCES 및 임시 Git config 권한으로 4개 실패. host 재실행 로그는 마지막 개별 검사까지 통과했지만 전체 종료 결과가 기록되지 않았고 session 73190도 소멸했다. 전체 통과로 보고하지 않는다. 검사 예외를 코드로 우회하지 않는다.
- 새 안내 검사 29개 통과, 변경 파일 ESLint 오류 0(경고 20), i18n 키 일치 검사 통과, 가격 보존 검사 125키 × 12개 언어 통과. 첫 pre-push에서 sitemap 원장 drift가 있어 공식 생성기로 갱신 중이다.
- 로컬 HTML 미리보기 열기는 CUA URL 보안 정책이 거부했다(허용 프로토콜 http/https, 대체 브라우저 등 우회 금지). 새 번역의 모바일 시각 검수는 아직 미완료다. guide-*.html은 실제 React 컴포넌트를 fixture 상태로 렌더한 것이며 실제 앱/기기 검증과 다르다.
- Play 개발자 `8929260153073799668`, 앱 `4971977067602742831`. 제출 ID 2, v1.0.54, 15개 언어 등록정보/96장 이미지 심사 중. 이번에 **관리형 게시 ON** 확인: 번역 검수 전에 자동 공개하지 않는다. 출시 국가는 아직 8개이며 확대 필요.

## 직접 번역 진행과 남은 범위
- 사용자 확정: “API 호출하지 말고 니가 직접 번역해줘”. 외부 번역 API 및 별도 LLM API 호출 금지. 직접 번역한다. 과금 호출 0회이며 API 초안 실행 스크립트도 제거했다.
- 73화 정본. 이전 4개 번역은 44화/오래된 hash, 나머지 7개는 없음. 기존 소설 플레이어/텍스트 리더에 언어별 정본 연결도 필요하다. 한국어 본문과 책갈피 ID를 보존한다.
- `scripts/i18n-build-repair-plan.mjs`는 읽기 전용: 영어 잔존·누락 후보, 소설 본문/선택지/표시명 등을 언어별 중복 제거. 후보 182,330건, 원문 8,175,286자. 짧은 공통 영문 22,304건은 수동 검토. 이는 미번역 확정 총량이나 완료율이 아니다.
- 코드 내 한국어를 전부 미번역으로 세지 않는다. KO 사전/한국어 전용 분기와 실제 해외 노출을 구분한다. FirstVisitGuide 본문은 이번에 번역했고, 영냥이 질문 UI·소설·기타 신규 화면은 추가 확인한다. 큰 잔존 영역: loveSimulation, featureMarketing, shellRuntime, fortuneTeaHouse. homeQuestions-02도 영어 잔존이 남아 있다.

## 증거 및 다음
아래 artifact 루트: `C:\Users\user\.codex\visualizations\2026\10\29\01a185c3-a6e9-76e0-9994-fb8c22613d80\global-locale-audit`
- `index.html`, `state.json`, `repair-plan.json`, `managed-publishing.png`, `check-fast-country-host.txt`.
- 외부 번역 도구를 쓰지 않는다. 원문을 읽고 직접 작성한 번역을 authored 정본에 기록한 뒤 기존 병합 도구를 사용한다.
- 번역 적용 시 authored 정본과 생성 사전을 함께 맞추고 숫자/정책/변수/URL 보존 검사. 소설 번역은 본문 외 표시명·선택지까지 검증한 뒤 생성기 연결.
- 12개 언어 모바일/데스크톱 표시, 국가 기본값→새 상담 기본값, 명시 선택, 오프라인, 저장된 유료 결과 재열람 검증. 구매 결과·가격·결제/인증/DB 계약은 변경하지 않는다.
- 새 서명 앱, 실기기 확인, main CI·릴리스 검증 뒤 심사 제출/정식 공개. 부분 번역을 출시하지 않는다.
