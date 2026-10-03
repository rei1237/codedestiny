---
status: active
updated: 2026-10-03
next: 승인된 시크릿 정리는 완료했다. 정리 커밋의 main CI 통과 후 공식 production workflow를 1회 실행하고, 런 URL을 전달한다.
---

# 마이 달빛 정원과 꽃돼지 성장 카드

## 2026-10-03 재개: 삭제 승인 확인 및 정리 완료

- 사용자가 이 재개 채팅에서 **해당 1개와 목록 1줄 삭제 후 운영 승격 승인**으로 답했다. 아래의 승인 대기·시크릿 존재 기록은 이전 세션 상태다.
- `scripts/sync-cloudflare-worker-secrets.mjs`에서 `DEFAULT_FORTUNE_COST_POINTS` 1줄만 제거했다. app/src/lib/worker/functions/config/scripts/__tests__/test/tests 참조 검색은 이제 0건이다.
- 직접 secret DELETE는 Cloudflare 오류 10215(최신 업로드 버전이 미배포됨)로 거절됐다. `wrangler versions secret delete`로 해당 이름만 제외한 버전 `a224cc74-75f6-4f7c-a0c2-64fcb02c7286`을 생성했다. 운영 트래픽 배포 내역은 전후 동일하며, 다른 바인딩 전체도 전후 동일함을 확인했다. 로컬 운영 승격은 실행하지 않았다.
- 원격 secrets 목록에서 대상 부재, 70→69개를 확인했다. 기존 업로드 용량 가드는 126/128, 여유 2개로 통과했다. 가드·Worker 설정·가격·이용권·인증/API/DB 코드는 변경하지 않았다. 비밀값은 출력·보관하지 않았다.
- `node --check scripts/sync-cloudflare-worker-secrets.mjs`, `node --test __tests__/release/worker-binding-budget.test.js`(3/3), `git diff --check` 통과. `npm run check:fast -- --plan`은 critical 자동 승격을 확인했다.
- `npm run check:fast`는 paid-gate-suite에서 메모리 할당 오류(`Array buffer allocation failed`, CoreCLR 초기화 실패 등)와 함께 exit 1로 중단됐다. 이를 통과로 기록하지 않는다. 공식 main CI가 승격 전 필수 게이트다.
- 수정은 `D:/Development/codedestiny-worktrees/unused-fortune-secret-20261003-225019`에서 격리했다. 원래 main의 미커밋 셸/RSS/marketing/llms 변경과 `.tmp/`는 보존하며 전달 커밋에 포함하지 않는다.

## 사용자 요청과 확정한 방향

- 사용자는 마이 화면을 달빛·꽃 콘셉트로 고급스럽게 정리하고, 프로필 카드를 키우며 기존 레벨업을 좋은 흐름을 가꾸는 과정으로 보여 달라고 요청했다. 구현 후 운영 승격 1회까지 승인했다.
- 실제 코드의 프로필 초안과 레벨업 캡처를 보여드렸다. 꽃돼지와 성장 정보 비중 질문에 **현재 균형 유지**로 답했다. 비중을 다시 조정하거나 재승인받을 필요가 없다.
- 마이 첫 화면은 큰 프로필 요약과 성장 진행률, 기록/이용 관리 그룹, 접을 수 있는 계정 설정 순서다. 프로필 상세는 기존 단일 카드와 CDLevel을 재사용한다.
- 기존 꽃돼지 연이 에셋을 사용한다. 레벨업 시 700ms 응원 동작과 메시지가 나오며 모션 감소 설정을 따른다. 일상 실천과 다음 레벨까지의 경험치를 먼저 보여 준다.
- 경험치 지급·보상 기준, 가격·이용권·월정석·단건 결제, 인증/API/DB 정책은 변경하지 않았다.

## 전달 상태

