---
status: in-progress
updated: 2026-11-14
next: CI661 계약 테스트 복구 전달 후 서양 무료 10종·숙요 관계 원본 누락을 완료하고 Linux AIT 전체 경로 검증
---

## 첫 행동
이 문서와 docs/toss/full-service-inventory.json을 읽고 현재 변경 및 담당 파일을 확인한다. 계획만 남기고 종료하지 않는다.

## 지금 상태
- 워크트리 D:/Development/codedestiny-worktrees/toss-launch-completion-20261114-165438, wt/toss-launch-completion-20261114-165438. 시작 e1fc882d7.
- 이전 전달 b67b027f3 main CI 43571942205 success 확인. 직전 QR15의 Linux runtime80bd는 41개 경로 통과.
- root 원본 checkout feat/world-cast-page 및 기존 untracked 2개는 다른 세션 소유.

## 승인 상태
2026-11-14 사용자: 최종 CI 확인 후 일부만 이식 중 코드 가능 기능군부터 계속 구현, 웹 원본과 달빛 예화 유지, 실제 AIT 홈→모의 생성→보관함, 압축하며 모든 작업과 론칭까지 진행.
검토·출시 준비를 계속하되 확정되지 않은 상품 가격·SKU·운영 설정은 구체적 근거와 영향을 준비한다. 실결제·실 LLM·운영 DB 쓰기는 개발 검증에 사용하지 않는다. 기존 4950원 SKU는 연이 기본 사주만.

## 작업 규칙과 함정
- private API가 현재 연이/찻집/네오/영냥이에 한정되어 일반 원본 어댑터가 있는 다른 상담도 QR에서 생성할 수 없음. 기존 모의 계약을 재사용해 실제 AIT에 연결한다.
- AIT 직전 해제99,910,754bytes. 한도100MB. 원본 기능·아트 무단삭제 없이 중복과 import 크기를 관리.
- CI는 ordinary main 대기 금지, artifact 필요한 경우만 기다림. 실제 가격/정책/소유권은 보존.
- Windows rootnode_modules 정션; 정리 시 먼저 해제. 자동 삭제 거절은 우회하지 않는다.

## 설계
- native_reports 담당은 새 private-simulation/native-reports.mjs + private-native-reports*.mjs. 기존 room-fixture는 변경 전 협의.
- remaining_audit 담당은 관계 경계 상담 및 기본 숙요/휴먼디자인의 실제 코드 누락 대조와 최소 복구.
- launch_completion 담당은 private API 통합·전문가/기본 무료 검증·기능표·번들·전달.

## 단계
- [x] 최종 CI 확인, 최신 main 워크트리 확보
- [ ] 원본 대비 잔여 코드 분류와 구현
- [ ] 전체 가능한 AIT 흐름·복구·소유권 검증
- [ ] targeted/checkfast/commit/prepush/main CI
- [ ] Linux AIT·비공개 QR·운영 및 검토/출시 준비
- [ ] 최종 전달·정리

