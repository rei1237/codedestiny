---
status: in-progress
updated: 2026-11-21
next: 2. R3 궁합 링크 통합(301 없음) — 실제 작동하는 무료 궁합 흐름을 실측해 정본 경로로 고르고 내부 링크·매핑만 바꾼다
---

# 미승인 후속 항목 — 권장안으로 진행 (2026-11-21)

## 첫 행동
- 이 문서의 frontmatter `next` 단계부터 진행한다. 계획 원문: `C:\Users\user\.claude\plans\pasted-content-id-8e9a-0-elegant-unicorn.md`.
- 항목마다 새 워크트리(`powershell -File scripts/create-safe-worktree.ps1 -Slug <주제>`) → `npm run fortune:build-data` → 구현·검증 → `git push origin HEAD:main` → 다른 체크아웃에서 `npm run worktree:remove -- <경로>`.

## 지금 상태
- 브랜치: main 직접 머지(워크트리 `wt/*` 경유). 단계별 커밋 SHA 는 아래 "단계" 결과에 적는다.
- 1단계 기준 origin/main: e85f70c69.

## 승인 상태
- 사용자 원문(2026-11-21): "승인 받지 않은 부분에 대해서는 권장안으로 진행해줘" — 위 계획의 "실행" 항목 1~5 를 RED 실행 승인으로 기록한다. 다시 묻지 않는다.
- 함께 적용(사용자, 2026-11-21): "빠르게 진행 … 회귀는 없도록 너무 꼼꼼하지 않아도돼", "서비스 기능에 회귀는 없어야해".
- 승인 밖: 운영 승격, 과금 LLM 실호출, 실결제·운영 DB 쓰기. 아래 "하지 않음" 표.

## 하지 않음 (권장안 = 실행 없음, 기록만)
| 항목 | 권장안 | 근거 |
|---|---|---|
| D1 칩 마크업 삭제 | 롤백 경로로 유지. 플래그가 안정되면 별도 삭제 | 7단계 승인 범위, 스펙 D1 |
| D8 하루 1회 서버 저장 | 계정 ID 로컬 키(현행) 유지. DB 쓰기 없음 | 스펙 D8 추천 "서버 저장은 별도 RED" |
| D10 연애 타로 무료화 | 유료 5,000원 유지 | 스펙 D10 추천 "이번 통합에서 제외" |
| 유료 비회원 결제 | 하지 않음. 유료와 저장은 로그인 유지 | W2 결정 "저장·유료는 로그인" |
| 운영 승격 | 하지 않음. 명시적인 1회 요청 때만 | CLAUDE.md 절대 규칙 3 |
| 과금 LLM 실호출 | 하지 않음. mock만 | CLAUDE.md 절대 규칙 1 |

## 작업 규칙과 함정
- 로컬 main 체크아웃(d:\Development\code-destiny)에서는 편집·pull·reset·stash 금지(옆 세션 공유, origin 보다 뒤처짐). 워크트리에서만.
- `js/destiny-profile.js` 를 바꾸면: `npm run sync:public` → `node scripts/restamp-paid-runtime-pins.mjs`(독립 페이지 22곳 + vedic-astrology.html + billing-client.ts + verify-paid-gate 상수) → `node scripts/verify-payment-freeze.mjs --update` → `verify:payment-choice-parity`·`verify:paid-gate-ui`·`verify:payment-freeze` PASS 확인. 순서는 sync 먼저, restamp 다음.
- `app/**` 를 바꾸면 `npm run sitemap:generate`(원장 서명만 갱신되는 것이 정상).
- Bash heredoc 은 백슬래시를 한 겹 먹는다 — 테스트의 정규식은 `includes` 나 `String.raw` 로.
- 브라우저 클릭은 동의 배너·하단 내비가 가로챈다 → `el.click()`(evaluate)로.
- 알려진 무관 실패: jest 가 옆 세션 `__tests__/fortune/daily-scroll-copy.test.mjs`("must contain at least one test")를 잡는다 — 보고만.
- 금지: 엔진 계산, 결제 실행 파일, .env*, package-lock, wrangler 구조, 리다이렉트 추가. `.claude/skills/fire-your-seo-agency/`·옆 세션 워크트리·`D:\Development\Temp\yeongnyangi-*` 손대지 않음.

## 설계
- 1(R5 숙요·베다): 서양 점성술(1172b1c71·81cc9e199) 계약을 기능 표로 일반화. `lib/guided-flow/astro-draft.mjs` `BIRTH_DRAFT_TARGETS{astro,sukuyo,vedic}`(키·셸 진입·되돌아올 랜딩), `writeBirthDraft`. React `AstroGuidedEntry kind=`(숙요는 장소 단계 없음). 셸 `_dpGuidedBirth` 표, 기능별 되돌이 방지 키. astro 키·주소는 불변.
- 2~5: 계획 원문 그대로(R3 링크만, L1 `FREE_READING_GUEST_ENABLED`, R1 `/free/` `FREE_LIST_PAGE_ENABLED`, 자미는 paid-gate-auditor 감사 후 조건부).

## 단계
- [ ] 0. 이 문서 작성(1단계와 함께 커밋)
- [ ] 1. R5 숙요·베다 가이드 진입 (`GUIDED_SUKUYO_ENABLED`, `GUIDED_VEDIC_ENABLED`)
- [ ] 2. R3 궁합 링크 통합 (301 없음)
- [ ] 3. L1 `/today/`·`/manse/` 비로그인 무료 결과 (`FREE_READING_GUEST_ENABLED`)
- [ ] 4. R1 `/free/` 무료 목록 단독 페이지 (`FREE_LIST_PAGE_ENABLED`)
- [ ] 5. R5 자미 (조건부, 결제 감사 먼저)
- [ ] 마무리: `docs/context/free-tarot-ux-qa.md` 플래그 표·미승인 목록 갱신, 워크트리·임시 파일 정리, main CI 1회 확인, 한국어 최종 보고
