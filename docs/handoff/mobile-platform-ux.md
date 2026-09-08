---
status: active
updated: 2026-09-08
next: 상세페이지 3종 시안 피드백을 반영하고 전체 인벤토리의 기능별 사실 확인과 동선 검증을 이어간다.
---

# 모바일 플랫폼 UX와 비주얼 상세페이지

## 왜

모바일 탐색·공유·뒤로가기·성능을 전수 개선하고 가로형 비주얼 패널을 팝업과 독립 소개주소에 재사용한다. 사용자 정정: 찻집의 “네 가지 찻잔”은 상담 방식이며 유지한다. 결과 대기 화면의 중첩 이미지를 우선 최적화한다.

## 지금 상태

- `codex/mobile-platform-ux-20260908`, 격리 워크트리. 전체 계획은 미완료이며 머지하지 않았다.
- 대기 화면 중첩 레이어 제거·질문 초안 복원·React 공유 fallback·240ms 강제 홈 타이머 제거. 상세페이지는 검토용 HTML 시안이며 운영 라우트에 미연결.
- 검증과 제한은 `docs/mobile-platform/progress.md`가 정본이다.

## 남은 작업

- [ ] 294 route 소스 행(React 242개·정적 52개), 155 마케팅 별칭, 145 action을 실제 기능 단위로 연결. 동적 경로 생성 대상과 전 기능 상태별 검증 필요. 인벤토리의 unverified는 통과가 아니다.
- [ ] 3종 목업 검토 후 공통 패널·`/features/[slug]/`·팝업 적용. 찻집 실제 결과 예시 추가, 기능별 근거·가격·CTA 검증.
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
