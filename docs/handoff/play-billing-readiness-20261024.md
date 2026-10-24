---
status: active
updated: 2026-10-25
next: "최신 main CI를 한 번 확인하고 성공이면 이 문서를 done으로 닫고 이 작업의 워크트리만 배수한다. 새 APK/AAB 빌드는 계속 보류한다."
---

# Play 결제 상품 등록 및 이용권 판매 준비

## 2026-10-25 CI 확인 및 정리 요청
- 최신 지시: 최신 CI 성공 시 이번 워크트리만 정리한다. 다른 세션은 건드리지 않고 앱은 빌드하지 않는다. 아래 과거 배포·기기 검수 순서는 이번 정리 요청의 선행 조건이 아니다.
- `24809bdb6511c068d8c9f55b2c2d5baedc8c99d0`의 CI https://github.com/rei1237/codedestiny/actions/runs/40133515322 는 실패했다. fast/build/critical은 성공했고, Static guards의 Node 검사 3653개 중 1개만 실패했다.
- 원인: 이벤트 검사기가 실제 `root.dispatchEvent?.(new root.CustomEvent(...))`를 인식하지 못해 `cd:play-prices-changed`를 발신자 없는 이벤트로 오인했다. 검사기의 호출 문법 인식 한 줄만 보완했고 면제 목록·앱 코드·결제 정책은 바꾸지 않았다.
- 수정 커밋: `95be4128576a300bea71b4e36dca06b85ebd7c2f` (`test(ui): detect optional event dispatch`). 인수인계 갱신과 함께 main으로 전달한다.
- 검증: `node --test __tests__/ui/custom-event-wiring.static.test.js __tests__/ui/play-display-price.test.mjs __tests__/ui/play-price-hook.test.mjs` 20/20 PASS. 대상 ESLint 오류 0개/기존 require 경고 4개, `git diff --check` PASS. `check:fast -- --plan`은 전체 critical 검사로 승격되어 전체 로컬 검사는 반복하지 않는다. 공식 판정은 새 main CI에 맡긴다.
- CI 성공 조건이 충족되지 않았으므로 현재 상태는 active이며 워크트리는 보존한다. 새 CI가 진행 중이면 기다리거나 반복 조회하지 않고 다음 재개 때 한 번 확인한다.
- 공유 루트의 `docs/handoff/heaven-light-mv-v7.md`, `.claude/skills/fire-your-seo-agency/`, `docs/handoff/ggulggul-master-repair-release.md`는 다른 세션 소유로 보존했다. 앱 빌드·실제 과금·배포 조작 없음.

## 2026-10-25 추가 번역 및 Google Play 현지 가격 표시
- 최신 지시: 해외 상담 결과는 각 로케일로 제공하고 통화 표시는 Google Play Console 기준으로 한다. 번역이 먼저이며 새 APK/AAB는 계속 보류한다.
- 저장소 전달: `955536219`까지 상담 결과 로케일 유지 및 안내 번역을 전달했고, `2be51f121` 네오 이메일 응답 언어와 `d917fd041` 홈 안내·접근성 번역을 main에 전달했다. `955536219`의 CI 실패 1개는 언어 의존성이 빠진 추출 테스트였으며 다른 세션의 `650845876` 수정과 중복되지 않게 우리 로컬 동일 수정은 제외했다. `650845876` PR CI 성공. 이후 `d917fd041` CI는 접근성 속성 사전 비교 1개가 실패했다. 아래 추가 수정으로 원인을 해결했다.
- 상담 언어: 신규 결과 요청, 재개, 후속 질문에서 구입 당시 로케일을 유지한다. 사주 궁합·네오 작전실·사주 섹션·나크샤트라·연애비책·점성술·자미두수·숙요·신년·인생의 책·카르마·전문가 후속 상담 경로를 보완했다. 기존 저장 결과 본문을 임의로 다시 생성하지 않는다.
- 네오 수동 이메일 상담은 12개 언어의 요청 언어를 입력/주문/관리 화면/운영자 접수 메일에 유지한다. 사람이 답변하는 기존 정책은 그대로다. 실제 이메일 발송은 하지 않았다.
- 홈 안내는 새 문구 150개를 12개 언어로 작성하고, 영어·일본어 홈/메뉴/푸터의 동적 번역 후 한국어 잔류·접근성 속성·링크·동작 보존을 검사했다. 기존 다른 영역의 번역 전체가 완성됐다는 뜻은 아니다.
- 꿀방울 사용처 24종 이름/설명과 확인·취소·잔액·오류 안내 총 99키를 12개 로케일로 작성했다. 사용 금액·개수·권한은 기존 서버 카탈로그를 그대로 사용한다. 안내를 열거나 언어를 바꾸는 동작은 조회만 한다.
- Play 가격은 서버 `/api/app-store/products`가 선택한 SKU를 네이티브 `queryProducts`로 조회해 `formattedPrice`를 그대로 표시한다. UI 언어로 통화를 임의 변환하지 않는다. React 가격 배지, 홈 대표 상담/질문/체험/이용권, 기존 타일 및 꿀방울의 현금 선택에 적용했다. 로컬 통화 문자열은 표시 전용이며 `amountKRW`, 권한/사용 한도, 결제 입력에는 넣지 않는다. 웹 원화·참고 환산 정책은 유지한다. 미확인 상품은 Play 가격 확인 안내를 표시한다.
- Play Console IAB 연결은 복구되었다. 작은 꿀단지의 KR/JP/US/GB/CA/AU/NZ/IE 가격을 읽기 전용으로 확인해 `docs/verification/play-local-price-display-20261025.json`에 남겼다. 앱에는 이 파일의 숫자를 하드코딩하지 않는다. 콘솔 가격·국가 설정을 변경하지 않았다.
- 검증: 네오 이메일 40개, 홈 실제 번역 런타임 2개, 가격 관련 27개, 꿀방울/홈/Play 표시 묶음 37개(앞 검사와 일부 중복), React 가격 훅 1개 PASS. 증분 TypeScript PASS. 관련 ESLint 오류 0개(기존 스타일 및 legacy var 경고 포함 136개). 실제 AI·결제·운영 DB 호출 없음.
- 추가 수정: 속성 사전 비교도 런타임과 동일하게 `data-cd-vars` 및 `@번역키`를 해석하도록 보완했고, 실제로 달랐던 이미지 대체 텍스트·마스터 접근성 문구는 저작 사전에서 한국어 원문까지 생성하도록 맞췄다. 실패를 단순 제외하지 않았다. 해당 검사와 영·일 실제 번역 검사 6개 PASS. 앱 브리지가 늦게 준비되는 경우에도 React 가격 배지가 Play 가격으로 바뀌는 동작을 확인했다.
- `4c6d2ed9a`는 꿀방울·Play 가격 표시의 구현 커밋이다. `check:pre-push` 통과. `check:fast -- --plan`은 critical 전체 검사로 승격되었고, 실행은 문서 검사 통과 후 전체 테스트 단계에서 위 CI 실패 수정 때문에 중단했다. 전체 `check:fast` 통과라고 보고하지 않는다. 수정 후 필요한 검사는 따로 실행하고 공식 전체 판정은 새 main CI에 맡긴다.
- 작은 화면 육안 검수: CUA IAB에서 로컬 미리보기 연결이 시간 초과로 실패했다. 화면 폭 360/390/430 및 데스크톱의 실제 시각 검수를 완료한 것으로 기록하지 않는다. 임시 미리보기 서버는 종료했다.
- 현재 설치된 APK 1.0.54에는 이번 번역/가격 표시가 포함되지 않는다. 새 빌드, 테스트 카드 국내·해외 구매, 구매 복원, 전체 기존 기록 및 부적 홈/잠금화면 적용은 여전히 최종 실기기 확인이 필요하다.