## 최신 상태 (압축 후 정본)
- worktree 그대로. main 661e25a95까지 push 완료, 이전 origin0d254 CI43574744892 success 확인 후 전달. 공유 루트는 다른 세션이 main으로 변경했으므로 건드리지 않음. push는 HEAD:main 사용.
- 로컬 후속6dce766d8 전체서비스 launch:status, 9136faaf4 SecretHouse 무손실 압축. 코드 첫묶음: relationship 오류분류, Codex가격/그림, 아트중복제거, 숙요연간, HD무료/프리미엄, native14/expert7/Neo27 private연결, novel bookmark. full SHA는 git log 참조.
- check:fast 처음 node4실패(HD테스트VM3/context없음 + 오늘fortune산출물없음)를 수정. nativeundef 실제결함도 caller/param 수정. targeted 모두PASS, 나머지계획 실행 D:/Development/Temp/launch-check-resume-final.txt 종료0, Jest479 suites8008 tests PASS(1skip). paid77/lint/roottsc/node나머지/Worker build등PASS. pre-push PASS 뒤 위mainpush. 현재CI는 다음push직전1회확인.
- 실제 local AIT: build10 01a1d93d-85f2-73a5-abab-30258afbe82b expanded99,520,309. HD 360/390/430 무료0주문+18장원문계정격리, 숙요연간12월/19점수/음력근거0주문, naming 압축후PASS. native14/expert7/Neo27 각각home/구매/생성/이탈/재열람/계정B거절PASS. 전부mock.
- 최신확장build1 01a1d94b-731e-7786-83ab-0c7e59d29db6 expanded99,579,587. 확장4+타로4 중 Compass만서버AsyncLocalStorage import문제로실패→private 원본sections buildextract수정하여build2 진행(agent native_reports). 다른7경로PASS. 같은build1에서 novel bookmark/psychotest 추천 실제AIT3viewport0주문 PASS, Maya무료원본프롬프트완전일치PASS.
- 새Linux없음/새QR없음. 이전QR15 runtime80bd Linux41은이전증거. 이번workflow추가50경로(14+7+HD+yearly+Neo27)는커밋됨. 다음추가군완료후 workflow확장+mainCI+Linuxartifact발행필요.
- 신규 private-maya-free.mjs와 archive --maya-free CLI는 부모작성. native_reports가같은CLI다른모드작업하므로분리커밋조율. docs/build-service-inventory.mjs 부모수정중, 아직생성JSON/feature-matrix미갱신. Maya무료정책최신경로/HD/숙요/novel증거정정. 기존96partial를자동완료판정하지말고단계별근거로수정.

## 담당과 다음 행동
- native_reports: 확장4+tarot4 AIT 마지막Compass검증→해당단위커밋가능보고. 이후relationship/sukuyo전문가/반려동물paid 기존offline계약을private연결. Maya신규유료제외(이미free원본). API/sdk/catalog/ownerprefix/library중복주의. Yoga srcdocCSP해결은private자체HTML asset +frame-src self, main script-src self보존.
- remaining_audit: psychotest 원본추천/안내 3파일20testsPASS; FamousSaju 검색/분야/선택URL 2파일2testsPASS. 다음 전체227published seed 계산/상세+60일주 원문 canonical/famous-library.mjs 제작중(gzip562579B, 원문2.66MB), 기존66approvedarticle109KB와통합할것. 공개미검수글은웹과같이검수전표시, 승인기사와혼합금지. App.tsx 담당허용. 기존빌드420KB여유+SecretHouse새절감47KB.
- 부모: 기능표/운영준비, 추가무료private경로연결조율. 실제Maya코드는누락아님(Screens161 general original free, receipt SavedMaya). free-fortune-policy원문우선. NativeMaya는과거구매복구경로다.
- 남은private무료누락 parent감사: manse/calculate, pet catalog/blueprint, compass moon/calendar/narrate, nakshatra today/resolve/compat/muhurta/vvip/lord/dasha, today-hub, olympus placements, tarot-library/free. offline/fixture58~155 공통기존계약재사용. SecretHouse srcDoc private strictCSP도Yoga와같은문제일수있어실제전체경로확인필요.
- ego guide전문 D:/Development/Temp/launch-ego-guide.txt 끝까지읽음. 아직본작업새space없음. 사용자새space복구승인유효. console새QR전한space생성하고이후id재사용/끝finish. 이전space끝났음.
- 새운영상태: approved5SKU(Yeoni1/Yeongnyangi4), native/tarot0, NEW_PURCHASES_AVAILABLE=false. 가격임의추가금지. launch-status이전7서비스선정이력이현재탐색범위처럼보이던오류수정6dce.


