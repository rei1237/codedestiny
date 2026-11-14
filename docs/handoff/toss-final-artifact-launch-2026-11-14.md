---
status: in-progress
updated: 2026-11-14
next: 이미지 매핑 수정6407d8582 및 최신SEO main 병합본으로 full Linux CI와 두 AIT를 생성하고 실제 이미지6개 디코딩 후 새 비공개 QR을 등록한다.
---

## 최우선 최신 인계 — artifact_finish (2026-11-14)

### 최우선 이미지 누락 수정 — private_qr_delivery

3095의 Linux43601482167은 CI required 포함6 jobs 모두 success. 일반/모의AIT 다운로드 후 실제 펼친 요약에서 ExternalImageGuide raw img만 기존 WebP 매핑을 거치지 않아 캐릭터 PNG가 누락됨을 확인했다. 제출하지 않았고 Downloads/CodeDestiny/43601482167/SUPERSEDED.txt에 표시했다. 6407d8582는 Toss Vite projection에서 해당 원본 컴포넌트의 표시 src/캐릭터 다운로드 href만 기존 byte 동일 WebP에 연결한다. 웹 원본·공유 메타데이터·정책은 보존한다. 실제 core검사에 펼친 원본 이미지6개 decode를 추가하고390×844 실제 viewport 캡처4장을 준비했다.

targeted bundle-art4 PASS, Windows actualAIT core/구매/재열람/B거절 PASS. 이미지실패0. 새 Windowsexpanded99,992,004B, deployment01a1da7a-d213-7b51-9ed7-8eabfed70713. check:fast -- --base=HEAD exit0,479suites/8008tests PASS; log D:/Development/Temp/toss-report-art-checkfast.txt. 캡처 D:/Development/Temp/toss-report-art-viewport-screens. 다음새Linux만 제출한다. 다른SEO세션c562be344의3커밋을 무충돌merge했고 app/layout.js analytics캐시핀 및 문서만 바뀌어 Toss원본경로 영향없음. 동일SHA 일반push중복은 root상시승인대로 취소하고 full_ci+두artifact superset을 완료한다. 운영 활성화/검토/실결제는 계속 보류.
### Linux 실행 위치 회귀 수정 — linux_qr_finish

**이 문단이 아래7e8상태보다최신이다.** 7e8 Linux43598295559는 일반AIT까지PASS했으나 private actualAIT 후반의 `--sukuyo-yearly`에서 옛버튼문구 timeout으로실패했다. `SukuyoBasic.tsx`는 기본숙요 guest무료복구후 연간전용 `올해의 숙요 흐름`/`토스 로그인하고 연간 흐름 보기`를제공하는데 테스트가이전공통 `토스 로그인하고 살펴보기`를찾았다. 각CLI는새Node/browser/context라선행계정오염아님. 118456b3a에서 exact새heading/버튼으로수정, runtime변경0. 같은runtime Windows AIT01a1da10에서 숙요연간 전체PASS 및 **그이후53케이스전부PASS**(extended4,paidtarot4,paidfamily4,free/native14,Neo편지27). 로그 `D:/Development/Temp/toss-sukuyo-yearly-fix.txt`, `toss-remaining-summary.txt`(53/failures[]), 개별 `toss-remaining-00..52.txt`. 재빌드없음. Linux실패로그 `toss-linux-critical-7e8.txt`에는 연이/찻집/네오/native/expert/HumanDesign까지PASS근거가있다. 아직음악/동물등후반Linux근거로쓸수없음.