## 2026-10-25 번역 우선 작업
- 사용자 최신 지시로 배포·결제 테스트보다 번역을 우선했다. APK/AAB 생성과 공개 출시 조작은 하지 않았다.
- 이전 결제 커밋 `eea38194404f2d46ce74107a0d4be7c90e66db53`의 PR CI는 성공으로 확인했다. 아래 10월 24일의 실행 중 기록은 당시 상태다.
- 공유 루트의 다른 세션 변경을 보존하고 기존 전용 워크트리만 사용했다. 로컬 인수인계 커밋을 최신 main `730fb5ed27bf5a7b669396207f38f481c7f2a575` 위로 재배치했다.
- 홈 첫 이용 안내 60개 문구에 영어·일본어를 추가했다. 언어 전환 시 안내·버튼·접근성 이름을 갱신하고 프로필 진행 상태, 동의 화면 우선순위, 기존 결과 링크를 보존한다.
- 일본어 상담 목록의 신년·카르마·연애·인생의 책 4종 영어 대체 문구를 보완했다.
- 일본어 기록 보관함의 저장·복원·오류·환불 확인 문구와 저장 리포트 공통 소제목 192개를 보완했다. 차트 제목·목차·발화자·시빌라 결과 안내도 영어·일본어로 표시한다.
- 저장된 상담 원문·사용자 입력·차트 값은 번역하거나 재생성하지 않는다. 언어가 다른 기존 결과의 본문은 원문 그대로다.
- 앱의 영어 결제 대기 안내를 현재 한국어 정책과 일치시켰다. 영어·일본어 이용권 설명에서 추가 단건 결제가 필요 없는 적용 범위라는 뜻을 명확히 했다. 가격·한도·권한 판정·API 요청·DB 구조는 바꾸지 않았다.
- 관련 Node 검사 32개 통과(첫 이용 안내 11, 기록 로케일 5, 기존 기록 내용 6, Android 언어/앱 hydration/부적 10). 변경 TS/TSX ESLint 및 locale-text-fit 검사 통과. Impeccable 기계 검사 발견 사항 없음.
- 실제 브라우저 연결은 2회 타임아웃으로 화면 검증을 못 했다. DOM 동작 및 React 렌더링 검사는 통과했지만 360/390/430px 실화면과 기기 적용은 미검증이다.
- 새 번역 범위는 우선 출시 언어 영어·일본어다. 다른 로케일 전체 번역 완료로 보고하지 않는다.
- `sync:public` 및 사이트맵 생성기를 사용했다. URL 집합은 1019개 그대로다.
- 전체 로컬 검사보다 다른 세션의 진행 중 검사를 보존한다. 검증 실행/전달 상태의 최종 근거는 이번 커밋과 main CI다.

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
`D:\Development\code-destiny\.codex-worktrees\play-billing-readiness-20261024-221610`에서 `D:\Development\code-destiny\.codex-worktrees\play-billing-readiness-20261024-221610\docs\handoff\play-billing-readiness-20261024.md`를 읽고 수정 커밋 `95be4128576a300bea71b4e36dca06b85ebd7c2f`의 원격 main 포함 여부와 최신 CI를 한 번 확인한다. 통과하면 이 문서를 done으로 닫아 전달하고 자기 워크트리의 정션·워크트리·머지된 브랜치만 순서대로 정리한다. 다른 세션 작업은 보존하고 앱 빌드는 하지 않는다.
