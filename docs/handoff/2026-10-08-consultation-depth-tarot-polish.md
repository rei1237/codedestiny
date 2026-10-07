---
status: done
updated: 2026-10-08
next: 없음 — 구현 통합 및 main CI 통과 확인 완료
---

# 상담 분량·추가 질문·타로 화면 개선

## 현재 상태와 전달 경계
- 구현 및 로컬 검증 완료. 보류 해제 후 main에 구현이 통합됐고, 후속 린트 수정 f4a234a7ffe033db7e0bd586e2883d6a6c5c2d22 및 사이트맵 원장 동기화 21c1a3ee87d4adef730a338f9aedf9cb58a55463까지 통합했다. main의 budgetModule 테스트 변수명을 보존했다.
- 최종 작업 디렉터리: D:\Development\code-destiny (사용한 안전 워크트리는 종료 시 정리)
- 브랜치: wt/tarot-recommendation-20261008-040954 (동시 작업 예외로 만든 안전 워크트리; PR 없음)
- 마지막 구현 커밋: 42728698f1d4531f47a84e0fe52eb4e33fc899dd
- 카드 디자인 커밋: 02d9130f5becedf9d186b3c18d1ab41aa3f8821d
- 베이스: 6fbc2050948d68f6b683e557970bace8c0f905b4
- 외부 보류: 사용자 승인 전달 메시지에서 ‘진단 및 CTR 개선’ 세션이 운영 배포/성능 비교 동안 main merge/push를 중지하도록 요청했다. 고정 후보는 f610e521f85377b0dfd1dc6bea7812fdd17070af. 후속 전달에서 보류가 해제됐다. 이는 운영 배포·실결제·유료 LLM 승인이 아니다. 이 전달은 다른 채팅에 회신할 권한을 주지 않았다.
- 다른 세션의 main 미커밋 변경은 보존했다. 구현은 main에 통합됐으며 이 완료 기록 push 후 자기 정션·워크트리·머지된 브랜치를 정리한다.

## 구현
- 질문의 주제·기간·등급에 맞는 타로 배열과 예시 질문. 재물 연어/광어 7장, 참치 10장; 일반 연어 이상 추천 최소 6장. 직접 선택과 기존 최대 카드 수·가격 계약은 유지.
- 성향(타로는 현재 상황)·공감·강점/그림자·반복 패턴을 먼저 다루고 질문별 답변과 행동 챕터를 잇는다. 타로는 모든 카드의 이름·정역·상징·자리·질문 적용·행동을 설명한다.
- 이전 v6 전체 목표 분량을 최초 답변+전체 추가 질문 합계로 배분한다. 추가 질문이 있으면 최초 약 80%, 후속 약 20%. 글자 수만으로 유료 재생성하지 않는다.
- 모듬 18+예방 1챕터/추가 질문 5회, 초융합 28+예방 1챕터/추가 질문 7회. 기존 구매 스냅샷은 변경하지 않는다.
- 네오 팩폭 전략실 결과·현실 점검만 2회. 두 수정 작전의 내용 보존, 이전 조언을 다음 프롬프트에 전달, 중복/초과/동시 요청 방지. 기존 최초·후속 분량 상수 유지. /fortune-chat 연이·네오의 기존 계약 유지.
- 공통 상담 지침: 실제 근거에 따른 우선 선택과 유리한 시기, 반대 신호·조건·현실 행동. 없는 날짜·계산·확률을 만들지 않는다.
- 카드 선택 셔플, 캐릭터 안내, 추가 질문 대화 UI. 월정석 잔액은 기존 API를 읽고 사용 가능한 수량 표시; 결제 검증/인증/DB 스키마 불변. 상담 스냅샷과 Neo 응답에 분량/횟수/이력 필드가 추가됨.
- 내장 image_gen으로 린넨·금박 카드 뒷면 생성. 문양 유지. 기존 인코딩 파이프라인으로 정확한 180도 회전 대칭, 240/600/1200 크기 WebP/AVIF 생성. 78개 앞면·추첨 불변. 원본 PNG와 생성 프롬프트는 docs/design/yeongnyangi-tarot/sources/back-linen-v2.png 및 art-ledger.jsonl 마지막 항목.
- 카드 선택 그리드의 행 축소를 막고 모든 카드를 2:3으로 표시. 모바일 최소 카드 너비 64px.

