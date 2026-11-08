---
status: in-progress
updated: 2026-11-09
next: check:fast 최종 로그를 확인하고 UI·원화 커밋 및 pre-push 검사 뒤 원격 main에 직접 전달한다.
---

# 프로필 카드 운세 다마고치 통합

## 첫 행동

`D:/Development/codedestiny-worktrees/profile-pet-20261109-052334`에서 `.tmp/pet-check-fast-final.log`와 실행 세션 82007 상태를 확인한다. 검사는 mock guard 아래 실행 중이다. 운영 DB·실결제·실 LLM을 호출하지 않는다.

## 지금 상태

- 원본 작업 폴더: D:/Development/code-destiny, 다른 세션 변경 다수. 절대 reset/stash/checkout으로 정리하지 않는다.
- 내 워크트리: D:/Development/codedestiny-worktrees/profile-pet-20261109-052334
- 내 브랜치: wt/profile-pet-20261109-052334, 시작 origin/main 4ee6c81148d5ccc19afbd0143232aa81d4ad0bcb.
- 마지막 커밋: fbce1c4f1. 앞 커밋 268eb90b1은 서버 배정·돌봄 구현, 마지막은 반복 요청 멱등·트랜잭션 읽기 직렬화·탈퇴 데이터 정리.
- UI/원화/문서/자동 생성 미러/공용 프로필 스크립트 캐시 핀은 미커밋이며 모두 내 변경이다. 원본 워크트리의 변경을 복사하지 않았다. push 전이다.
- 로컬 main 체크아웃 C:/Users/user/Documents/Codex/worktrees/yeongnyangi-blue-passes-20261024-050530은 e6aa5a287이며 다른 세션의 꿀방울·상담 수정이 있다. origin/main보다 오래됐고 변경 파일이 겹친다. 이 체크아웃은 건드리지 않는다. 내 검증된 커밋을 최신 origin/main에 맞춘 뒤 HEAD:main fast-forward push로 전달하고 원격 main 도달을 확인한다. PR은 만들지 않는다.

## 승인 상태

2026-11-09 사용자가 전체 제안 계획을 붙여넣어 “PLEASE IMPLEMENT THIS PLAN”으로 구현을 승인했다. 같은 날 추가 요청: “오행별로 색깔만 좀 다르게”, 동물마다 자연스러운 먹기·놀기·잠자기 시트, 지정 개발자 계정의 유니크 영냥이. 지정 계정은 worker/lib/profile-pet.js에서 서버 User.email로만 판별한다. 별도 운영 DB 수선은 하지 않는다. 이미지 제작은 내장 image_gen 사용을 승인 범위에 포함한다. 프로덕션 승격 요청은 없다.

## 작업 규칙과 함정

