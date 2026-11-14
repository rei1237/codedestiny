---
status: in-progress
updated: 2026-11-14
next: 부모의 push/freeze 해제를 확인한 뒤 서양 원본 chart+10종 private fixture 연결과 SecretHouse 실제 AIT CSP 검증을 이어가고, 모의 상품 reactionAsset 누락을 고쳐 콘솔 캡처를 다시 준비한다.
---

# 첫 행동

handoff 스킬과 CLAUDE.md를 읽는다. 부모 `/root/launch_completion` 또는 그 fresh coordinator와 소유권/freeze를 확인한다. 사용자 요청은 전체 코드 가능한 원본 기능 이식 및 출시 준비까지 지속 진행이며, 계획만 제출하거나 새 사용자 세션을 요구하지 않는다.

# 지금 상태

- 공유 워크트리 `D:/Development/codedestiny-worktrees/toss-launch-completion-20261114-165438`, 브랜치 `wt/toss-launch-completion-20261114-165438`.
- 인수인계 전 HEAD `298e93a1f` (부모 fixture whitespace 정리). 부모가 push/CI를 조율한다. 새 브랜치·PR·워크트리를 만들지 않는다.
- 이 하위 작업의 완료 커밋: `203837969` 유료4/베다 예시 및 API/공통 fixture/CLI, `b3d0e2692` 베다 용어팝업 QA. 원본 베다는 remaining agent `38a3b4162`.
- 현재 실제 AIT: `apps/toss/private-simulation/ai-saju-studio.ait`, deployment **01a1d979-42b4-7cff-b288-74abd0a36a8c**.
- 용량 실측: AIT **88,044,999 bytes**, expanded **99,964,684 bytes**, 1775 source files, 여유 **35,316 bytes**. Windows 경로라 최종 제출본은 아직 아님. 최종 Linux AIT/QR은 부모 담당.
- 당시 check:fast 전체 PASS (부모 보고 Jest479 suites/8008), source freeze 이후 부모 push 중. 새로운 API/CLI 연결은 부모 해제 통보 이후에만.

# 승인 상태

- 실제 LLM·실결제·운영 DB 쓰기 금지. 모의 SKU/1원만 private에서 사용, 운영 SKU 임의 추가 금지. mock에서 실제 서비스로 폴백 금지.
- 부모는 콘솔 캡처 준비만 승인했다. **업로드·스크린샷 교체는 아직 승인되지 않았다.** 모의 배너를 지우지 않는다.
- 서양/베다 private는 **검증한 고정 입력을 원본 로컬 계산기로 계산한 fixture**만 허용. 임의 합성 위치를 실계산으로 표시하지 않는다. 다른 출생정보는 명시적 예시 전용 오류. 일반 서비스의 자유 입력은 보존.

# 완료된 실측

1. 무료 7경로: 게스트 반려동물 원본 입력/차트/저장 아이 재열람/유료 로그인 게이트, 만세력 간지·대운, 무료 타로 5종 전부 실제 AIT PASS. 비로그인·주문0·외부 요청0. 360/390/430px 21 PNG `C:/Users/user/Downloads/CodeDestiny/launch-free-calculations-20261114/`.
2. 유료4: 관계 경계, 숙요 전문가, 반려동물 심층, 반려동물 궁합. 홈→입력→모의 구매→생성 중 이탈→원본 구매 기록→재개→저장 원문 재열람→B 계정 거절 PASS. 관계/숙요/반려4 Node+API+offline회귀+Vedic동일성 총19/19 PASS.
3. 베다: 원본 local Swiss 예시(1990-02-03 F08:35 서울) 이외 입력422, 남/북명반,7토픽,8상세,아코디언,바바 용어팝업 open/native-back close,3폭PASS. 30PNG `C:/Users/user/Downloads/CodeDestiny/launch-vedic-reading-20261114/`.
4. locale 무손실 압축 후 최신 AIT 관계href 수정, 나크샤트라, 나침반, 손금 실제 구매/보관함/재열람/B거절 모두 PASS.
5. 최신 AIT **기존 default core**는 부모와 제가 각각 약8초 내 PASS. 일반 홈→영냥이 질문→mock login→주문1/생성1→원문→재열람→B거절 정상. 제 로그 `D:/Development/Temp/launch-private-default-current.txt`, 부모 로그 `launch-private-core-current.txt`.

# 설계와 함정

