---
status: done
updated: 2026-11-16
next: QR19 간편 진입 단위는 완료했다. 승인된 후속 웹툰 설명 이식을 별도 단위로 진행한다.
---

## 첫 행동
이 단위는 완료했다. 아래 최종 전달 결과가 이전 진행 기록보다 우선한다. 기존 기능 원장의 코드 존재를 사용 가능한 UX 증거로 취급하지 않는다.

## 지금 상태
- 작업 디렉터리 `D:/Development/codedestiny-worktrees/toss-guided-entry-20261115-221109`, 브랜치 `wt/toss-guided-entry-20261115-221109`.
- UI 커밋3b48cdd98은 병합b39b5c29e를 거쳐 main에 전달됐고, 고정 AIT source는 `d38c0997cab26fb08f280618c243c21d19ce8e56`이다. 워크트리는 승인된 후속 웹툰 구현에서 이어 사용 후 정리한다.
- UI 최종 check:fast 계획과 pre-push, main CI, 전체 수동 CI와 Linux AIT 검증을 완료했다.
- 다른 세션의 웹툰 변경은 main 원본으로 보존·병합했다. 기존 untracked `.claude/skills/fire-your-seo-agency/`는 건드리지 않았다.

## 승인 상태
- 2026-11-15 추가 요청 원문: “가상 모바일로 확인해볼게. 최종 CI와 새 비공개 테스트 QR 등록까지 계속 마무리하고, 그다음 기존 웹툰 방식 설명도 원본을 재사용해서 이식해줘. 실결제와 새 검토 제출은 계속 보류해.” 현재 QR 단위 완료 후 웹툰 구현을 별도 단위로 계속한다.
- 2026-11-15 사용자는 QR18의 로그인·보관함·재진입 정상 확인.
- 최신 제보 원문: “일단 프로필 카드 설정이 어렵게 되어있어서 확인이 어렵고 모든 운세 기능들 이식은 한것 같지만 ui/ux가 이용하기에 직관적이지 않아서 내 서비스를 참조해서 간편하게 개선해줘야할것 같다 너무 한 화면에 기능들이 모여있고 운명 찻집은 타로밖에 없는데 모든 운세 기능들이 이식이 되어야해 다른 기능들도 마찬가지이고”. 이것이 현재 작업의 성공 기준이다. 기능표 정리만으로 종료하지 않는다.
- 실결제·실LLM·운영DB 테스트 쓰기·새 검토 제출·공개 출시 보류. 신규판매 닫힘. 기존가격/권리/서비스·계정소유권 유지. 새 UI 코드 구현·mock검수·LinuxAIT/비공개QR 등록은 기존 사용자 승인 범위.
- QR18 source61ca3cea186427cfa21d1578865a2ccee01280bf. Linux43704490361SUCCESS. AIT/QR `C:/Users/user/Downloads/CodeDestiny/20261115-login-cta-ux/`. SHA2567f8d36bc3a500c7b75a0898050dc4ff89e8b5bc0f0d18f15e58d7bb038aa90fa. 기존17검토 취소는 사용자 명시지시로 실행,18은 검토필요. 현재새브라우저공간없음(15정상finish).
- 이전 운영 로그인fix08103bec6 / run43698214314이미성공. 절대중복배포금지. 이름불일치지원문의는사용자담당.

## 작업 규칙과 함정
- 사용자에게 개선 방향 설명 완료: 달빛 예화/아트 유지, 상담선택→필요출생정보→시작 순서. 홈과밀/프로필설정/찻집모드 접근 실제코드와웹원본 대조.
- impeccable SKILL/code-destiny/operate 읽음. context --target apps/toss/src/UnifiedHome.tsx 실행완료. UI편집전 craft-floor필독. 출력은구PRODUCT/sidecar drift참고일뿐 글로벌수선금지. 완료UI detector1회 및 모바일360/390/430+desktop일괄검수→1회보정확인. 브라우저는 ego-browser skill따라사용. 실연동fallback금지.
- PowerShell rg 경로 wildcard는지원되지않음: 디렉터리를대상으로 -g 파일패턴 사용. 루트전체검색금지.
- root node_modules 정션과 앱 npm ci --ignore-scripts 설치 완료. lockfile 변경 없음. node C:/Program Files/nodejs/node.exe. py -3 사용.
- 중간집계109코드누락없음은과거원장기준이지사용자제보를반박하는근거가아님. 새UX/진입결함발견시실제증거로기능표갱신.

