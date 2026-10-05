---
status: done
updated: 2026-10-05
next: "완료. 운영 d4a2c8a19 승격·verify:release 통과(10-05). 남은 것은 Play Console SKU 등록(사람 손)과 폐기안 브랜치 2개 삭제 여부 사용자 확인뿐이다."
---

# 영냥이 정식 가격 시행 (2026-10-05)

## 왜

체험가(고등어 1,000원~)로는 수익이 거의 없다. 10-02 에 고등어 9,900원 체계를 준비했으나 10-04 에 바꿨다. 사용자 원문:

- "9900원까지 올리는것은 너무 가파르기 때문에 아닌것 같고 고등어 기준 2990원으로 설정하고 나머지도 그에 맞게 영냥이 이용권까지 가격을 같은 비율로 계산해서 결정한 이후에 작업 후 운영 승격까지 진행시켜줘"
- "천원 운세라는 단어를 쓰기 위해서라도 일부 서비스는 천원으로 이용할 수 있도록 해줘 예를들면 재밌는 사주 콘텐츠들이 좋겠다."
- "앱에서도 천원이더라도 돈은 받도록 수정해"

결정(10-04): 직전 확정표(9,900 체계) × 0.302, 100원 단위(코인 정수 유지라 2,990 대신 3,000). 승격은 10/5 0시 KST 이후. 천원 콘텐츠는 리포트 카드 5종 + 달빛 럭키 리추얼. 9,900 체계 워크트리 B 는 머지하지 않고 폐기.

## 최종 가격표

단건(`worker/lib/paid-feature-registry.js`):

| | 고등어 | 연어 | 광어 | 참치 | 모둠(3종 각) | 오마카세 |
|---|---|---|---|---|---|---|
| 체험가(~10/4) | 1,000 | 3,000 | 5,000 | 10,000 | 20,000 | 50,000 |
| 10/5~ | **3,000** | **5,400** | **7,200** | **10,500** | **14,800** | **30,000** |
| 코인 / 월정석(1개=10원) | 30 / 300 | 54 / 540 | 72 / 720 | 105 / 1,050 | 148 / 1,480 | 300 / 3,000 |

생선 팩(`-v3`, policy `yeongnyangi-pack-20261005`, 30일, 같은 생선 전용, 웹 PG 전용):

| | 5회(20%↓) | 10회(30%↓) | 20회(40%↓) |
|---|---|---|---|
| 고등어 | 12,000 | 21,000 | 36,000 |
| 연어 | 21,600 | 37,800 | 64,800 |
| 광어 | 28,800 | 50,400 | 86,400 |
| 참치 | 42,000 | 73,500 | 126,000 |

천원 사주 콘텐츠(10코인, 1,000원, 영구 해금, LLM 없음): 나의 매력 클래스 `rpt_specialCharmCard` · 인생 스킬 트리 `rpt_skillTreeCard` · 사주로 보는 여행지 `rpt_energyCoordCard` · 빌런 블랙리스트 `rpt_villainCard` · 시크릿 하우스 `rpt_secretHouseEntryCard` · 달빛 럭키 리추얼 `fun.quantumLotto.ritualReport`. 진입은 무료 사주 결과의 리포트 카드. 이용권 최저 커버 30→10코인.

## 커밋 (워크트리 `D:\Development\codedestiny-worktrees\yn-price-3000-20261004-235305`)

- C1 c03fc3520 영냥이 3,000원 체계·팩 -v3·체험가 종료·미러
- C2 7059a967a 천원 콘텐츠 6종·MIN_PASS 10·앱 무료 통과 거부(`isAppFreeFeature`)
- 2a579744e core 사전(shellCopy·homeQuestions) 재병합·월정석 할인 테스트 PG 하한
- C3 b8c95a1af 문구: `/yeongnyangi/1000-won-fortune/` 를 천원 사주 콘텐츠 허브로(URL 유지), 홈·랜딩 다음 단계·엔티티 레지스트리 문구
- C4 5d7e8f13d 문서: payment-gating 10-05 절, payment-policy-flow, CONTEXT_AUDIT, play-billing-app, PLAY_CONSOLE_TASKS, 이 문서
- 8d283cd5d 천원 허브·홈 meta description 을 SERP 폭 160 안으로(첫 push d8bd2d268 이 CI adsense-readiness 에서 181·167>160 으로 실패 — check:fast 는 이 빌드 가드를 안 돈다)
- 4e8181f99 머지 뒤 정적 셸 캐시 키 재생성. main CI required·Build·Deploy staging 성공, `verify:staging` PASS(Pages·Worker 4e8181f99), 스테이징 허브·영냥이 홈 HTML 에 새 가격만(9,900·체험가 0건)