- private `paid-families.mjs`는 `test/offline/relationship-sukuyo.mjs`의 추출된 원본 모의 계약을 재사용한다. 원래 offline/fixture.mjs도 같은 모듈 사용, 기존 회귀 PASS.
- `/library` 기존 review-fixture는 숙요를 이미 합산한다. 추가 private purchases는 숙요 제외. `/canonical/records`는 새 family records 합산.
- 관계 완료 시 URL이 `toss_<intent>`에서 `rbt_<result>`로 바뀐다. purchase href가 intent에 고정돼 있으면 원본 ReviewReceipt가 차단한다. **저장된 result.sessionId 우선**으로 수정했고 최신 AIT PASS. 숙요도 저장 result.id 우선.
- Vedic example JSON은 원본 `tossVedicReading` 로컬 Swiss 결과, 4648bytes. test가 다시 원본 계산해 완전 동일성을 비교한다. private Vite만 `<Reading {...props}/>`에 exampleBirth 추가.
- freeTarot worker module을 그대로 가져오면 paid generator 동적 의존을 통해 Mongo/BSON 1.9MB 등이 유입된다. 부모 private free-tarot-generator alias로 pure public 원본만 남겼다. 원본 일반 정책/유료 구현은 변경하지 않았다.
- PowerShell `rg` path에 wildcard를 직접 넣지 말고 디렉터리와 `-g`를 쓴다. Python alias는 설치되지 않았으므로 Node를 사용한다.
- .tmp/private-qa는 제가 정리했다. 현재 .tmp/private-astro/build.mjs만 다음 fixture 재생성용으로 남아 있다.

# 미연결 서양 원본 fixture (내 소유)

다음 신규 파일은 **미커밋·미연결** 상태다. 다른 agent의 원본 서양 모듈 커밋과 부모 freeze 해제 후 연결한다.

- `apps/toss/private-simulation/astro-reading-example.json`: 동일 예시 birth, 원본 verified chart + strict Swiss 무료10종 HTML. raw148698bytes, gzip28324bytes. calculatedAt 실제 생성시각 포함.
- `apps/toss/private-simulation/astro-reading.mjs`: `privateAstroReading(body,kind='section')`. chart는 `kind='chart'`. 예시 외422 `ASTRO_EXAMPLE_REQUIRED`, 유료/알수없는 key404. 아직 api에 연결 안 됨.
- `apps/toss/test/private-astro-reading.test.mjs`: 10종 HTML/public/원문동일, 다른 birth·유료key 거절 **1/1 PASS**. chart 테스트는 추가 필요.
- `.tmp/private-astro/build.mjs`: esbuild로 `worker/toss/astro-section.js`와 `astro-chart.js`를 묶어 fixture 생성. `node --require=./scripts/lib/mock-network-guard.cjs .tmp/private-astro/build.mjs`.

중요: 원본 astro section handler는 requestUrl을 기준으로 ephe를 찾는다. mock-network-guard 없이 실행하지 않는다. 초기 외부 ephe 요청은 guard에 막혔으며, 생성 스크립트는 저장소 **public/ephe 4개만 loopback 서버로 제공**하고 `SWISS_EPHEMERIS_FILES_BASE_URL`을 지정해 해결했다. 실제 외부 호출/DB/LLM 없음. 원본 chart는 1900..2050 verified westernPositions, 10심층은 strict Swiss 경로를 그대로 유지했다.

remaining agent의 UI는 **`apps/toss/src/AstroReading.tsx`** (service 폴더 아님). optional exampleBirth + `<Reading {...props}/>` 슬롯, 오류 `ASTRO_EXAMPLE_REQUIRED`. private Vite 예시 transform, `/astro/chart` 및 `/astro/section` API와 gzip 로더 연결 필요. payload 확인은 원본 새 worker 모듈과 협의한다. 35KB 여유라 rawJSON import 금지; 무손실 gzip+추가 용량 실측 필요.

remaining agent는 별도 숙요 4종 `worker/toss/sukuyo-tools.js`와 `src/SukuyoTools.tsx`도 준비 중이다. `/sukuyo/tools`, 예시 본인 위와동일/상대1991-04-05 M12:30서울, 명시 `SUKUYO_EXAMPLE_REQUIRED`. 새 coordinator가 소유권 확인하고 이어 연결한다.

# 콘솔 준비 캡처와 정확한 결함

준비 자료 390px fullpage 3장(업로드 없음, 모의배너 유지):
- `C:/Users/user/Downloads/CodeDestiny/console-preparation-20261114/01-home-390.png`
- `C:/Users/user/Downloads/CodeDestiny/console-preparation-20261114/02-yeongnyangi-question-390.png`
- `C:/Users/user/Downloads/CodeDestiny/console-preparation-20261114/03-completed-mock-reading-390.png`

3장은 실제 AIT UI에서 생성했고 완료결과는 영냥이 모의주문1/생성1/재열람/B거절 성공한 원문이다. **최종 심사자료 아님**: 홈 candidate에는 최초 guest 세션만료 안내가 보일 수 있고, 결과 하단 고등어 감사 이미지가 깨져 있다.