## 검증 결과
- main 21c1a3ee87d4adef730a338f9aedf9cb58a55463 CI required 성공: https://github.com/rei1237/codedestiny/actions/runs/37686168077 (원장 동기화 변경의 선택 실행: 타입·린트/Static guards 통과, 빌드/Critical checks는 이전 f4a에서 통과).
- main f4a234a7f CI: 타입·린트/빌드/Critical checks 통과. Static guards는 사이트맵 원장 드리프트로 실패; 21c1a3ee8에서 원장 동기화 후 npm run verify:sitemap-drift 통과(955 URL).
- 구현 커밋의 Paid Flow Gates: https://github.com/rei1237/codedestiny/actions/runs/37684557505 성공.
- node scripts/run-mock-tests.mjs node: 최종 3011/3011 통과 (새 뒷면 캐시 해시 테스트 갱신 포함).
- node scripts/run-mock-tests.mjs jest --runInBand --silent: 354 suites, 5374/5374 통과.
- npx tsc --noEmit: 통과. 변경 UI/라이브러리 파일 scoped ESLint 통과. git diff --check 통과.
- node scripts/verify-yeongnyangi-tarot-assets.mjs: 480 이미지 해시·크기·문구·정확한 회전 대칭 통과.
- node scripts/verify-yeongnyangi-consultation-polish.mjs: 로컬 mock 실제 컴포넌트, 외부 네트워크 차단. 360/390/430/1280px overflow 없음, 78장 전체 2:3, 셔플 순열/선택 잠금/새로고침 복원/잔액 최댓값 적용·오류 통과.
- npm run check:fast -- --plan: critical. check:fast 전체 실행은 87/88 통과, npm test가 새 back URL의 캐시 해시를 예상하지 못한 테스트 1개로 실패. 해당 기대값을 실제 manifest 해시로 수정한 뒤 전체 Node 및 Jest를 각각 다시 통과했다. check:fast 전체를 다시 실행해 통과했다고 주장하지 않는다.
- 실제 유료 상담 LLM·실결제·운영 DB·운영 배포는 수행하지 않았다. 내장 이미지 생성은 요청한 디자인 제작에 사용했다. 실제 생성 본문의 목표 분량·문장 품질은 미검증.
- 화면 증거: C:/Users/user/.codex/visualizations/2026/10/07/01a117c3-f477-7641-98a4-87db7c4ab071/consultation-review (pick/recommendation/conversation/balance 각 4개 너비 PNG).

## 완료
추가 구현 작업 없음. 이 세션에서는 운영 배포를 실행하지 않았다. 실제 유료 생성 본문의 품질 검수는 별도 승인된 실호출이 있을 때만 수행한다.

검증 재현 명령:
- node scripts/run-mock-tests.mjs node
- node scripts/run-mock-tests.mjs jest --runInBand --silent
- node scripts/verify-yeongnyangi-tarot-assets.mjs
- node scripts/verify-yeongnyangi-consultation-polish.mjs
- npx tsc --noEmit

## 수정 파일
```text
__tests__/ui/consultation-budget.test.mjs
__tests__/ui/yeongnyangi-consultation-kinds.test.mjs
__tests__/ui/yeongnyangi-consultation-quality.test.mjs
__tests__/ui/yeongnyangi-fusion-delivery.test.mjs
__tests__/ui/yeongnyangi-question-followup-storage.test.mjs
__tests__/ui/yeongnyangi-reading-invariance.test.mjs
__tests__/ui/yeongnyangi-reading-v5.test.mjs
__tests__/ui/yeongnyangi-spread-catalog.test.mjs
__tests__/ui/yeongnyangi-spread-recommend.test.mjs
__tests__/ui/yeongnyangi-tarot-spread-v3.test.mjs
__tests__/worker/neo-operation-room.sections.test.js
__tests__/worker/neo-paid-delivery.test.js
app/checkout/CheckoutClient.tsx
app/checkout/MoonstoneDiscountBalance.tsx
app/checkout/moonstone-discount-balance.module.css
app/yeongnyangi/_components/Consultation.tsx
app/yeongnyangi/_components/QuestionConversation.tsx
app/yeongnyangi/_components/question-conversation.module.css
app/yeongnyangi/_components/tarot/TarotCardPick.tsx
app/yeongnyangi/_components/tarot/TarotSpreadPlanner.tsx
app/yeongnyangi/_components/tarot/tarot-spread.module.css
docs/context/yeongnyangi-question-consultation.md
docs/design/yeongnyangi-tarot/art-ledger.jsonl
docs/design/yeongnyangi-tarot/asset-sources.json
docs/design/yeongnyangi-tarot/sources/back-linen-v2.png
lib/fortune/consultation-counsel.mjs
lib/tarot/yeongnyangi-deck.ts
lib/tarot/yeongnyangi-spread-catalog.mjs
lib/tarot/yeongnyangi-spread-locales.ts
lib/tarot/yeongnyangi-spread-recommend.mjs
public/assets/yeongnyangi/tarot/v1/back-1200.avif
public/assets/yeongnyangi/tarot/v1/back-1200.webp
public/assets/yeongnyangi/tarot/v1/back-240.avif
public/assets/yeongnyangi/tarot/v1/back-240.webp
public/assets/yeongnyangi/tarot/v1/back-600.avif
public/assets/yeongnyangi/tarot/v1/back-600.webp
public/assets/yeongnyangi/tarot/v1/manifest.json
scripts/build-yeongnyangi-tarot-assets.mjs
scripts/verify-yeongnyangi-consultation-polish.mjs
src/features/neo-war-room/NeoOperationRoomResultPage.tsx
worker/lib/neo-operation-room-prompt.js
worker/lib/neo-refinement-contract.js
worker/routes/neo-operation-room.js
worker/yeongnyangi/fortune/ask/question-policy.ts
worker/yeongnyangi/fortune/consultation-budget.ts
worker/yeongnyangi/fortune/reading-v6.ts
worker/yeongnyangi/prompts/system/fortune-master.ts
worker/yeongnyangi/question-followup.ts
worker/yeongnyangi/service.ts
```