- 코드 커밋: `09e424135` UI 구현, `b785510f2` 기존 main 변경 병합, `bd2b7df5c78f5eb89a4400816997321f7bb1f048` 병합된 사주 제목 3개 번역 정합성 보정. 모두 main push 완료, PR 없음.
- 중간 코드 CI: https://github.com/rei1237/codedestiny/actions/runs/37125617933 (`bd2b7df5c78f5eb89a4400816997321f7bb1f048`)에서 빌드와 번역 정합성은 통과했지만 병합된 index-inline-runtime 캐시 핀의 미러 불일치를 발견했다. 정적 셸 8벌의 해당 핀 1개를 재생성했다. 최종 CI는 이 문서 이후 main의 최신 커밋 실행을 기준으로 확인한다.
- 이전 CI 37125217605는 빌드·핵심 회귀·타입/lint 통과, 다른 세션의 사주 제목 이모지 제거와 ko 사전의 불일치 3건으로 static guards 실패. 위 마지막 커밋에서 원문 의도를 유지하며 사전 정본에 반영했다.
- 주요 파일: `templates/home-funnel.html`, `styles/my-garden.css`, `js/core/home-funnel.js`, `js/destiny-profile.js`, `i18n/authored/shellCopy-15.json`, `scripts/design/verify-my-garden.mjs` 및 public 미러. `shellCopy-16.json`은 사주 제목 병합 정합성 3키다.
- `app/_lib/billing-client.ts`는 프로필 런타임 캐시 URL만 변경했고, 이에 맞춰 payment-freeze 해시를 갱신했다. 결제 함수 내용은 그대로다.

## 실측 검증

- `node scripts/design/verify-my-garden.mjs`: 병합 전후 각각 11/11 PASS. 360/390/430/1280px, 두 테마, 비로그인/빈 프로필/레벨업. API와 외부 요청은 로컬 mock/차단이며 실결제·실 LLM·운영 DB 쓰기 없음.
- 꽃돼지 뒤 회색 사각 배경 수정 후 시각 검수 통과. 초안 비중 유지 확인.
- `npm run check:fast -- --plan`과 `npm run check:fast` 실행. paid-gate-suite 88/88 및 Node 2332/2332 통과. 마지막 Jest 330묶음/4944개 통과, astro-timezone-dst 1묶음은 Windows 의존 파일 UNKNOWN read로 실행 실패했다. 해당 묶음만 재실행하여 16/16 PASS. 전체 명령의 exit 1 자체를 통과로 바꾸어 기록하지 않는다.
- 병합 후 `verify:sitemap-drift`, `verify:payment-freeze`, `verify:payment-choice-parity`, `git diff --check` PASS. 제목 보정 후 `node --test __tests__/ui/shell-dictionary-parity.static.test.js` 4/4 PASS.
- 초안과 검증 JSON 보관: `C:/Users/user/.codex/visualizations/2026/10/03/01a101ac-87fd-7652-b265-959c3ebd3498/my-garden/`의 `390-pig-draft-profile.png`, `390-pig-draft-levelup.png`, `verification.json`.

## 운영 차단과 다음 행동

- 이번 세션에서 Cloudflare secrets 목록을 **읽기 전용**으로 재조회했다. Worker text binding 127/128, 여유 1개로 최소 2개 가드에 걸린다. `DEFAULT_FORTUNE_COST_POINTS`가 아직 존재한다.
- `git grep`으로 app/src/lib/worker/functions/config/scripts/__tests__/test/tests를 확인한 소비자는 `scripts/sync-cloudflare-worker-secrets.mjs` 동기화 목록 1곳뿐이다.
- 사용자에게 해당 미사용 운영 시크릿 1개와 재등록 방지용 동기화 목록 1줄 삭제 승인 질문을 보냈다. **응답 전에는 삭제하지 않는다.** 기존 관련 기록은 `docs/handoff/2026-10-03-ggulggul-home-release.md`다.
- 이번 세션의 운영 workflow는 아직 실행하지 않았다. 승인 후 해당 항목만 정리하고 검사/커밋/main push/CI 확인 뒤 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`을 1회 실행한다. 기존 전달 계약대로 실행 후 release를 폴링하지 않고 실행 URL을 전달한다. 운영 완료를 확인했다고 쓰지 않는다.
- 작업 위치는 main `D:/Development/code-destiny`다. 다른 세션의 index/public 셸 캐시핀, RSS/llms/marketing 및 `.tmp/` 미커밋 변경을 보존했으며 커밋에 포함하지 않았다. 범용 reset/stash/clean을 쓰지 않는다.
