---
status: active
updated: 2026-10-02
next: "재판정 91건 적용 완료 — 아래 「사용자 결정 대기」 STALE 23건의 유지·폐기를 사용자에게 받아 폐기분은 삭제(인바운드 링크 함께), 유지분은 그대로 둔다"
---

# 활성·차단 인수인계 재판정

## 왜

사용자: "후속 과제, 특히 활성 인수인계 문서 중에서 필요없는것들은 삭제해주길 바란다" — 10-02 1차 정리 뒤 남은 활성 문서의 재판정을 이어서 요청.

## 지금 상태

- 10-02 정리 2회 완료: `0ce7810f1`(활성·차단 64 삭제, 19 done 전환) · `b27ee330a`(오래된 done 26 삭제). 지운 문서는 `git log --diff-filter=D --name-only -- docs/handoff`.
- 남은 것(10-02 실측, `_TEMPLATE` 제외): active 96 · blocked 7 · done 39. active·blocked 중 마지막 커밋 09-30 이전 89개(가장 오래된 08-29).
- 🔴 1차의 "유지" 92개는 **문서 본문에 남은 작업이 적혀 있다**는 이유였다 — 그 작업이 이미 코드에 들어갔는지는 확인하지 않았다. 이번 재판정의 핵심이 그 실측이다.

## 2차 재판정 결과 (10-02, 91건)

대상: 09-30 이전 89건 + 날짜 누락으로 빠졌던 `expert-consulting-premium-ux-2026-09-08.md`·`운기 다이어리 앱.md`. 판정표 전문은 이 변경의 커밋 메시지.

- 삭제 7: app-social-login-return-path-2026-08-30 · basic-fortune-library · love-code-permanent-unlock-2026-09-08 · 2026-09-09-past-life-webtoon · home-yehwa-motifs-pr3 · yeongnyangi-seo-1000won-2026-09-16 · threads-daily-split-2026-09-17. 남은 링크는 이력 기록(SEO-CHANGELOG·done 문서)뿐이라 두었다.
- done 9: gsc-index-coverage-2026-08-30 · android-web-sync-2026-08-29 · growth-plan-2026-08-30 · human-design-report-generation-fix · global-payment-readiness-20260909 · yeongnyangi-mongodb-integration · service-reform-20260920 · 2026-09-27-llm-length-never-fatal · 2026-09-28-yeongnyangi-tier-chapters.
- 유지 75: 전부 `updated: 2026-10-02` 와 현재 코드 기준 `next` 로 갱신. 이 중 아래 23건이 STALE.

### 사용자 결정 대기 — STALE 23건 (한 달 넘게 실질 진척 없음·미배정)