- 7e8일반AIT만 `C:/Users/user/Downloads/CodeDestiny/43598295559/regular/ai-saju-studio.ait` 다운로드완료: deployment01a1da34-60b4-7fde-ba71-f6a1cd4fa16a, archive87668230, expanded98824729, source1760, nonPortable0, SHA25626bb1aa7fa5442f95f17529adaba5880fbab3c3e226a510cd75d439370764c5a. private upload저장단계전실패라private파일없음. 최종은새런regular/private쌍사용.
- main pushCI43598296786는 다음push직전1회조회시 in_progress였고7e8정확SHA였다. artifact43598295559는실패. 기존watch74707는완료됐거나종료대기. 새런dispatch가필요하며root에게런번호직접알릴것. fullroot검사중복불필요: 이미Toss1741/root479통과,최신은QAselector1줄뿐.
- 118 prepush첫시도는 이인계문서미커밋때문에mirror판정불가(실제mirror drift아님). 이문서commit후prepush재실행하고push. final보고에통과시도/판정불가이유분리.
- console69/p1 meta/edit 살아있음(22:33쯤round50확인), 저장/업로드/검토변경0. p2는우리새GitHubjob로그페이지(readonly), root유저페이지아님. 정상AIT setInputFiles→memo/releaseNote→임시저장→app-build테스트→newQR. round51까지 `D:/Development/Temp/toss-launch-console-20261114/` 사용. 안내버전은기존15이므로새16예상이나실제관찰확인.
- 브라우저및Linux준비: ego-guide `D:/Development/Temp/linux-qr-ego-guide.txt`; inspect script `.../inspect-linux-artifacts.mjs`는현재7e8/run43598295559상수라최종새값으로바꿀것. `node ...inspect-linux-artifacts.mjs <folder> [regular|simulation]`; filedownload완료후실행. screenshots는actualarchive defaultcore에 `TOSS_CONSOLE_CAPTURE=1`/`TOSS_CAPTURE_DIR=<permanentfolder>/screens`로3장. `tools.view_image`로확인.
- 최종README/QR/metadata/AIT/screens는 `C:/Users/user/Downloads/CodeDestiny/<최종run>/`에묶고root에QR부터전달. 기능표상단구버전정보갱신, ait-verification JSON의과거근거보존해최신절추가, 110행16/93/1유지. 32MiB는현재메모리상한/SDKstream없음이지공식한도아님. 운영활성화·검토는root가새QR관찰뒤구체질문,임의실행금지.

- `438f6c16d` 일반 CI43595865519 및 Linux dispatch43595897060은 전체 Jest 통과 후 Toss 계약 검사 실패. `astro-synastry-ui.test.mjs`가 `path.resolve('public/styles/...')`로 실행 위치에 의존했고, `routes.test.mjs`는 신규 music-download mock 누락으로 실제 웹 auth/models를 부분 stub과 섞었다. 로컬 기존 targeted가 root cwd에서 실행되고 음악 통합 뒤 라우트 전체검사가 없었던 차이이며, runtime 제품 결함을 뜻하지 않는다. 실패 로그 `D:/Development/Temp/toss-linux-critical-438.txt`, `toss-main-failure-438.txt`. 이 두 런에서 제출 가능한 AIT는 생성되지 않았다.
- `7e8d6523acc2cfece64159d7fa38dbc41373020e`에서 CSS 경로를 import.meta 기준으로 고정하고 음악 라우트 mock 경계와 prepare/read/file 인증·403 보존 테스트를 추가. cwd 상대경로를 Toss test 범위로 점검했고 해당 누락만 확인. 실제 `apps/toss` cwd targeted78 PASS, **npm test 전체1741/1741 PASS(55초)**, pre-push PASS. 로그 `toss-linux-fixtures-targeted.txt`, `toss-linux-fixtures-full.txt`, `toss-linux-fixtures-prepush.txt`. 루트479suites를 반복하지 않았다.
- **main 7e8d6523a push 완료**, 새 Linux workflow dispatch **43598295559** in_progress, 일반 push CI **43598296786** pending. 이번에는 artifact dispatch가 먼저 실행 중이다. watcher session74707, `D:/Development/Temp/toss-linux-artifact-watch-7e8.txt`. 이전 watcher23750은 실패 런의 나머지 job 종료까지 대기 중으로 중복dispatch 아님. 새 런만 최종 산출물로 사용한다.
- runtime은438과 같고 새 변경은 테스트2파일 및 문서뿐. 위치 운영고지 초안 `18d3bf6cd`도 push 포함: 명시 클릭/별도 전송/무료결과 DB 미저장/LLM없음, 외부 천체력 설정시 좌표 전달 가능. 고지 정본이나 운영 설정은 변경하지 않았다.
- 새 artifact 이름은 `toss-preview-7e8d6523acc2cfece64159d7fa38dbc41373020e`, `toss-private-simulation-7e8d6523acc2cfece64159d7fa38dbc41373020e`. 최종 전달 디렉터리 `C:/Users/user/Downloads/CodeDestiny/43598295559/regular` 및 `/simulation`. 기존 임시 inspect-linux-artifacts.mjs의438/run 상수도 새SHA로 수정하고 사용한다.
- 콘솔69/p1은 정상 `meta/edit` 상태. 확인된 파일input은 `input[type=file][accept=".ait"]`, 텍스트 `input[name="releaseNote"]`, `input[name="bundle.memo"]`. 아직 파일업로드/값변경/저장 전. 정상 파일업로드+memo/releaseNote+임시저장 뒤 app-build 테스트로 새QR, 검토버튼은 누르지 않는다. Browser round49까지 read-only; skill guide `D:/Development/Temp/linux-qr-ego-guide.txt` 재사용.

