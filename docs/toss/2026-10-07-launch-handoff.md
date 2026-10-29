# 앱인토스 출시 진행 기록

status: in-progress

## 최신 상태 — 2026-10-08 번들 20261008-3 및 등록 이미지 갱신

사용자 요청: 현재 업로드본 최신화, 앱 로고 교체, 고급스러운 실제 화면 기반 미리보기 제작·등록. 사업자 검토 대기는 유지하며 공개 출시·재검토 제출은 하지 않았다.

- 원격 fetch 결과 main `39d1f46b3c59c446acc0f6d132ef0185dda67096`. 작업본 `fec16ec4a4a231ec4c8d47c0cf36bcf57ccb460f`가 이를 포함함을 merge-base --is-ancestor로 확인. 토스 코드는 main에 아직 미전달.
- `npm test --prefix apps/toss`: mock 32/32 통과. `npm run build --prefix apps/toss`: tsc/Vite/ait 통과. 큰 JS 청크 경고 유지.
- 실제 업로드·임시저장 후 콘솔 모달 확인: 버전 `20261008-3`, deploymentId `01a11aae-3e2c-78aa-9ce6-e190aa05fa97`. 번들 525591 bytes, SHA256 `C287992C372E43B61534493868CEBD48B51A274167E5ADAEB686CADBC0C5BA2C`.
- 테스트 링크 `intoss-private://ai-saju-studio?_deploymentId=01a11aae-3e2c-78aa-9ce6-e190aa05fa97&host=appsInTossHost`. 테스트 푸시 발송 없음. 실기기 기능 검증 없음.
- 로고: 원본 영냥이 기반의 기존 600×600 불투명 정사각 PNG를 라이트·다크 모두 교체 업로드. 라이트 URL `https://static.toss.im/appsintoss/21957/live-managed-v1-9263ff09-4247-42c7-981e-61659a7838dd.png`, 다크 URL `https://static.toss.im/appsintoss/21957/live-managed-v1-2b4de315-6772-464a-917c-42a0a8b6fe34.png`.
- `docs/toss/assets/20261008-3/`: 세로 636×1048 세 장, 가로 1504×741 한 장의 편집 가능한 SVG+PNG 조판. 실제 기존 앱 캡처 원본을 삽입, 생성 UI 아님. 사주 질문 선택·상담 범위·결과 구성 예시만 소개하고 출시 준비 중 고지를 유지.
- 독립 visual_checker가 4장 글자·잘림·고지 검수. 02 긴 부제만 짧게 수정. 로고와 세로 세 장은 콘솔 임시저장 후 reload로 URL·원본 크기 영속 저장 확인. 가로는 함께 선택했으나 콘솔에 남지 않아 **등록 완료로 간주하지 않음**; 로컬 대체안으로 보관.
- 세로 등록 URL 순서: `live-managed-v1-a79b5dea-cf0e-4fa0-b560-fcfecb6ee989.png`, `live-managed-v1-975a6435-007b-4a6d-8acb-e23c11fd91d4.png`, `live-managed-v1-af7506ca-5fa6-4beb-b20a-4685cae524e0.png` (위와 같은 CDN/workspace 경로).
- 앱 정보는 기존 반려사유 표시 유지, 검토 요청 버튼 비활성. 법적 확인 체크·재검토 제출·공개 출시 없음. 사업자 서류 검토와 앱/번들 검토는 다른 단계.
- **즉시 출시 준비 완료 아님:** SERVICE_AVAILABLE=false, 승인 SKU 빈 배열, 서버 release gate 유지. 전체 CODE DESTINY 기능 미포함. 단순 최신 소스 통합은 전체 기능 이식이 아니다. 기존 feature-matrix의 첫 제출 제외 방침은 사용자의 전체 기능 요청보다 우선하지 않는다. 로그인·IAP·생성·보관 연동, 나머지 기능 이식, 약관·mTLS·실기기 검증이 남음.
- 운영 웹·결제 정책·인증/API/DB 로직은 이번 작업에서 변경하지 않았다. 자산 변경만 로컬 검증·커밋하며, 미완성 서버 코드 전체를 main에 함께 전달하지 않는다.

다음: 사업자 심사 결과 확인 후 로그인·IAP 설정을 연결하고 전체 기능별 출시 충족표를 갱신. 모든 기능 이식 및 구매→결과→기록 검증 완료 후 실제 화면으로 등록 이미지를 다시 확정하고 앱 통합 검토 제출.

