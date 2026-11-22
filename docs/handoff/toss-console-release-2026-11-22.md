---
status: done
updated: 2026-11-22
next: 없음 — 이 문서는 종료. 정본은 toss-full-parity-2026-11-22.md
---

# 앱인토스 콘솔 작업 인수인계 (Codex 용, 2026-11-22)
2026-11-22 후속 지시로 아래는 이전 작업 이력이다. QR21 부분 출시 승인은 철회되었다. [현재 작업](./toss-full-parity-2026-11-22.md).

## 첫 행동
1. `git pull --ff-only` 후 이 문서와 `docs/toss/launch-candidate-20261116.md`(QR21 기록)를 읽는다.
2. 단계 0의 AIT 파일과 SHA256 을 확인한다. CI 아티팩트는 **보관 1일**이므로 로컬 사본을 쓴다.
3. 콘솔은 사용자가 로그인한 브라우저에서 연다(워크스페이스 21957, 앱 `ai-saju-studio`). 버튼 조작 전 화면 상태를 먼저 사용자에게 보고한다.

## 지금 상태
- 브랜치 main 직접 개발(브랜치·PR 금지). 빌드 소스 SHA `209371928e670041eae530aa1f0765019d597919`.
- 토스 관련 커밋(모두 main, CI 통과): `37f91c431` 타로 서재 재생성 상한, `01821cc00` 첫 지급 purchaserMatched 검증(D1 닫힌 판매 복원 허용·D2 첫 지급 조회만 헤더), `e13f99d23` 토스 번들 웹 결제 코드 제외, `6b9b13fd2` 내 정보 화면 빌드 ID.
- 앱 콘솔: 마지막 업로드는 QR21 `20261116-21`(소스 `324b95f47`, deployment `01a1e08b-9241-73a0-80e2-7dedc170c8e7`), 11-16 '검토 중'. 이후 상태 **미확인**. 이 QR21 에는 11-16 이후 수정이 없다(이게 "토스에 변경이 안 보이는" 원인).
- 운영 서버: release run `44903370877`(`28aea4bdd`). 위 토스 서버 커밋(P-a·P-b)은 **아직 운영 미배포**(0단계 보류: main 에 옆 세션 Trait-First 유료 프롬프트 변경이 섞여 사용자 확인 대기). `28aea4bdd..209371928` 의 `worker/toss` 차이는 위 두 커밋뿐이고 새 엔드포인트가 없어, 새 AIT 는 현 운영 서버와 호환된다(판매 플래그 false 기준).
- 판매 플래그 `lib/toss-release.mjs` `NEW_PURCHASES_AVAILABLE=false` → 새 AIT 도 **무료·기존 기록 범위**다. 콘솔 상품 5개 노출은 11-16 기준 전부 꺼짐.

## 승인 상태 (원문·날짜)
- 2026-11-16 "무료·기존 기록부터 검토·출시 진행" — QR21 범위 검토·출시. **새 AIT 의 검토 제출·출시는 이 승인에 포함되지 않는다** → 사용자에게 1회 승인을 받는다.
- 2026-11-22 "Phase 3 .ait 빌드 먼저 진행해 그리고 나머지 토스 콘솔 작업은 코덱스에게 인수" — 빌드까지 승인. 콘솔 작업은 Codex 가 진행하되 아래 🔒 항목은 각각 사용자 1회 승인.
- 미승인(하지 말 것): 서버 운영 배포, 판매 플래그 전환, 상품 노출 ON, 실결제, QR21 요청 취소·출시, 새 검토 요청·출시.

