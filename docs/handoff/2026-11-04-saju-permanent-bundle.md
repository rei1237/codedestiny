---
status: active
updated: 2026-11-05
next: "RED 위험과 검증 결과를 사용자에게 보고한 뒤 main push, 프로덕션 승격은 별도 1회 승인, 승격 전에 Play Console에 cd_content_tier_19를 등록한다"
---

# 사주 영구 묶음 (무료 만세력 + 29,000원 평생 소장)

## 왜

사주를 만세력 무료와 유료 묶음 하나로 정리했다. `saju_lifetime_bundle`(사주 전체 풀이 평생 소장)은 29,000원, 290코인, 앱 SKU `cd_content_tier_19`인 출생 기반 영구 해금이다. 상품 규칙과 키 목록은 `docs/context/payment-gating.md`의 "2026-11-04 사주 영구 묶음"과 `worker/lib/saju-bundle-policy.js`가 정본이다.

## 지금 상태

- Task 1~7 구현과 main 통합이 브랜치 `wt/saju-permanent-bundle-20261104`에 커밋되어 있다. main push와 프로덕션 승격은 아직 하지 않았다.
- 통합 기준점은 `869bdba4e`다. 이후 origin/main이 8커밋 앞서 갔고, `git merge-tree` 기준 `config/sitemap-lastmod.json`, `vedic-astrology.html`, `public/vedic-astrology.html`에서 충돌한다. push 전에 다시 합쳐야 한다. 앞의 둘은 재생성, `public/`은 `npm run sync:public`로 푼다.
- 되돌리기: 통합 뒤 묶음 변경을 `git revert`한다. 이미 산 묶음 권리 행은 남으므로, 판매만 멈출 때와 권리까지 다룰 때를 나눠 사용자에게 먼저 묻는다.

## 사람이 직접 할 일

### Play Console `cd_content_tier_19` 등록

`docs/pricing/PLAY_CONSOLE_TASKS.md`와 `docs/play-console-submission-values.md`를 따른다. 등록 전까지 앱에서 이 상품만 503(티어 미등록)으로 막힌다. 웹 결제는 영향이 없다. 폐기 SKU는 재사용하지 않는다.

앱 사용자는 이 등록 전까지 개별 판매가 닫힌 키도 묶음도 살 수 없으므로, **프로덕션 승격 전에 등록을 끝내는 편이 맞다.** 순서가 바뀌면 그동안 앱 안에서 사주 유료 풀이 판매가 멈춘다.

## 알려진 한계

### 공개 JS로 볼 수 있는 내용

서버 배달로 옮긴 것은 원국 풀이와 대운 등 묶음 본문이다. 아래는 브라우저 계산이나 공개 파일로 남아, 코드를 뜯으면 결제 없이 볼 수 있다. 화면 잠금은 있지만 기술적 차단은 아니다.

- 뇌구조: 브라우저 계산 카드와 `hd-copy.generated.js`(휴먼 디자인 해석 문구)
- 재미 콘텐츠: 로또 리포트, 테토·에겐 등 브라우저 계산 카드
- 일반 문장: `sajuElementReading` 3문장, `public/i18n`의 `sajuReading` 원소 단위 문장

매출에 영향이 보이면 서버 배달로 옮기는 후속 작업을 잡는다.

### 균일가와 합칠 때

이 통합 시점 main에는 `worker/lib/light-fortune-catalog.js`가 없어 교집합을 확인하지 못했다. 균일가를 합치는 사람은 `light-fortune-catalog`와 `SAJU_BUNDLE_SALE_CLOSED_KEYS`의 교집합이 비어 있는지 먼저 확인한다. 비어 있지 않으면 합치지 말고 멈춰서 사용자에게 보고한다.

## 승격 후 2주 지표

승격 직전 2주를 기준선으로 잡는다. 아래 기준값은 구현 쪽 제안이고 사용자가 확정하지 않았다.

| 지표 | 보는 것 | 되돌림 검토 기준(제안) |
| --- | --- | --- |
| `/saju` 유입 | 세션 수 | 기준선 대비 30% 이상 감소가 7일 지속 |
| 결과 이탈 | 무료 결과 화면에서 다음 행동 없이 떠난 비율 | 기준선 대비 10%포인트 이상 악화 |
| 묶음 구매 | 구매 수, 결과 화면 대비 구매 전환 | 2주 누적 구매가 0건에 가까움 |
| 매출 | 사주 관련 합계(묶음 + 상담 등 회당 상품) | 2주 합계가 기준선보다 30% 이상 감소 |

- 판매 차단 오류(409 `PRODUCT_SALE_ENDED` 뒤 묶음 안내가 안 열림, 묶음 결제 후 본문 미표시)는 수치와 상관없이 즉시 확인한다.
- 되돌림은 사용자 결정이다. 기준에 닿으면 수치와 함께 보고한다.

## 검증에서 남은 것

