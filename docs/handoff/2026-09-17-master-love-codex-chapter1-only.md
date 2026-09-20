---
status: active
updated: 2026-09-20
next: "인연의 서 부분 생성 항목(작업 1·2)은 [2026-09-19-master-love-codex-partial-chapters.md](2026-09-19-master-love-codex-partial-chapters.md) 로 닫혔다 — 원인 규명·수정·운영 승격(bd144f4e64a4)·복구까지 완료. 여기 남은 것은 **③이니시스 창 안의 카카오페이 복귀가 부자연스러운 원인 구분** 하나다."
---

# 마스터 인연의 서 — 운영에서 1장만 생성되는 문제·서재 CTA·카카오페이 복귀 인수인계

이전 작업: [2026-09-17-master-love-codex-real-gate.md](2026-09-17-master-love-codex-real-gate.md). 여기서 실출력 게이트를 수정해 운영 `23cf9995d`로 승격했다.

## 사용자 보고 (2026-09-17, 운영 실결제 테스트)

1. 이니시스 결제창에서 카카오페이로 결제한 뒤 사이트로 돌아오는 과정이 자연스럽지 않다.
2. 챕터 1만 생성되고 그 뒤 장이 이어지지 않는다.
3. 결과 화면 하단의 "운명의 지도 열기"는 의미가 없으니 보관함(내 서재)으로 바꾼다.

## 작업 1 — 1장만 생성되는 문제 (최우선, RED)

### 관련 코드
- `worker/routes/master-love-codex.js`
  - `CHAPTER_CONCURRENCY = 4`, `CHAPTER_BATCH_SIZE = 4` (107–108행): 한 요청이 4장을 동시에 쓰는 한 웨이브다.
  - `planBatchCommit` (550행): 앞에서부터 이어지는 `ok` 결과만 저장한다. **2장이 실패하면 3·4장이 성공해도 버린다.**
  - `handleGenerate` (1202행), `runCodexWaveInternal` (1305행): 웨이브 실행, 장 사이 중복 문장 제거(`dedupeChapterAgainst`), 최종 하한 `codexChapterFloor`.
- `worker/lib/master-love-codex-quality.js`: `assertCodexChapterQuality`, `codexChapterFloor`(minChars×0.7), `dedupeCodexBody`.
- `worker/lib/master-love-codex-evidence.js`: 근거 정규화, 체계·상대방 근거 0건이면 탈락.
- 이어 쓰기 크론: `*/10` 스케줄, 장별 시도 3회 상한.

### 가설 (미검증, 추정)
- A. 직전 작업에서 실제 호출로 확인한 것은 **궁합판 1장뿐**이다. 2장 이후는 minChars·근거 계약이 달라 여전히 게이트에서 탈락하고, `planBatchCommit` 때문에 1장만 남을 수 있다.
- B. 장 사이 중복 제거로 2장 이후 본문이 하한(70%) 아래로 줄어 탈락한다. 앞 장이 많을수록 제거량이 커진다.
- C. 웨이브 시간 예산이나 엣지 100초 제한 안에 4장 병렬이 끝나지 않아 타임아웃으로 탈락하고, 3회 상한에서 `generation_failed`가 된다.
- D. 클라이언트가 1장 완료 뒤 다음 `/generate`를 호출하지 않고, 크론도 해당 세션을 집지 않는다(상태·잠금·`deliveryMeta` 조건).

### 조사 순서 (권장)
1. 사용자에게 **운영 DB 읽기 전용 조회 1회**를 승인받는다. 테스트 세션의 `status`, `generationProgress`, `deliveryMeta.failures`(장 id·오류 코드·시도 횟수), `lock`, `updatedAt`만 확인하고 본문은 출력하지 않는다.
2. 오류 코드로 A/B/C/D 중 어느 경우인지 가른다. 코드가 없으면 D(호출 자체가 안 일어남)를 먼저 의심한다.
3. mock으로 재현 테스트를 먼저 만든다. 2장이 게이트에서 탈락하는 웨이브, 중복 제거 뒤 하한 미달, 크론이 다음 웨이브를 집는지를 각각 다룬다. 고치기 전 코드에서 실패하는 것을 확인한 뒤 수정한다.
4. 실제 모델 확인이 필요하면 **정확한 호출 횟수**를 승인받는다. 개인판·궁합판 2장 이후 각 1장이 필요하다. 출력은 길이·오류 코드만 남긴다.
5. `planBatchCommit`의 앞에서부터만 저장하는 정책을 바꿀지 검토한다. 성공한 뒤 장을 따로 보관하고 앞 장만 재시도하는 방식이다. 결제·전달 계약에 걸리므로 영향 범위를 먼저 보고한다.

