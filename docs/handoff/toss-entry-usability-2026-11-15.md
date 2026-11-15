---
status: in-progress
updated: 2026-11-15
next: 구현한 홈·찻집·프로필의 최종 check:fast와 커밋/pre-push/main CI를 완료하고 일반 Linux AIT로 새 비공개 QR을 등록한다.
---

## 첫 행동
이 문서를 읽고 아래 작업 디렉터리에서 상태를 확인한다. 부모 검증은 PASS 후 main a7f5dd6d1으로 전달됐다. 새 UI 전담 워크트리에서 구현을 계속한다. 기존 기능 원장의 코드 존재를 사용 가능한 UX 증거로 취급하지 않는다.

## 지금 상태
- 작업 디렉터리 `D:/Development/codedestiny-worktrees/toss-guided-entry-20261115-221109`, 브랜치 `wt/toss-guided-entry-20261115-221109`.
- 기준 커밋 `a7f5dd6d1e8ea4b263adf1435dd4504f7c297514`은 부모가 main에 전달했다. 이번 UI 변경은 아직 미커밋이며 이 워크트리에서 전담한다.
- 부모의 이전 준비 작업 check:fast는 Node5099/Jest8011(479 suites)/pre-push PASS로 종료했다. 이번 UI 작업의 최종 check:fast는 별도 필요하다.
- 다른 세션의 root ServiceGuide/webtoon 등 미커밋 변경은 보존한다. root 직접 편집 금지.

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
- [ ] mock실사용동선/모바일시각·키보드/nativeback검증
- [ ] targeted/checkfast/커밋/prepush/mainCI
- [ ] 검증소스LinuxAIT·새비공개QR(검토미제출)·정리

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