## 설계·추적 시작점
- `apps/toss/src/UnifiedHome.tsx`: 루트2캐릭터선택; 꿀꿀운세world에서FortuneDirectory; 영냥이world에모든birthSystems/legacy/relationship/fusion/spirit/horary+질문목록한번에노출.
- `apps/toss/src/FortuneDirectory.tsx`, `home-directory` 및 원본웹 `js/core/service-registry.js`, `index.html`의 카테고리/검색/컬렉션 비교.
- `apps/toss/service/Screens.jsx`: /fortune-tea-house의 counsel=letter는LetterRoom, 기본은원본FortuneTeaHousePage(paymentSurface=toss). tea/result/consultation/owner/adapters유지.
- `src/features/fortune-tea-house/FortuneTeaHousePage.tsx`: enterTeaHouse 기본mode=tarot(1033줄), mode=saju 쿼리특별진입(598줄), stage teaSelect에서 paymentSurface!==toss 분기(1698줄). 원본모드saju/sajuCompatibility/sukuyo/tarot있음. 제보의타로밖에없는UI관련분기를우선추적하되추측수정금지.
- `apps/toss/service/TossAstrologyProfilePicker.tsx` 및 찻집QuestionForm/영냥이프로필컨트롤 실제입력흐름대조. 여러상담입력·결과를제목만합치지말것.

## 단계
- [x] QR18실기기기본정상및사용성제보수신
- [x] 원장집계오류수정커밋/targeted3PASS
- [x] 부모checkfast종료/기존준비단위전달 (Node5099/Jest8011/prepush PASS, main a7f5dd6d1)
- [x] 웹원본·실제토스홈/프로필/찻집모드접근대조
- [x] 점진노출·간편입력·모든모드진입구현
- [x] mock실사용동선/모바일시각/nativeback검증 (실기기 키보드는 추가 확인)
- [x] targeted/checkfast/커밋/prepush/mainCI
- [x] 검증소스LinuxAIT·새비공개QR(검토미제출); 사용자 미리보기와 후속 작업용 워크트리만 유지

## UI 구현 재개 상태
- 새 전담 worktree: `D:/Development/codedestiny-worktrees/toss-guided-entry-20261115-221109`, 기준 a7f5dd6d1. 이전 readiness worktree는 부모가 배수했다.
- 홈 네 분류 점진 노출(기본 5개), 44개 운세의 명시적 다섯 소분류, 영냥이 세 분류, 찻집 5종 선선택 UI, 프로필 guided 4단계 및 기존 계정/경로 scoped 세션초안 연결 구현 완료.
- 실제 reload에서 기존 Screens 인증 초기화가 profile draft를 지우는 결함 발견. 기존 보존 목록에 검증된 profile-entry envelope만 추가했다. 계정/경로 범위는 기존 helper를 사용한다.
- 실제 홈 전체 73개 진입 PASS. 찻집 6모드(saju/sajuJoint/tarot/tarotFive/sajuCompatibility/sukuyo)의 모의 구매 1건·생성 1회·앱 재열기·저장 원문·후속상담·다른 계정 거부 PASS.
- 일반 Windows AIT 87,854,975 bytes / expanded 99,095,658 bytes: 한도 PASS. Linux 경로 검증 전에는 업로드하지 않는다.
- 모의 AIT는 expanded 100,257,263 bytes로 업로드 한도 FAIL. 일반 AIT와 혼동하지 않는다. 이 변형은 현재 로컬 직접 테스트용이며 한도 게이트는 변경하지 않았다. 원본 아트 손실을 일으키는 축소를 하지 않는다.
- 사용자 미리보기 http://127.0.0.1:4330/preview (exec session36448). 이미 사용자에게 전달했다. 계정/기록 초기화나 서버 중단 금지. 다음 private dist 빌드는 이 서버가 읽는 자산을 덮어쓰므로 수행하지 않는다. 일반 dist 빌드는 독립적이다.
- 독립 미리보기 사본: `C:/Users/user/Downloads/CodeDestiny/20261115-guided-entry-preview`에 scripts/preview-private.mjs, private-simulation/dist, 사용안내.txt, verification 캡처/증거를 보존했다. 워크트리 정리 전에 이 사본의 서버로 같은 4330 포트를 이어주면 브라우저 계정/기록은 유지된다. 현재 서버가 살아 있으면 중복 실행하지 않는다.
- 최종 추가 targeted 73 PASS. 새 profile-entry helper가 Screens에 추가되어 기존 테스트 6곳의 광범위 mock resolver도 실제 helper를 읽도록 수정했다. 기존 회복/뒤로가기/계정 경계 검증을 줄이지 않았다.
- 별도 모의 AIT `--guided-profile`: 홈→로그인→4단계 초안→reload→네이티브 뒤로→B 빈 초안→A 복원 PASS. 편지 saju 및 네오 saju-partner도 주문 1건·원문·후속·cold reopen·B 거부 PASS.
- check:fast는 paid77/lint PASS 뒤 sitemap 드리프트에서 종료. 정식 sitemap:generate와 재검사(1081 URL) PASS. 기존 계획의 나머지 단계를 `.tmp/guided-check-remaining.mjs`로 동일 guard/env에서 진행 중(session62014); 전체 타입 검사 PASS 후 Node 회귀 단계다. 통과한 앞 단계를 중복 실행하지 않는다.
- 원본 웹툰 설명은 후속 이식: 다른 세션의 app/_entry/ServiceGuide.tsx, CutReader, lib/brand/service-guide-webtoon.mjs가 확정된 뒤 quickGuideStories 5종과 대표6/전문7 그룹을 원본 href/상담ID로 재사용한다. 이번에 미커밋 원본을 가져오지 않았다.

