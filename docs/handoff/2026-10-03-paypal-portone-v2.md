---
status: active
updated: 2026-10-03
next: "승인된 사주 번역 문구 수정의 main CI 통과를 확인한 뒤 PayPal 운영 승격을 1회 실행한다."
---

# PayPal PortOne V2 운영 연동

## 요청과 승인

- PayPal 비즈니스 계정 가입 후 PortOne V2 연동 절차와 해외 결제 구현 요청.
- USD로 청구: 기존 원화 가격을 주문 준비 시 최신 공표 환율로 환산하고 결제 전에 USD 표시.
- 2026-10-03: "방금 페이팔 실운영 승인이 났으니까 실제 결제에 페이팔도 연동해줘".
- 실운영 설정과 운영 승격 1회는 승인됐다. 실결제 테스트, 환불, 유료 LLM, 검증을 위한 운영 DB 쓰기는 승인되지 않았다.
- 재개 채팅에서 "기존 사주 번역 오류도 수정하고 CI 통과 후 운영 승격 진행" 답변으로 범위 확대가 승인됐다.
- 같은 채팅에서 "기존 public 미러도 갱신하고 CI 통과 후 운영 승격 진행" 답변으로 기존 미러 오류의 수정도 승인됐다.

## 완료한 작업

- PortOne 전용 PayPal 온보딩 연결 완료 화면 확인. 추가 가입 완료 메일은 발송하지 않았다.
- PortOne 실연동 채널 CodeDestiny PayPal SPB 생성 완료.
- Cloudflare code-destiny-web production에 PORTONE_PAYPAL_CHANNEL_KEY, PAYPAL_ENABLED=1 암호화 secret 저장 완료. Save를 사용했으며 수동 배포는 하지 않았다. 값은 문서·코드·로그에 넣지 않는다.
- 서버가 Frankfurter/ECB의 최신 공표 KRW/USD 환율을 조회해 USD cents를 계산한다. 주문의 첫 환율과 금액을 metadata.paypalCharge에 고정하며 원화 가격·이용권·월정석·단건 정책은 유지한다. 환율 실패 시 PayPal 주문을 만들지 않는다.
- 공통 결제 선택 표, 정적 셸, 독립 상세 화면, 이용권 PointsClient, 서비스팩에 PAYPAL_SPB 버튼과 USD 사전 표시를 연결했다.
- 공유 서버 confirm/webhook에서 paymentId·USD cents·통화·상점·정확한 PayPal 채널을 검증한 뒤 기존 권한 CAS를 사용한다. 미승인 상태에는 권한을 지급하지 않는다.
- 환불 API에는 저장된 USD cents를 사용한다. 국내 결제 금액과 정책은 유지한다.
- PayPal 공식 HTTPS 리소스의 CSP 허용, 디지털 상품 STC의 기존 구매자 ID/이메일 전달, 12개 로케일 문구를 추가했다.
- 원격 main 코드 커밋: c06e027de62d494ef64ac02b35ce499a96fb6066 및 65e7e8dfc28794931455e1887305db9c2ded4382. 둘 다 push 완료.

## 검증

- npm run check:fast -- --plan / npm run check:fast: 결제 위험 변경으로 자동 승격. 88개 중 87개 통과, npm test의 기존 node 검사 실패로 전체 실패.
- 전체 Jest: 330 suites / 4,936 tests 통과. 이후 STC/CSP 보완은 PayPal targeted 2 suites / 10 tests 통과.
- node suite: 최초 2,324개 중 2,322개 통과. 사이트맵 날짜와 사주 번역 검사만 실패. 최신 upstream의 사이트맵 갱신 후 날짜 검사는 통과하고 사주 번역 불일치 1개가 남았다.
- 변경 파일 eslint, npm run typecheck, npm run build:worker (dry-run), git diff --check 통과.
- PortOne single-payment, payment-choice-parity, payment-freeze, checkout-pass 및 refund 회귀 검사 통과.
- 데스크톱/390px 모바일은 mock SDK로 USD 표시를 확인했다. 실 SDK 버튼, 실제 결제, 실물 기기 결제 검증은 수행하지 않았다.
- 정확한 코드 SHA main CI: https://github.com/rei1237/codedestiny/actions/runs/37105341663
- Paid Flow Gates: https://github.com/rei1237/codedestiny/actions/runs/37105341691

## 차단과 다음 단계

