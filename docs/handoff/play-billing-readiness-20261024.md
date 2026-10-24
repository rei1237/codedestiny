---
status: active
updated: 2026-10-24
next: "이번 main CI 결과를 확인하고 통과 시 승인된 서버 판매 설정을 운영 반영한다. 이용권 페이지 수정이 준비되기 전 새 APK/AAB를 빌드하지 않는다."
---

# Play 결제 상품 등록 및 이용권 판매 준비

## 위치와 전달 상태
- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\play-billing-readiness-20261024-221610`
- 브랜치: `wt/play-billing-readiness-20261024-221610`
- 마지막 구현 커밋: `eea38194404f2d46ce74107a0d4be7c90e66db53` (`fix(billing): enable approved Play passes`)
- 원격 main push 완료. 당시 main CI: https://github.com/rei1237/codedestiny/actions/runs/40103191178 (마지막 조회 시 실행 중).
- Paid Flow Gates는 https://github.com/rei1237/codedestiny/actions/runs/40103191258 에서 성공했다. PR CI는 아직 실행 중이다.
- 구현 커밋은 원격 main에 있고, 이 인수인계 커밋만 로컬에 보존한다. 진행 중인 구현 CI를 취소시키지 않도록 추가 push는 CI 확인 뒤에 한다.
- 이 인수인계 뒤에는 다시 전체 로컬 검사를 돌리지 말고 다음 턴 또는 전달 직전 CI를 한 번 확인한다.
- 공유 체크아웃은 `feat/world-cast-page`, HEAD `ed7c93d647820036eee773d29968dd4372b57365`. 다른 세션 변경 2개를 보존했다: `.claude/skills/fire-your-seo-agency/`, `docs/handoff/ggulggul-master-repair-release.md`.
- 이 워크트리는 CI/운영 반영 확인 전까지 보존한다. 다른 워크트리는 정리하지 않는다.

## 사용자 최신 지시
- 기존 가격과 이용권 한도는 유지한다. 실제 과금하지 않는다.
- 이전 원가 검토 자료를 신규 가격의 판매 필수 조건으로 삼지 않고, 승인된 현재 가격으로 Google Play 이용권 판매를 허용하도록 명시적으로 승인했다.
- 흑자 검증 자료를 새로 만든 것이 아니다. `PASS_COST_EVIDENCE`는 수정하지 않았다.
- 이용권 페이지 수정이 준비되어야 하므로 **현재 상태로 새 APK/AAB를 빌드하지 않는다**. 다른 세션의 이용권 페이지 수정은 건드리지 않는다.
- 공개 배포 승인은 기존 대화에서 받았다. 재승인 대신 CI 및 실제 배포 게이트를 따른다.

## 완료한 Console 설정
- 신규 단건 4종: `cd_content_tier_15/16/17/18` (1,000 / 15,000 / 50,000 / 70,000원).
- 신규 이용권 3종: `cd_pass_standard_30d_v4`, `cd_pass_premium_30d_v4`, `cd_pass_vvip_30d_v4` (9,900 / 29,900 / 59,900원).
- 모두 구매 옵션 `purchase`, 구입, 활성. KR / JP / US / GB / CA / AU / NZ / IE 8개국. 새 국가 자동 판매 없음.
- ko-KR / en-US / en-GB / en-AU / en-CA / ja-JP 상품명·설명 등록. 이용권은 6개 로케일 저장본까지 다시 읽어 검증.
- 이용 한도: 각각 20,000 / 60,000 / 120,000원 상당, 기간 제한 없음, 자동 갱신 없음.
- 29,900원과 59,900원은 일괄 가격 계산 시 반올림되어 개별 국가 가격 입력으로 수정했고, 저장 후 구매 옵션 화면을 다시 열어 정확한 값 확인.
- Family v4, 기존 레거시 및 폐기 상품은 변경하지 않았다.
- 등록 근거: `docs/verification/play-product-registration-20261024.json`.
- 화면/가격/번역 증빙: `D:\Development\code-destiny\output\play-billing-readiness-20261024`.
- Play Console 브라우저: IAB ID 2, 상품 tab 8. 라이선스 테스트 tab 7은 해당 턴 보존 표시가 필요하다.

## 구현
- `lib/payment/pass-policy.js`: 승인된 현재 Google Play SKU 3종을 명시.
- `worker/lib/pass-sale-policy.js`: 위 3종만 승인된 가격 정책으로 판매 허용. 영수증 검증, 계정 결합, 대기 결제 거절, 중복 지급 방지는 유지.
- `scripts/create-play-console-products.mjs`: 상품 설명의 이용 한도를 SKU 정책 버전으로 계산. 신규 상품에 과거 3만/10만/20만 원 한도를 표시하던 문제 수정.
- 관련 테스트, 등록 증빙, 생성기 기반 사이트맵 갱신 포함.
- 실제 운영 API의 판매 개방은 아직 확인하지 않았다. main push만으로 운영 반영 완료라고 보고하지 않는다.

## 검증
- 변경 후 결제 관련 Jest 4 suites / 127 tests PASS. 실제 네트워크·결제·DB는 mock.
- 구매 복원 자격 부팅 테스트 8/8 PASS (실기기 구매 복원 성공 증거는 아님).
- verify-play-console-products, verify-app-store-pricing, verify-app-store-billing-policy, verify-pass-tier-policy PASS.
- check:pre-push PASS (사이트맵 생성기 적용 후 URL 1019개 동일).
- check:fast 실행은 FAIL: 전체 Jest는 424 suites / 6816 tests PASS였으나 Node/천문 가드에 Swiss ephemeris 자료 미로딩·mock 외부 네트워크 차단, deploy-base 가드에 임시 Git 설정 쓰기 권한 오류가 있었다. --base 없이 실행되어 자동 귀책 문구는 비교 증거가 아니다. 무관한 파일을 고치거나 안전 가드를 끄지 않았다.
- 이 커밋 직전 main 필수 CI 5862684는 성공. 별도 이전 browser shadow는 cookie banner가 버튼 클릭을 막아 실패한 이력이 있으며 이번 변경과 혼동하지 않는다.

## 실기기 상태
- Android 16 / SM-M156S 연결·USB 승인 확인. 기존 앱이 없던 기기에 검증된 APK 1.0.54(versionCode 54) 설치.
- 사용자가 기존 계정으로 로그인했고 마이 화면의 기존 프로필 및 Lv.3 표시 확인.
- 현재 설치본에서 이용권 판매 준비 중 화면과 2만/6만/12만 원 한도 확인. 서버 변경 전의 상태다.
- 실제 과금 없음. 테스트 카드 구매, 해외 국가 시뮬레이션, 구매 후 재실행/복원은 **미완료**.
- 기존 계정의 전체 기록·부적 홈/잠금화면 적용 역시 최종 새 빌드에서 확인해야 한다.
- 사용자에게 ADB 화면 확인·무과금 테스트를 명시적으로 허용받았다. 조작 직전 `dumpsys window`의 현재 앱을 확인하여 다른 앱을 건드리지 않는다. 로그인/비밀번호 입력은 사용자가 직접 한다.
- 라이선스 테스트는 기존 내부테스트 목록 1명 선택 상태. 기기의 Play 결제 계정이 그 계정과 일치하고 결제창에 테스트 카드 표시가 보이기 전에는 구매하지 않는다.

## 다음 순서
1. 이번 main CI와 Paid Flow Gates 결과를 한 번 확인한다. 실패면 해당 실패만 조사한다.
2. 통과한 main으로 승인된 Cloudflare 서버 판매 설정 반영을 진행하고 Pages/Worker SHA 및 읽기 전용 pass-offers 응답에서 현재 3종 활성/Family 비활성을 확인한다. APK/AAB 빌드는 보류한다.
3. 이용권 페이지 변경이 준비된 이후 그 변경이 포함된 main을 확정해 새 앱을 빌드한다. 이미 제출된 1.0.54를 새 빌드 완료로 표시하지 않는다.
4. 라이선스 계정/테스트 카드로 국내 성공·거절·대기, Billing Lab 해외 국가/통화, 재실행 및 구매 복원/중복 지급 방지를 확인한다. 실카드 결제와 유료 AI 생성은 하지 않는다.
5. 완료 후 이 문서를 done으로 닫고 자기 워크트리의 node_modules 정션을 먼저 해제한 뒤 자기 워크트리·브랜치만 정리한다.

## 재개 지시
`D:\Development\code-destiny\.codex-worktrees\play-billing-readiness-20261024-221610`에서 이 문서를 읽고 구현 커밋 `eea38194404f2d46ce74107a0d4be7c90e66db53`의 원격 main 포함 여부와 최신 CI를 확인한다. 새 APK/AAB는 이용권 페이지 수정 준비 전까지 만들지 않는다.