- main 직접 전달, 다른 세션 변경 보존. 문제 시 내 작업 단위 커밋만 되돌리고 force push하지 않는다.
- 기존 출석 하루 1개, 5일 연속 +4개 유지. 같은 친구 먹이+놀이에 계정당 KST 하루 +1개. 친밀도 최초 활동당 +5, 최대 100. 미접속 감소 없음. EXP/월정석/가격/이용권 로직은 연결하지 않는다.
- 최초뿐 아니라 보상 없는 반복 요청도 영수증을 저장해야 자정 재시도가 다음 날 돌봄으로 새지 않는다. 트랜잭션에서는 Mongo 읽기 병렬 실행을 하지 않는다.
- 일반 동물은 실제 오행색, 희귀·영냥이는 원화색. 일반 99%, 희귀 3종 합계 1%. 저장 프로필마다 고정. 알은 장식만 결정.
- 공통 얼굴 파츠는 이마에 두 번째 얼굴로 보이는 결함으로 제거했다. 원화 표정 4프레임을 유지하고 6가지 대기 리듬으로 다양화했다. 무늬4×리듬6×장식8=192 조합, 일반 오행5색 포함 960.
- 영냥이 최초 시트에는 이웃 셀 조각이 섞여 다시 그렸다. 최종 unique-sleep은 원본 마지막 행의 눈감은 셀 [1,2,3,2]를 사용한다. 기존 마스터 원본은 불변이다.
- .tmp/profile-pet-sources-final.json은 원화 절대 경로와 생성 프롬프트를 포함한 기술 준비 입력이다. 전역 C:/Users/user/.codex/generated_images의 원본은 보존한다. 준비 스크립트는 자르기·8px 여백·리사이즈·WebP 최적화만 한다. 프로젝트에는 최적화 35개 시트와 art-manifest.json이 있다.
- sync:public만으로 독립 정적 페이지의 destiny-profile.js 핀이 갱신되지 않아 첫 check:fast가 실패했다. scripts/restamp-paid-runtime-pins.mjs로 24개 참조를 재생성했다. 결제 로직 수정이 아니다.
- Ego 브라우저 공간 67, p1. 서버는 .tmp/profile-pet-server.mjs, localhost:13378. 모든 API는 mock, CSP로 외부 트래픽 차단. Windows node 프로세스 명령줄이 이 정확한 파일인 프로세스만 종료할 것.
- Ego의 페이지 행동 뒤 viewport가 원복될 수 있으므로 캡처 직전에 CDP metrics를 다시 설정했다. 실제 프로필 시트 닫기/복귀는 Escape로 검증했고 단일 노드 1개가 홈에 돌아온다.
- Ego 업데이트 안내가 있었으나 업그레이드는 요청하지 않았고 실행하지 않는다. 작업 종료 전 공간을 finish({keep:[]})로 닫는다.

## 설계

설계·원화 출처는 docs/design/profile-pet-garden.md 및 public/assets/profile-pets/moon-garden-v1/art-manifest.json. API는 /api/rpg/pet, /pet/hatch, /pet/care. 상태 profile_pets, 요청 profile_pet_actions, 보상은 기존 꿀방울 지갑과 계정/날짜 고유 원장. 무료 운세는 기존 profileCharacterPreview 정적 엔진을 재사용하며 LLM 호출 없다. 홈은 기존 프로필 노드를 cdhPetGardenHost로 옮기고 프로필 시트는 동일 노드를 빌린다.

## 단계

- [x] 서버·카탈로그·API 구현 및 커밋
- [x] 신규 16종 원화(일반12/희귀3/영냥이), 종마다 대기·먹기·놀기·수면 16프레임, 알/장식 제작
- [x] 홈 카드·돌봄·출석·무료 정적 운세·접힌 기존 기능 연결
- [x] 서버 테스트 16개, UI 행동 6개, 기존 정령/출석 104개, 탈퇴29개 통과
- [x] scripts/verify-profile-pets.mjs: 35개 투명·규격·중복·용량 검증 통과
- [x] verify-profile-characters --skip-assets, verify-profile-card-level, verify-profile-card-action-policy 통과
- [x] 360/390/430/1280 브라우저 캡처, 가로 넘침 없음·주요 버튼 최소48px 확인. 독립 시각 검수 최종 SHIP.
- [x] 독립 기술 검수의 2개 실제 결함 수정 및 회귀 테스트 추가. Detector 정확히1회: 23건(달 그림자 side-tab 오탐1, 보조 글자 크기 advisory22). .tmp/pet-detector.json.
- [ ] check:fast --base=268eb90b1^ 최종 완료 확인. 첫 실패는 캐시 핀 수정으로 해결 중이며 재실행 세션82007.
- [ ] UI/원화/문서/미러/캐시 핀 커밋, npm run check:pre-push
- [ ] origin/main 최신 상태·CI 확인 후 main 직접 push, 최종 CI 1회 확인(진행중이면 URL 보고하고 종료, 폴링 금지)
- [ ] 이 문서 status:done 정리, 검수 서버/Ego 종료, 내 .tmp 파일·워크트리·wt 브랜치 배수
