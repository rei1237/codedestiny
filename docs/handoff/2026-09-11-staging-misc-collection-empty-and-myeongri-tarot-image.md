---
status: active
updated: 2026-09-11
next: "스테이징에서 기타 운세 컬렉션이 데스크탑·모바일 모두 빈 화면으로 보이는 원인 규명, 명리학 타로 이미지 미참조 원인 규명"
---

# 2026-09-11 스테이징 기타 운세 빈 화면 + 명리학 타로 이미지 미참조

## 이미 끝난 것 — 다시 하지 말 것

이전 세션에서 CI 배포 파이프라인 결함(PR #1899가 깨뜨린 `dispatch_staging` 잡의 `gh workflow run`에
`-R owner/repo` 누락)을 찾아 PR #1911로 고쳤고, **머지·스테이징 자동 재배포·검증까지 전부 완료됨**.

- PR #1911 머지 SHA: `72a006600f4fdb4d05582016650461c474620b5f` (main에 반영됨)
- `node scripts/verify-deployed-sha.mjs --sha=72a006600f4fdb4d05582016650461c474620b5f --origin=https://staging.code-destiny.com` → PASS (Pages·Worker 모두 이 SHA)
- `npm run deploy:smoke -- --base https://staging.code-destiny.com` → PASS
- `npm run verify:staging-noindex` → PASS
- 별도로 PR #1910(오래된 브랜치의 중복 수정)은 사용자 승인 하에 닫힘 — 모바일 오버레이 자체 버그는 이미 main의 PR #1906으로 정상 수정되어 있음(관련 문서: [docs/handoff/2026-09-11-room-visibility-fullscreen-fix.md](2026-09-11-room-visibility-fullscreen-fix.md), status: superseded).

**즉 스테이징은 지금 최신 main(파이프라인 수정 포함)을 정확히 서빙하고 있다.** 파이프라인 문제를 다시 조사하지 말 것.

## 지금 문제 — 사용자 재보고 (2026-09-11, 파이프라인 수정 이후)

사용자 원문: "여전히 스테이징 사이트에서 기타 운세 컬렉션 부분은 데스크탑에서 비어서 나오는 문제가 있고
모바일에서도 그 부분은 비어서 나오고 있어 추가로 명리학 타로에 들어갈 이미지는 미참조가 된 문제가 있다"

### 문제 1: "기타 운세" 컬렉션이 데스크탑·모바일 모두 빈 화면

🔴 **이전 세션의 실측과 상충한다 — 이전 실측을 신뢰하지 말고 재검증부터 할 것.**

이전 세션에서 스테이징 라이브 페이지를 헤드리스 Chrome(CDP)으로 열어 데스크탑 뷰포트(1440x900)에서
`window.__cdExpandHome()`을 호출한 뒤 다음을 확인했다:

```
miscDisplayAfter: "block"
miscVisibilityAfter: "visible"
miscRect: { width: 1410, height: 360, top: 15699.6875 }
allCollectionHeaders: 8개 전부 display:block (miscCollection 포함)
```

이 검사는 `.fg-group` 래퍼(`#miscCollection`의 `closest('.fg-group')`)의 **CSS display/visibility/bounding-rect만**
확인했고, **그 안의 실제 카드 콘텐츠가 렌더링됐는지는 확인하지 않았다.** 사용자가 보고하는 "비어서 나온다"는
십중팔구 이 안쪽 콘텐츠 문제이므로, 다음 세션은 반드시 다음을 확인해야 한다:

1. `#miscCollection` (또는 그 자식 카드 그리드) 내부의 실제 자식 엘리먼트 개수·innerHTML을 다른 컬렉션(예:
   `#tarotCollection`)과 비교. 다른 컬렉션은 카드가 차 있는데 misc만 비어 있다면 콘텐츠 마운트 문제.