## 작업 규칙과 함정
- 저장소 규칙: `CLAUDE.md`·`AGENTS.md`. 과금 LLM·실결제·운영 DB 쓰기 금지. 비밀값을 출력·커밋하지 않는다.
- 콘솔 '출시' 버튼은 즉시 공개된다. 롤백도 '앱 출시'에서 이전 버전 선택으로 즉시 반영. SDK 3.x 로 출시한 뒤에는 2.x 번들로 롤백 불가(https://developers-apps-in-toss.toss.im/guide/operation/deploy.md).
- 검토 요청 전 **QR 테스트 최소 1회 필수**, 압축 해제 100MB 이하, 검토 영업일 3~7일(https://developers-apps-in-toss.toss.im/guide/operation/console-workspace.md).
- 용량 여유가 ~0.9MB 뿐이다. 업로드가 용량으로 거부되면 파일을 고치지 말고 보고한다.
- QR21 이 '검토 중'이면 새 버전 제출 전에 '요청 취소'가 필요할 수 있다(문서 **미확인**). 취소는 🔒.
- 검토 요청 취소 절차·앱 정보만 바꿀 때 재검토 여부: 문서에서 **미확인**.
- 외부 결제·외부 웹 이동 유도 금지(https://developers-apps-in-toss.toss.im/guide/undefined.md 2-2·2-3). 출시 노트에 웹 결제·웹사이트 이동을 쓰지 않는다.
- SDK 3.x 는 샌드박스가 없다. QR 기기 테스트에서 결제 버튼을 누르면 실결제다 → 판매가 닫혀 있으므로 결제 시도를 하지 않는다.
- 진단용 명령에 배포·출시 동작을 넣지 않는다(2026-11-22 실수 사례: 범위 밖 운영 run 이 시작돼 취소함).

## 단계

### 0. AIT 확보 (Claude 완료 — 결과는 아래 '빌드 결과' 절)
- [x] CI: `gh workflow run pr-ci.yml --ref main -f full_ci=true -f toss_artifact=true` → run `44955093339`
- [x] 로컬 사본: `D:\tmp\toss-release\209371928\ai-saju-studio.ait`
- 재빌드가 필요하면 위 명령을 다시 실행하고 `gh run download <run> -n toss-preview-<full sha> -D D:\tmp\toss-release\<short sha>`.
- 무결성: `certutil -hashfile D:\tmp\toss-release\209371928\ai-saju-studio.ait SHA256` 이 '빌드 결과'의 값과 같아야 한다.

### 1. 콘솔 상태 읽기 (읽기 전용, 승인 불필요)
- [ ] '앱 출시' 목록: 현재 출시됨 버전·deploymentId, QR21 행 상태(검토 중/반려+사유/승인·미출시/출시됨) 캡처
- [ ] 인앱 상품 5개: 상품 ID·가격·노출 상태 캡처 → `worker/toss/catalog.js` 와 대조
- [ ] 결과를 사용자에게 보고하고 이 문서 '실측' 절에 기록

### 2. 새 번들 업로드 (업로드만, 공개 영향 없음)
- [ ] '앱 출시'에서 새 버전 업로드: 파일 `D:\tmp\toss-release\209371928\ai-saju-studio.ait`, 버전 이름 `20261122-1`
- [ ] 업로드 후 deploymentId·버전·테스트 URI(`intoss-private://ai-saju-studio?_deploymentId=<id>&host=appsInTossHost`)·QR 이미지 저장
- 업로드가 QR21 검토 때문에 막히면 멈추고 보고(🔒 요청 취소 판단은 사용자).

### 3. QR 실기기 테스트 (사용자 기기, 결제 시도 금지)
체크(비게임 체크리스트 https://developers-apps-in-toss.toss.im/checklist/app-nongame.md 기준):
- [ ] 진입·토스 로그인·재진입 후 기록 유지
- [ ] 내 정보 화면 빌드 ID 가 `2093719` 로 시작(신·구 번들 판별)
- [ ] 무료 운세 단계형 입력(출생 입력·자시 칩·다음 버튼), 홈 무료 카드 목록
- [ ] 보관함: 기존 구매 결과 재열람(추가 결제·생성 없음)
- [ ] 토스 뒤로가기·Android 백버튼·최초 화면 뒤로가기 종료, 핀치 줌 비활성, 라이트 모드
- [ ] 화면 어디에도 카카오페이·계좌이체·외부 결제·웹사이트 이동 유도가 없음
- [ ] 유료 상품은 '판매 준비 중' 등으로 닫혀 있고 결제창이 뜨지 않음
- [ ] PDF·음원 저장, 오디오 중단·복귀
- 결과를 표로 기록. 실패 항목은 고치지 말고 보고(코드 수정은 Claude/사용자 판단).

### 4. 🔒 검토 요청 (사용자 1회 승인 후)
- [ ] (필요 시) 🔒 QR21 '요청 취소'
- [ ] 출시 노트 초안(무료·기존 기록 범위, 외부 이동 문구 없음):
  > 무료 운세의 출생 정보 입력을 단계형으로 다듬고, 자미두수·숙요·베다·점성술 무료 운세를 추가했어요. 같은 토스 계정으로 받은 기존 결과는 보관함에서 다시 볼 수 있어요. 새 유료 상담은 준비 중이에요.
- [ ] 스크린샷 3장(홈·무료 운세·구매 기록)은 새 번들 화면이 크게 다르면 교체를 제안만 한다(교체는 사용자 확인).
- [ ] 검토 요청 → '검토 중' 확인 캡처 → 이 문서 기록. 중복 제출 금지.

### 5. 🔒 출시 (승인 메일 수신 + 사용자 1회 승인 후)
- [ ] '출시하기' → 공개 확인 → 실기기에서 빌드 ID 확인
- 롤백: '앱 출시'에서 직전 출시 버전 선택 → 출시(즉시). 서버 롤백은 별개: `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=rollback -f pages_deployment_id=<id> -f worker_version_id=<id>` (🔒, id 는 `docs/toss/approved-operations-20261115.md`·직전 release run 요약).

### 6. 출시 후 모니터링 (읽기 전용)
- [ ] 24h: 토스 앱 접속·보관함 재열람 오류 제보, Worker 로그의 `/api/toss` 5xx(`npx wrangler tail` 은 운영 읽기라도 사용자 확인 후)
- [ ] 7일: 리뷰·신고, 이용권 관련 CS

### 이후(별도 결정, 이 문서 범위 밖): 유료 판매 개방
순서: 서버 0단계 배포(P-a·P-b) → `NEW_PURCHASES_AVAILABLE=true` 서버 배포 → 플래그 true 로 새 AIT → QR 실결제 1건+환불 → 검토·출시 → 콘솔 상품 노출 ON. 긴급 차단은 노출 OFF 먼저. 각 단계 🔒. 운영 API 가 `purchaserMatched` 를 실제로 주는지 **미확인**(안 주면 첫 지급 전부 403) — 앱인토스 담당자 확인 권장.

## 빌드 결과
- CI run `44955093339` success(full_ci critical + `verify:release-bundle`), 소스 `209371928e670041eae530aa1f0765019d597919`
- 파일 `D:\tmp\toss-release\209371928\ai-saju-studio.ait` — 87,680,343 B, SHA256 `6bbbc743faece1ca6f021cca49cf3df8c54118fe9246e8ea23a7409cff5f3d0f`
- 압축 해제 99,040,193 B(1,777 파일, `unzip -l` 합계; AIT 머리 227,204 B 경고는 정상) → 100MB(=100,000,000 B 가정) 여유 약 0.96MB. QR21 99,289,360 B 보다 249,167 B 작음
- 빌드 ID 표시는 SHA 앞 7자리 `2093719` + KST 빌드일

## 실측
(Codex 가 단계별로 기록)