이 절이 아래 이전 상태보다 우선한다. 코드/Windows 실제AIT/검사 작업은 끝났으며, Linux 산출물과 QR·최종 전달 단계다. 반복 전체검사나 기능 재탐색으로 돌아가지 않는다.

- **원격 main SHA `438f6c16dd6f4a75c04a51c94a0a261e86eb1274` push 성공**. 일반 push CI **43595865519** 진행. 공식 Linux AIT workflow_dispatch **43595897060**, full_ci/toss_artifact/toss_simulation_artifact 모두 true로 시작했다. 보통 CI는 폴링하지 말고 final/다음push 직전1회; 필수 Linux 산출물 생성완료 대기는 이번 전달을 위해 필요하다. 60초 넘는 blocking wait 없이 사용자업데이트 유지.
- 처음push는 다른 SEO세션 원격 main `cea92ad58` 진전으로 non-fast-forward 거절. **강제push없이** 해당main CI43593465811 success 확인, `2055bc8c7` 무충돌merge로168파일 전부보존했다. root checkout에는손대지않음. source분석: Toss/Worker 변경없음, 웹홈/브랜드/상품설명/SEO 변경, saju-engine 시작에 analytics1줄. 원본추출17계산선언/154shell --check PASS; 기능표110행 unchanged. 최신source부터 번들재생성했음.
- 공식checkfast 1회 전체PASS: `npm run check:fast -- --base=9a6ac23eb`, log `D:/Development/Temp/launch-artifact-check-fast.txt`; paid77PASS, lint/typecheck/worker guards, Jest479suites/8008tests PASS(1skipped). Toss tsc PASS log launch-toss-typecheck.txt. prepush 최종merge도PASS log launch-artifact-pre-push-merged.txt. **다시 전체 checkfast를 돌리지 말 것**. 새소스실패가나면그범위대상검사만.
- 소스수정완료: `cf7c970c3` Screens로그인 next allowlist music추가(기존엔영냥이로잘못복귀), AnimalDestiny원본globals.css+LazyMotion/domAnimation 연결(원본카드무스타일/opacity0빈공간복구), 동물QA달력 accessible name /^달력/ 및 실제CSS/opacity검사. 로그인회귀+musicUI21PASS, animal2PASS.
- `02ff9538a`: 기존 compressLocaleCopy를 TSX로파싱, KarmaDestinyAiClient/FusionFortuneClient의원문다국어literal만gzip(약125KBsource절감), 모든원문table/formatter 동등성5PASS. 기능/원문/아트삭제없음.
- 통합build3 Windows deployment01a1d9fc-2ed6-7908-864d-2a4cf77daa03 expanded99,991,886B. **최신merge build4** 현재 apps/toss/private-simulation/ai-saju-studio.ait: deployment **01a1da10-5fdd-7b68-9cf1-782f2d403d82**, archive88,328,328B/expanded**99,991,890B**, 1790source files. limit100,000,000에여유8110B. `D:/Development/Temp/launch-final-private-build4-merged.txt`. Windows경로이므로최종제출은Linux를쓸것.
- 실제build3 AIT PASS: --animal-destiny/--music-download/--astro-synastry/--free-originals/--neo-email/core(default)/--free-calculations/--free-reading/--expert-report karma/fusion. build4 merge후core재검증PASS log launch-core-merged4.txt. 나머지Linux전체스크립트는workflow가실행함. 기본/새CLI모두제대로등록됨.
- 동물 원본144궁합동등성은**단위검사**. actualAIT는윤달/시각미상한명+상대1쌍,10탭/6본문/12도감,3폭,B입력초기화,무료주문0. screenshot `D:/Development/Temp/launch-final-screens/animal-mobile-card.png` 직접확인PASS. 원본카드보임. 음악은홈→로그인복귀→모의구매1건→합성10byte파일저장요청→cold구매기록재열람/새로고침→B동일URL ReviewReceipt **구매 기록 확인**게이트차단. SDK실파일은저장안함. B경계QA를rolealert가아닌이실제heading으로수정,권한검사우회없음.
- 스크린샷폴더에 animal-full-original/music-owned-download/vedic-compat-input/vedic-compat-result/prashna-result/flower-result PNG. 동물/음악/베다입력직접확인. 음악은모의판원곡미다운로드로재생오류표시가능,다운로드권리QA와분리. docs아래PNG커밋금지.
- 최신기능표갱신 `2a200f011`/`5e7a36bc0`/`438f6c16d`: **110=이미동작16+콘솔운영설정93+일부만이식1(음악큰파일)**. codeGaps빈칸을운영출시완료로말하지않음. 32MiB는 **현재 어댑터 메모리 상한, SDK 공식 용량한도 아님**. SDK3.7에는URL/stream/append파일API없고큰원곡경로미구현/기기미검증. 기존구매권리와정책유지. 기능표/원본감사/운영안/기기안내모두정확표현수정됨. inventory6PASS,YAMLparsePASS.
- 새최종자료 `docs/toss/final-original-flows-20261114.md`, `final-device-walkthrough-20261114.md`, `launch-operational-evidence-20261114.md` 마지막운영후보표. 원본분석/QA도다시쓰지말고이자료최신Linux근거만추가.
- **운영게이트중요**: TOSS_RELEASE_READY=true는로그인/기존결과뿐아니라native기존미완료유료생성복구·대사·unlink복구도연다. root가코드/AIT/QR준비완료후한번묶음승인질문할것. 새임의플래그/기존권리축소추가금지. 실LLM개발검증은계속금지이며운영승격영향으로기존구매의LLM재개가능성을명시. 키3종(TOSS_IDENTITY_KEY/TOSS_DATA_KEY/TOSS_CALLBACK_AUTHORIZATION)·mTLS·DB/개인정보정본대조·콘솔필드/제출문구는운영자료표에구체화. 새판매false,독립buyer증명문제유지.
- **콘솔69/p1**: 공간68사라져기존사용자새공간승인대로복구. name `Code Destiny final verified Linux QR 20261114`. URL app-build같음. 최신snapshot round43: container@12, 버전등록@14, 앱정보수정@15. 콘솔최신15/앱정보반려/검토필요. 새업로드/검토/정보저장없음. `D:/Development/Temp/toss-launch-console-20261114/round-41.mjs` 실패(68없음),42새69,43snapshot. 다음round44 unique파일. ego-browser skill+전체guide는 fresh가다시읽을것. guide `D:/Development/Temp/launch-ego-guide.txt`는끝표시까지읽음. 업데이트알림있으나업그레이드승인없고작업필수아님.
- Linuxartifact names `toss-preview-438f6c16dd6f4a75c04a51c94a0a261e86eb1274`, `toss-private-simulation-438f6c16dd6f4a75c04a51c94a0a261e86eb1274`; retention1day이므로완료후즉시D:/Development/Temp나사용자전달폴더로다운로드. runtimeSOURCE438가최종검증대상. 후속문서커밋은소스동일하니artifact를다시빌드하지않음.
- 최종Linux다운로드후 `node .../private-simulation-archive.mjs <LinuxAIT>`에는 --local-windows넣지않고확인. workflow이미전체모드검증시그근거활용. 콘솔3스크린샷준비는 default actualAIT 경로에 `TOSS_CONSOLE_CAPTURE=1`, `TOSS_CAPTURE_DIR=<외부폴더>`로실행하면원본QA과정캡처함. `private-console-prep.mjs` 참고. 실제Linux AIT 캡처를확인해옛축소홈콘솔이미지교체자료로준비;검토는누르지않음.
- next: 이미지 매핑 수정6407d8582 및 최신SEO main 병합본으로 full Linux CI와 두 AIT를 생성하고 실제 이미지6개 디코딩 후 새 비공개 QR을 등록한다.

