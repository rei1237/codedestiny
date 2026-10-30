---
status: active
updated: 2026-10-30
next: 사용자 심사 재시작 승인 후 Play Console 최종56 검토 제출 및 승인 후 게시
---

# 앱 전체 다국어 출시

## 2026-10-30 09시 최종 상태 — 최우선
- Android56 BUILD SUCCESSFUL in37m12s(207tasks), jarsigner verified, aapt56/1.0.56/min24/target36 확인. USB install-r Success, dumpsys56 확인. 실제 헤더 제목y106으로 상태바와 분리(55y25). 증거 D:/Development/code-destiny/.playwright-mcp/android56-home.png. 업데이트 후 소설의繁體中文 선택 유지 및 메인 진입 확인.
- 제출AAB apps/mobile/android/app/build/outputs/bundle/release/app-release.aab(468918542bytes), SHA256 FE98B16CE54C4719DA3194D1B8FD0E13E5E58137EE83ADCBF850619ADD2FF061. APK468481656bytes. 소스675456972e; 이후main병합은 문서 전달용이며 이 APK를 새main소스 빌드로 표현하지 말 것.
- Play 최종56 업로드/최적화/출시준비됨/15언어노트/100%모든대상국가 저장 완료. 신규11국+기존8국. 55제외. Chrome3 tab1473077450, releases/3, 현재 게시개요의 ‘검토를 다시 시작하시겠어요?’ 확인창.
- ‘검토 다시 시작’ 클릭을 자동 승인 검토가 거부했다: 진행중인10월29일 심사를 취소하고 대기시간을 늘릴 수 있는 구체적 동작 승인이 없다는 사유. request_user_input_async로 사용자의 최종56 심사 재시작 승인을 요청했고 답변 대기. 승인 없이 우회/재시도 금지. 확인화면 play56-restart-review-confirmation.png. 아직56심사제출/정식게시 완료 아님. managed publishing ON.
- 웹운영 CI40921979719와 production40925498246 success, Pages/Worker0e64bb92974f84e58ff1ace3005aa65efbba4f18 일치 및 FAQ/home/ggulggul390/1440 실제화면 PASS. 담당기록 D:/Development/code-destiny/outputs/moonlight-production-20261030/release-evidence.json statusdone 확인. 이후 다른 담당main927c6ebe6의새배포가 진행중이므로 이전증거를현재최신SHA로표현하지말것.
- 30d04ed255b27bf0921b98b5273ccdf52898cce4에 기존실기기기록커밋, 이후origin/main927c6ebe6를충돌없이병합. 최종 문서전달prepush/push/CI확인 남음. 출시진행파일을보존하기위해worktree는최종게시전유지.

## 2026-10-30 최종 제출 진행 — 아래 기록보다 우선
- 소설4언어 각각73화/7844비트 및 상세4언어 직접 번역 완료. 다른7언어 긴 안내/소설은 EN, 기본 UI·상담12언어 유지. API 번역0. 국가/UI/상담 mock58검사와 fake provider12언어 PASS; 실제 해외IP/실LLM 검증은 아니다.
- Android55 서명 빌드 성공(61분22초), USB RFCXB0CP4AR install-r 성공. EN/JA/CN/TW 실제 메인 언어 선택→번역 본문 모두 확인. 앱 재시작 후 기본 한국어 유지. 증거 D:/Development/code-destiny/.playwright-mcp/android55-novel-{en,ja,zh-CN,zh-TW}.png.
- 기기 홈 상단 상태바 겹침 때문에55는 심사 제출하지 않는다. GlobalHeader.module.css 안전 여백 수정675456972e463318598d501a28da5c5344f707cd(관련5검사PASS), 웹 담당이 f871d187e로 통합. 수정 포함 Android56 sync 성공, Gradle bundleRelease assembleRelease 진행(session96771, .tmp/android-gradle-56.log). 종료 후 버전56/서명 확인→install-r→상단 실기기 확인→Play56업로드/제출. 산출 경로에 남은55를 잘못 제출하지 말 것.
- Play55 저장/심사전송전. 56 새 임시버전 출시명/15언어노트 저장, 새AAB 아직 미업로드. 54 검토중. 승인96이미지/15등록언어 유지, 출시19국 저장. managed publishing ON. 일반 제출/출시는 승인됐지만 심사전 공개완료라고 보고하지 않는다.
- Chrome3 releaseFresh tab1473077441. dev8929260153073799668/app4971977067602742831/track4697542548292933451. 오래된1473077411 재사용금지. .tmp/release-notes-1.0.55.txt는56에도 재사용가능(본문버전없음).
- main0e64bb92974f84e58ff1ace3005aa65efbba4f18 CI40921979719 success. 웹 운영 담당 채팅01a187c3-555f-71e0-bb9f-5fb769196a9a가 승인된 production 배포중. 중복dispatch금지. Pages/Worker SHA·FAQ/안내버튼 실화면 결과를 받는다.
- ownHEAD675456972e는 main에 동일패치가 cherry-pick됐으므로 단순FF불가. root/다른main체크아웃 dirty보존. capacitor 로컬경로 생성물/RSS4파일은HEAD정리. 재Gradle에는 .tmp/capacitor.settings.local.gradle 또는공식sync 필요. js/faq-search.mjs는LF정규화후HEAD와동일hash이나stat M일수있어 실제diff확인.
- 전체check:fast90suite는 리소스경합으로 본인프로세스중단; 전체PASS아님. 공식CI와 기록된targeted결과만 사용. 실제결제/LLM/운영DB쓰기 테스트없음. 최종 앱 제출/웹운영일치/정리 아직 미완료.

