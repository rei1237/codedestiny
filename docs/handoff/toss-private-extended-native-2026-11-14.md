---
status: in-progress
updated: 2026-11-14
next: private 무료 계산 API 연결의 새 AIT 검증을 진행하며 관계 경계·숙요 전문가·반려동물 유료 모의 흐름을 이어서 구현한다.
---

# 첫 행동

CLAUDE.md를 읽고 부모 `/root/launch_completion`과 파일 소유권을 확인한다. 사용자는 전체 코드 가능 이식과 출시 준비까지 지속 진행을 요청했다. 계획만 제출하거나 사용자에게 새 세션을 요구하지 않는다.

# 지금 상태

- 공유 워크트리: `D:/Development/codedestiny-worktrees/toss-launch-completion-20261114-165438`.
- 확장 8경로는 부모가 `c49590fd9`로 커밋했다. 이후 부모의 다른 커밋은 `git log`로 확인한다.
- 인수인계 직전 HEAD: `686d60165e2ed656e4ca8055ab6831fc89b661a2` (부모 소설 gzip 포함). 아래 문서 커밋이 그 다음이다.
- 구현 완료: ziwei-deep / compass / yoga / nakshatra, 유료 tarot oracle / celestial / relationship / mindscan.
- Node 계약 16/16 PASS. 8개 모두 실제 Windows AIT 홈→입력→모의 로그인·구매→생성 중 이탈→정상 구매 기록→완료→재열람→B 계정 거절 PASS.
- AIT 배포: 1차 `01a1d94b-731e-7786-83ab-0c7e59d29db6`(99,579,587 bytes), Compass 수정 2차 `01a1d951-3055-76c5-a4e3-bd88c92fb024`(99,575,271 bytes), 최종 나크샤트라 대비 수정 3차 `01a1d955-897e-7785-abf9-57276bca701e`(100,022,116 bytes, 유명인 추가로 한도 22KB 초과).
- 부모가 소설 gzip 추가 102KB 절감을 진행 중. SecretHouse gzip은 3차에 이미 반영된 `SecretHouseReading-ChGfSRYT.js` 491,019 bytes이므로 추가 절감으로 중복 계산하면 안 된다.
- 현재 AIT: `apps/toss/private-simulation/ai-saju-studio.ait`. 아직 Linux 최종 아티팩트가 아니다.
- 캡처: `C:/Users/user/Downloads/CodeDestiny/launch-extended-20261114/`. 나크샤트라 최종 dark 본문 직접 확인 완료.
- 로그: `D:/Development/Temp/launch-extended-8.txt`, `launch-extended-recheck.txt`, `launch-extended-build2-qa.txt`, `launch-nakshatra-visual-final.txt`. 초기 Compass/Celestial 실패는 아래 원인 해결 후 PASS.

# 승인 상태

- 실 LLM·실결제·운영 DB 쓰기 금지. private에만 synthetic 가격 1원, 실제 SKU 추가 금지. 실결제 승인 확대 없음.
- 부모가 운영 게이트/검토·출시 범위를 관리한다. 이 하위 작업은 운영 요청·승격·콘솔 변경을 하지 않는다.
- 부모가 커밋/main CI 및 기능표를 관리. 부모의 전체 작업을 완료로 선언하지 않는다.

# 작업 규칙과 함정