## 첫 행동
handoff 스킬/CLAUDE를 읽고 이 문서를 최신 정본으로 삼는다. 전체 사용자 요청은 중단하지 않는다. 이전 toss-launch-completion 및 toss-private-extended-native 문서는 이전 증거 참고용이다.

## 지금 상태
- 워크트리 D:/Development/codedestiny-worktrees/toss-launch-completion-20261114-165438, 브랜치 wt/toss-launch-completion-20261114-165438. root checkout은 다른 세션 소유: 편집/checkout/reset 금지.
- 마지막 코드 통합 f76687af0, 동물 도감 QA 029670ad0. git fetch 완료. main 마지막 push 9a6ac23eb. 이후 로컬 커밋 다수; HEAD:main으로 push한다. 다른 변경 보존.
- **빌드 실행 중**: npm --prefix apps/toss run build:private-simulation, exec session83971, 로그 D:/Development/Temp/launch-final-private-build2.txt. source freeze다. 이 빌드에 음악/동물/가격배지 수정/추가 gzip 모두 포함.
- agent /root/launch_final_coordinator/animal_port가 동물 소유, source 안정/QA 도움 대기. /root/music_download는 완료/슬롯 반환. parent /root에게 진행 및 출시안 전달한다.

## 승인 상태
- 사용자 2026-11-14: 모든 코드 가능한 기능을 끝까지 진행, 실제 AIT mock 검증, 가능하면 론칭까지. 실결제/실 LLM/운영 DB 쓰기 금지, 판매 false 유지. 검토 보류와 최신 론칭 요청의 운영 게이트는 코드/AIT 완료 후 root가 한 번 묶음 질문한다. 개발 중 이 때문에 중단하지 않는다.
- 새 브라우저 작업공간에서 계속 승인 유지. 다른 사용자 공간 claim 금지.
- 운영 Worker 승격/secret 등록/상품노출/검토/최종출시는 개별 게이트. 임의 SKU 가격/secret 값 생성 금지. 승인된 콘솔 5SKU(연이4950+영냥이4tier) 외 판매 금지.

