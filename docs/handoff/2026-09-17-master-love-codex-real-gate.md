---
status: done
updated: 2026-09-17
next: "운영 실결제 테스트 결과(1장만 생성·카카오페이 복귀·서재 CTA) 후속은 2026-09-17-master-love-codex-chapter1-only.md에서 이어간다."
---

# 마스터 인연의 서 — 결제 후 생성 실패·결제 복귀·내 서재 인수인계

## 원인 (실측)

- 운영 읽기 전용 조회(2026-09-17): 09-01 이후 인연의 서 세션 6건 전부 저장된 장 0개. 실패는 전부 품질 게이트(`LLM_OUTPUT_TOO_SHORT`, `LLM_EVIDENCE_INVALID`)이고, 관련 결제 6건은 모두 환불 상태였다.
- 스테이징은 `STAGING_LLM_MOCK_ENABLED=true`라 mock 출력이 게이트를 우회해 실출력 경로를 한 번도 거치지 않았다.
- 실제 gemini-2.5-flash 호출(승인된 3회 모두 사용): 프롬프트 스키마(evidenceId·subject·system·period·certainty·crossChecks)와 게이트의 기대가 어긋나 출력 100%가 탈락했다. 본문 길이의 실측값은 minChars의 약 76%였다.
- 결제 복귀를 수동으로 눌러야 했던 원인: PG 리다이렉트 뒤 새 문서가 로드될 때 일어나는 인증 복원(`user:null → 실제 사용자`)을 `usePaidDeliveryScope`가 계정 전환으로 오인해 이어받기를 취소하고, 랜딩과 "지금 열기" 카드로 되돌렸다.

## 수정 (main, 커밋 단위로 되돌릴 수 있음)

| 커밋 | 내용 |
|---|---|
| `f1dd780a4` | 근거는 계산 기록 기준으로 정규화(모르는 id는 버림), crossChecks 상태는 계약값으로 강제, 장 사이에 반복된 문장은 탈락시키지 않고 잘라냄, 최종 하한 `ceil(minChars×0.7)`, 최종 점검 `stalled` 무한 정체 제거 |
| `06aadb722` | `usePaidDeliveryScope(cb, { survivesAuthRestore: true })` 옵트인(인연의 서만 사용). 인증 확정 전 첫 복원은 전환으로 보지 않고, 확정 후의 계정 전환·로그아웃은 계속 무효화 |
| `7287ba0ac` | 내 서재: `/sessions`에 이름·진행도 추가, 랜딩 카드형 서재(다시 읽기 / 이어서 집필 / 집필 시작), 결과 화면 하단 "내 서재" 링크, 5개 로케일 |
| `188019802` | 부분 저장 재개 테스트에 새 의존성 주입 |
| `548eb8439` | sitemap lastmod |
| `65708387b` | 신규 테스트 lint(`module` 대입) 수정 |

## 검증

- `tsc --noEmit` 0, 인연의 서 jest 184개, UI node 29개(인증 복원 신규 6개 포함), `paid-report-partial` 5개, `check:fast` paid-gate-suite 88/0, lint·entry-encoding 통과, `verify:sitemap-drift` OK.
- 서재 UI: esbuild 렌더에 `/sessions` mock을 붙여 390·430·1280px 스크린샷을 찍음. 가로 넘침 0, 버튼 높이 44px, 결제 API 호출 0. visual-checker가 판정했고 지적 2건(진행 막대 폭, 버튼 최소 폭)은 반영했다.
- 수정 후 실제 호출 1회로 게이트 통과를 확인했다. 20장 전체의 실제 완주는 미검증이며, 운영에서 실결제 테스트로 확인해야 한다.

## 운영 승격 (사용자 1회 승인)

- `65708387b` main CI `CI required` success, 스테이징 배포 success.
- 운영 릴리스 [35217791543](https://github.com/rei1237/codedestiny/actions/runs/35217791543) success. 배포 SHA는 main HEAD인 `23cf9995d`로, 동시 세션의 docs 커밋과 숙요 궁합 복귀 수정 `677092e1c`가 함께 포함됐다. 이 SHA의 `CI required`도 success.
- `verify:deployed-sha -- --sha=23cf9995d118188ff48a4db3d3607cff4f9ffba8 --attempts=1`: Pages·Worker 모두 PASS.
- 첫 push `548eb8439`의 CI는 신규 테스트 lint와 동시 세션 `579e154dd`의 robots 단언 불일치로 실패했다. 후자는 그 세션이 `4a87c5985`로 수정했다.

## 롤백

- 전체 되돌리기: `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=rollback`
- 부분 되돌리기: 해당 커밋만 `git revert` 후 push, 재승격

## 후속 과제 (보고만, 이번 범위 밖)

- 동결 파일 `js/destiny-profile.js`의 핸들러 8초 대기와 GRANT_PENDING 4초 안내가 복귀 체감 속도를 늦춘다. payment-freeze 절차가 필요하다.
- 인앱 브라우저 appScheme, 카드사 앱·카카오톡 앱에서 브라우저로 돌아오는 OS 전환은 코드로 없앨 수 없다.
- `scripts/verify-master-love-codex-payment-recovery.mjs`는 기준 커밋 `6193d7206`에서도 alert 대기 타임아웃으로 실패한다(이번 변경 이전부터 있던 문제). CI에 배선되어 있지 않다.
- `verify:payment-freeze`를 실행하면 `billing.js` 상한이 `config/payment-freeze.json`에 자동으로 조여진다. 동시 세션의 미커밋 변경과 충돌하므로 되돌려 두었다.