## 2026-11-14 후속 구현과 전달 상태
- 최신 로컬 7252ac031. 원격661e25a95의 CI43578407030 Critical checks는 routes.test의 Swiss WASM loader 누락 및 신규 nativeHD/yearly mock 경계 누락으로 실패. ac81e7d3f에 loader와 명시적인 route mock+guest/owner 경계 테스트 추가, 71/71 통과. 런타임 fallback은 추가하지 않음.
- c608b461e 무료 만세력·반려 차트·무료타로5종 private API 연결. 원본 free tarot 생성기만 private alias로 가져와 실 LLM/DB 번들 유입 방지. 실제 AIT7경로 및360/390/430px21스크린샷 통과.
- 38a3b4162 베다 원본 전체 UI: 남북 명반,7토픽,8상세,12바바용어,원본CSS. 로컬 Swiss 원본 계산 fixture로 실제 AIT3폭 및 nativeback 통과. 일반경로는 자유 출생입력/strictSwiss, private만 고정예시·다른입력422를 명시.
- 203837969 반려2·숙요·관계 모의 구매/재열람 계약 및 베다fixture. 숙요/반려2 실제AIT 통과. 관계 결과 rbt ID와 intentID 차이를 발견해 보관함 URL 수정, 다음 빌드 재검증 중. b3d0e2692 베다바바팝업 QA 강화.
- 77bdf72e6 원본 birthInput 공유모듈로 만세력의 불필요 꽃데이터 의존 분리, 러브코드 전체원문 gzip(12언어/선택지/점수 동등성). 7252ac031 나크샤트라/나침반/손금 번역 데이터 무손실 압축(키순서·모든언어·함수 동등성3tests).
- 직전 AIT01a1d971-8d68-7cf7-bdee-349209dd7458 expanded100,232,178B 초과. 추가 번역압축 반영 AIT 생성 중. Windows 로컬 QA이며 Linux/QR 신규 전달 아님. 이전 QR15 runtime80bd만 존재.
- check:fast --base=661e25a95 실행: 초기 유명인 module변수 lint 오류 수정 후 나머지 검사를 재개하여 통과. paid77, node/guards/typecheck/worker 및 Jest479suites8008PASS1skip. pre-push는 후속변경이 미커밋이어서 신선도 판정 차단됨; 단위커밋 후 다시 실행해야 함.
- 아직 원본 정밀 감사 미완료. 다음 실코드 누락: 서양 무료10종 원본section/휠, 숙요 관계도구. 일부만이식96을 모두 같은 결함으로 취급하지 말고 코드/운영/실기기 단계를 분리한다.
- 담당 remaining_audit: 서양 원본 UI·worker adapter와 숙요 감사. 담당 private_completion: 유료4+베다+무료7 AIT 및 다음 서양 privatefixture. 본 에이전트: CI복구/push·압축·기능표/전체AIT·콘솔.

## 운영 콘솔 관찰 (수정/저장/검토 요청 안 함)
- Ego TaskSpace66,p1 유지. D:/Development/Temp/toss-launch-console-20261114/round-22.mjs까지 실행. 다음은23 이상 새파일. 소유 세션 종료/재생성하지 않음.
- 메타 edit에 반려사유: 앱 아이콘 및 썸네일은 크롭되지 않으며 배경색이 포함된 꽉 찬 사각형 형태 필요. 앱번들 재등록 필요없다는 안내. 현재 한국어명꿀꿀운세/영어Code Destiny, private 설명은 옛 축소판 설명이라 출시전 실제범위로 수정 필요.
- Toss Login은 등록하기 상태, 약관/콜백 등 미등록 폼 관찰. 임의등록/secret변경 없음.
- IAP5개 가격확인, 연이4950 SKU와 영냥이14850 SKU 상세는 미노출. 다른3개노출상태는 미확인. 새서비스에 기존SKU재사용 금지.
- 실기기 토스로그인/IAP/키보드/nativeSDK 실제작동 및 운영Worker·권한·상품노출·검토/출시 게이트 남음. 사용자의 론칭요청을 실제 결제테스트로 확대하지 않는다.
