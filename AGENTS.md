# AGENTS.md — Codex 진입점

> 🔴 **이 파일은 규칙 정본이 아니다.** 규칙을 여기에 복제하지 않는다 — 복제본이 낡는 것이 정확히 지금까지의 사고 형태였다(2026-08-28 정리: 이 파일은 27,813자짜리 미러였고, 워크트리 경로·프로덕션 승격 조항·PR CI 스위트 수가 전부 낡아 있었다).
> **정본은 루트 [CLAUDE.md](CLAUDE.md) 이고, 주제별 상세는 그 파일의 라우팅 표가 가리키는 [docs/context/](docs/context/) 다.**

## Project Identity

- Code Destiny 는 한국어 운세·AI 상담 서비스다 (`code-destiny.com`).
- 사주 · 자미두수 · 수쿠요 · 점성술 · 베다 점성술 · 타로 · AI 상담 · 음악 · PDF 리포트 · 리뷰 · 어드민 · 유료 접근을 함께 다룬다.
- 제품 보이스는 전문적이고 신비롭되 감정적으로 자연스럽고 발이 땅에 붙어 있어야 한다. 🔴 결정론적 공포 마케팅이나 결과 보장 표현은 쓰지 않는다. 상세: [docs/context/content-assets.md](docs/context/content-assets.md) §콘텐츠 보이스.

## 시작 순서

1. **[CLAUDE.md](CLAUDE.md) 전문을 읽는다.** 절대 규칙 6개 · 코딩 원칙 13개 · 결제 게이팅 절대 순서 · 레포 함정 · 작업 격리가 거기 있다.
2. CLAUDE.md 의 **작업별 필독 문서 라우팅 표**에서 이번 작업 축에 해당하는 [docs/context/](docs/context/) 문서를 읽는다. 🔴 "대충 알 것 같다"로 건너뛴 것이 이 레포 사고 이력의 대부분이다.
3. 그래도 애매하면 [docs/CURRENT_DEV_BASELINE.md](docs/CURRENT_DEV_BASELINE.md)(현재 개발 초점) → [docs/CONTEXT_AUDIT.md](docs/CONTEXT_AUDIT.md)(충돌·예외 기록).
4. 문서끼리 어긋나면 **조용히 합치지 말고** `docs/CONTEXT_AUDIT.md` 에 기록한 뒤 사용자에게 보고한다.

🔴 라우팅 표를 여기에 복사하지 않는다. `CLAUDE.md` 를 열어서 본다.

## 절대 규칙 — 요약 (정본: [CLAUDE.md](CLAUDE.md) §절대 규칙)

괄호 안은 CLAUDE.md 의 규칙 번호다. 상충하면 **CLAUDE.md 가 이긴다.**

- **(1)** 과금 LLM 실호출 금지 — Gemini · Workers AI 를 실제로 부르는 검증은 사용자 허락 없이 하지 않는다. 기본은 mock.
- **(2)** 실결제 · 프로덕션 DB 쓰기 · 취소/환불/정산 실행도 같다 — 그 정확한 행위에 대한 명시적 허락이 필요하다.
- **(3)** `main` 직접 작업·직접 배포 금지. 브랜치 → 커밋 → push → PR → CI → 사용자가 머지 → **스테이징** 자동 배포. 프로덕션은 `workflow_dispatch(mode=production)` 수동 승격이며 **승인 없이 실행하지 않는다.** 🔴 **거꾸로, 사용자가 명시적으로 요청하면 에이전트가 대신 실행한다** (`gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`) — 그 허락은 그때 한 번에 대한 것이다. 로컬 wrangler 경로는 `scripts/lib/production-deploy-guard.mjs` 가 막으며 우회 대상이 아니다.
- **(4)** 수정 금지: `.wrangler/` · `package-lock.json` · `.env*` 전부 · `dist/`·`out/` · 마이그레이션 실행 결과물 · `worker/wrangler.toml` **구조**(`[vars]` 추가·수정은 허용).
- **(5)** 비밀정보 노출 금지 — API 키 · 토큰 · MongoDB URI · R2 자격증명 · OAuth/JWT/PortOne 시크릿. 🔴 **유일한 예외**(사용자 승인 연락처 메타데이터 2파일)는 [docs/context/reference-basics.md](docs/context/reference-basics.md) 에 있다.
- **(6)** 기존 기능·라우트·배지(`준비중` 포함)·콘텐츠를 사용자 요청 없이 삭제하지 않는다.

## 작업 방식

- **어떻게 일할지의 정본은 [CLAUDE.md](CLAUDE.md) §코딩 원칙 (1~13)** 이다. 여기에 복제하지 않는다 — 거기서 읽는다.
- 고위험 축(LLM · 결제 · 프로덕션 DB · 배포 · 인증 · Worker 라우팅 · R2 · 과금/접근)에 걸리면 코드를 고치기 전에 **사전 보고 7항목**을 먼저 낸다: [docs/context/coding-principles.md](docs/context/coding-principles.md) §고위험 변경의 사전 보고 7항목.
- Ignore snapshot, archive, and one-off audit paths unless the user explicitly asks for them — 스냅샷·아카이브·1회성 감사 경로는 사용자가 명시적으로 요청하지 않는 한 무시한다:
  `.claude/worktrees/**` · `.codex-worktrees/**` · `.cleanup/**` · `reports/**` · `docs/performance-audit/results/**`
- 검색·삭제 규율(핀셋 검색 · 부정 단언 금지 · 3면 grep 은 `git grep`)은 [docs/context/search-discipline.md](docs/context/search-discipline.md).
- 배포·PR CI 티어·롤백은 [docs/context/delivery-and-ci.md](docs/context/delivery-and-ci.md) **하나가 정본**이다. 요약조차 다른 곳에 두지 않는다.
- 🔴 **작업 격리(워크트리)의 정본은 [CLAUDE.md](CLAUDE.md) §작업 격리** 다. 이 파일이 예전에 적어 두었던 저장소 밖 워크트리 경로는 낡은 것이라 2026-08-28 에 삭제했다 — 되살리지 말 것.

## 사용자 응답

- 🔴 한국어로 답한다(사용자가 달리 요청하지 않는 한).
- 선택지를 줄 때는 **가장 권하는 안을 먼저, `추천` 으로 표시하고** 이유를 붙인다. 우열 없는 나열로 끝내지 않는다.
- 사용자는 개발자가 아닐 수 있다 — 구체적인 파일 경로 · 명령 · 검증 결과 · 롤백 방법을 준다.
- 위험한 작업 전에 경고하고 안전한 mock/샌드박스 대안을 제시한다.
- 불확실하면 `확인 필요` 로 표시한다.
- 최종 보고에 담을 것: 수정한 파일 · 수정 의도 · 건드리지 않은 영역 · 검증한 명령과 그 출력 · 추가 확인이 필요한 부분.
- 작업 중 취약점 · 보안 위험 · 재현 가능한 버그를 발견하면 즉시 보고하고, 다른 세션에서 분리 디버깅할 수 있도록 위험도와 짧은 제안을 남긴다.