## 최신 요청 완료 — 카테고리 최적화·테스트 업로드 20261008-2

사용자가 운영 승격은 필요 없다고 명시하고 앱인토스 카테고리 최적화와 업로드를 요청했다. 이번에는 운영 배포를 실행하지 않았다. 이 절이 이전의 운영 승격 선행/업로드 보류 지시보다 우선한다.

- 기존 앱 코드데스티니 / Code Destiny, appName ai-saju-studio, workspace 21957을 사용했다. 카테고리는 생활 > 콘텐츠 > 운세로 유지 확인.
- 검색어: 사주, AI사주, 사주팔자, 코드데스티니, 영냥이, 운세, 연애운, 직장운, 재물운. 중복 범용 AI/인공지능/내사주는 제거했다. 임시저장 후 reload하여 카테고리 및 9개 키워드 영속 저장 확인. 검색량·순위 개선 효과는 미측정.
- 현재 코드로 npm run build --prefix apps/toss 성공(tsc/Vite/ait). 소스 수정 없음. 500kB 이상 JS 청크 경고는 유지.
- apps/toss/ai-saju-studio.ait 새 빌드 및 실제 콘솔 업로드 완료. 버전 20261008-2, deploymentId 01a11a99-ad7a-7d09-aabb-ee1a222b8f16, SHA256 C491593831427465D155927D8A8E9B103DD99F7EAE19F51666FBF9D63FEAEEE6.
- 콘솔 임시저장 성공 메시지, 업로드 후 사용 권한 없음, 테스트하기 모달의 새 버전/QR/동일 deploymentId를 확인했다. 테스트 링크: intoss-private://ai-saju-studio?_deploymentId=01a11a99-ad7a-7d09-aabb-ee1a222b8f16&host=appsInTossHost . 테스트 푸시는 보내지 않았다.
- 로그인·구매·생성은 여전히 비활성인 화면 테스트 번들이다. 검수 제출/공개 출시 없음. 새 버전 실기기 테스트 미실행.
- 등록 이미지 팩은 확인만 했고 업로드하지 않았다. 기존 로고 반려/사업자·약관·IAP·mTLS 및 전체 출시 미완료 사항은 유지. 다음: 테스트 QR로 새 버전 확인, 출시 가능한 인증·구매 구현과 콘솔 필수 설정 완료 후 등록 자산/통합 검수 진행.


## 최신 재개 상태 — 2026-10-08 실기기 진입 확인·등록 자산 준비

이번 재개에서는 테스트 버전 `20261008-1`의 콘솔 QR·링크 상태를 다시 확인하고, 로컬에서 실패 검사의 원인을 분리했으며, 검수 반려 사유에 맞춘 Toss 등록 자산을 별도 폴더에 준비했다.

- 사용자 판단에 따라 등록 자산 업로드는 보류한다. 운명의 꽃 UI 톤 개선이 먼저 반영되어야 하며, 그 이후 최신 테스트 번들·실기기 화면 기준으로 등록 이미지를 다시 확인한 뒤 업로드한다.

