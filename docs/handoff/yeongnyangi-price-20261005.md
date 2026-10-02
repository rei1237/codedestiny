---
status: active
updated: 2026-10-02
next: "docs/handoff/yeongnyangi-price-20261005.md 의 '10/5 당일 절차'대로 워크트리 B 의 영냥이 정식 가격을 main 에 머지·push 하고 스테이징 검증까지 진행해줘. RED 이니 위험·검증·롤백을 먼저 보고하고, 운영 승격은 범위를 다시 보여 준 뒤 내 승인을 받아"
---

# 영냥이 정식 가격 시행 (2026-10-05)

## 왜

체험가(고등어 1,000원~)로는 공유·유입이 적은 지금 수익이 거의 없다. 사용자 원문:

- "딱 10월 5일부터 영냥이 상담 가격을 새롭게 논의한 가격으로 업데이트해서 그 가격으로 상담받을 수 있도록하고 영냥이 이용권 가격도 그에 맞게 가격을 인상시켜줘"
- "가격을 높히는만큼 영냥이 이용권의 혜택은 더 커지는 편이 나을것 같다"
- "그때부터는 천원 운세가 이날 9900원 운세로 설명도 바꿔야할것 같다"
- (같은 날 수정) "가격 차이가 너무 심한데 연어 17900, 광어 23900, 참치 34900, 모둠 49000, 오마카세 99900원으로 가격을 변경해줘 그리고 생선팩 가격도 그에 맞도록 가격을 조정해주도록하고 10월 5일부터 반영되도록해줘 인수인계 문서 만들어서 진행하는게 낫겠다"

결정(2026-10-02): 날짜 분기 코드 없이 **10/5 당일 배포·승격**. 팩 할인 20/30/40%·30일. `/yeongnyangi/1000-won-fortune/` URL 은 유지하고 문구만 '9,900원 운세'. 체험가 종료는 지금부터 "10월 4일까지" 고지(이미 main).

## 최종 가격표

단건(`worker/lib/paid-feature-registry.js`, 클라이언트는 `worker/yeongnyangi/payments/catalog.ts` 로 파생):

| | 고등어 | 연어 | 광어 | 참치 | 모둠(3종 각) | 오마카세 |
|---|---|---|---|---|---|---|
| 지금(체험가) | 1,000 | 3,000 | 5,000 | 10,000 | 20,000 | 50,000 |
| 10/5~ | **9,900** | **17,900** | **23,900** | **34,900** | **49,000** | **99,900** |
| 월정석 | 4,950개 | 8,950개 | 11,950개 | 17,450개 | 24,500개 | 49,950개 |
| 앱 코인 | 99 | 179 | 239 | 349 | 490 | 999 |

생선 팩(`worker/payments/service-pack-policy.js`, `-v3`, policy `yeongnyangi-pack-20261005`, 30일, 같은 생선 전용, 웹 PG 전용):

| | 5회(20%↓) | 10회(30%↓) | 20회(40%↓) |
|---|---|---|---|
| 고등어 | 39,600 | 69,300 | 118,800 |
| 연어 | 71,600 | 125,300 | 214,800 |
| 광어 | 95,600 | 167,300 | 286,800 |
| 참치 | 139,600 | 244,300 | 418,800 |

## 지금 상태 (2026-10-02)

- **main(배포됨)**: 체험가 배너가 "체험가는 10월 4일까지, 10월 5일부터 정식 가격"을 고지한다. 취소선 '정식 오픈 예정가'(`lib/brand/launch-offer.ts` `plannedPriceKRW`)는 위 10/5 가격으로 맞춰 두었다. 실결제가는 아직 체험가다.
- **워크트리 B (main 미머지, push 안 함)**: `D:\Development\codedestiny-worktrees\yn-price-1005-20261002-161442`, 브랜치 `wt/yn-price-1005-20261002-161442`.
  - 89f56bf41 가격·이용권·문구 코드 / 0cd324690 결제 문서 / 754e193d2 origin/main 머지 / f85915c7a 가격 재조정(17,900~99,900)
  - 내용: 레지스트리 단건가, 팩 20/30/40% `-v3`, 기존 팩 보호(`servicePackCoverage` 는 `0 < 스냅샷 단가 ≤ 현재가`면 같은 생선에 적용), `PRICE_CHANGED` 안내 고정 금액 제거, `launch-offer` `active:false`, '천원 운세'→'9,900원 운세' 문구(URL 유지), 앱 SKU 실패 폐쇄, 결제 문서 10-05 절.
  - 🔴 B 는 이 PC 로컬에만 있다(브랜치 push 금지 규칙). 워크트리를 지우지 않는다.
