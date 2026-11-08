---
status: done
updated: 2026-11-09
next: 화면 승인과 main CI 성공을 확인한 뒤 공식 운영 승격. 아직 운영 승인 대기.
---

# 프로필 카드 운세 다마고치 통합

## 첫 행동

구현과 CI 후속 수정은 완료했다. 다음 사용자 응답에서 화면 승인 여부와 최신 main CI를 확인한다. 운영 승격은 아직 승인되지 않았다. 이 문서의 워크트리는 표준 전달 후 정리하며, 이전 경로를 재사용하지 않는다. 운영 DB·실결제·실 LLM은 개발 검증에 사용하지 않았다.

## 지금 상태

아래 브랜치·워크트리는 최초 구현의 이력이다. 최신 후속 검증과 승인 경계는 문서 마지막 절을 따른다. main 전달 커밋과 CI 조회 결과는 최종 답변에 기록한다.

- 원본 작업 폴더: D:/Development/code-destiny, 다른 세션 변경 다수. 절대 reset/stash/checkout으로 정리하지 않는다.
- 내 워크트리: D:/Development/codedestiny-worktrees/profile-pet-20261109-052334
- 내 브랜치: wt/profile-pet-20261109-052334, 시작 origin/main 4ee6c81148d5ccc19afbd0143232aa81d4ad0bcb.
- 마지막 통합 구현 커밋: 16ffbdf53. 원격 main의 9466a2d3e까지의 폰트·홈·SEO 작업을 보존해 병합했다. 앞 커밋 268eb90b1은 서버 배정·돌봄, fbce1c4f1은 멱등·직렬화·탈퇴 정리, 2bad57256은 UI·원화, b67134337은 다국어 접근성, 2a78b7ea3은 투명 컷아웃·친밀도 상한 안내다.
- 원본 워크트리의 미커밋 변경을 복사하지 않았다. 사이트맵 충돌은 원격 원장을 보존한 뒤 생성기로 다시 계산했다. 마지막 전달의 push·CI 조회 결과는 최종 답변에 기록한다.
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
- Ego 브라우저 공간 67은 finish({keep:[]})로 닫았고 .tmp/profile-pet-server.mjs 서버도 종료했다. 모든 API는 mock, CSP로 외부 트래픽을 차단했다.
- Ego의 페이지 행동 뒤 viewport가 원복될 수 있으므로 캡처 직전에 CDP metrics를 다시 설정했다. 실제 프로필 시트 닫기/복귀는 Escape로 검증했고 단일 노드 1개가 홈에 돌아온다.
- Ego 업데이트 안내가 있었으나 업그레이드는 요청하지 않았고 실행하지 않았다.
- check:fast 두 번째 실행은 77개 결제/인증 가드 중 76개 통과, billing-client 캐시 핀 변경에 따른 동결 해시 1개가 실패했다. 실제 diff가 캐시 핀 1줄임을 검토한 뒤 --update했다. config/payment-freeze.json에는 해당 파일 해시 1개만 바뀌었다. 재실행에서는 77개 모두 통과했다.
- 전체 Node 4,781개 중 새 홈 영역 aria-label의 번역 누락 11개가 실패했다. 기존 home.myGarden.garden 키에 연결한 뒤 11개 언어를 모두 재검증해 통과했다. 앞서 통과한 4,770개를 불필요하게 반복하지 않고, check:fast가 아직 실행하지 않은 나머지 계획을 동일 mock 환경으로 이어서 실행했다. 나머지 계약·워커 빌드·Jest가 모두 통과했다. 원래 check:fast 프로세스의 exit 1을 숨기거나 exit 0으로 보고하지 않는다.
- Jest 전체: 467개 스위트 통과, 7,920개 테스트 통과, 기존 1개 스위트/1개 테스트 skip. 최신 main 통합 후 날짜 계산·11개 언어·반려 캐릭터·원화 검사 24개도 통과했다.
- 전체 원화 검사에서 뱀·기린 및 양·사자 수면의 종이 배경을 찾아 image_gen으로 컷아웃을 교정했다. 각 프레임의 내부 경계까지 확인하도록 검사를 강화했고 35개 최종 시트가 통과했다.
- 첫 pre-push는 public mirror와 home registry가 통과했으나 사이트맵 원장 서명 6개가 낡아 실패했다. npm run sitemap:generate로 이 서명만 재생성했다.

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
- [x] check:fast 계획의 모든 항목 검증. 실패한 국제화 11건은 수정 후 재검증했고 미실행 나머지 계획은 이어서 실행해 통과했다.
- [x] UI/원화/문서/미러/캐시 핀 커밋
- [x] 사이트맵 서명 갱신 후 check:pre-push 통과. 통합/최종 문서 커밋 뒤에도 전달 직전 다시 확인한다.
- [x] 이 문서 status:done 정리, 검수 서버/Ego 종료

남은 표준 전달은 이 문서 커밋 → pre-push → 원격 main fast-forward push → CI 상태 1회 조회이며 별도 운영 승격은 하지 않는다. 전달 뒤 내 .tmp·워크트리·wt 브랜치만 배수한다. 최종 원화 미리보기는 사용자 시각화 작업 폴더의 profile-pets-sleep-preview.png에 보존했다.

## CI 추가 승인 — 2026-11-09

기존 main 9466a2d3e의 CI가 일일 운세 패키지 누락으로 실패해 전달을 보류했다. 사용자가 “CI 준비 단계 수정 후 main에 전달 (추천)”을 선택해 CI 수정을 승인했다. 승인 범위는 Static guards의 Node 검사 직전 npm run fortune:build-data 추가와 완성한 기능의 main 전달이다. 기존 검사·분류·차단 조건은 바꾸지 않는다. 동일한 정적 준비 후 신규 날짜 테스트 7개가 모두 통과했다. 프로덕션 승격 승인은 아니다.