## 2026-10-30 현재 진행 상태 — 아래 과거 기록보다 우선
- c696b77c1215977834404ca1e26c28d9daf20433를 origin main에 non-force push 완료. main CI40905181451은 빌드/핵심검사 PASS, static guards 두 검사와 lint 세 오류로 실패. 원인은 새 NativeHomeCardLink에 맞지 않는 구 검사, featureMarketing이 없는 브랜드 fixture, 테스트 module 변수/익명 mock 컴포넌트. b84ad2e17에서 수정하고 관련18검사 PASS/lint 오류0 확인. 9719040b4는 최종 앱 링크 검사 수정이며 아직 후속 push 전.
- 소설4언어 각각73화/7844비트, 상세4언어 직접 번역 완료. 나머지7언어 EN 안내/소설, UI 및 상담12언어 유지. API 번역0. 국가/UI/상담 mock 계약58검사 및 fake provider12언어 PASS. 실제 해외IP/실LLM 검증 아님.
- 최종 dist 기반 scripts/design/verify-detail-editions-browser.mjs 12/12 PASS(320/390,4언어+FR 영어대체). verify-novel-locales-browser.mjs 4언어 메인선택/본문/마지막회차/허브320/390/1440와7언어 영어대체 PASS. 편지 실제컴포넌트12/12 PASS, 변수/전체문단14검사 PASS.
- mobile:android:sync(c696 소스) EXIT0; 이미지5667개 재인코딩159.4MB 절감, PortOne차단 및 콘텐츠 진입검사 PASS. Gradle 서명55 빌드 실행 중: session92253, .tmp/android-gradle-55.log. 작업흐름 process32088(Gradle), 파일해시 계산 진행 확인. 아직 APK 설치/새 AAB 제출 완료 아님.
- 실제 USB RFCXB0CP4AR 연결 확인, 기존54설치. Chrome3 새tab1473077411로 복구해55임시버전 작성화면/출시명/15언어 출시노트 입력. 기존54는 심사중,8국,설치0. upload/제출/게시 아직 안 함. releaseFresh CUA변수. 새 계약 동의 등은 사용자 직접 확인 필요, 일반 제출은 이미 승인됨.
- 빌드가 생성한 capacitor.settings.gradle은 로컬 node_modules 경로이므로 빌드 후 HEAD로 되돌린다(다른 세션 파일 아님). RSS 빌드변경4파일은 HEAD로 정리 완료. 소스변경은 없고 후속커밋은 테스트만이므로55앱 내용은c696과 동일.
- 기본 main 체크아웃 C:/Users/user/Documents/Codex/worktrees/yeongnyangi-blue-passes-20261024-050530에는 다른세션8dirty파일, root는feat/world-cast-page 작업중. 보존하고 own HEAD:main non-force 전송. prepush 통과 후 공식 CI 확인, 운영workflow(modeproduction), Pages/Worker SHA확인,55설치-r 실기기/스토어 제출까지 계속. 운영 배포/출시 아직 완료 아님.
- own worktree D:/Development/code-destiny/.codex-worktrees/app-global-locale-release-20261029-151727. localhost18720은 .tmp/serve-mobile-artifact.mjs의 dist서버(session69311), /api503. 실제결제/LLM/DB쓰기는 금지.
## 2026-10-29 후속 담당 진행 상태
- **현재 확정 범위**: 사용자가 소설뿐 아니라 긴 상세 안내도 EN/JA/zh-CN/zh-TW, 나머지는 EN으로 승인했다. 기본 UI와 상담 응답은 국가별 기존 12언어 유지. `b25094496`은 상세 안내 featureMarketing 영어 대체 동기화/검사와 sky/experience 6템플릿 240키 직접 번역을 반영했다. UI·상담 namespace 보존 2검사, 111 namespace/46,299경로, 가격125키×12 PASS. 전체 상품 상세 번역 완료는 아직 아니다.
- **소설 최신**: `56f206231` EN, `a7084846b` JA 전체 73화/7,844비트와 런타임 완료. `4bd5eeff1`은 EN/JA 허브 161문구와 73회차 제목 연결. 현재 공개 가능한 언어 ko/en/ja이며 ZH는 완성 후 생성한다. API 호출 없음.
- **모바일 최신**: `cbf34d3ec` MobileBottomNav의 초기 언어 hydration 불일치를 공용 useLocale로 수정, 보관함7언어 라벨 직접 번역. native home12언어 실제 모의 브라우저 PASS. `scripts/design/verify-novel-locales-browser.mjs` EN/JA 메인선택·리더·허브·마지막회차·프랑스어 상담언어보존과 나머지7언어EN 선택 PASS. screenshot은 D:/Development/code-destiny/.playwright-mcp/global-novel. 실제 기기/해외 IP/실상담 증거는 아니다.
- **기기 최신**: 호스트 adb에서 RFCXB0CP4AR / SM_M156S device 연결 확인. 기존 root의 release-signing.properties를 본 worktree의 동일 ignored 경로로 복사했으며 내용 출력/커밋하지 않음. 새 빌드·설치 검증은 아직 남았다.
- **담당 재개**: 이전 에이전트가 live 목록에 없어 저장 원고부터 새 하위 담당에게 인계. finish_chinese_early=ZH EP39~42A+hub 두판, finish_chinese_late=ZH EP48~53/51S~53S 후 숙요 상세, finish_detail_four=sky120 완료 후 주요 유료 안내. root=오라클/리포트/음악120 완료, 통합·무료허브·검증·출시. 다른 세션 파일 보존.
- 위 항목이 아래 과거 진행 기록보다 최신이다. 아직 main 통합/push 및 최종 CI·배포·새 앱 제출 전이다.
- 최신 이어가기: origin/main 5d7fcf852c1eab54ff3471d4fea9630c0f4199b7(PR CI40862258511 success)을 d33fa1c69로 병합. sitemap 공식 생성 후3d6ab45b7, check:pre-push PASS. 그 이후 변경은 아직 push 전이며 다시 generator/pre-push 필요. root main은 다른 작업 변경이 있어 건드리지 않는다.
- 870983913: 늦게 도착한 국가 기본 언어를 소설 메인/텍스트 리더에 반영. 수동 소설 언어 선택과 재생 중 읽기 위치 보존. 14검사+추가5검사 및 verify-novel-player-start PASS.
- 9c39bbf37/f8315d189: 네이티브 홈 조언자/예시/체계설명/전체FAQ/사업자 라벨/접근성 nav라벨 연결. native-home-copy151개 직접 문구×11. 공개 KO 웹 유지. EN390px 실제 mock DOM에서 남은 한글은 공식브랜드·등록사업자원문만,scrollWidth375. 5관련검사+ESLint오류0.
- 37488b8ef: 사주 상세38키×12(11번역) 직접작성; tarotReading-01.json은 타로41키직접작성. 가격125키×12/84markup 검사, featureMarketing111ns/46299paths 통과. 이는 전체 번역 완료 증거가 아니다.
- 4c21a8d55: EN/JA/ZH EP.26까지 완료원고49파일 추가커밋. 이후 담당자들이 계속 작성. 최종번역파일/런타임은 아직 갱신하지 않았다.
- 담당분담변경: novel_english는 EN전체+content/novel/hub-en.json 완료 후 ZH EP.43~53 및51S/52S/53S 두판 맡음. novel_chinese는 ZH EP.42까지(이전외전포함)만 소유, 이후hub-zh-CN/TW. novel_japanese는 JA전체후hub-ja.json. 허브는KO원문→번역map, authored폴더밖.
- 브라우저 재연결 완료: CUA browser3, tab1473076779, 변수storeBrowser/storeTab. Play Console /u/1 기존개발자8929260153073799668 앱4971977067602742831 실제확인: 1.0.54프로덕션+15언어등록정보 검토중, managed publishing ON,8개국. 아직출시0. 현재후속버전은미제출.
- Windows native 창읽기는 최소화오류로256초지연해중단. 재연결된Chrome extension은정상. 과거file://보안거부우회금지.
- Android준비: worktree에release-signing.properties/local.properties없음. root의기존release-signing.properties만있음(내용/비밀값출력금지). JDK21.0.11 및SDK adb존재. 하위powershell스크립트는AuthorizationManager실패; 설정변경없이수동read-only확인. 호스트adb devices는정상실행했으나기기0, 사용자USB연결요청pending. 새빌드/설치검증아직안함.

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

- 2026-10-29 재확인: origin/main 5d7fcf852c1eab54ff3471d4fea9630c0f4199b7, PR CI 40862258511 success. 이전 f7c922d6a 실패는 f90488fa8에서 문서 수정되어 해결. 최신 main에 기존 npm test 실패2파일 수정도 포함돼 통합 예정. `c10fcb7df` 앱 운세 종류/고민 소개25문구×11 추가; 독일어390px 가로넘침 없음.

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