- `/library`는 기존 `review-fixture.mjs`가 이미 extended 4종과 paid tarot를 합산한다. 새로 합산하면 중복된다. `/canonical/records`에는 extendedRecords만 추가했고 tarot는 기존 roomRecords가 처리한다.
- Tarot 실제 URL은 UUID만 허용. SDK는 `private-order-A-UUID`를 유지하고, private 전용 `tarot-links.mjs`만 원본 UUID builder/parser 앞에서 prefix를 제거한다. private Vite alias는 자기 importer를 제외해야 재귀가 없다. grant/restore의 API owner prefix 검사를 유지한다.
- `test/offline/paid-tarot.mjs`의 routeId는 mock-order 또는 private-order-[AB] prefix만 제거하도록 수정했다. 운영 URL 모듈은 변경하지 않았다.
- Celestial은 질문 textarea가 없는 원본 입력이다. helper에서 질문 입력을 생략해야 한다.
- Compass fixture에서 서버 contract를 runtime import하면 브라우저 AsyncLocalStorage 예외가 난다. `section-metadata.mjs`는 원본 COMPASS_SECTIONS를 빌드 시 key/title만 추출한다. 원본 일치 test가 있다.
- Yoga srcDoc는 상위 CSP를 상속하여 원본 inline JS가 막힌다. `yoga-reader.mjs` plugin이 원문 HTML을 별도 asset으로 내보내고 private 빌드에서만 iframe src로 바꾼다. sandbox allow-scripts 유지, main script-src self 유지, frame-src self. reader 원문 동일 test가 있다.
- 나크샤트라 원본 AiConsultDecks의 main이 Toss main 안에서 밝은 전역 배경을 받아 밝은 본문이 안 보였다. `embedded` prop으로 section을 선택하도록 수정, 웹 기본 main 유지. CSS 덧씌우기 없음. browser helper가 중첩 main 0과 dark surface를 확인한다.
- 새 free-calculations의 mansion-reports top-level import는 CMS extensionless TS로 Node API 테스트 전체를 깨뜨린다. 특정 mansion endpoint에서만 dynamic import하도록 바꿨다.
- `rg` 경로 인자에 PowerShell wildcard를 넣지 말고 디렉터리와 `-g`를 사용한다.

# 설계 및 미커밋 변경

부모가 새 `apps/toss/private-simulation/free-calculations.mjs`와 `test/private-free-calculations.test.mjs`를 작성했다. 하위 작업이 다음 3개를 방금 수정했으며 부모에게 아직 커밋 완료 통보하지 않았다:

1. `private-simulation/api.mjs`: privatePublicCalculation은 인증 앞, privateOwnedCalculation은 인증 뒤 연결.
2. `private-simulation/extended-reports.mjs`: 중복 Compass public fixture 제거; free-calculations 정본으로 통합.
3. `private-simulation/free-calculations.mjs`: mansion fixture top-level import를 lazy import로 변경.

`node --test apps/toss/test/private-extended-api.test.mjs apps/toss/test/private-free-calculations.test.mjs` **4/4 PASS**. 이 API 연결 이후 새 AIT 빌드/브라우저 검증은 아직 하지 않았다. 모듈의 실제 계산 엔진 import에 의해 번들 증가 또는 서버 전용 의존 문제가 생길 수 있으므로 실측해야 한다.

# 다음 유료 3군

- 관계 경계 / 숙요 궁합 전문가: 기존 `test/offline/fixture.mjs` 181~254줄의 계약을 새 공통 fixture 모듈로 추출하고 private에서 재사용. 원본 UI 및 Worker는 존재한다.
- `sukuyoFixtureSummary`가 같은 파일 상단에 있음. 두 사람의 원본 입력을 보존해야 한다.
- 기존 UI QA: `test/sukuyo-expert-browser.mjs`; 관계 경계의 원본 TossRelationship 및 test 파일들을 rg로 찾는다.
- 반려동물 paid: `worker/toss/native-pet-paid.js`, 기존 Toss 원본 UI와 경로를 추적해 모의 생성/보관함을 추가한다. 무료 blueprint는 새 free-calculations가 담당하므로 과금하지 않는다.
- Maya는 제외: 현재 무료 정책이며 일반 Screens.jsx의 MayaPrompt는 이미 원본 무료 생성. verifiedReceipt만 구구매 복구용 TossMayaPrompt. 부모가 실제 무료 경로 QA 담당, 유료 mock을 새로 붙이지 않는다.

# 단계

- [x] 확장 4종과 유료 타로 4종 private 구현/권한/재열람 검증 및 부모 커밋
- [x] 원본 Yoga CSP 문서/Compass metadata/나크샤트라 대비 문제 해결
- [x] 무료 계산 API 연결과 Node 계약 검증
- [ ] 부모 gzip 변경과 합쳐 새 AIT 크기/무료 원본 계산 경로 검증
- [ ] 관계 경계·숙요 전문가·반려동물 paid 추가 구현 및 홈 전체 경로 QA
- [ ] 부모 targeted/pre-push/main CI 및 최종 Linux AIT/QR 전달 지원

이 문서는 하위 작업의 진행 상태이며 부모의 전체 이식/운영 게이트 보고를 대체하지 않는다.