- 콘솔 workspace `21957` / appName `ai-saju-studio`의 테스트 모달이 정상 표시됐다. deploymentId `01a11a59-2b8a-77b0-b1b3-c492905b843b`, 테스트 링크 `intoss-private://ai-saju-studio?_deploymentId=01a11a59-2b8a-77b0-b1b3-c492905b843b&host=appsInTossHost`가 일치한다. 사용자 실측으로 QR 스캔 후 토스앱 진입 성공을 확인했다. **앱이 열렸다는 진입 증거이며 홈·상담·예시 각 화면의 세부 상호작용까지 확인한 것은 아니다.** 테스트 푸시는 보내지 않았다.
- 등록 요구사항을 콘솔에서 실측했다: 다크모드 앱 로고 `600×600px`, 세로 스크린샷 `636×1048px` 최소 3장, 가로 스크린샷 `1504×741px` 최소 1장.
- 등록 자산은 [`docs/toss/assets/20261008-1/`](assets/20261008-1/)에 준비했다. `ai-saju-studio-icon-600.png`는 영냥이 원본 기반의 불투명 남색 배경 정사각 아이콘이며, `01` 홈·`02` 고등어 상담·`03` 개인정보 없는 결과 예시 세로 캡처와 `04` 홈 가로 캡처가 있다. 크기·바이트·SHA256은 `manifest.json`에 기록했다.
- 캡처는 `apps/toss` 로컬 CSR 미리보기에서 생성했고 `SERVICE_AVAILABLE=false`를 유지했다. 일반 브라우저에서는 Toss native bridge가 없어 `SafeAreaInsets` 콘솔 오류가 반복되지만 화면 캡처는 생성됐다. 이 오류는 실기기 결과나 운영 장애로 해석하지 않는다.
- `npm --prefix apps/toss test`: **32 passed / 0 failed**. `npm --prefix apps/toss run build`: **통과**, 로컬 build deploymentId `01a11a6a-6cbd-7cff-a823-332034589f02`; 테스트 콘솔에 업로드하거나 기존 테스트 버전을 교체하지 않았다.
- 실패 원인 분리 재현: `verify:deploy-base-guard`는 Windows 임시 디렉터리 Git config `Permission denied`; `verify:llm-generation-resilience`·`verify:analysis-basis-contract`는 Swiss ephemeris 파일의 `127.0.0.1` 통신 `EACCES` 및 `cdn.jsdelivr.net` DNS `ENOTFOUND` 후 숙요 계산 실패; `verify:payment-choice-parity`와 `--self-test`는 독립 정적 페이지의 기존 캐시 핀 `build-4094433f67b2`가 현재 기대 `build-9c92542eb04f`와 불일치; `npm test`와 `verify:ai-consultation-flows`의 마지막 Jest 단계는 Temp `realpath` `EPERM`이다. 모두 이번 Toss 자산 변경이 깨뜨렸다는 회귀 증거는 아니다.
- 앱인토스 등록 이미지·아이콘은 아직 콘솔에 업로드하지 않았다. 사업자·약관·IAP·mTLS·검수 제출·출시는 계속 미완료이며, main merge/push도 하지 않았다.

다음: 운명의 꽃 UI 톤 개선 반영을 기다린다. 반영 후 최신 테스트 번들을 재빌드하고, 실기기 진입·홈·상담 선택·결과 예시를 다시 확인한 뒤 등록 이미지를 재캡처한다. 그 다음 별도 승인 범위에서 등록 자산의 콘솔 업로드 여부를 결정한다. 실기기에서 깨짐이 확인되면 자산이 아니라 앱 코드/콘솔 표시 문제를 분리해 조사한다.

## 최신 실행 상태 — 2026-10-08 테스트 번들 업로드 완료

이 절이 아래 과거 기록보다 우선한다. 이번 요청의 운영 확인 → 최신 main 통합 → 재빌드·테스트 업로드는 완료했다. 전체 출시 작업은 미완료이므로 worktree와 in-progress 상태를 유지한다.