운영 승격은 미실행이다. 기존 main의 사주 번역 검사 실패를 재현하고 수정했다: index.html의 result.ilju.balanceTitle과 public/i18n/ko.json을 "오행 균형도"로 일치시켰다. PayPal 변경 전 CI 37103732126에서도 동일 실패가 확인됐다. 검사를 끄거나 실패를 성공으로 취급하지 않는다.

범위 확대 승인 후 i18n/authored/shellCopy-14.json에 기존 12개 언어 제목을 등록하고 기존 merge 스크립트를 사용했다. 실제 생성 사전 변경은 한국어 제목의 이모지 제거 한 줄이다. 생성 과정에서 재적용된 기존 홈 문구 3개는 원상태로 보존했다. node --test __tests__/ui/shell-dictionary-parity.static.test.js는 수정 전 3/4, 수정 후 4/4 통과했다. 결제·인증·API·DB 로직은 이 수정에서 변경하지 않았다.

재개 검증: git diff --check와 npm run verify:doc-freshness 통과. npm run check:fast -- --plan은 저작 파일 변경을 critical로 자동 승격했다. npm run check:fast는 결제 게이트 실행 도중 프로세스가 종료되어 전체 완료를 확인하지 못했다(exit -1). 로컬 전체 통과로 기록하지 않으며 정확한 수정 SHA의 공식 main CI 결과를 확인한다.

코드 CI 37105341663과 인수인계 CI 37105736682는 동일 번역 오류로 실패했고, PayPal 코드의 Paid Flow Gates 37105341691은 통과했다. 9110be6bce18abd664b5a9b2f1e3dd9072a81bab의 origin/main 포함을 확인했으며 최신 main을 안전 워크트리에 fast-forward했다.

번역 수정 커밋 17203bcae230e7a70dd9df56941e8b42be1057ba는 main push 완료. 이후 발견한 미러 불일치는 이 수정 이전 main CI 37107283912에도 있던 기존 오류였다. 승인 후 npm run sync:public으로 10개 파일의 자산 캐시 키만 갱신했다(각 1줄, 기능 로직·문구·정책 변경 없음). 번역 회귀 4/4와 verify:payment-freeze를 다시 통과했다. 최신 미러 갱신 커밋의 main CI 통과 후 운영 승격을 1회 실행한다.

동시 작업 때문에 안전 워크트리에서 개발했다. 공유 main에는 다른 세션의 staged/unstaged 변경과 로컬 분기된 커밋이 남아 있어 직접 병합하지 않고 검증된 작업만 HEAD:main으로 push했다. reset/stash/restore로 공유 변경을 지우지 않는다. main이 안전하게 정리된 뒤 이 커밋들을 포함하도록 병합하고 워크트리를 배수한다.

CI 통과 시 이미 승인된 운영 승격을 한 번 실행한다:

```powershell
gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production
```

docs/context/delivery-and-ci.md의 운영 승격 계약에 따라 dispatch 뒤 운영 run을 poll/watch/log 하지 말고 실행 링크를 보고한다. 추가 승격은 새 요청이 필요하다. 정산용 은행 연결은 사용자가 PayPal에서 직접 진행해야 한다.

롤백은 PayPal 커밋만 revert하거나 운영 PAYPAL_ENABLED=0 설정이다. 다른 세션의 커밋을 함께 되돌리지 않는다.

## 재개 정보

- 작업 디렉터리: D:\Development\codedestiny-worktrees\paypal-usd-20261003-151024
- 문서: D:\Development\codedestiny-worktrees\paypal-usd-20261003-151024\docs\handoff\2026-10-03-paypal-portone-v2.md
- 기존 PayPal 코드 SHA: 65e7e8dfc28794931455e1887305db9c2ded4382 (origin/main push 완료)
- 기존 인수인계 SHA: 9110be6bce18abd664b5a9b2f1e3dd9072a81bab (origin/main 포함 확인)
- 다음 행동: 승인된 제목 수정의 검증·commit·main push 후 정확한 SHA CI 통과를 확인하고 운영 승격을 1회 실행한다. 승격 실행 뒤에는 실행 링크만 보고하고 run을 poll/watch/log 하지 않는다.

화면 증거와 세션 상태: C:\Users\user\.codex\visualizations\2026\10\03\01a1005c-ff97-7793-9650-d9c0695fb85b\paypal-session-state.txt. PayPal 연결 및 Cloudflare 설정 화면, mock USD 화면을 같은 폴더에 보관했다. 임시 preview 서버는 종료했고 브라우저 viewport는 복원했다.