## 구현 및 증거
- 고정110행 감사 docs/toss/original-mode-audit-20261114.json, inventory/feature-matrix. 53eca7d6a는 historical local-partial과 현재 portStatus 분리: 당시 2일부(animal/music),92운영설정,16개발범위동작. old 상세 수동표의 일부 이식은 역사 증거. 최종 동물/음악 실제AIT 후 감사/생성기 갱신할 것. 기존 검증을 새110개 개별E2E로 부풀리지 않는다.
- 동물 02ebf0ffc +029670ad0: 원본 AnimalResultScreen 전체10탭/6심층/12도감/관계/성장/카드, 원본 solar/lunar/leap/unknown+144궁합,7targeted/tsc/eslint/detector PASS. guest 무료/미저장 원본 정책. private API 공개 경로 원본 pure worker 호출. --animal-destiny QA 포함.
- 음악 세부 정본 docs/handoff/toss-music-download-2026-11-14.md (cf5186f40). 단건권리/owner/환불/서비스경계/원본 proxy 유지. mock SDK는 exact ID3 10byte만 localStorage 기록하며 실제 파일 저장 없음. 대상12+모델13+상품2 PASS. **32MiB 초과 원곡 저장 미완료**: 설치SDK3.7 File.saveBase64/openPDFViewer만 지원, URL/stream API없음. 정책한도 아닌 기술제약; 큰파일 전체완료로 표시하지 않는다. 운영은 곡별SKU/실원곡크기/실기기파일 필요.
- 통합 f76687af0: privateAPI 음악 DI/카탈로그/주문/보관함, bootstrap/sdk 음악목록, 모의저장 정확문구, --music-download/animal CLI, workflow5모드. Node private music API+SDK2PASS, CLI syntax PASS.
- 추가무손실압축: 62598c2f3 심리검사 literal -69KB; b165ada4c 타로 sun-recovery/interpretation literal -105KB, 원문identity+failclosed검사 PASS. animal gzip -27KB. 원본/아트삭제 없음. 더 압축 필요하면 lossless만.
- 이전 실제 Windows AIT 01a1d9c9-e74b-7540-af9f-81dcba5c8032는 expanded100022244(한도22244초과), 음악/동물/최신gzip 전. 이 AIT에서 astro2,vedic2+flower4,neoemail 경로 PASS. 로그 D:/Development/Temp/launch-final-astro-synastry2.txt / launch-final-free-originals2.txt / launch-final-neo-email3.txt. astro 원본가격배지 발견해 b5de20414 neutral수정, 새AIT 재검증 필요.
- Neo email은 실제 메일발송아닌 mock 접수/상태/취소요청/보관함, deliveries0. 취소요청을 환불완료로 주장하지 않는다.

