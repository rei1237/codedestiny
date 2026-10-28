---
status: done
updated: 2026-10-12
next: 사용자 승인으로 통합 완료. 최신 품질·발췌·검수는 docs/product-details/quality-recheck-20261012.md 참조. 추가 코드의 운영 반영은 release SHA로 확인한다.
---

# 유료 상세 6종 — 가상 편집 예시를 실제 AI 결과 원문 발췌로 교체

요청: 6개 유료 상품 상세의 "편집 예시 / 가상 편집" 패널을 가상 예시 프로필로 실제 생성한 AI 결과의 원문 발췌(연속 2~4문장, 무수정)로 교체한다. 결제·인증·API·DB·라우팅·가격 무변경, push/PR/배포/실결제/과금 LLM 호출 없음.

## 작업본

- 작업 디렉터리: `D:\Development\codedestiny-worktrees\real-llm-excerpts-details-20261012-035905` (`scripts/create-safe-worktree.ps1 -Slug real-llm-excerpts-details`, `git fetch origin` 후 생성)
- 브랜치: `wt/real-llm-excerpts-details-20261012-035905`, 기준 SHA `304b3667844b685a9754e4724bba08aa76c97b9b`
- 이 문서를 마지막으로 바꾼 커밋: `git log -1 --format=%H -- docs/handoff/2026-10-12-real-llm-excerpts-in-details.md`
- main checkout과 다른 작업본은 수정하지 않았다. 원본 샘플은 main checkout의 `build-cache/llm-sample-review-20261009/`(git 미추적)을 읽기만 했다.

## 교체 내용

공통: 라벨 `실제 AI 결과 원문 발췌 · 가상 예시 프로필`, 출처 줄 "가상 프로필로 생성한 실제 결과 중 「장 제목」 장", "고객 결과나 후기가 아닙니다/아니에요". alt·notice·한글-원고.md 갱신. notice에는 "가상 예시 프로필로 생성한 실제 AI 결과를 고치지 않고 발췌한 것으로 고객 결과·후기가 아니며, 결과는 입력에 따라 달라집니다"를 넣고 나머지 사실은 유지했다. 패널 수는 변경 없음. 글꼴 크기는 줄이지 않았다.

| 상품 | 패널 | 샘플·출처 | 발췌 시작 |
|---|---|---|---|
| pet-saju-report | 06-a-small-observation | P4 calls/009 · 「아이의 상태에 맞춘 놀이」 › 숨바꼭질 | 놀이 시간은 보리의 집중력을 고려하여 10~15분… |
| love-secret | 08-draft-message | LS1 calls/007 · 「상대에게 다가가는 대화 문장」 | "너랑 같이 있으면 시간이 정말 빨리 가는 것 같아… |
| master-love-codex | 08-one-sentence | R3 calls/012 · 「화해와 회복의 언어」 | 갈등이 발생했을 때, 너무 오랫동안 혼자 감정을… |
| master-love-codex-compat | 08-agreement | R4 calls/014 · 「갈등의 뿌리 — 같은 다툼이 반복되는 이유」 | 예를 들어, 어떤 문제에 대해 상담자님은 신중하게… |
| new-year-expert | 08-an-annual-question-in-action | NY1 calls/003 · 「재물과 직업」 › 직업·이직 | 이직을 고려하신다면, 이러한 편관의 압박과… |
| life-book | 07-paragraph | R9 calls/002 · 「성격과 내면의 작동 방식」 | 이는 타인에게 의존하기보다는 스스로의 판단과… |

- 원문 대조: 각 문장이 패널 HTML과 샘플 result.md/presented·LLM 응답(call response)에 그대로 있는지 스크립트로 확인했다(전부 true). 생년월일·요청 ID·실명 없음. "보리"는 가상 반려동물 이름이다.
- P4는 요청 예시 plays[0] 대신 plays[1](숨바꼭질) 문단을 썼다. plays[0] 문장은 앞뒤 문맥이 어긋나 2문장 연속 발췌가 패널에 맞지 않았다.
- LS1은 원문에서 "상대에게 다가가는 대화 문장:" 첫 항목과 "피해야 할 대화 문장:" 첫 항목을 가져왔다. 각 인용 뒤 괄호 설명과 중간 3개 항목은 생략하고 "…"로 표시했다(연속 문장이 아님).
- CSS: love-secret `.message.excerpt` 여백 축소, compat·new-year에 `.excerpt` 테두리 블록 추가. 글꼴 크기 변경 없음.

## 검증

- `node scripts/render-crafted-detail.cjs <id>` 6종 overflow 0.
- `npm run sync:public` → `public/feature-details/{life-book-ai,love-secret-ai,master-love-codex}.json`, `lib/marketing/feature-visual-details.generated.json` 갱신. pet·new-year는 crafted manifest를 런타임에 읽는다.
- `node --test __tests__/ui/feature-visual-details.test.mjs __tests__/ui/feature-detail-preview.test.mjs` 21/21 통과.
- mock dev 서버(`MOCK_DEV_PORT=14330`)에서 verify-crafted-pet(pet-saju-report)·new-year·codex·books·love-secret 통과(360/390/430/1280). verify-crafted-introductions는 love-secret·codex·compat 통과. life-book은 첫 실행 popup 단계에서 `/ggulggul` timeout이 났고 재실행에서 통과했다(기준 커밋에서도 통과 확인, dev 서버 첫 컴파일 지연으로 판단). 이후 서버 종료.
- `git diff --check` 통과. TS/TSX 변경 없음(ESLint 대상 없음).
- `npm run check:fast` exit 0 (Jest 385 suites / 5905 tests 통과, entry-encoding 등 포함).

## 남은 일·주의

- NY1 샘플 내부 불일치(질문 답변은 이직 쪽, 직업·이직 절은 병행 제안)는 범위 밖이라 그대로 둔다. 발췌는 직업·이직 절 문장만 썼다.
- dream-psycho notice에도 "가상편집으로 실제응답…" 문구가 있으나 이번 6종 범위 밖이라 수정하지 않았다.
- main 통합·push·운영 배포는 하지 않았다.

## 2026-10-12 후속 승인·보완

사용자가 상세페이지 브랜치 통합과 실패 샘플의 최소 유료 재검을 승인했다. da263d5a3을 premium-repricing 작업본에 병합했고, 해몽 안내와 G4·D4 발췌를 최신 결과로 바꿨다. 신년 직업 장은 앞 장의 질문 답변을 전달받도록 고쳤으며 해당 장만 다시 생성했다. 상세 검수·비용은 docs/product-details/quality-recheck-20261012.md를 따른다.
