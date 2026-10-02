---
status: active
updated: 2026-10-02
next: "활성·차단 103개 중 마지막 커밋이 09-30 이전인 89개를 오래된 순으로, 남은 항목이 코드·git 에 이미 반영됐는지 실측해 done·삭제·유지(next 갱신)로 재판정한다"
---

# 활성·차단 인수인계 재판정

## 왜

사용자: "후속 과제, 특히 활성 인수인계 문서 중에서 필요없는것들은 삭제해주길 바란다" — 10-02 1차 정리 뒤 남은 활성 문서의 재판정을 이어서 요청.

## 지금 상태

- 10-02 정리 2회 완료: `0ce7810f1`(활성·차단 64 삭제, 19 done 전환) · `b27ee330a`(오래된 done 26 삭제). 지운 문서는 `git log --diff-filter=D --name-only -- docs/handoff`.
- 남은 것(10-02 실측, `_TEMPLATE` 제외): active 96 · blocked 7 · done 39. active·blocked 중 마지막 커밋 09-30 이전 89개(가장 오래된 08-29).
- 🔴 1차의 "유지" 92개는 **문서 본문에 남은 작업이 적혀 있다**는 이유였다 — 그 작업이 이미 코드에 들어갔는지는 확인하지 않았다. 이번 재판정의 핵심이 그 실측이다.

## 남은 작업

- [ ] 89개를 축별(결제·영냥이·SEO·성능·LLM·기타)로 묶어, 문서마다 남은 항목을 `git log -S`/`git grep`/파일 존재로 대조한다.
- [ ] 판정(1차와 같은 규칙):
  - 남은 항목이 다 반영됨 → 코드·설정·런타임이 인용하거나(R1) 현행 문서가 근거·결정 출처·절차·재시도 금지로 가리키면(R2) `status: done` + `next: "완료 — <인용처> 근거로 보존"`, 아니면 삭제(R3).
  - 대체·폐기됨 → 삭제(R3). 링크가 이력 기록(changelog·verification·done 문서)에만 있으면 링크는 둔다.
  - 진짜 미완 → 유지하되 `updated`·`next` 를 지금 실행 가능한 한 줄로 갱신.
- [ ] "끝" 기준: 89개 모두 판정표(문서·판정·근거 `파일:줄`)가 커밋 메시지에 남고, 유지 문서의 `next` 가 현재 코드와 맞는다.

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
