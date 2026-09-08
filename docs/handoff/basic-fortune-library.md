---
status: active
updated: 2026-09-08
next: "PR #1818 필수 CI를 확인한다. 기존 상세 해석 번역과 운영 LCP·CLS는 별도 작업으로 이어간다."
---

# 기본 운세 결과 모달

## 지금 상태

`codex/basic-fortune-library`에서 숙요점·자미두수 표시 계층과 모달 접근성을 개선했다. 최신 `origin/main`을 merge 방식으로 통합했고 생성 파일인 사이트맵 레지스트리는 main을 기준으로 다시 생성한다. 프로필 운세 선택창과 두 결과 모달에 dialog 의미, 포커스 순환·복귀, `Escape`, URL을 바꾸지 않는 Back/Forward 수명주기를 적용했다. `window.BasicFortunePresentation`의 `sukuyo`, `ziwei`, `init` 공개 인터페이스는 유지했다. 사용자 요청으로 새 점성술 요약·탭은 제거하고 원래 점성술을 유지했다. PR 머지·배포는 범위에 포함하지 않는다.

## 남은 확인

- [ ] PR #1818 필수 CI 최종 상태 확인. 모든 필수 검사가 성공하고 base 충돌이 없어야 한다.
- [ ] 기존 상세 해석 번역은 별도 작업으로 분리한다. 이 PR은 아래 혼용 현황만 기록하며 기존 리포트 문구를 번역하지 않는다.
- [ ] 운영 환경의 LCP·CLS는 배포 후 별도로 측정한다. 로컬 단일 mock 관측을 운영 성능으로 일반화하지 않는다.

## 비한국어 혼용 감사

`after/report.json`에서 영어·일본어·중국어 간체·번체 각각의 보이는 한글 텍스트 노드를 렌더러별로 수집했다. 네 로케일 모두 동일하게 숙요점 422개(`renderSukuyo`), 자미두수 825개(`renderZiwei`)이며 신규 presentation 레이블에서는 발견되지 않았다.

- 숙요점 대표 사례: `.sy-intro-eyebrow`의 `당신의 본명숙`, `.sy-intro-title`의 `성(星)`, `.sy-intro-symbol`의 기존 본명숙 설명.
- 자미두수 대표 사례: `.fr-facts`의 `토5국(土五局)`, `.zw-empty-state`의 `궁(宮)을 클릭하시면`, `각 궁에 대한 해석이 나옵니다.`
- 소유 경계: 숙요점은 기존 `renderSukuyo`, 자미두수는 기존 `renderZiwei`가 소유한다. 새로 추가한 제목·접기·궁 바로가기 레이블은 5개 로케일 검사를 통과했다.

## 정본

설계·재현 명령: `docs/design/basic-fortune-library.md`.
계산 회귀·화면 검사: `scripts/verify-basic-fortune-library.mjs`.

## 검증

`node scripts/verify-basic-fortune-library.mjs --baseline`과 후속 실행 통과. 세 계산 fixture 동일성, 360·390·430·768·1280px 넘침 없음, 궁 선택, 긴 이름·5개 언어, 빈 프로필·정보 일부 누락·새로고침·로딩·오류 복구·모의 공유를 확인했다. 숙요점·자미두수 각각 프로필 버튼부터 키보드 진입, `Tab`/`Shift+Tab` 경계, `Enter` 접기와 `aria-expanded`, 닫기·`Escape` 후 포커스 복귀, Back 시 URL·스크롤 유지와 모달만 닫힘, Forward 복원, history 중복 방지도 통과했다. 로컬 산출물은 `.impeccable/basic-fortune/`에 보관하며 커밋하지 않는다.

`verify:mobile-detail-nonintrusive`, `verify:mobile-detail-render`, `verify:hero-contrast` 통과. 모바일 정적 fixture 검사는 일부 runtime 제목을 검사하지 않으므로 위 실제 렌더 mock 검사와 함께 해석한다. 실 LLM·결제·운영 DB 호출은 수행하지 않았다.

`npm run check:fast -- --plan`은 공통 런타임 변경을 `critical`로 승격했고, 이어서 실행한 `npm run check:fast`는 Node 930개·Jest 218 suite/2417개를 포함해 통과했다. `js/destiny-profile.js` 내용에서 유도된 `build-3a7b24d24e59` 캐시 핀을 React 런타임과 독립 정적 페이지 25개 소비 지점에 동기화했으며 관련 결제 회귀 검사도 통과했다.
