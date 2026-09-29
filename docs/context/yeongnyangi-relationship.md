---
status: awaiting-main-integration
updated: 2026-09-29
next: 사용자 지시대로 다국어 세션 커밋 후 main 통합 및 CI 확인
---

# 영냥이 연애·결혼·궁합 확장

## 범위와 정책

- 신규 상담: 자미두수 연애운·결혼운·궁합, 베다점·서양점성·타로 궁합. 한국어 전용이며 서버와 UI에서 제한한다.
- 사주·숙요는 기존 궁합에 질문 중심 진입점을 연결한다. 수비학·오라클 독립 상품은 추가하지 않는다.
- 기존 상품 ID, 가격 registry, 이용권·월정석·단건 결제, 인증, 결제 승인, DB 스키마는 변경하지 않는다.
- 신규 상담은 v6 장별 계약과 등급별 5·8·11·15장 분량을 유지한다. 기존 v7 및 구매 스냅샷을 변경하지 않는다.

## 계산과 해석 계약

자미두수는 명궁·신궁·부부궁(부처궁/夫妻宮)·복덕·재백·관록·전택·자녀·천이궁을 보존한다. 연애 7항목, 결혼 7항목, 궁합 11항목은 각 등급의 장 또는 소제목에 모두 포함된다. 홍란은 子年起卯逆行, 천희는 홍란의 대궁으로 배치하고 밝기는 만들지 않는다. 배치 규칙 출처: [iztro location.ts](https://github.com/SylarLong/iztro/blob/main/src/star/location.ts). 생년·대한·올해/내년 유년 근거를 분리하고 유년사화는 해당 연도 천간으로 계산한다.

해외 자미두수는 IANA 역사적 시간대를 통해 UTC 순간을 확정하고 `UTC + 경도×4분 + 균시차`를 사용한다. 반복·소실 DST 시각은 결제 전 보완한다. 국내 Asia/Seoul은 기존 계산을 유지한다. 균시차는 기존 일 단위 근사식을 재사용하며, 독립 Swiss WASM 대조 3개 기준일에서 1분 이내와 부호를 확인했다. 정의는 [Swiss 공식 문서 §9.4](https://www.astro.com/swisseph/swephprg.htm)의 LAT−LMT다. 이는 전 기간 정밀도를 입증하지 않는다. 출생시각이 날짜·시진 경계에 가까운 해외 명반은 승격 전 별도 대조가 필요하다. 원래 입력, UTC, 경도·균시차, 보정 일시와 규약 버전은 비공개 구매 근거에 보존한다. 음력은 한국 음양력 코어 규약을 적용한다.

베다는 양쪽 라그나·로드, 달·나크샤트라, 금성·화성, 7하우스·로드, D9 행성 사인을 전달한다. 아쉬타쿠타는 속성만 사용하고 신랑/신부 역할을 가정하는 점수와 총점은 제거한다. D9 하우스·상승점을 만들지 않는다. 가까운 기간은 실제 양쪽 다샤·안타르다샤의 겹치는 기간을 사용한다.

서양점성은 기존 오브·각도 계산을 재사용해 태양·달·금성·화성, 토성·천왕성·명왕성 및 ASC/DSC 접촉, 양방향 하우스 오버레이를 전달한다. 출생 시나스트리이며 Composite나 트랜짓 예측이라고 표시하지 않는다.

상대 마음·결혼·재회를 확정하지 않으며 점수를 성공 확률로 바꾸지 않는다. 집착·감시·원치 않는 연락을 권하지 않고 자녀궁/전통적 체질 지표로 임신·출산·건강을 판단하지 않는다.

## 질문 중심 UX와 타로

홈의 궁합 보기 → 여섯 질문 → 두 사람 정보 → 추천 엔진/등급 → 기존 결제 → 결과/보관함 흐름이다. 마음·연락·썸·재회는 타로를 우선 추천한다. 결혼·장기관계는 양쪽 생시 충족 시 자미두수를 추천하며 다른 엔진도 선택할 수 있다.

타로는 출생 프로필 대신 별칭을 받고, 서버에 저장된 6장을 내 마음 → 상대 쪽 관계 → 관계·미래·조언 순서로 선택/공개한다. 한 기기에서 역할을 나누는 상징적 의식임을 안내한다. 360px에서 모두 선택할 수 있는 두 줄 배치를 사용한다.

1. 내 현재 마음
2. 상대 쪽 관계 흐름
3. 두 사람 사이의 끌림
4. 겉으로 드러난 관계와 숨은 과제
5. 가까운 미래의 가능성
6. 관계 조언과 종합 판단

카드 ID·순서·정역방향은 구매 스냅샷에 고정하며 UI 선택·새로고침은 재추첨하지 않는다. 기존 타로 스프레드는 유지한다.

## 저장·복구

신규 관계 요청은 구매 의도를 먼저 조회한다. 상대·질문·종류가 다르면 다른 의도이며, 프로필 수정이나 provider 준비 실패 이후 재전송은 기존 스냅샷을 복원한다. 저장소 읽기 오류는 새 계산/추첨 허가가 아니다. 기존 주문·결제 증명·큐·장별 잠금·제한된 재시도를 재사용한다. 저장된 유효 본문은 유지하고 누락된 장만 복구한다. 일반 문구를 완성된 유료 결과로 대체하지 않는다. 보관함과 결과 상담 정보에 별칭을 표시하며 공개 공유에 상대 원본 출생정보를 추가하지 않는다.

## 검증 증거

- 네트워크 가드 Node 상담 계약: 17/17 통과. 신규 6종 mock 장 생성, 양쪽 근거 전달, 모든 등급 제목, 한국어 키, 소유권·동일 프로필·누락·생시·음력·윤달·DST·날짜/시진 경계·구매 재전송 포함.
- 저장소 mock: 결제 후 장 저장 실패 → 같은 주문에서 남은 장 완성, 스냅샷/카드 불변, 재차감 없음. 기존 큐·재시도·환불·미결제·검토 필요 제한은 기존 회귀 검사로 검증한다.
- Playwright Chromium mock: 360/390/430/1280px 모두 통과. 질문→별칭→추천→결제 요약, 새로고침 입력 보존, 카드 순차 선택/공개/복원, 카드 불변, 가로 넘침 없음. 실제 결제 SDK 호출 0회.
- Impeccable 신규 UI 정적 검사: primary findings 0.
- `npm run typecheck`: exit 0. 기존 구매 불변성 Node 검사: 기존 ID·스냅샷·프롬프트·검증 결과·manifest 해시를 모두 유지하며 통과.
- `npm run check:fast -- --plan`, `npm run check:fast`: paid gate 88/88(328.5초, 전체 npm test 포함), 변경 lint와 전체 lint 통과. 마지막 wrapper 실행은 사이트맵 추적본 갱신 요구로 중단되었다. `sitemap:generate` 후 `verify:sitemap-drift` 통과(1300 URLs). 이미 통과한 대규모 테스트를 재실행하지 않고 계획의 나머지 환경·결제 snapshot·보안·분석 이벤트·Worker 정의/빌드·strict-core 인코딩 검사를 별도로 실행해 모두 exit 0을 확인했다. wrapper 전체 exit 0 또는 GitHub CI 통과로 표시하지 않는다.
- `npm run build:worker`: dry-run exit 0. 배포하지 않았다.
- 최종 브라우저 재검사: 네 폭 모두 완료 5장 보관함 재열람, 카드 불변, 재추첨/추가 구매 요청 없음까지 통과. 초기 개발 서버 실행에서 자동 새로고침/이동 경쟁으로 불안정했던 검증은 checkout을 먼저 unmount하고 로그·캡처를 워크스페이스 밖에 저장해 반복 검증했다.
- 최종 캡처/JSON: `C:/Users/user/.codex/worktrees/relationship-readings/qa-artifacts/`. 개발 서버와 브라우저 프로세스는 종료했다.
- main push·GitHub CI: **대기**. 사용자가 다른 세션의 다국어 미커밋 변경을 먼저 커밋한 뒤 통합하도록 선택했다.


실행 명령:

```powershell
node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/yeongnyangi-consultation-kinds.test.mjs
node scripts/verify-yeongnyangi-relationship-browser.mjs
npm run check:fast -- --plan
npm run check:fast
```

## 프로덕션 승격 전 남은 검수

- 실제 한국어 유료 결과 의미·서사·개인화 검수: 명시적으로 승인된 프롬프트/모델/호출 수/총비용 안에서 별도 수행.
- 해외 명반 독립 대조 확대, 특히 일 단위 균시차 근사와 날짜·시진 경계, 역사적 시간대.
- 실제 기기 키보드·스크롤·로그인 복귀 검수. Chromium 에뮬레이션은 실기기 증거가 아니다.
- 운영 기존 구매 재열람, 결제/큐 장애 복구, 가격·접근 권한 대조 및 프로덕션 승격은 별도 승인 범위.
- 신규 한국어 전용 범위를 유지한 채 기존 다국어 변경과 통합 후 main CI 확인.

## 수정 파일

- `__tests__/fixtures/yeongnyangi-chapter.ts`
- `__tests__/ui/yeongnyangi-consultation-kinds.test.mjs`
- `__tests__/ui/yeongnyangi-consultation-quality.test.mjs`
- `__tests__/ui/yeongnyangi-paid-recovery-contract.test.mjs`
- `__tests__/ui/yeongnyangi-reading-invariance.test.mjs`
- `__tests__/worker/yeongnyangi-repository.test.js`
- `__tests__/worker/yeongnyangi-route.test.js`
- `app/yeongnyangi/_components/Consultation.tsx`
- `app/yeongnyangi/_components/Library.tsx`
- `app/yeongnyangi/_components/RelationshipJourney.tsx`
- `app/yeongnyangi/_components/Result.tsx`
- `app/yeongnyangi/_components/TarotDrawRitual.tsx`
- `app/yeongnyangi/_components/relationship.module.css`
- `app/yeongnyangi/_lib/api.ts`
- `app/yeongnyangi/_lib/relationship-copy.ts`
- `app/yeongnyangi/_original/FortuneHome.tsx`
- `app/yeongnyangi/_original/original.css`
- `config/sitemap-lastmod.json`
- `lib/tarot/spreads.mjs`
- `lib/tarot/yeongnyangi-relationship-spread.mjs`
- `public/sitemap-ko.xml`
- `public/sitemap.xml`
- `scripts/verify-yeongnyangi-relationship-browser.mjs`
- `sitemap-ko.xml`
- `sitemap.xml`
- `worker/routes/yeongnyangi.js`
- `worker/yeongnyangi/fortune/ask/tarot.ts`
- `worker/yeongnyangi/fortune/consultation-kinds.ts`
- `worker/yeongnyangi/fortune/consultation.ts`
- `worker/yeongnyangi/fortune/reading-presentation.ts`
- `worker/yeongnyangi/fortune/relationship-calculation.ts`
- `worker/yeongnyangi/fortune/relationship-contract.ts`
- `worker/yeongnyangi/fortune/relationship-manifest.ts`
- `worker/yeongnyangi/fortune/shared/contracts.ts`
- `worker/yeongnyangi/fortune/shared/input.ts`
- `worker/yeongnyangi/fortune/ziwei/index.ts`
- `worker/yeongnyangi/providers/chapter.ts`
- `worker/yeongnyangi/service.ts`
- `docs/context/yeongnyangi-relationship.md`
- `docs/handoff/yeongnyangi-relationship-integration-20260929.md`