고등어 원인 위치를 정확히 확인했다:
- 원본 `app/yeongnyangi/_components/FishReceipt.tsx:19`는 `product.reactionAsset`을 img src로 사용.
- **`apps/toss/test/offline/yeongnyangi-contracts.mjs` productView가 image/reactionAsset 필드를 누락**한다. 현재 모의 결과 product의 src가 undefined인 가능성이 직접 코드로 확인됨. 따라서 404라고 단정하면 안 된다.
- 정상 원본 경로 `/assets/yeongnyangi/fish/reaction-mackerel.webp`; 저장소 `public/assets/yeongnyangi/fish/reaction-mackerel.webp` 존재.
- 최신 AIT index에도 `sources/assets/yeongnyangi/fish/reaction-mackerel.webp` **존재 확인**. asset registry 추가부터 하지 말고 fixture productView 계약의 누락부터 최소 복구 후 실제 img.currentSrc/decode 검증한다.

캡처 자체 controller는 390px에서 로그인에 정체하는 일이 있었다. **기존 default core는 두 사람 모두8초PASS라 제품회귀 확정 아님**. 캡처 전 닫기/viewport변경/동명 로그인버튼의 비동기 경로가 영향을 준 가능성. 반복 실패한 capture-only CLI 연결 변경은 공유파일을 훼손하지 않도록 **내 변경만 `git restore -- apps/toss/test/private-simulation-archive.mjs`로 되돌렸다**. 신규 `test/private-console-prep.mjs`는 수동 삽입용 passive `captureConsoleFrame(page,name)`만 남겼으며 eslintPASS. 현재 --console-prep CLI는 존재하지 않는다. 다음에는 검증된 default journey 완료 후에만 snapshot 호출을 추가하고, source controller는 복제하지 않는다. 제가 띄운 멈춘 console-prep Node 프로세스는 모두 정리했다.

# 다음 SecretHouse 실제 AIT 작업

부모가 새로 요청한 미착수 항목:
1. `SecretHouseReading.tsx`의 iframe srcDoc 원본 inline script가 private CSP `script-src self`에 막히는지 **실제 AIT 홈→사주리포트→시크릿하우스 시작버튼→원본section 응답**으로 재현한다. 기존 secret-house-browser는 일반 preview만 검증했다.
2. 막히면 privateYogaReader와 동일한 standalone sandbox HTML asset 플러그인. `sandbox allow-scripts`, parent message origin null/source iframe 검증 유지.
3. 원본 HTML527696chars 중 data:image5개를 **동일bytes decode**해 로컬asset으로 분리 가능(리사이즈/재인코딩/삭제금지). 원본5이미지 byte동일 test+실제AIT decode 필요. img-src self data: 유지. 약75KB 절감 추정이며 실측 전.

# 재현 명령

워크트리 루트에서:
```powershell
node --test apps/toss/test/private-paid-families.test.mjs apps/toss/test/private-paid-families-api.test.mjs apps/toss/test/offline-fixture.test.mjs apps/toss/test/private-extended-api.test.mjs apps/toss/test/private-vedic-reading.test.mjs
node apps/toss/test/private-simulation-archive.mjs apps/toss/private-simulation/ai-saju-studio.ait --local-windows
node apps/toss/test/private-simulation-archive.mjs apps/toss/private-simulation/ai-saju-studio.ait --local-windows --paid-family relationship
node apps/toss/test/private-simulation-archive.mjs apps/toss/private-simulation/ai-saju-studio.ait --local-windows --paid-family sukuyo
node apps/toss/test/private-simulation-archive.mjs apps/toss/private-simulation/ai-saju-studio.ait --local-windows --paid-family pet
node apps/toss/test/private-simulation-archive.mjs apps/toss/private-simulation/ai-saju-studio.ait --local-windows --paid-family pet-compat
node apps/toss/test/private-simulation-archive.mjs apps/toss/private-simulation/ai-saju-studio.ait --local-windows --free-calculations
node apps/toss/test/private-simulation-archive.mjs apps/toss/private-simulation/ai-saju-studio.ait --local-windows --vedic-reading
```

# 단계

- [x] 기존 확장8, 무료7, 유료4, 베다 원본 흐름 구현·실제AIT 검증·커밋
- [x] 100MB미만 Windows AIT 및 locale압축 대표4경로 검증
- [x] 콘솔3장 준비자료 저장(업로드 금지, 결함 수정 후 최종 재캡처 필요)
- [ ] 서양 원본 chart+10종 private gzip/예시/API 연결 + 전체 UI 검증
- [ ] 숙요 신규 무료4종 연결은 remaining 소유권 확인 후 진행
- [ ] SecretHouse 실제AIT CSP 검증/필요시standalone원본asset
- [ ] fixture reactionAsset 복구와 img decode 검증, guest 초기 세션만료 안내 원인 확인
- [ ] 최종Linux AIT/QR/CI/운영안/워크트리배수는 부모·fresh coordinator와 끝까지 진행
