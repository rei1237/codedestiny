# 러브 코드 영구 해금 정정

## 정책과 정본

- feature key: `love-code`
- product key: `unlock.love-code`
- 가격: 10,000원 (`100` coins)
- entitlement: 계정 스코프 `ContentEntitlement`, `grantType: permanent_unlock`, `expiresAt: null`
- 구 키 `loveSimulation`, `openLoveSimulation`은 과거 결제 기록과 브라우저 캐시를 읽는 별칭일 뿐, 새 결제와 응답에는 쓰지 않는다.

## 원인

기존 서버 등록소는 `loveSimulation`을 영구 해금으로 분류했지만, 사주 대시보드, 정적 AccessStore, React 결제 재개가 서로 다른 키와 오래된 로컬 스냅샷을 읽었다. 특히 PG 확정 후 `User.unlockedFeatures`에 주문 원본 키를 기록해 canonical entitlement와 표시 키가 갈라질 수 있었다.

## 지급과 재접근

1. 단건 PG, 이용권, 월정석 모두 canonical 상품을 푼다.
2. 이미 가진 계정은 entitlement/user unlock 배열의 canonical 및 legacy 키를 먼저 조회해 `ALREADY_UNLOCKED`로 통과한다.
3. 최초 성공은 `ContentEntitlement`와 `User.unlockedFeatures`/`paidFeatures`에 `love-code`를 멱등 저장한다. PG 지급 실패는 주문의 미지급 상태로 남아 기존 webhook/reconcile 경로가 같은 지급 함수를 재시도한다.
4. access-state 및 billing snapshot은 legacy 키도 읽지만 `unlockMap["love-code"]`와 canonical 배열만 방출한다. 이용권 잔여량과 월정석 만료는 재접근 판단에 쓰지 않는다.

## UI와 모바일 재개

`useCanUseFeature`는 AccessStore를 단일 읽기 경로로 사용한다. 상태가 `loading` 또는 `error`이면 결제 CTA를 노출하지 않는다. `unlocked`는 실행 CTA, `locked`만 10,000원 결제 CTA를 보인다.

결제 descriptor에는 `featureKey: "love-code"`를 저장한다. 인페이지 결제 성공과 모바일 redirect resume은 모두 AccessStore revalidate, billing balance fresh 조회, payment eligibility cache 무효화를 기다린 뒤에 실행 화면을 연다. 배포 전 브라우저에 남은 `loveSimulation` resume kind도 읽기 호환으로 한 번 처리한다. 로컬 optimistic unlock은 전환 보조이며, 서버 스냅샷이 최종 권한이다.

## 기존 결제자 보정

```powershell
npm run repair:love-code-unlocks -- --dry-run
npm run repair:love-code-unlocks -- --apply
```

기본과 `--dry-run`은 읽기 전용이다. 성공한 10,000원 결제, active legacy entitlement, legacy 사용자 unlock 배열을 교차해 후보를 찾고, `--apply`에서만 canonical entitlement 및 사용자 배열을 `$addToSet`/upsert로 보정한다. 로그의 사용자 식별자는 SHA-256 축약값이며, 재실행은 멱등이다.

## 검증 결과와 롤백

- mock PG/권한 검증만 사용한다. 실제 PortOne/KG이니시스, LLM, 운영 DB는 호출하지 않는다.
- 통과: `verify:love-code-permanent-unlock`(3 checks), worker entitlement Jest(27 tests), `verify:per-use-never-unlocks`(23 checks), `verify:saju-unlock-entitlement-regression`, `verify:paid-resume-wiring`, `verify:paid-gate-ui`, `typecheck`, mobile pricing static test(5 tests).
- `check:fast`/`check:payment`은 이 격리 worktree 밖의 변경까지 포함하는 기준 SHA를 사용해 기존 `config/sitemap-lastmod.json` 드리프트에서 중단됐다. 이 작업은 sitemap 설정을 수정하지 않았고, 대상 결제/권한 검증은 위 명령으로 별도 통과했다.
- 롤백이 필요하면 애플리케이션 코드를 되돌리되, 이미 생성된 `love-code` entitlement는 삭제하지 않는다. legacy read alias가 남아 있어 배포 순서가 바뀌어도 기존 구매 기록은 계속 읽힌다.