### 검증
- `npm run test:jest -- --runInBand __tests__/worker/master-love-codex`
- `node --test __tests__/ui/paid-report-partial.behavior.test.js __tests__/ui/master-love-codex-*.test.js`
- `npm run check:fast` (paid-gate-suite 포함)

## 작업 2 — 결과 화면 하단 CTA를 내 서재로 교체 (GREEN)

- 위치: `src/features/master-love-codex/components/CodexSeal.tsx` 44–50행.
  - 현재는 `CONTINUE YOUR DESTINY` 문구와 `<Link href="/destiny-island.html">{copy.continueDestinyButton}</Link>`이다.
- 교체안:
  - 링크를 `/master-love-codex#${CODEX_LIBRARY_ANCHOR}`로 바꾼다. `CODEX_LIBRARY_ANCHOR`는 `components/CodexLibrary.tsx`에서 export한다.
  - 문구는 `copy.libraryNavLink`("내 서재")를 쓰고, 영문 머리 문구도 서재에 맞춰 바꾼다.
- 중복 정리: 직전 작업에서 `CodexReader.tsx`의 PDF 버튼 아래에 넣은 `readerLibraryLink`와 하단 CTA가 겹치면 하나만 남긴다. 권장은 하단 CTA 하나다.
- `continueDestinyButton` 키가 고아가 되면 5개 로케일에서 함께 삭제한다. 삭제 전에 `git grep continueDestinyButton`으로 소스·테스트·verify를 확인한다.
- `CodexSeal`은 PDF 내보내기(`forceVisible={isExporting}`)에도 렌더되니, PDF에 링크가 찍혀도 괜찮은지 확인한다.
- 390·1280px 스크린샷을 visual-checker로 판정받고, `npm run sitemap:generate`를 같은 커밋에 포함한다.

## 작업 3 — 이니시스 창 안 카카오페이 복귀 (조사 먼저, 결제 RED)

### 구분해야 할 세 층
1. **카카오페이 자체:** 모바일에서 카카오톡 앱으로 전환한 뒤 원래 브라우저로 자동 복귀하는지는 카카오 앱과 OS의 동작이다. 코드로 없앨 수 없다.
2. **이니시스 결제창:** 이니시스가 카카오페이 인증 뒤 `redirectUrl`로 이동시키는지, 중간 완료 화면이나 닫기 버튼을 누르게 하는지. PortOne V2 채널 설정과 `appScheme`(인앱 브라우저 복귀) 누락 여부를 본다.
3. **우리 복귀 처리:** `js/destiny-profile.js`(**결제 동결 파일**)의 핸들러 8초 대기와 GRANT_PENDING 4초 안내, 인연의 서 이어받기. 인증 복원 오인은 `06aadb722`에서 수정했다.

### 조사 방법
- 사용자에게 재현 조건을 받는다: 기기·OS, 브라우저(일반/카카오톡 인앱/네이버 인앱), 카카오페이를 앱 결제와 QR 결제 중 무엇으로 했는지, 멈춘 화면(카카오 화면/이니시스 화면/우리 화면)과 눌러야 했던 버튼 문구.
- 같은 조건에서 **카드 결제**도 부자연스러운지 비교한다. 카드는 괜찮고 카카오페이만 문제면 1·2층, 둘 다 문제면 3층이다.
- 코드에서 PortOne 요청의 `redirectUrl`, `appScheme`, `windowType`(모바일 REDIRECTION) 설정을 확인한다. 결제 요청 조립은 동결 파일과 `app/_lib/billing-client.ts`에 있다.
- 동결 파일을 고쳐야 하면 payment-freeze 절차(`docs/context/payment-gating.md`)를 따르고, 먼저 위험·검증·롤백을 보고한다.
- 실결제는 하지 않는다. 결제 검증은 mock과 사용자의 실기기 테스트로만 한다.

## 금지·주의
- 과금 LLM 호출, 운영 DB 조회는 각각 정확한 횟수를 승인받아야 한다. 운영 DB 쓰기, 환불, 실결제는 하지 않는다.
- `js/destiny-profile.js`, `app/_lib/billing-client.ts`는 결제 동결 파일이다.
- 동시 세션이 main 체크아웃에 미커밋 `config/payment-freeze.json`·마케팅 변경을 두고 있으니 보존한다. 쓰는 세션이 둘 이상이면 워크트리에서 작업한다.
- 운영 승격은 사용자가 이번에 다시 명시적으로 요청할 때만 한다.