- `fortune-weekly-monthly-reindex-2026-08-28.md` — 월 범위 기준일(그 달 1일 vs 절입일)을 사용자가 정한 뒤 lib/fortune/range-data.ts loadMonthRange 수정
- `home-cls-and-brand-seo-2026-08-29.md` — 남은 CLS 5건(GlobalHeader 메뉴·useHumanDesignLocale·#sySoloAiConsultCard·SeoLandingBirthForm·찻집 배지)을 field 데이터로 재측정해 남는 것을 home-perf-cwv-2026-09-07 로 옮기고 done
- `mobile-fling-catch-arbiter.md` — verify-mobile-cdp-smoke 에 synthesizeScrollGesture 뒤 pageYOffset>100 단언을 먼저 넣어 재현한 다음 gesture-arbiter 수정
- `monetization-free-paid-boundary.md` — 사용자가 Tier A / Tier B / free-quota 중 우선순위를 고른다
- `system-comparison-docs-2026-08-16.md` — 남은 2편(astrology-vs-myeongri·tarot-vs-saju)을 insights 가 대신한 것으로 보고 종료할지 사용자 확인 — 종료면 done(app/compare 인용)
- `human-design-fixture-expected-values.md` — 사용자가 외부 차트를 주면 기대값을 넣고 fixture 로 옮긴다(그때까지 blocked)
- `llm-prompt-json-slicing.md` — 사주는 대상에서 빼고(캐싱으로 해소) vedic·astrology·신년 프롬프트 크기를 먼저 잰 뒤 계속할지 사용자와 정한다
- `service-exposure-audit-2026-08-24.md` — §3(LocaleFooterHub 환불 섹션)·§5-2(famous-saju-aliases)·§5-4(geomancy-oracle-v4 인라인 스크립트) 3건만 git grep 으로 확인해 닫는다
- `reengagement-email-blocked-2026-08-28.md` — 선결조건(일일 메일)은 #1524 로 풀림 — 사용자와 갈래 A(lastClickAt) 또는 B(marketingConsent) 중 하나를 정해 착수
- `novel-full-audit-2026-09-02.md` — 사용자 판단 3건(사자 색·리더 im/skill 미렌더·죽은 자산)을 받고, 착수 전 447bf6d6b·18a8e7d21 확장에 맞춰 비트 수·자산 사용 여부 재계산
- `pass-tier-price-cap-leak.md` — 사용자에게 열린 기능명 확인 → resolveLegacyPricingResult 가격 출처 확인 → legacy·v3 standard 로 건당 상한 초과 진입을 mock 재현
- `detail-sheet-copy-rewrite.md` — 결함 1번(saju-guardian-unlock 영구 해금 누락, worker/routes/fortune.js:2508)부터 사용자 결제 판단을 받는다
- `gateway-yeon-peony-crown-illustration.md` — 사용자 일러스트(또는 승인 시 codex-image)로 public/images/fortune-tea-house/yeon-peony-crown.webp 교체 → sync:public
- `locale-text-fit.md` — index.html normalizePaymentOverlayBody 를 i18n 키 동일성 판정으로 교체(결제 셸 — payment-freeze 절차)
- `prompt-hub-followups.md` — 사용자 보류 — 재개 지시가 오면 퀴즈 UI 목업 발행부터
- `content-translation-2026-08-25.md` — 3b: LoveCharacterStorySection.tsx 렌더 대상 확인 뒤 캐릭터 N명 단위로 i18n/authored/loveSimulation-04.json 에 저작한다(03 은 사용 중)
- `global-i18n-audit-remaining.md` — NewYearAiClient.tsx·SukuyoCompatibilityAiClient.tsx 본문 텍스트 로케일화(지금은 aria/title 만) 또는 §4 no-fallback-baseline +11 원인 추적부터
- `inp-round3-2026-08-16.md` — §6-4: window-capture/document-capture/document-bubble 3단계 프로브로 '최근 이용' 기록이 끊기는 단계를 CDP 터치 1회·합성 클릭 1회로 특정
- `locale-service-optimization-2026-08-25.md` — app/_lib/moonlight-store-snapshot.ts 메시지 4개 로케일화 → animal-destiny Hero·연출 3종을 _lib/copy.ts 키로 이전
- `locale-sweep-2026-08-24.md` — §7-A /naming-ai 부터 §4-1 로 재측정 후 §5 절차로 저작 — 착수 여부는 사용자 결정
- `payment-auth-p0-fixes.md` — P0-4c: app/_lib/auth-client.ts:397 sessionStorage.clear() 를 인증 키만 지우게 변경(RED 선보고) — withMongoRetry·P1·[vars] 는 PAYMENT_AUTH_RELIABILITY_PLAN_2026-08-15.md 근거로 사용자 결정
- `seo-followups-2026-08-27.md` — 사용자에게 한 번에 묻는다: §2-4 몰입형 셸 7라우트·§1-4(b) 허브 카드 문구·§4 ETag — 셋 다 보류면 done 으로 보존(재시도 금지 근거)
- `ganji-wallclock-parts-migration.md` — 사용자에게 별건-3 선택지 1(ziwei-ai·life-book-ai·sukuyo-compatibility-ai 에 calculationVersion+엔진 지문 lock) 승인 여부를 묻는다 — 거절이면 선택지 3 으로 정하고 done

## 남은 작업

- [x] 89개를 축별(결제·영냥이·SEO·성능·LLM·기타)로 묶어, 문서마다 남은 항목을 `git log -S`/`git grep`/파일 존재로 대조한다.
- [x] 판정(1차와 같은 규칙):
  - 남은 항목이 다 반영됨 → 코드·설정·런타임이 인용하거나(R1) 현행 문서가 근거·결정 출처·절차·재시도 금지로 가리키면(R2) `status: done` + `next: "완료 — <인용처> 근거로 보존"`, 아니면 삭제(R3).
  - 대체·폐기됨 → 삭제(R3). 링크가 이력 기록(changelog·verification·done 문서)에만 있으면 링크는 둔다.
  - 진짜 미완 → 유지하되 `updated`·`next` 를 지금 실행 가능한 한 줄로 갱신.
- [x] "끝" 기준: 89개 모두 판정표(문서·판정·근거 `파일:줄`)가 커밋 메시지에 남고, 유지 문서의 `next` 가 현재 코드와 맞는다.

## 함정

- freshness 4문서가 링크하는 인수인계는 지우면 링크도 함께 고친다: BASELINE 18·41·42·88·89·94·95행, CONTEXT_AUDIT 211·219·231행. `verify:doc-freshness` 가 깨진 링크를 잡는다.
- `competitiveness-roadmap-20260923.md` §「인수인계 문서 상태」(192행~) 표에 이름이 있으면 같은 커밋에서 표를 고친다.
- `docs/payments/payment-inventory.json` 의 handoff 경로는 09-08 스냅샷이다 — 읽는 코드가 없고 수정 금지.
- 메모리(`~/.claude/projects/d--Development-code-destiny/memory/`)가 가리키는 문서는 지운 뒤 경로 옆에 "(10-xx 삭제, git 이력에 있음)".
- `index.html` 주석 인용은 public 미러 7개에도 있다 — grep 은 미러까지 본다.
- 결제 축 문서는 상태만 바꾼다. 결제 코드·동결 파일은 이 작업 범위가 아니다.
- 동시 세션이 많다 — 워크트리에서 작업하고, 로컬 main 에 남의 미push 커밋이 있으면 ff 하지 말고 `origin/main` 위에서 `git push origin HEAD:main`.

## 검증

```
node scripts/verify-handoff-contract.mjs
npm run verify:doc-freshness
npm run check:fast -- --base=<작업 시작 SHA>
```

## 모르는 것

- 미완이지만 한 달 넘게 아무도 손대지 않은 문서(로드맵의 "활성·세션 미배정" 등)를 지울지 — 사용자 결정. 목록을 만들어 묻는다.