## 앱인토스 용량 추가 승인 및 검증 — 2026-11-09

사용자가 “두 이미지의 앱인토스용 WebP 최적화 후 main 전달 (추천)”을 선택했다. 기존 main CI 42526922672의 Critical checks는 102,804,422바이트로 100MB 제한을 넘었다. 두 PNG의 Toss 전용 파생본(quality 88, alphaQuality 100)은 3,176,474바이트를 줄이며 원본 해상도·알파를 보존한다. Toss Image 어댑터만 표시 URL을 치환하고 서버 기록·외부 공유의 웹 원본 주소는 보존한다. 최종 묶음에서 원본 PNG 두 장은 제외되고 새 WebP 두 장이 포함된다.

최종 `npm run build --prefix apps/toss`: AIT 92,186,171바이트, expanded 99,633,017바이트, 1,435파일, 기존 제한 통과. Windows 소스 경로 경고는 기존 동작이며 공식 Linux CI는 별도 확인한다. lint 오류 0, 기존 경고 15개. 전체 Toss 테스트는 1,422개 통과 후 새 알파 검사의 파일 인코딩 비교 오류가 큰 diff를 만들며 메모리 실패 3건을 동반했다. 디코딩한 raw alpha 비교로 수정했고, 해당 4개 파일의 16개 검사 통과 및 실제 Image 렌더 포함 최종 새 검사 3개 통과를 확인했다. `check:fast -- --plan` 갱신도 성공했다.

## main CI 후속 수정·화면 승인 경계 — 2026-11-09

사용자 요청: “main CI 통과했는지 확인하고 문제 있으면 수정해주고 어떤식으로 나오는지 한번 보여주고 승인하면 운영 반영하도록해”. CI 복구와 미리보기는 승인되었고, 운영 승격은 아직 승인되지 않았다.

main `ee929d30adc74638927094b77e40d1fb6b52131b`의 CI 42529653597은 Critical checks(Toss 포함)·빌드·타입·린트 및 Node 4,783개가 통과했다. Static guards의 `verify:detail-first-entry`만 이전 `.cd-sig__viewport` 레일을 찾아 실패했다. 실제 화면은 고정 비교 카드·고민 필터로 이미 변경되어 있었다. `scripts/verify-detail-first-entry.mjs`를 해당 구조와 실제 필터 조작으로 갱신했다. 기존 여섯 유료 서비스 ID의 정확한 보존을 추가로 확인하며 상세 이미지·닫기·초점 복귀·CTA·뒤로가기·결제 호출 부재 검증은 유지한다. 앱·정책·API·DB 동작 변경은 없다.

새 격리 워크트리 `D:/Development/codedestiny-worktrees/profile-pet-ci-preview-20261109-080318`, 시작점 ee929d30a. 원본 폴더의 다른 세션 미커밋 변경은 보존했다. `verify:detail-first-entry`는 7개 진입 × 4개 폭(360·390·430·1280) 모두 통과했고, `verify:mobile-journeys`는 320·360·375·390·412·430px 통과, `verify:profile-new-user`, `verify:profile-card-level`, `verify:profile-client-first`도 통과했다.

Ego 공간 68에서 실제 홈과 mock API를 사용해 알 선택·부화, 먹기·놀기·잠자기·깨우기·무료 정적 운세를 시연했다. 친밀도 35→45, 돌봄 꿀방울 23→24, 전용 영냥이 자동 부화 및 독립 동작을 확인했다. 데스크톱 단일 카드·가로 넘침 없음도 확인했다. 이 생년·잔액은 시연 데이터이며 운영 계정·운영 DB를 읽거나 수정하지 않았다. 승인용 전체 카드 캡처는 사용자 시각화 폴더의 `profile-pet-eggs-card.png`, `profile-pet-yeongnyangi-card.png`다. 화면 크기 전환 중 잘린 일반 카드 캡처는 승인 자료로 사용하지 않는다. Ego finish와 mock 서버 종료를 마쳤다.

최종 check:fast·pre-push와 push 결과는 이 절의 후속 기록 및 최종 답변을 따른다. 사용자가 화면을 승인한 뒤에도 main CI 성공을 확인하고 GitHub의 공식 운영 승격 워크플로만 실행한다. 로컬 배포나 실 LLM·실결제·운영 DB 수선은 허용되지 않았다.

추가 승인 자료 `profile-pet-motion-preview.html`은 실제 petSpriteMarkup·profile-pet.css·35개 WebP 및 실제 UI 캡처 3장을 사용한 단일 HTML(5,735,775바이트)이다. 16종 × 대기·먹기·놀기·수면을 고를 수 있고, 일반 동물의 오행색 변경과 희귀·전용 색 고정을 확인할 수 있다. 자산을 모두 내장하고 CSP로 외부 연결을 막았다. JSDOM에서 4개 동작·오행색 전환·특수 동물 색 고정·내장 이미지 경로 검사를 통과했다. 서비스 기능을 추가한 앱이 아닌 화면 승인용 로컬 파일이다. 실제 데스크톱 전체 홈 캡처는 같은 사용자 시각화 폴더의 `profile-pet-home-desktop.png`다.

후속 `npm run check:fast -- --plan` 및 `npm run check:fast` 모두 exit 0. 결제·인증 77개 가드, 전체 린트·타입, Node 4,783개, critical 계획의 나머지 정책·워커 검사, Jest 467개 스위트·7,920개 테스트가 통과했다(기존 1개 스위트/1개 테스트 skip). 변경 검증기는 별도 ESLint와 28개 실제 진입 시나리오도 통과했다. 최종 커밋 뒤 pre-push 및 새 main CI 한 번 조회는 표준 전달 절차로 이어간다.