- 추가 사용자 요청에 따라 콘솔 표시명을 `코드데스티니` / `Code Destiny`, 부제를 `내 고민에서 시작하는 사주 이야기`로 변경하고 임시저장 성공 확인. 상세 설명·출시 노트·메모는 영냥이 사주 상담 안내/결과 예시와 현재 화면 테스트 단계에 맞춰 수정했다. 미래 보장이나 미제공 기능 이용 가능 주장 없음.
- 카테고리 `생활 > 소셜 > 소셜`을 `생활 > 콘텐츠 > 운세`로 변경. 사주사진 키워드를 제거하고 코드데스티니·영냥이·운세를 추가해 임시저장 완료. 기존 AI·사주·내사주·AI사주·인공지능·사주팔자 키워드는 유지.
- 변경 불가 appName `ai-saju-studio`, 고객지원 연락처, 연령, 정책과 번들은 유지. 아이콘/썸네일 반려 보완과 등록 이미지 제작은 남아 있다. 검토 요청 및 법적 확인 체크박스는 실행하지 않았다.
- 서비스 정보 증거: `C:\Users\user\.codex\visualizations\2026\10\08\01a11a57-4881-7701-aa24-5a9327667d52\toss-codedestiny-metadata.jpg`.
- 운영 실행 `37739647381`: completed/success, headSha `00ff9724c916de061f2e2ceac747d6f0eaeafb34`. 실제 `https://code-destiny.com/version.json` 및 `/api/version` 모두 같은 SHA와 production을 반환했다. 추가 운영 dispatch 없음.
- origin/main을 fetch한 결과 최신 SHA는 위 `00ff9724…`. clean 상태에서 충돌 없이 통합한 커밋은 `0ca433d50fdfd348d8bbbbe58ed5e31ffd636ced`. 새 브랜치/PR 없음.
- `apps/toss`에서 `npm run build` 성공(tsc, Vite, ait). 500 kB 초과 청크 경고는 남음. `npm test` 32 passed / 0 failed(mock).
- 업로드 파일: `apps/toss/ai-saju-studio.ait`, 525595 bytes, SHA256 `BC9EC2CD672137FF3DA0978A3C44EB921E96842DCE32262EDA948B26C923EE8F`.
- **콘솔 업로드 및 임시저장 성공을 실제 화면으로 확인.** workspace 21957 / ai-saju-studio 수정 화면에서 파일 업로드 후 사용 권한 없음, 토스앱 테스트 활성화, “임시저장 했어요.” 확인.
- 테스트 버전 `20261008-1`, deploymentId `01a11a59-2b8a-77b0-b1b3-c492905b843b`. 로컬 빌드 ID뿐 아니라 콘솔 테스트 모달에서 같은 ID를 확인했다.
- 테스트 링크: `intoss-private://ai-saju-studio?_deploymentId=01a11a59-2b8a-77b0-b1b3-c492905b843b&host=appsInTossHost`.
- QR 증거: `C:\Users\user\.codex\visualizations\2026\10\08\01a11a57-4881-7701-aa24-5a9327667d52\toss-upload-20261008-1.jpg`. 콘솔 테스트 모달을 열어 두었다. 푸시는 보내지 않음.
- SERVICE_AVAILABLE=false, 승인 SKU 빈 배열, 서버 TOSS_RELEASE_READY fail-closed 유지. 결제/인증/API/DB 구현 및 정책 수정 없음. 실기기·실결제·LLM·검수 제출·출시는 미실행.
- `npm run check:fast -- --base=30f3eab563da9239d2823eedef8283ab7ce43545 --plan`은 통합된 정적 셸 8개를 fast로 분류. 같은 base의 실행은 paid-gate-suite 81 통과 / 7 실패로 종료했으며 후속 검사는 미실행.
- 실패: npm test(Jest 임시 경로 EPERM), verify:deploy-base-guard(임시 Git config 쓰기 거부), verify:llm-generation-resilience·verify:analysis-basis-contract(로컬 통신 EACCES), verify:ai-consultation-flows(하위 Jest EPERM), verify:payment-choice-parity 및 self-test(독립 페이지 캐시 핀 build-4094433f67b2 / 기대 build-9c92542eb04f, 예 yoga-guru.html). Windows 줄바꿈 또는 기존 결함 귀책은 미확정. suite의 “이 변경이 깨뜨렸다” 출력은 base 비교 없이 나온 문구이므로 회귀 실측으로 해석하지 않는다.
- 안전 전달 예외: 기존 토스 서버 구현은 출시 전 공백이 남고 전체 게이트가 실패했으므로 main 병합/push/신규 main CI는 보류. 통합 커밋과 이번 기록은 해당 worktree에 보존한다. 이미 운영 중인 main SHA의 CI 성공과 이번 작업본의 검증을 혼동하지 않는다.

다음: QR로 실기기 화면 확인 → 실패 검사 원인 분리 및 토스 출시 전 구현 공백 해결 → 사업자·약관·IAP·mTLS 준비 → main 전달/CI → 검수. 동일 번들은 재업로드하지 않아도 된다.

재개 기준 커밋: `0ca433d50fdfd348d8bbbbe58ed5e31ffd636ced` (이번 기록 커밋의 부모). 실제 최신 기록 커밋은 `git log -1 --format=%H -- docs/toss/2026-10-07-launch-handoff.md`로 확인한다.

```powershell
Set-Location 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959'
Get-Content 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959\docs\toss\2026-10-07-launch-handoff.md'
git -c core.fsmonitor=false status --short
git log -1 --format=%H
# 다음: 테스트 버전 20261008-1 실기기 확인 및 실패 검사 원인 분리. 재업로드/재배포하지 않는다.
```

## 최신 실행 상태 — 2026-10-08 운영 승격 요청

이 절이 아래 과거 조사 기록보다 우선한다. 사용자 최신 지시는 웹 수정 완료 → 운영 승격 → 앱인토스 작업 순서다.

