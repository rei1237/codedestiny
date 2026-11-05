# 무료 타로 고급화 설계

승인된 목업: https://claude.ai/artifact/4owrVx8EQbDqMhC6R7rrqe (2026-11-05 사용자 승인, "좋다 이대로 구현해")

## 의도

무료 타로의 플립과 결과가 단조롭다. 명리 타로 모달은 효과음이 나고 외부 공개 덱을 쓴다. 운명 찻집 카드, 소리 없는 빛과 플립, 타로 마스터의 읽기 순서를 따른 분야별 종합 풀이로 바꾼다.

## 목표

- 명리 타로 모달: 세 장을 무료 기본으로, 한 장은 보조 탭으로 둔다. 운명 찻집 78장, 효과음 없음, 분야 8종별 깊은 풀이, 십성의 결.
- `/today/` 타로: 같은 연출과 종합 풀이. 저장 키, `DAILY_MEANINGS`, 22장, 공유 카드, KST 하루 규칙은 유지한다.
- 맨 아래에서 LLM 심층 상담(`fortune-tea-house-tarot-consultation`, 5,000원)으로 연결한다.

## 하지 않는 것

- LLM 호출, 서버 호출 추가.
- `/today/`의 3,000원 게이트와 "무료" 문구 불일치 수정(보고만).
- 찻집으로 카드 이어받기(찻집에서 새로 뽑는다).
- 카드 그림 수정.

## 절대 안 되는 것

- 단정 예언, 확률, 날짜, 상대 속마음 확정, 공포 조장(`TAROT_SHARED_RULES`).
- 건강 진단이나 투자 권유로 읽히는 문구.
- 기존 5,000원 구매자의 결제 후 재개 경로 손상.

## 풀이 엔진

위치: `js/core/tarot/master-reading.mjs`(순수 함수), `js/core/tarot/master-reading-data.mjs`(생성물), `scripts/build-tarot-master-data.mjs`(생성기). 레거시 JS는 `/js/...mjs`만 동적 import할 수 있고 `lib/`는 공개되지 않아서, 계획의 `lib/tarot/master-reading.mjs`에서 위치를 바꿨다(내 판단).

읽기 순서: 한 줄 결론 → 자리별 읽기 → 덱의 기운(구성, 우세 수트, 방향, 숫자 흐름) → 카드 사이의 이야기 → 십성의 결(모달만) → 분야 종합(흐름, 살펴볼 점, 오늘 해 볼 한 가지) → 연이 마무리 → 찻집 상담 안내.

타로 마스터 로직:
- 각 카드에 톤을 매긴다: 열림(open), 압박(strain), 풀림(easing, 무거운 카드의 역방향), 막힘(blocked, 밝은 카드의 역방향).
- 첫 자리와 마지막 자리 톤으로 아크를 정한다: 트임, 조심, 맑음 유지, 정비, 전환.
- 이웃한 두 카드의 원소 관계를 본다(원소 존엄: 불·공기, 물·흙은 돕고 불·물, 공기·흙은 부딪힌다).
- 마이너 숫자는 시작(1~3), 전개(4~6), 시험(7~9), 완결(10), 사람(11~14)으로, 메이저는 여정의 초반, 중반, 후반으로 읽는다.
- 그림에 인쇄된 메이저 번호가 표준과 다를 수 있어서 메이저 번호 숫자는 화면에 쓰지 않는다(목업과 다른 점, 내 판단).

문구 재료: `TAROT_CARDS`(병합본)의 분야별 문장을 생성 시점에 추출한다. 생성기가 합쇼체를 승인 목업의 해요체로 바꾸고, 표에 없는 어미를 만나면 실패한다. 금칙 문장은 코어나 조언 문장으로 대체한다. 분야 매핑은 daily→daily, love, reunion, career, money, people→relationship, health→psychologicalMeaning(`healthMind`는 78장 모두 같은 문장이라 쓸 수 없다), exam→coreMeaning+advice이다.

## 유료 경계 (RED, 착수 전 보고 완료)

Approaches:
1. **등록소 판매 종료 플래그 (선택).** `saleEnabled:false`. 운명의 섬 선례(`c70354de9`)와 같고, 서버가 신규 결제만 막는다. 결제 완료 경로에는 판정이 없어 진행 중 주문이 살아남는다.
2. 화면에서만 버튼 제거. 오래 캐시된 셸에서 결제가 계속 열린다. 탈락.
3. 상품 키 삭제. 과거 주문 조회, 재개, 정책 검증이 깨진다. 탈락.

함께 할 일: 꿀방울 목록에서 제외, 모드 버튼과 안내 문구 수정, crafted 오퍼 비표시, i18n 전 언어, `docs/context/payment-gating.md` 날짜 절. 보존: 가격 상수, `requireMyeongriTarotThreeCardPayment`, `_runShowTarotFinalInterpretation`, 재개 핸들러. 재개 경로는 예전 씬과 AI 프롬프트 패널을 그대로 쓴다.

## 모달 구조

새 무대 `#tarotRitualStage`를 세 장 모드에 표시한다. 예전 `#tarotSceneThree`는 재개 전용으로 남긴다. 무료 풀이는 새 함수 `_runFreeTarotMasterReading`이 그리며 AI 프롬프트 패널은 표시하지 않는다. 기본 모드는 세 장이다.

이미지 순서: caretaro 1순위, `/tarot-cards/` 폴백. 동기 함수라 코드→파일명 표를 레거시 JS에 두고, 테스트로 `lib/tarot/caretaro-card-images.mjs`와 일치를 확인한다.

## `/today/` 구조

연출은 같고 자리별 읽기는 `DAILY_MEANINGS`를 그대로 쓴다. 종합은 엔진을 dynamic import한다. 십성 없음, "사주 등과 별개인 타로 상징 해석" 문구 유지.

## 연출 기준

승인 목업(`template.html`)의 값을 그대로 쓴다. 뽑을 때 입자 14개, 준비 링 3.2s, 모으기 1s, 뒤집기 1.5s `cubic-bezier(.3,.05,.15,1)`, 광륜 2s, 입자 46개, 잔광 4.5s. reduced-motion에서는 타이머 0, 빛 없음.

교훈: opacity 애니메이션을 `preserve-3d` 요소에 걸면 평면화되므로 부모에 건다. `[hidden]`은 `display:grid`에 덮인다. 광륜 넘침은 기둥 `overflow-x:clip`으로 막는다.

## 빌더에게 남긴 것

문구 표의 세부 표현, 무대의 DOM 세부, 모달 분야 라벨 `TAROT_CONTEXT` 재사용 여부.
