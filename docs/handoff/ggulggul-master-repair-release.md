---
status: active
updated: 2026-10-19
next: "2026-10-30 확인: 45cb7c8e·44fdd1d2·f0d183b0 모두 main에 포함, 운영 Pages/Worker는 5d758f0f2(해당 커밋 포함)이고 라이브 JS/CSS·초상화 3종 200 확인. 남은 것은 로그인된 브라우저로 4종 각 1회 보유 이용권 상담 검증뿐(브라우저 도구가 없는 세션에서는 수행 불가)."
---

# 꿀꿀운세 마스터 상담 및 기본 화면 수정

## 전달 상태
- 작업 디렉터리: `D:\Development\code-destiny`.
- 마지막 자체 커밋: `45cb7c8e1003213a624bcdc2f26a5cb59b61f421`, main push 완료. 선행 서버 수정: `44fdd1d2223569ae02254dda2c52597db1c48861`.
- 서버 수정 CI 39146755289 성공. 캐시 수정 CI 39147127195는 마지막 조회에서 Static guards 진행 중, 다른 실행 대상 성공, Critical은 캐시 범위라 skip.
- 이후 다른 세션이 `f0d183b062d227aaa58d626d25259b4df0dbc1bc`를 main에 통합. CI 39147516224에서 lint와 static 실패. 영냥이 QA의 module 변수명 및 이전 문구 기대 테스트가 원인. 담당 세션이 QA 파일을 수정 중이므로 건드리지 않는다.
- 사용자가 "영냥이 담당 세션의 수정 완료까지 배포 보류" 선택. 공식 production은 아직 실행하지 않았다. 운영 SHA 및 실제 새 화면 검증은 미완료.

## 완료한 변경
- worker/lib/feature-question-delivery.js: BSON 저장 시 undefined가 null로 바뀌어 저장 확인이 실패하는 문제를 JSON 정규화로 수정.
- worker/lib/feature-question-quality.js: 네 운세 전용으로 내부 fact 번호, 확인된 문장 조각, 반복 문구 정리. 이전 챕터 전체와 챕터 역할을 프롬프트에 제공해 반복을 억제하고 근거와 해석을 연결.
- js/saju-engine.js 및 public mirror: 동일 계정 토큰 갱신으로 상담 복구가 취소되는 문제 수정. 실제 계정 변경 취소는 유지.
- js/core/fortune-consultation-ui.js, styles/fortune-consultation-entry.css 및 mirror: 무성·윤달 큰 초상화와 기본 해설 도입. Vedic 무료 결과 상단으로 이동. 숙요점 기존 서한비 아트와 대체 텍스트 정리.
- scripts/sync-legacy-static-to-public.mjs: standalone Vedic의 오래된 고정 캐시 키를 공식 동기화에서 갱신.
- 영냥이 제품 코드, 가격, 이용권/월정석/단건 결제 정책은 이 작업에서 수정하지 않았다.

## 검증
- targeted worker 64개, 복구 UI 11개 통과. BSON 실제 직렬화 왕복 회귀 포함.
- verify:runtime-cache-sync, check:pre-push, git diff --check 통과.
- check:fast 전체는 실패: Jest 421 suites/6685 tests 성공. Node 재검사 3407 중 3404 성공, 로컬 dist/out의 오래된 브랜드 2개 및 다른 세션 영냥이 문구 기대 1개 실패. 로컬 전체 성공으로 보고하지 않는다.
- 실제 컴포넌트 390px/desktop 로컬 미리보기 검토 완료. 운영 검증으로 간주하지 않는다.
- 증거 폴더: `C:\Users\user\.codex\visualizations\2026\10\18\01a14ec6-8f0b-7e32-b229-c26e577b4ccc\live-master-audit`.

## 재개할 작업과 승인
1. 영냥이 담당 수정 완료 및 최신 main CI 성공 확인. 다른 세션 파일 보존.
2. 기존 production 승인으로 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`. 정확한 배포 대상 SHA 확인. 완료 후 Pages /version.json과 Worker /api/version의 SHA 일치 확인.
3. 실제 기본 화면: 자미두수 무성, 서양/베다 윤달의 큰 초상화 및 숙요점 서한비 확인. 베다는 상단 배치와 새 캐시 키 확인.
4. 사용자 새 승인: **4종 각 1회, 보유 이용권만 사용**. 아직 한 건도 생성하지 않았다. 월정석·추가 결제 금지. 기존 승인 재질문 불필요. 보유 이용권 확인 후 각각 새 질문으로 생성하며 동일 요청 복구 외 추가 생성은 하지 않는다.
5. 각 원문 전체를 위 증거 폴더 `<kind>-after-answer.txt`로 보존하고 사용자에게 링크. 무성/서한비/윤달 말투, 근거→해석, 체계 분리, 반복·문장 끊김·내부 번호, 새로고침 후 저장 복구 검증. 기존 원문은 덮어쓰지 않는다.
6. 완료 후 이 문서를 done으로 닫고 자체 임시 파일 정리.

브라우저: in-app 원래 탭2 Ziwei, 탭3 Sukuyo, 탭5 Vedic (살아있는지 확인). Western은 새 탭으로 `https://code-destiny.com/?action=cdHomeAstroEntry`. CUA 문서부터 복원. 사용자 로그인 원래 프로필 사용, 숨은 인증 상태 접근 금지.

## 복사할 재개 지시
`D:\Development\code-destiny`에서 `D:\Development\code-destiny\docs\handoff\ggulggul-master-repair-release.md`를 읽고 마지막 자체 커밋 `45cb7c8e1003213a624bcdc2f26a5cb59b61f421` 및 다른 세션의 수정 완료와 최신 main CI 통과를 확인하라. 사용자 보류 조건이 해소되면 기존 승인으로 공식 production 배포, SHA 일치, 실제 마스터 이미지 및 4종 각 1회 보유 이용권 상담 검증을 이어가라. 추가 결제·월정석 사용은 금지한다.
