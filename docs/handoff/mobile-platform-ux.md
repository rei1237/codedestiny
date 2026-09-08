---
status: active
updated: 2026-09-08
next: Neo 전략실과 관계 타로 2종의 팝업 브라우저 전체 회귀를 실행 제한이 없는 환경에서 완료하고, 타로 mindscan·궁합 기능군부터 나머지 58개 상세페이지의 기능 근거 확인·확장을 이어간다.
---

# 모바일 플랫폼 UX와 비주얼 상세페이지

**재개 명령·복사용 요청문:** [RESUME.md](../mobile-platform/RESUME.md)

**69개 대상별 작업 원장:** [feature-detail-coverage.md](../mobile-platform/feature-detail-coverage.md)

```powershell
Set-Location -LiteralPath 'D:\Development\code-destiny-mobile-platform-ux'
Get-Content -LiteralPath 'docs/mobile-platform/RESUME.md'
npm run worktree:status
npm run verify:handoff-contract
```

미머지 작업을 이어받을 때는 기존 워크트리를 보존한다. `session:start`는 최신 main·머지된 문서를 요구하므로 현재 재개용 명령이 아니다. 조건과 머지 후 정확한 명령은 RESUME.md에 구분했다.

## 왜

모바일 탐색·공유·뒤로가기·성능을 전수 개선하고 가로형 비주얼 패널을 팝업과 독립 소개주소에 재사용한다. 사용자 정정: 찻집의 “네 가지 찻잔”은 상담 방식이며 유지한다. 결과 대기 화면의 중첩 이미지를 우선 최적화한다.

## 지금 상태

- `codex/mobile-platform-ux-20260908`, 격리 워크트리. 전체 계획은 미완료이며 머지하지 않았다.
- 원격 보존: 초안 PR [#1824](https://github.com/rei1237/codedestiny/pull/1824). 생성 시 main은 `c0bc1b86`로 진행됐고 API의 mergeable=false였다. 최신 main과 공통 파일 통합이 필요하며 자동 머지하지 않는다.
- 상세페이지 구현 보존 커밋: `1ea226a1e`. 후속 문서 커밋은 `git log`로 확인한다. 코드·문서 모두 같은 브랜치에서 이어받는다.
- 대기 화면 중첩 레이어 제거·질문 초안 복원·React 공유 fallback·240ms 강제 홈 타이머 제거.
- 사용자가 상세페이지 방향을 승인했다. 기존 정본에 검증 근거를 추가하고 공통 렌더러·지연 로더·React/정적 팝업 연결 및 `/features/[slug]/`를 구현 중이다. 69개 대상 중 찻집·인생의 책·동물 도감·네오 전략실·핵심 5개 체계(사주·자미두수·숙요·베다·점성술)·관계 타로 2종(우리는 무슨 사이·재회운)까지 11개만 검증 콘텐츠로 등록했다. 배포하지 않았다.
- 추가 디자인 피드백에 따라 반복 카드·테두리를 제거하고 제목 위계·본문 서체·여백·내비게이션·CTA를 정돈했다. 3개 소개주소 × 8개 너비에서 overflow 없음. 모바일/데스크톱 캡처는 `test-results/mobile-platform/refined-*.png`에 있다.
- 후속 피드백: 인생의 책·동물 도감의 결과 캡처와 개발용 안내를 공개 소개에서 제거하고 직접 그린 SVG + HTML 제공 항목 미리보기로 교체했다. 실제 개인 결과를 흉내내지 않고 기질/흐름/장별 해석, 성향/행동/성장 미션을 설명한다. 320/390/430/1280px, 캡처 요청 없음, 금지된 기존 문구 없음, 단위 3개 및 typecheck 통과. 이전 prototype HTML은 역사적 시안이며 최신 화면은 `/features/` 경로다. 동물 도감의 독립 OG 이미지 보강은 여전히 필요하다.
- 검증과 제한은 `docs/mobile-platform/progress.md`가 정본이다.

## 남은 작업

- [ ] 294 route 소스 행(React 242개·정적 52개), 155 마케팅 별칭, 145 action을 실제 기능 단위로 연결. 동적 경로 생성 대상과 전 기능 상태별 검증 필요. 인벤토리의 unverified는 통과가 아니다.
- [ ] 승인된 공통 패널을 나머지 기능으로 확장. 핵심 5개 체계와 관계 타로 2종은 구현 근거·체계별 SVG/HTML·독립 주소 320/390/430px 검증까지 완료했다. 찻집 실제 결과 예시와 tarot mindscan·궁합·초융합 등 나머지 58개 확장이 남았다. React 팝업 검사는 실제 유료 Neo 카드로 수정했으나, `/app/`의 동적 모달 상호작용 전체는 현 실행 환경의 30초 브라우저 제한으로 완료 증거가 없다.
- [ ] 공통 파일 통합 전에 worktree 상태 재확인: 2026-09-08 재검사에서 index.html 및 생성 미러의 다른 작업 중첩이 발견됐다. 디자인 피드백은 전용 CSS/신규 features 경로에 한정했다.
- [ ] 정적 `js/share.js`를 공통 서비스와 연결. 공개 요약 생성/조회·소유권·90일 만료·공유 전 확인은 아직 미구현. 개인 결과 공유를 켜지 말 것.
- [ ] Kakao Developers 로그인/도메인/공개 JS Key 확인, 기능별 OG 및 실제 채널 확인. 새 Secret은 만들지 않았다.
- [ ] 전체 내비게이션·결제 resume·모달/키보드·프로필 여정과 성능 측정. 현재 일부 여정의 mock 증거만 있다.
- [ ] `npm run build` 재실행: 다른 작업의 59211 dev 서버 때문에 저장소 사전 가드가 차단했다. 해당 프로세스를 종료하거나 가드를 우회하지 않았다.

## 정본 예시

`src/features/fortune-tea-house/components/ScentLoadingScene.tsx:116`

## 함정

`npm run sync:public`은 새 공통 JS가 들어오면 셸·미러의 cache key를 재생성한다. 별도 수기 수정이 아니다. Windows SVG 줄바꿈으로 motif 검사가 실패하면 정본 생성기로 재생성한다(논리 diff 없음).

## 검증

```
npm run check:fast
node --test __tests__/ui/share-service.test.mjs
node scripts/test-tea-loading-mobile.mjs
node scripts/test-mobile-platform-journeys.mjs
node scripts/test-share-fallback-mobile.mjs
npm run verify:handoff-contract
```

브라우저 스크립트는 별도 `npm run dev` mock 서버가 필요하다. 실제 LLM·PG·DB·배포는 실행하지 않는다.

## 모르는 것

실기기 iOS/Android, 운영 Kakao 설정, 전체 route 권한/만료 상태, 실사용 CWV는 미검증이다. 파일 용량과 실전 전송량을 혼동하지 않는다.