- main: `00ff9724c916de061f2e2ceac747d6f0eaeafb34`. 타로 라이브러리 진입 복구 `e8050a4691724f92cd9174423bf28b6f38ca8db1` 및 모듈 참조 해시 동기화 포함. 추적 파일 미커밋 변경 없음. 다른 세션의 미추적 파일은 보존했다.
- 공식 main CI 통과: https://github.com/rei1237/codedestiny/actions/runs/37738210923 . Paid Flow Gates 통과: https://github.com/rei1237/codedestiny/actions/runs/37738210998 . 이전 e805 CI 실패는 정적 셸 8개의 app.js 캐시 주소 불일치였으며 00ff에서 해결.
- 운영 승격 1회 dispatch 성공: https://github.com/rei1237/codedestiny/actions/runs/37739647381 . **완료 확인 전이다.** 저장소 전달 규칙에 따라 실행을 폴링하지 않았다. 승격 전 Pages/Worker는 모두 `931cb0a7bd180ab8a6c5627deeb4c2878b02b8bc`였다. 재개할 때 이 실행의 완료 및 운영 SHA를 먼저 확인하고, 실패하면 재승격을 임의 반복하지 않는다.
- 타로 홈 버튼은 기본 뽑기 대신 기존 라이브러리를 연다. 390/1280px 실제 브라우저에서 11개 링크+명리학 타로 버튼 총 12종 접근, 연애 상세/기본 타로 닫기 및 홈 복귀 확인. 모바일 초기 6개 DOM은 가상화이며 끝까지 스크롤하면 나머지도 보인다. 결제·LLM 호출 없이 검증.
- targeted 타로 테스트 6개, sitemap 955 URL 드리프트 검사, public-mirror-fresh 통과. 로컬 check:fast --committed-head는 npm test 실패 후 추가 광범위 검사를 중단했으므로 전체 로컬 통과로 기록하지 않는다. 공식 CI는 별도로 통과했다.
- Toss 작업본 HEAD(문서 갱신 전): `f33f0f5014f0bb22440a0c6f6dee7b1b731f1b6b`. e805까지 통합되어 있고 00ff는 아직 미통합. SDK 3.7.0 / TDS 2.5.1 / React 18.3.1 / Vite 8.3.3 / TypeScript 5.9.3.
- 마지막 로컬 번들: `apps/toss/ai-saju-studio.ait`, 525595 bytes, SHA256 `9DBD7098003F550757B1A57C385E66A032CEA7D7C36C062933E4D03B63EE34CE`, build deploymentId `01a11895-eb8c-71d1-9b2d-a0e12579912a`. 이 ID는 로컬 빌드이며 콘솔 업로드 증거가 아니다. 업로드 도구가 중단되어 실제 업로드 성공 여부 미확인. 다시 업로드하기 전에 콘솔 상태부터 확인한다.
- 화면 테스트 번들: SERVICE_AVAILABLE=false, 서버 TOSS_RELEASE_READY 기본 false, 승인 SKU 목록 비어 있음. 로그인·구매·상담 생성 이용 가능 앱으로 제출하지 않는다. apps/toss 테스트 32개, 기존 질문정책 8개, repository 96개(mock, 9/15 복구 포함) 통과. 실제 Toss/기기/결제/mTLS 미검증.
- 질문 범위는 worker/yeongnyangi/fortune/ask/question-policy.ts 정본을 재사용한다. 고등어 개인 질문, 연어 선택, 광어 두 사람, 참치 장기 흐름이며 아래의 5/8/11/15 고정 항목 안내는 현재 질문형 상품에 적용하지 않는다. 상담 이어묻기와 질문 결정·상대 출생정보 소유권을 추가 검증했다.
- SDK 3.1.1 이상 Origin: `https://ai-saju-studio.apps.tossmini.com`, `https://ai-saju-studio.private-apps.tossmini.com`. 아래 과거 web/private-web Origin은 사용하지 않는다.
- 콘솔 workspace 21957 / appName ai-saju-studio / 기존 앱 ai 사주 물상. 로그인 재확인했으나 사업자등록증 업로드 화면이 남아 토스 로그인·IAP 설정 접근 미완료. 앱 정보 아이콘 반려, SKU/약관/mTLS/정산 미완료. 신규 법적 동의나 사업자 정보를 추정 입력하지 않는다.
- 남은 개발: 탈퇴·연결 해제 데이터 삭제/법정 보존, 환불 동기화, 출생·결과 암호화/실제 처리 지역, 개인정보·LLM 약관, 전환 dedupe/콘솔 매핑, 원본 결과 렌더러, 등록 이미지/아이콘 및 실기기. 완전 출시·검수 제출·승인·출시 모두 미완료.

