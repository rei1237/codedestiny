---
status: in-progress
updated: 2026-11-15
next: QR18 실사용 제보를 기준으로 찻집 전체 모드 진입·프로필 입력·홈 과밀을 웹 원본과 대조하여 구현하고 검증한다.
---

## 첫 행동
이 문서를 읽고 아래 작업 디렉터리에서 상태를 확인한다. 부모가 실행 중인 check:fast 종료를 알리기 전에는 읽기·설계만 한다. 종료 뒤 UI 구현을 담당한다. 기존 기능 원장의 코드 존재를 사용 가능한 UX 증거로 취급하지 않는다.

## 지금 상태
- 작업 디렉터리 `D:/Development/codedestiny-worktrees/toss-launch-readiness-20261115-213935`, 브랜치 `wt/toss-launch-readiness-20261115-213935`.
- 마지막 구현 커밋 `b746faefe`: launch:status가 원본110행을 ID검증 후 코드gap1/기록된gap없음109로 구분. 테스트3PASS. 아직 push 전. 이 문서 후속 커밋 추가 예정.
- 부모 check:fast session96447 진행 중, `.tmp-launch-check.log`. paid77PASS, lint/typecheck/sitemapPASS, Node5099PASS. 나머지 계약/Jest 진행. 전체 재실행 금지, 부모가 종료확인 담당.
- main 시작점2eee0a76e, 다른 세션 web moonlit 변경과 `.claude/skills/fire-your-seo-agency/` 보존. root 편집 금지.

## 승인 상태
- 2026-11-15 사용자는 QR18의 로그인·보관함·재진입 정상 확인.
- 최신 제보 원문: “일단 프로필 카드 설정이 어렵게 되어있어서 확인이 어렵고 모든 운세 기능들 이식은 한것 같지만 ui/ux가 이용하기에 직관적이지 않아서 내 서비스를 참조해서 간편하게 개선해줘야할것 같다 너무 한 화면에 기능들이 모여있고 운명 찻집은 타로밖에 없는데 모든 운세 기능들이 이식이 되어야해 다른 기능들도 마찬가지이고”. 이것이 현재 작업의 성공 기준이다. 기능표 정리만으로 종료하지 않는다.
- 실결제·실LLM·운영DB 테스트 쓰기·새 검토 제출·공개 출시 보류. 신규판매 닫힘. 기존가격/권리/서비스·계정소유권 유지. 새 UI 코드 구현·mock검수·LinuxAIT/비공개QR 등록은 기존 사용자 승인 범위.
- QR18 source61ca3cea186427cfa21d1578865a2ccee01280bf. Linux43704490361SUCCESS. AIT/QR `C:/Users/user/Downloads/CodeDestiny/20261115-login-cta-ux/`. SHA2567f8d36bc3a500c7b75a0898050dc4ff89e8b5bc0f0d18f15e58d7bb038aa90fa. 기존17검토 취소는 사용자 명시지시로 실행,18은 검토필요. 현재새브라우저공간없음(15정상finish).
- 이전 운영 로그인fix08103bec6 / run43698214314이미성공. 절대중복배포금지. 이름불일치지원문의는사용자담당.

## 작업 규칙과 함정
- 사용자에게 개선 방향 설명 완료: 달빛 예화/아트 유지, 상담선택→필요출생정보→시작 순서. 홈과밀/프로필설정/찻집모드 접근 실제코드와웹원본 대조.
- impeccable SKILL/code-destiny/operate 읽음. context --target apps/toss/src/UnifiedHome.tsx 실행완료. UI편집전 craft-floor필독. 출력은구PRODUCT/sidecar drift참고일뿐 글로벌수선금지. 완료UI detector1회 및 모바일360/390/430+desktop일괄검수→1회보정확인. 브라우저는 ego-browser skill따라사용. 실연동fallback금지.
- PowerShell rg 경로 wildcard는지원되지않음: 디렉터리를대상으로 -g 파일패턴 사용. 루트전체검색금지.
- 작업앱 node_modules는아직없음. root node_modules정션만존재. 앱빌드필요하면 apps/toss에서 npm ci; lockfile변경금지. node C:/Program Files/nodejs/node.exe. py -3사용.
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
- [ ] 부모checkfast종료/기존준비단위전달
- [ ] 웹원본·실제토스홈/프로필/찻집모드접근대조
- [ ] 점진노출·간편입력·모든모드진입구현
- [ ] mock실사용동선/모바일시각·키보드/nativeback검증
- [ ] targeted/checkfast/커밋/prepush/mainCI
- [ ] 검증소스LinuxAIT·새비공개QR(검토미제출)·정리