## main 병합과 전달 진행
- UI 복구 커밋 `3b48cdd9872dd0be9dfc5e885bb68ab177365dfb`를 root main에 병합한 커밋은 `b39b5c29e`이며 아직 push 전이다. 이전 main `1872bd579f0439be09a0e671f74dd1e050365d35` CI `43722216643`의 SUCCESS를 1회 확인했다.
- 원장 충돌은 최신 main 원장을 기반으로 정식 sitemap:generate를 실행해 해소했다. verify:sitemap-drift URL1081, 병합 트리 check:pre-push 전체 PASS. 다른 세션 untracked `.claude/skills/fire-your-seo-agency/`는 보존했다.
- paid77/lint/typecheck PASS. Node5099 중 당일 생성물 누락 1건은 로컬 fortune:build-data 후 해당 파일7/7 PASS로 해소했다. 나머지 계약/Worker/encoding PASS. 마지막 Jest479 suites/8011 tests PASS,1skip(448초), agent session77993 exit0. check:fast 공식 계획의 모든 단계를 완료했으며 전체 재실행하지 않는다. 로그5종은 Downloads/CodeDestiny/20261115-guided-entry-preview/verification에 보존했다.
- root가 push와 콘솔 QR 등록을 담당하고 agent가 고정 push SHA의 Linux AIT 생성·검수를 담당한다. 콘솔 Ego20 p1에서 QR18 검토 필요·버전 등록 활성 확인. 검토 요청 버튼은 누르지 않는다.
- 사용자 preview 4330은 계속 유지한다. 웹툰 원본은 main93f73981d에 들어왔으며 이번 QR 등록 후 기존 StoryLibrary/CutReader를 재사용해 후속 구현한다.

## 최종 전달 결과 — 2026-11-16
- source `d38c0997cab26fb08f280618c243c21d19ce8e56`, main CI43725837626 SUCCESS. 전체 검증을 강제한 Linux run43725888081도 CI required 포함 SUCCESS.
- AIT `C:/Users/user/Downloads/CodeDestiny/20261115-guided-entry-linux/ai-saju-studio.ait`: archive87,856,544 / expanded99,099,236 bytes, portable 경로 PASS. SHA256 `ac4a4cd8904b15e099d073555c4d4e7d7f907cdb3b6dfdabfe47a83ef4961e86`.
- 해당 Linux AIT의 홈73경로·질문 복원·360×420 CTA·신규 판매 닫힘·저장 원문·연결 단절 재열람·계정B 거부 PASS. 새 결제0. 테스트의 옛 '내 정보' 선택자만 수정한 후속 로컬 커밋11cce55f7은 후속 웹툰 단위에 전달하며 AIT 런타임은 변경하지 않았다.
- 콘솔 `20261116-19` 등록·빌드 완료, 검토 필요 상태. 테스트 URI `intoss-private://ai-saju-studio?_deploymentId=01a1dfb2-f631-72f8-a8e3-fa56410e9908&host=appsInTossHost`. 같은 폴더에 QR png/svg, 링크txt, 콘솔 상태json, 검증 로그·캡처를 보존했다.
- root Ego20은 정상 finish. 실결제·운영 재배포·테스트 푸시·새 검토 제출·공개 출시0. 토스 상단 이름은 사용자 담당 범위를 유지한다.
- QR19 실기기 키보드/뒤로가기와 변경된 입력 흐름 확인은 아직 미검증이다. 기존 QR18의 사용자 로그인·보관함·재진입 확인을 QR19 전체 검증으로 확대하지 않는다.