다음 행동: 운영 승격 완료를 먼저 확인 → main 00ff를 이 worktree에 통합 → 토스 번들 재빌드 → 콘솔 업로드 상태 확인 및 테스트용 업로드 → 외부 사업자 게이트와 남은 구현 해결 후에만 통합 검수. 현재 완료된 웹 작업 때문에 미완료 토스 worktree를 삭제하지 않는다.


## 최신 사용자 지시 — 2026-10-08 재개

사용자가 최신 운영 소스 기준 구현·업로드 재개를 요청했다. 먼저 홈의 운명의 꽃 스타일, 읽을거리 접힘 배치, 명상 컬렉션의 잘못된 타로 기록 링크 제거를 main에 반영했다. 최종 UI 커밋은 `846d7eb9be4f0f4b7a78e56480a18456395f86fa`이며 CI 확인 후 승인된 운영 배포를 진행한다. 콘솔 재로그인은 확인했다. 사업자 증빙 서류 업로드가 남아 로그인/IAP 설정은 아직 열리지 않는다.

SDK 3.7.0은 npm latest 확인. 공식 미니앱 테스트 문서의 SDK 3.1.1 이상 계약에 따라 허용 Origin을 `ai-saju-studio.apps.tossmini.com`, `ai-saju-studio.private-apps.tossmini.com`으로 수정했다. 앞선 web/private-web 기재는 3.0.0~3.1.1 미만에 해당한다. 실기기 Origin은 아직 미실측. 근거: https://developers-apps-in-toss.toss.im/guide/operation/toss

## 이전 사용자 지시 — 출시 보류

2026-10-07: 사용자가 “지금 서비스 중에서 안되는 부분들이 있어서 그 부분이 해결된 이후에 앱인 토스 론칭해야겠다”라고 지시했다. **업로드·검수 제출·출시 작업을 보류했다. 기존 서비스 장애 해결과 회귀 검증 이후 재개한다.** 자동 재개/감시 예약은 만들지 않았다.

사용자가 사업자 정보 입력과 휴대폰 인증을 모두 완료했다고 알려 주었다. 이는 사용자 확인이며, 마지막 콘솔 조회는 아직 사업자 등록 안내였으므로 사업자 승인·정산 완료로 기록하지 않는다.

## 요청과 경계

CODE DESTINY의 기존 계산·해석·구매 기록을 보존하면서 토스 전용 CSR, Toss 로그인, IAP, 중단 복구, 기록, 약관, 소개 이미지와 콘솔 등록·업로드·검수·승인 후 출시를 구현한다. 실결제·과금 LLM·예산 지출·메시지 발송은 미승인이다. 삭제 요청은 사용자가 다른 세션에 보낼 말을 잘못 보냈다고 철회했다. **토스 출시만 진행하고 기존 웹 정리는 하지 않는다.**

## 실측 증거 (2026-10-07 KST)

