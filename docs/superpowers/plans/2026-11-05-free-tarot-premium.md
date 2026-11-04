# 무료 타로 고급화 구현 계획

> **For agentic workers:** 이 세션에서 직접 구현한다(사용자 승인 범위, 추가 확인 불필요). Steps use checkbox (`- [ ]`) syntax.

**Goal:** 명리 타로 모달과 `/today/` 타로에 운명 찻집 카드, 소리 없는 빛과 플립, 타로 마스터식 분야별 종합 풀이를 넣는다.

**Architecture:** 순수 엔진(`js/core/tarot/master-reading.mjs`)과 생성 데이터를 두 화면이 공유한다. 모달은 동적 import, `/today/`는 `@/js/core/...` dynamic import. 신규 판매는 등록소에서 닫고 구매자 재개 코드는 보존한다.

**Spec:** `docs/superpowers/specs/2026-11-05-free-tarot-premium-design.md`

## Global Constraints

- LLM·서버 호출 추가 없음, 실결제 없음. 효과음 없음.
- `TAROT_SHARED_RULES`: 단정 예언, 확률, 날짜, 상대 속마음 확정, 공포 조장 금지.
- 연출 값은 승인 목업 그대로. 모달 용어 순행·역행, `/today/`는 역방향 없음.
- `lib/tarot/daily-three.mjs`와 저장 키 불변.

## Review Focus

- R2 이미지 차단: 모달은 `/tarot-cards/`로, today는 기존 이미지 폴백으로 뒷면에 멈추지 않는다.
- 연출 도중 모달 닫기·분야 변경: 타이머가 이전 상태에 쓰지 않는다(`tarotLifecycleToken`).
- 엔진 동적 import 실패: 자리별 읽기는 남고 안내 한 줄이 나온다.
- 구매자 재개: 판매 종료 후에도 카드와 예전 결과가 복원된다.
- 오늘 재방문: 세 장을 다 연 저장본은 연출 없이 바로 풀이가 보인다.

---

### Task 1: 엔진과 데이터

**Files:** Create `scripts/build-tarot-master-data.mjs`, `js/core/tarot/master-reading-data.mjs`, `js/core/tarot/master-reading.mjs`, `__tests__/ui/tarot-master-reading.test.mjs`

**Produces:** `buildMasterReading({cards:[{code,reversed}], category, surface:'modal'|'today', positions:[string,string,string], positionTexts?:[string,string,string]}) -> {verdict,positions:[{label,code,name,reversed,dirLabel,text}],energy:[{label,head,body}],between,synthesis:{flow,caution,action},close}`; `caretaroImageUrl(code,{width})`.

- [ ] 실패하는 테스트: 전 카테고리·정역 조합 표본에 금칙 없음, 합쇼체 없음, 결정적, 분야별 결론 차이, 정역 차이, 생성물과 재생성 일치
- [ ] 생성기(말투 변환, 미지 어미 실패)와 엔진 구현
- [ ] 테스트 통과, 커밋

### Task 2: 모달

**Files:** Modify `js/saju-engine-tarot-sukuyo-quantum.js`, `index.html`, `styles/fortune-ui-home.css`, `js/core/index-inline-runtime.js`

- [ ] 이미지 후보에 caretaro 1순위 + 표 일치 테스트
- [ ] `playTarotFlipSound`·`createGoldDust` 호출 제거
- [ ] `#tarotRitualStage`와 무료 풀이, 기본 모드 세 장, 재개는 예전 씬 유지
- [ ] 실화면 점검, 커밋

### Task 3: `/today/`

**Files:** Modify `app/today/DailyTarot.tsx`, `app/today/daily-tarot.module.css`

- [ ] 같은 연출, 엔진 종합, 저장 복원, 공유 카드 유지
- [ ] `daily-three` 테스트, 실화면 점검, 커밋

### Task 4: 유료 경계와 문구

**Files:** Modify `worker/lib/paid-feature-registry.js`, `worker/lib/honey-unlock-catalog.js`, `__tests__/worker/honey-unlocks.test.js`, `public/i18n/*.json`, `index.html`, `docs/context/payment-gating.md`, `scripts/verify-crafted-myeongri-tarot.cjs` 등

- [ ] 판매 중단·과거 가격 유지 테스트 추가
- [ ] 등록소·꿀방울·문구·crafted 오퍼 수정
- [ ] 결제 verify 묶음 통과, 커밋

### Task 5: 통합 검증

- [ ] `sync:public`, `check:fast`, 결제 verify, 78장 URL 응답, R2 차단, reduced-motion, 터치 타깃, 가로 넘침, AudioContext 없음, mock 재개, SEO 점검
- [ ] 최종 보고