## 설계 / 작업 규칙과 함정
- source 안정 후 현재 build2 완료 확인. 명령 node apps/toss/test/private-simulation-archive.mjs apps/toss/private-simulation/ai-saju-studio.ait --local-windows --animal-destiny (옵션 교체).
- 즉시 --animal-destiny / --music-download / --astro-synastry / --free-originals / --neo-email 및 core(default), 압축회귀 --free-calculations / --free-reading 검증. 최종 Linux workflow가 전체 서비스 CLI 실행. 실결제나 external fetch 폴백없음.
- TOSS_CAPTURE_DIR=D:/Development/Temp/launch-final-screens 사용하면 동물/음악/vedic/prashna/flower PNG 생성. view_image로 작은화면 직접 확인. QA selector 실패는 실제UI 근거로만 고치며 상태검증 축소 금지.
- 음악 홈 검색 음악→첫곡→로그인→단건결제로다운로드→모의파일저장→앱재진입→꿀꿀운세구매기록→다시보기→B동일URL차단. 동물은 무료라 로그인/주문0, B 입력초기화.
- 공식 checkfast 이번 묶음 아직 미실행. npm run check:fast -- --plan --base=9a6ac23eb 후 계획대로 1회, prepush, mainCI한번 조회 후 push. 기존CI run43588000694 SHA9a6은 마지막조회 in_progress(critical/build/typecheck성공,static진행). 지금push직전 한번조회. 빨간불이면 원인수정. 매번전체검사/CI폴링 금지. Linux artifact workflow 필요한 completion 대기는 허용.
- .github/workflows/pr-ci.yml에 --astro-synastry/free-originals/neo-email/music-download/animal-destiny 추가. YAML parse 최종필요. Linux 최종검증SHA로 full_ci+toss_artifact+toss_simulation_artifact 공식워크플로실행. 이전 QR15는80bd 구버전이므로 새번들새QR필수.
- 공유index: 명시적 own files add/commit, 다른agent stage와 겹치지 않는다. no reset/stash.

## 콘솔 / 운영 출시안
- ego-browser skill 및 CLI 전체guide 다시읽고사용. 설치0.6.2.8, 업그레이드불필요. TaskSpace68 name Code Destiny final Linux private QR 20261114, p1. 마지막 app-build https://apps-in-toss.toss.im/workspace/21957/mini-app/ai-saju-studio/app-build . 이전버전20261114-15. ref127 버전등록/ref128정보수정은 snapshot갱신후사용.
- 실행파일 D:/Development/Temp/toss-launch-console-20261114/round-32.mjs~round-40.mjs. 새round41이후 unique파일 작성, ego-browser nodejs -e import(file URL). space사라지면 승인대로새space. 아직업로드/검토/외부저장 안함. corrected600x600opaque아이콘 기존검증완료; 새아트불필요. 기존콘솔3스크린샷이옛축소홈이라 최종실AIT화면교체자료 필요.
- docs/toss/launch-operational-evidence-20261114.md 최신302b9c496: read-only wrangler secret list code-destiny-web 60names중TOSS_*0. TOSS_IDENTITY_KEY/TOSS_DATA_KEY/TOSS_CALLBACK_AUTHORIZATION 미확인/미등록, 값노출없음. 로그 D:/Development/Temp/launch-final-secret-names.txt(names only). 기존 데이터키관계 확인없이 랜덤등록 금지. 로컬 mTLS bindingcert/expiry2027-12-03 존재는 운영배포증거아님.
- 공식 purchaseowner 독립검증 API 부족으로 신규판매닫힘필수. 최종 root 전달할 구체출시후보: **무료+검증된기존결과,신규판매닫힘**, Worker commit/bindings/datafields/secret필요이름/개인정보정본/UI콘솔기입값/제출문구 묶음. 코드를 먼저끝낸 뒤 root운영승인질문.

## 단계
- [x] fixed110 원본추적 및 코드가능 마지막2군 구현
- [x] 음악/동물 mock 통합 및 소스대상검사
- [ ] build2 용량확인 / 실제AIT 마지막2군 및 회귀 / 모바일스크린샷 확인
- [ ] 기능표 최종증거갱신 / checkfast / prepush / mainpush / CI
- [ ] Linux exactSHA AIT / 전체 실제번들mock검사 / 새 비공개QR
- [ ] 무료+기존결과 운영출시안 및 실기기 버튼별절차를 root전달
- [ ] 승인된 운영단계 처리 또는 정확한 gate보고, 자기문서done/작업물정리