- 저장소: https://github.com/rei1237/codedestiny, main. 여러 쓰기 세션을 확인하여 공식 스크립트로 격리했다.
- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959`
- 작업 브랜치: `wt/toss-miniapp-20261007-223959`, 시작 SHA `a71611cdfda163fbeaad2e7a90470e4821d3200d`.
- Chrome 로그인 콘솔에서 workspace `21957` / `네오3377`, 기존 앱 `ai 사주 물상`, appName `ai-saju-studio` 확인. 중복 앱 생성 없음.
- 앱 출시 화면: 앱 정보 반려, 첫 버전 미등록, 등록 버튼 비활성.
- 반려 사유: 아이콘/썸네일은 크롭하지 않은 배경 포함 사각형 제출 필요.
- 수정 화면은 앱 정보와 `.ait` 번들을 함께 받으며 토스앱 테스트를 요구한다.
- 콘솔 제한 실측: 한국어 앱명 10자, 영어 15자, 부제 20자. appName 변경 불가. 현재 연령 만 19세 이상.
- npm 공식 registry `@apps-in-toss/web-framework` latest `3.7.0`, beta `3.5.0-beta.0`.
- 공식 SDK 3.x 문서: `apps-in-toss.config.ts`, `webBundleDir`, `webView`, brand.primaryColor. 운영 Origin `<appName>.web.tossmini.com`, QR 테스트 `<appName>.private-web.tossmini.com`.
- 콘솔 MCP는 현재 호출 가능한 도구 목록에 없음. Chrome 새 전용 탭에서 로그인 세션 접근 성공. 원래 탭 연결 2회는 focus CDP timeout.

## 구현 선택

- `apps/toss` 독립 패키지와 lockfile. 루트 Next.js/PortOne 번들을 임베드하지 않는다.
- 설치된 SDK 타입과 공식 문서를 함께 확인한다. 기존 User는 이메일 필수이므로 Toss 식별자를 기존 웹 계정으로 자동 병합하지 않는다.
- 영냥이 `prepareFortune`, `presentFortune`, `generateNextChapter`, repository, queue, recovery와 계산 모듈 재사용 검토 중.
- IAP 서버 조회는 사용자 범위의 `x-toss-user-key` 필수. 공식 주문 응답에는 금액이 없으므로 금액을 서버 조회 결과라고 꾸미지 않는다. 콘솔 승인 SKU 가격 스냅샷과 SDK 상품 정보 대조가 필요하다.
- 화면 방향: 라이트 중성 바탕, 질문 우선, 영냥이 원본, 보라 CTA, 네이비/골드 강조. TDS 공통 UI. 첫 진입 로그인 자동 실행 금지.

## 재개할 때 다음 행동

1. 기존 서비스 장애가 해결됐는지 사용자/수정 커밋에서 확인. 해결 전에는 제출/출시하지 않는다.
2. 이 worktree의 미커밋 변경을 보존한 채 main의 동시 작업과 통합 범위를 비교한다. 다른 세션 변경을 삭제하지 않는다.
3. 아래 미완료 보안·약관·생명주기·통계·화면 검증을 마치고 targeted 검사와 CI를 실행한다.
4. 사업자/정산/관리자 권한, 토스 로그인·약관·mTLS·IAP 상태를 실제 콘솔에서 다시 확인한다.
5. 승인 SKU/가격·법적 동의·보존/삭제 정책·인증서·실기기 증거 없이 TOSS_RELEASE_READY를 true로 설정하지 않는다.

## 미완료

**출시 가능한 완성본이 아니다.** 로컬 개발 중 상태를 격리된 worktree에 보존했다. 아직 커밋/merge/main push/CI/배포를 하지 않았다. 사용자 보류 지시 때문에 check:fast와 로컬 Vite 서버를 중단했다. 미완료 작업이므로 worktree와 문서를 삭제하거나 status: done으로 표시하지 않았다.

### 준비한 구현

- `apps/toss`: React 18.3.1 / Vite 8.3.3 / TypeScript 5.9.3 / SDK 3.7.0 / TDS 2.4.1 독립 패키지, lockfile, CSR 화면, 공식 로그인/IAP/미지급 복구 어댑터. 외부 PG·웹 계정 로그인 없음.
- 원본 `public/assets/yeongnyangi/original/hero-800.webp`를 확인한 후 `apps/toss/public/assets/yeongnyangi.webp`에 재사용. 새 이미지 생성/등록 이미지 완성은 하지 않음.
- `worker/toss`: Workers mTLS 전용 fetch, 암호화 userKey/해시 세션, 독립 Toss identity, 서버 범위 주문 확인, 멱등 권한 트랜잭션, 결과/기록/복구 경로, 제한된 CORS와 이벤트 필드.
- `worker/yeongnyangi/access-methods.js`, `repository.js`, `recovery.js`: TOSS_IAP 증거 재검증 및 영속 PAID 행의 기존 복구 경로 연결.
- `worker/index.js`에 `/api/toss/` 전용 라우팅. `tsconfig.json`은 독립 apps/toss 타입 검사 제외.
- 승인 SKU registry는 **빈 배열**. `TOSS_RELEASE_READY !== 'true'`일 때 인증/유료 작업 차단. 현행 운영 웹 가격을 토스 승인 가격으로 간주하지 않음.

### 실행된 검증

- `node --test apps/toss/test/*.test.mjs`: **26 passed**, mock/pure tests.
- `npm run test:jest -- --runTestsByPath __tests__/worker/yeongnyangi-repository.test.js --runInBand`: **95 passed**. 실제 repository 코드를 사용하되 DB/LLM은 mock. TOSS_IAP 9/15 중단→같은 주문 재개, 8개 항목 보존, 동시 claim 중 한 번만 진행, 웹 결제 증가 없음, 다른 소유자 결과 거부 포함.
- `apps/toss`의 `npm run typecheck`: 통과(초기 UI 시점).
- `apps/toss`의 `npm run build`: 통과(초기 UI 시점). 이후 뒤로가기/가로 넘침/구매 중복 방지/CSS 설정을 편집했으므로 **현재 최종 변경 전체의 빌드 통과 증거는 아님**.
- 최초 로컬 `.ait`: `apps/toss/ai-saju-studio.ait`, 489,867 bytes, CLI 출력 deploymentId `01a116b8-e928-7933-8b78-46ccb0fc3185`. **로컬 빌드 ID이며 업로드/공개 배포 ID가 아님**. 현재 코드보다 이전 산출물이라 업로드 금지.
- Chrome 390×844 로컬 홈/질문 선택 관찰. 첫 진입 로그인 모달 없음. 영냥이 이미지 가로 넘침 발견 후 CSS 수정, 수정 후 재검증은 미실행. Android/iOS 토스 실기기 검증 아님.
- `npm run check:fast -- --plan`: critical 판정 확인. `npm run check:fast`는 paid-gate-suite 진행 중 사용자 보류로 종료, **통과 미확인**.
- main CI, 운영 DB, 실결제, 유료 LLM, mTLS 실통신, 실제 개인정보 삭제는 실행하지 않음.

### 출시 전 반드시 해결할 구현/검증 공백

- 서버 주문의 금액 필드가 없으므로 콘솔 승인 가격 증거와 SDK 결제창 가격 실측 필요. 현재 SKU 0개.
- 콜백은 Basic Auth 및 3개 referrer 검증과 세션 무효화까지만 구현. 연결 해제/자체 탈퇴 시 개인정보 삭제, 거래 보존 범위/기간, unlinkPending 재처리, 재가입/동시 로그인·해제 경합은 미완료.
- userKey AES-GCM 저장은 구현했지만 구매 내역/출생정보/상담 결과의 저장 암호화와 DB 리전은 검증되지 않음.
- 환불은 결과 접근 시 서버 조회 후 차단함. 백그라운드 주문/환불 동기화와 공식 환불 절차 연결은 미완료. Toss를 PortOne 환불로 처리하면 안 됨.
- 결과 화면은 저장된 chapter 구조를 읽지만 전체 native chart/시기 표시, 모든 상태와 접근성 검증이 미완료. 준비 중인 기능은 등록 문구에 넣지 않음.
- API 개인정보 최소화/익명 이벤트 필드 제한은 구현. 전환 이벤트 영속 중복 제거·콘솔 이벤트 연결·생성 완료율/미제공률 운영 지표는 미완료.
- 미지급 복구는 권한을 먼저 복원하고 사용자가 질문을 명시적으로 연결함. SDK가 요청 ID를 반환하지 않으므로 최근 draft를 임의 연결하지 않음. 타기기/백그라운드/콜백 유실 E2E 실측 필요.
- 출생 입력은 국내 7개 도시만 선택 가능. 음양력·윤달·시간 모름 엔진 parity, 해외/기타 도시 UX 보완 필요.
- 약관 화면은 준비 상태 고지이며 제출용 약관이 아니다. LLM/Cloudflare/Mongo 실제 리전·수탁/국외 이전·보존·환불 정책 확인과 최종 동의 등록 필요.
- 정책/비게임 체크리스트 전체 읽음. 콘솔 공지 목록에서 10/1 통합 검수, 10/22 노출 정책 변경, 9/23 공유 리워드 종료 공지 제목 확인. 본문과 10/7 블로그 접근 오류는 아직 해결되지 않음.
- 로고/소개 이미지/상품 이미지, 등록 문구 입력, 테스트 QR, 검수 제출, 승인, 출시 **모두 미실행**.

### 재개 명령

```powershell
Set-Location 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959'
Get-Content 'docs\toss\2026-10-07-launch-handoff.md'
git status --short
# 현재 마지막 커밋: a71611cdfda163fbeaad2e7a90470e4821d3200d (시작 커밋; 이 작업 커밋 없음)
# 다음: 기존 서비스 복구 확인 → 미커밋 토스 구현 보완/검증 → main 통합/CI → 콘솔 준비 후 제출
```

## 공식 근거

- https://developers-apps-in-toss.toss.im/llms.txt
- https://developers-apps-in-toss.toss.im/intro/guide
- https://developers-apps-in-toss.toss.im/checklist/app-nongame
- https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x
- https://developers-apps-in-toss.toss.im/documentation/common/authentication/toss-login
- https://developers-apps-in-toss.toss.im/documentation/common/monetization/iap/in-app-purchase

10월 7일 블로그 공지는 web 도구에서 접근 오류로 재확인 필요. 최신 문서와 공지 사이의 미검증 사항을 확정 사실로 취급하지 않는다.