2. **가장 유력한 선행 단서** — 이전 세션이 정적 분석으로 찾은 구조적 비대칭:
   - `index.html`의 `.fg-group.fg-group--misc`는 `.feature-card-grid`의 **형제(sibling)**이지, 나머지 7개
     컬렉션처럼 그 **자식**이 아니다 (`index.html:17478` 부근).
   - `js/core/home-funnel.js:29`의 `move('#inputPage > .feature-card-grid', 'cdhCollections')`는
     `.feature-card-grid` 자체를 통째로 옮기므로, 그 바깥에 있는 misc 그룹은 `#cdhCollections` 안으로
     결코 재배치되지 않는다.
   - 만약 카드 콘텐츠를 실제로 채워 넣는 로직(지연 마운트·데이터 바인딩 등)이 `#cdhCollections` 하위
     엘리먼트만 순회한다면, misc는 컨테이너 자체는 보여도(`display:block`) 안이 비어 있는 것으로 정확히
     설명된다. **이 가설을 코드에서 실측으로 확인할 것** — 아직 추정 단계다.
3. 모바일에서도 동일 증상이면 모바일 오버레이 로직(`setGroupActive()`, `group.closest('#cdhCollections')`가
   misc에서는 `null`을 반환한다는 것도 이전 세션이 정적으로 확인한 사실 — [docs/handoff/2026-09-11-room-visibility-fullscreen-fix.md] 참고)도 같은 뿌리일 가능성이 있다.
4. 실제 화면 스크린샷(visual-checker 에이전트 또는 육안)으로 먼저 증상을 재현·기록한 뒤 원인을 좁힐 것 —
   DOM 속성만으로 결론 내리지 말 것(이번 상충의 교훈).

### 문제 2: 명리학 타로 이미지 미참조 — 조사 전무

사용자가 방금 보고한 신규 항목이며 이번 세션에서 전혀 조사하지 않았다. 다음 세션은:

1. "명리학 타로"가 정확히 어느 라우트/컴포넌트인지부터 특정 (`/tarot/mingri/` 관련 코드가
   `scripts/verify-mobile-cdp-smoke.mjs`에 이미 언급됨 — 단서일 수 있음, 확인 필요).
2. 어떤 이미지가 "미참조"인지 — 깨진 `<img src>`, 존재하지 않는 에셋 경로, 아니면 CSS
   background-image 누락인지 콘솔 네트워크 탭/404로 실측.
3. 사용자에게 스크린샷이나 구체적 화면 경로를 요청해도 됨 — 근거 없이 추측하지 말 것.

## 검증 명령 (다음 세션 시작 시 재사용)

```bash
# 스테이징이 여전히 최신 main인지 먼저 재확인 (드리프트 재발 가능성 배제)
node scripts/verify-deployed-sha.mjs --sha=$(git rev-parse origin/main) --origin=https://staging.code-destiny.com --attempts=1 --delay-ms=0
```

## 작업 시 주의

- 이 저장소는 RED 등급(라우팅/공유 동작 수정 가능성) — 원인 특정 전에는 코드를 고치지 말고, 워크트리
  격리 후 최소 수정 → PR → 필수 CI 통과 → 머지는 사용자 승인 범위에서만.
- `codex/bug-report-room-visibility` 브랜치는 이제 참고 가치 없음(위 superseded 문서 참고) — 새 작업은
  origin/main 기준 새 워크트리에서 시작할 것.

## 다음 세션 시작 프롬프트

```text
docs/handoff/2026-09-11-staging-misc-collection-empty-and-myeongri-tarot-image.md 를 먼저 읽고
"문제 1: 기타 운세 컬렉션 빈 화면" 재검증부터 시작해줘 — 이전 세션의 CDP 검사는 컨테이너 display만 확인했고
실제 카드 콘텐츠는 확인 못 했으니, 실제 카드 자식 엘리먼트 개수를 다른 컬렉션과 비교하는 것부터.
CI 배포 파이프라인 문제(PR #1911)는 이미 해결·검증 완료이니 재조사하지 말 것.
```