- `scripts/design/verify-compact-home.cjs`: main의 홈 개편(`f798dddab`, `7b245a9eb`, 2026-10-28~31)이 `.cdh-consult`·`.cdh-consult-browser` 요소를 없앤 뒤로 첫 측정에서 실패한다. 묶음 때문이 아니다. 이 파일의 묶음 단정은 그 뒤에 있어 실행되지 않고, 같은 내용은 임시 4상태 화면 검사로 확인했다.
- `scripts/verify-saju-reading-personas.mjs`: 같은 커밋에서 없어진 `.cd-soulcat-entry`를 첫 단계에서 찾아 실패한다. 묶음이 바꾼 부분(잠금 전 카드 없음, 저장 프로필 뒤 해금)만 고쳤고, 입구 단계를 건너뛴 임시 사본으로 해금까지 통과했다. 그 뒤 `#tsGrid` 비교는 결과 화면 탭 때문에 숨은 요소를 읽어 실패하므로 이 가드는 여전히 빨간불이다. 시간 미상 + 묶음 보유 화면은 임시 하네스(저장소 밖, mock, 390·960)로 따로 확인했다. 승인 판정 켬에서 `#ukbuSection`은 판정 보류, `#currentAgeInfo`는 강약 판정 보류, `G_POWER`는 원값 유지, 페이지 오류·가로 넘침 없음. 이 하네스는 아래 "시간 미상 구매자" 항목 때문에 활성 프로필에 id를 임시로 붙였다. 페르소나 전환은 안정성 가드가 화자 전환 재배달로 확인한다.
- `__tests__/ui/yeongnyangi-reading-invariance.test.mjs`: 로컬에서 판정하지 않았다. Swiss Ephemeris를 스텁 없이 불러올 수 있어 CI에 맡긴다.
- `isTileKeyUnlocked` 덮어쓰기와 mock 402로 권리를 흉내 냈다. 서버 권리 판정은 워커 테스트가 맡는다. 실결제 흐름은 운영에서 확인한 적 없다.
- 자미·서양 차트는 브라우저에서 모달을 열어 보지 않았다(Swiss WASM 실행 가능성). 판매 종료 키에 차트 키가 없다는 것과 Next 경로 응답까지 확인했다.

## 승격 전 결정 필요

- **시간 미상 구매자:** 저장 프로필은 `birth.hour: null`, 엔진 활성 프로필은 `hour: 12`이고 활성 프로필에 id가 없다(`js/saju-engine.js:5032`). `_cdResolveCurrentProfileIdForAccess`의 `profilesReferToSameBirth`가 false를 돌려 결과 화면 프로필 id가 비고, 묶음 보유 상태에서 안내도 본문도 나오지 않았다(`owned:true`, `offerInline:0`, `sectionCalls:[]`). mock에서만 재현했고 운영에서는 확인하지 못했다. 이 판정 코드는 main과 같아 이번 수정 범위 밖으로 두었다. 후보 수정은 양쪽 다 시간 미상이면 같은 시각으로 보는 것이다(미구현).

## 결제 코드 변경 (main 대비)

`_cdRunDirectKrwCheckout`, `billing.js`, `payments.js`는 묶음 브랜치에서 실제로 바뀌었다. 목록과 `alreadyUnlocked` 범위 근거는 `docs/context/payment-gating.md`의 "main 통합 뒤 달라진 점"에 있다. 주문 없는 `alreadyUnlocked` 응답을 해금으로 받는 처리는 묶음과 판매 종료 키로만 좁혔다.

## 관찰 (고치지 않음)

- main의 `cdSignatureConsultPopup`(`js/core/home-funnel.js`, `f7ddbba01`)이 1.5초 뒤 `?action=cdOneStepFreeSajuEntry` 입력 폼 위에도 뜬다. 입력 중인 사람을 가리므로 확인이 필요하다.
- `#run-btn` Playwright 클릭이 간헐적으로 시간 초과한다. 계산 오버레이가 덮어서라는 것은 추정이고 원인은 확인하지 못했다(프로브 4회 재현 안 됨). 가드는 `TimeoutError`만 기록하고 넘긴 뒤 결과 대기로 판정한다.
- 판정 보류 화면의 게이지는 굵은 "신약 · 억부 점수 -7점 (판정 기준 30점)"을 그대로 보여 판정처럼 읽힐 수 있다. main 원본도 판정 보류 아래 같은 게이지를 넣는다(`js/core/saju/reading-rich.js:354-356`). 묶음이 만든 차이는 아니고 main 화면을 띄워 비교하지는 않았다.
- `shellRuntime.f2343`은 무료 힐링 타로(`app/tarot/healing/page.tsx:101`)에서만 쓴다. 사주 범위 문구가 아니어서 고치지 않았다.

## 뒤로 미룬 항목

- 문구: 마케팅 초안의 "무료 사주"(`instagram-captions.md:14`, `threads-queue.json:135,144`, `threads-week01.md:101`, `week01.json:20`), `lib/seo/siteSeo.ts:164,176`, en `rpt_dopamineCard.faq.1`, `index.html:18414,18434` 버튼 라벨.
- 번역: vi·hi·es·fr·de·nl·ms 혼합 언어 카드, hi·nl·ms 묶음 전용 키의 영어 잔류, 손번역은 원어민 검수 전, `CLAIMS_FREE_RE`에 일부 비한국어 표현 없음, `saju.bundle.*` i18n 없음.
- 제품 결정: 천원 페이지 제목 "천원 운세·천원사주" 유지, 영냥이 가격 메모, 묶음 상품명 표기 3종(사주 전체 풀이 묶음·사주 영구 묶음·평생 소장).
- 그 외 Task별 소소한 항목은 `.superpowers/sdd/2026-11-04-saju-permanent-bundle/progress.md`의 `minor (deferred)` 줄에 있다.