- 검증(10/2, mock): `npm run check:fast` 통과(paid-gate 88/88, jest 전체), 결제 jest 11스위트 314/314, `verify-app-store-pricing` 통과, 영냥이 UI node --test 통과. dev 화면(390/1280)에서 영냥이 홈·9,900원 페이지에 새 가격만 보이고 체험가·천원 0건. 팩 카드·결제창은 mock 에서 카탈로그 402·로그인 리다이렉트라 **화면 미검증**(서버 테스트만).

## 10/5 당일 절차

KST 10/5 에 사용자 요청으로 시작한다. 배너가 "10월 4일까지"라 10/5 중 어느 시각이든 약속 위반이 아니다(늦을수록 사용자에게 유리할 뿐).

1. 메인 체크아웃 `git status` 로 옆 세션 미커밋 확인. B 에서 `git fetch origin && git merge origin/main`. 충돌 시 결제 문서는 양쪽 절 보존, invariance 표는 main 표 기준으로 id/prepare(1·2번째 해시)만 재생성(`YEONGNYANGI_INVARIANCE_PRINT=1 node --test __tests__/ui/yeongnyangi-reading-invariance.test.mjs`).
2. B 에서 `npm run sync:public` → `npm run sitemap:generate` → `npm run llms:generate` 후 미러·원장 변경을 커밋.
   - 10/2 이후 main 에 영냥이 리딩 커밋(84fa9b160 반말/존댓말 등)이 계속 오르고 있어 invariance 표·문구 파일 충돌이 예상된다. 요청 본문 해시(3번째 이후)가 바뀌면 그건 main 쪽 변경이니 main 값을 따른다.
3. B 에서 `npm run check:fast` (jest 는 동시 실행 금지. mongoose `UNKNOWN: read` 는 I/O 헛실패라 그 스위트만 단독 재실행. 10/2 에 `verify:ziwei-deep-report-flow` 안의 `__tests__/ui/ziwei-deep-paid-delivery.behavior.test.js` 가 2회 'test failed' 로 떨어졌다가 단독 4회 통과 — 가격 무관 간헐 실패로 보고 단독 재실행 후 남은 단계를 이어 돌렸다).
4. `git push origin HEAD:main` → main `CI required` 통과 확인.
5. 결제 변경이라 `npm run verify:staging -- --sha=<40자리 SHA>`. 스테이징에서 직접 확인: `/yeongnyangi/` 생선 가격, `/yeongnyangi/1000-won-fortune/` 제목·가격표, 팩 카드 12종 가격, 결제창 금액(실결제 금지 — 금액 표시까지만).
6. **운영 승격 범위 재확인**: 마지막 승격 이후 main 에 오른 다른 세션 커밋 목록을 보여 주고 1회 승인을 받는다. 승인 뒤 승격 → `npm run verify:release`.
7. 이 문서 `status: done`, 결제 문서·`CURRENT_DEV_BASELINE` 에 시행 사실 기록.

## 롤백

가격 커밋만 `git revert`(89f56bf41·f85915c7a, 10/5 머지 뒤 생긴 미러·원장 커밋 포함) 후 push·재승격. force-push 금지. 롤백 사이에 팔린 `-v3` 팩은 저장된 `packSnapshot` 가격대로 유지되고, 결제 확정도 스냅샷을 쓰므로 진행 중 주문이 깨지지 않는다. 롤백 후 단가가 팩 스냅샷 단가보다 낮아지면 그 팩은 `servicePackCoverage` 에서 적용되지 않으므로(상한 검사) 롤백 시 판매분이 있으면 별도 조치가 필요하다.

## 사람 손 작업 (Play Console)

앱(Google Play)에는 새 가격대 SKU 가 없어 영냥이 상담 앱 결제는 `APP_SKU_NOT_VERIFIED`(503)로 **실패 폐쇄**된다(웹 결제는 정상). 앱에서 팔려면 콘텐츠 SKU 6개 등록 후 `worker/lib/app-store-pricing.js` 티어 추가·`APP_UNVERIFIED_CONTENT_COIN_PRICES` 에서 제거: 9,900 / 17,900 / 23,900 / 34,900 / 49,000 / 99,900원. 절차는 `docs/pricing/PLAY_CONSOLE_TASKS.md`.

## 알려진 위험·범위 밖 (보고만, 미수정)

- 상담가가 최대 약 10배 오른다. 전환 하락은 사용자 판단 사항.
- `-v2` 이전 팩은 단가 상한만 있어 오래 남은 선물 팩(1년+30일)도 인상 뒤 계속 적용된다. 보유 배지 미표시(`ServicePacks.tsx`).
- 9,900원 페이지 FAQ 의 "월정석 적용 안 됨"은 레지스트리(월정석 허용)와 다르다. `index.html` 영냥이 소개 문단은 월정석을 빠뜨린다.
- 연이·네오 채팅 3,000원은 생선 단계가 아니라 그대로. SoulCat 미러 카탈로그(`server/payments/catalog.ts`)는 이미 불일치.
- Yeongnyangi Browser Shadow CI 는 10/2 이전부터 실패(shadow, 비차단).
