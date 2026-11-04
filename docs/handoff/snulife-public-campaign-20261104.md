---
status: blocked
updated: 2026-11-04
next: "기존 main CI 복구 확인 후 변경 검증·main 반영, 정식 캠페인 활성화 및 실제 코드 검증, 스누라이프 회신"
---

# SNULIFE 정식 캠페인

사용자 요청: 정식 캠페인 설정 단계를 구현하고 운영 활성화 후 코드 작동을 확인해 스누라이프에 회신한다. 승인된 기간은 2026-11-04 00:00부터 2027-02-04 00:00까지 KST, 1,000계정이다. 기존 검수 캠페인과 결제 정책은 보존한다.

## 현재 상태

- 정식 캠페인은 활성화하지 않았고 코드 생성·GitHub secret 설정·메일 발송을 하지 않았다.
- `scripts/configure-snulife-public.mjs`, `.github/workflows/snulife-public-campaign.yml`, 관련 모의 테스트를 준비했다. 운영 설정이 이미 존재하면 중단하고 검수 설정은 보존하며 정식 코드를 마지막에 쓴다. Workflow는 main 수동 실행 전용이며 production release와 동시 실행하지 않는다.
- `node --test __tests__/ui/configure-snulife-public.test.mjs` 3개 통과. `npm run check:fast -- --plan`은 critical을 선택했다. `npm run check:fast`는 paid-gate 단계에서 다수 통과했으나 장시간 진전이 없어 중단했다. 전체 검증은 미완료다.
- 커밋 후 `npm run check:pre-push`는 홈 서비스 레지스트리 검사를 통과했으나 public 미러 검사에서 장시간 응답이 없어 중단했다. 전체 사전 전달 검사는 미완료다.
- 원격 main `9cd5aff9226a5c507f04f5a311514f83a998fe40`의 공식 PR CI [41676210944](https://github.com/rei1237/codedestiny/actions/runs/41676210944)가 실패했다. Static guards의 `new concise preparations preserve calculation and identity contracts across products`에서 `saju_mackerel:legacy` manifest 불일치가 발생했고 `CI required`가 실패했다. 저장소 규칙상 다른 커밋의 실패 위에 push하지 않는다.
- 별도 main 체크아웃 `C:/Users/user/Documents/Codex/worktrees/yeongnyangi-blue-passes-20261024-050530`에는 다른 작업의 미커밋 변경이 있다. 작업자의 파일을 수정하거나 지우지 않는다.

## 다음 행동

1. main의 최신 CI가 복구되었는지 확인하고, 승인된 기간이 아직 적절한지 확인한다. 기존 기간을 임의 연장하지 않는다.
2. 작업 커밋을 최신 main에 안전하게 통합하고 `check:fast`, `check:pre-push`, CI를 확인한다. 현재 CI 실패를 숨기거나 우회하지 않는다.
3. 새 정식 코드를 안전하게 생성하고 GitHub Actions secret `SNULIFE_BENEFIT_CODE`에 설정한다. 값을 로그나 저장소에 남기지 않는다. 수동 workflow를 main에서 실행하고 성공·운영 설정을 확인한다.
4. 이전 검수 계정은 이미 verified여서 정식 코드 유효성 검증을 건너뛴다. 미수령 전용 테스트 계정에서 실제 정식 코드 등록과 지정 프로필·10종 접근을 확인하되 실결제와 과금 LLM은 실행하지 않는다. 수량 소비 여부를 기록한다.
5. 확인 후 Gmail 스레드 `1a18223372b04e4a`의 `ad@snulife.com`에 정식 코드, `https://code-destiny.com/snu/`, 실제 등록 기간과 1,000계정 조건을 회신한다. 검증 전 발송하지 않는다.