## 남은 절차

1. ~~main 머지·push·CI~~ 완료(4e8181f99).
2. ~~verify:staging~~ 완료.
3. ~~운영 승격~~ 완료(10-05 12시경 KST). 사용자 재승인 2회: 결제 카탈로그 동기화(c63aa9f09 표시명·59a81fcc1 문서) push 뒤 한 번에 → 작명 v2 기본 화면(5249779df)이 섞여 작명 세션 verify:staging PASS 뒤 한 번에. 범위 운영 2710b06f2 → d4a2c8a19(비머지 약 145커밋, 다른 세션 작업 포함). run 37258689540 success(롤백 skipped), drift in-sync(Pages·Worker d4a2c8a19), 운영 /yeongnyangi/ 3,000원·5,400원, 천원 허브 1,000원, 체험가 문구 0. `npm run verify:release` EXIT 0(로컬 체크아웃 기준 정적 검사).
4. ~~이 문서 `status: done`~~ 완료. 워크트리 A·B·현재(yn-price-3000)는 10-05 에 정리했다. 남은 것: 머지 안 된 폐기안 브랜치 `wt/yn-price-1005-20261002-161442`(9,900 체계, 8커밋)와 `wt/yn-trial-ends-notice-20261002-160254` — 사용자 확인 뒤 `git branch -D`.

## 롤백

가격 커밋만 `git revert` 후 push·재승격. force-push 금지. 롤백 사이 팔린 `-v3` 팩은 `packSnapshot` 가격대로 유지. 천원 콘텐츠를 되돌리면 `MIN_PASS_COVERABLE_COIN`·`FAMILY_MIN_PASS_COVERABLE_COIN` 도 30 으로 함께 되돌린다.

## 사람 손 작업 (Play Console)

앱은 새 가격대 SKU 가 없어 실패 폐쇄(`APP_SKU_NOT_VERIFIED` 503, 웹 정상): 영냥이 ₩5,400·₩7,200·₩10,500·₩14,800, 천원 콘텐츠 ₩1,000(Play KRW 하한으로 가능한지 미확인 — `docs/play-billing-app.md` 는 과거에 불성립으로 적었다). 등록 후 `worker/lib/app-store-pricing.js` 티어 추가. 절차는 `docs/pricing/PLAY_CONSOLE_TASKS.md`.

## 알려진 위험·범위 밖 (보고만, 미수정)

- `-v2` 이전 팩은 단가 상한만 있어 오래 남은 선물 팩도 계속 적용된다. 보유 배지 미표시(`ServicePacks.tsx`).
- 천원 허브 FAQ "월정석 적용 안 됨" 문구와 레지스트리(허용) 불일치. `app/channel/page.tsx:16` 도 같은 문구.
- 이용권 최저 커버 10코인 부작용(코드 읽기 추정): 잔여 10~29코인 이용권이 종료되지 않고 만료까지 남아 그동안 하위 등급 구매가 `DOWNGRADE_BLOCKED`. 잔여로 쓸 수 있는 건 천원 콘텐츠뿐.
- 달빛 럭키 리추얼은 사용자 단위 영구 해금 목록에서 제외(`worker/routes/billing.js:2535`) — 재열람 여부 미확인이라 허브 문구에서 재열람 주장을 뺐다.
- 월정석 혼합 결제는 PG 잔액 1,000원 하한 때문에 고등어(3,000원)에서 최대 200개까지만 쓸 수 있다. Threads "500개=5,000원 할인" 예시는 고등어에 성립하지 않는다.
- 연이·네오 채팅 3,000원은 그대로. SoulCat 미러 카탈로그 불일치.
- Threads 10/5 게시 자료(다른 세션, `docs/handoff/threads-moonstone-20261005.md`)는 9,900/4,900원 예시를 쓴다 — 게시 전 3,000원 체계로 고쳐야 한다.
- Yeongnyangi Browser Shadow CI 는 10/2 이전부터 실패(shadow, 비차단).
- 천원 콘텐츠(unlock) 이용권 경로는 소유 조회 DB 읽기 1회가 추가된다.
