---
status: in-progress
updated: 2026-11-26
next: 기존 워크트리에서 런타임 PDF 저장을 모의 데이터로 검증하고 달빛 예화 조판을 마무리한다.
---

# 연애 비책·인연의 서 결과 및 달빛 예화 PDF

## 첫 행동

`D:\Development\code-destiny\.tmp\report-readability`에서 이 문서와 `CLAUDE.md`를 읽고 `git status --short --branch`, `git fetch origin`으로 실제 상태를 확인한다. 작업 코드의 마지막 커밋은 `8e6a60739d470ac1d034317c4838a98d0783bff7`이다. 목표는 두 서비스 결과 및 PDF에 담당 마스터 이미지를 보여주고, 저장된 근거와 지표를 읽기 쉽게 정리하며, PDF에 고급스러운 달빛 예화 스타일을 적용하는 것이다.

## 지금 상태

- 작업 워크트리 `D:\Development\code-destiny\.tmp\report-readability`, 브랜치 `wt/report-readability`. 원래 작업 트리의 다른 변경은 그대로 있다.
- `7cb07d9738`에서 웹·보관함·PDF 기본 개선을 커밋했다. `8e6a60739d470ac1d034317c4838a98d0783bff7`에서 달빛 예화 PDF를 커밋했다. 둘 다 로컬이다.
- 작업 베이스는 `4ca8015f15`. 마지막으로 읽은 원격 main은 `b464d947ae1c8cd4d6ed7da5d362f0eb251884f5`. 이어받을 때 최신 원격과 비교한다.
- 공유 main의 병합 가능 여부를 `git read-tree -n -m -u HEAD origin/main`으로 확인했더니 기존 미추적 파일 `__tests__/ui/legacy-home-head.test.mjs`가 덮어써진다고 Git이 차단했다. 공유 main에서 reset, stash, 파일 이동·삭제를 하지 않는다. 기존 변경 소유자와 충돌이 해소될 때까지 커밋은 워크트리에 보존한다.

## 승인 상태

- 사용자 요청은 “LLM으로 생성되는 결과 또는 PDF 결과에 마스터들의 이미지라든지 적절한 그래프나 표” 개선이다. 첫 적용은 사용자가 선택한 **연애 비책·인연의 서**다. “Please implement the plan.” 이후 “PDF UI/UX가 별로이므로 고급스럽게 개선해줘”, “PDF에도 달빛 예화 스타일을 넣어주도록해”가 추가됐다. 마지막 요청은 토큰 한도로 Claude에게 넘길 문서와 프롬프트를 작성하는 것이다.
- 실제 LLM, 결제, 운영 DB, 운영 배포는 검증에 사용하지 않는다. 기존 이용권·월정석·단건 결제, 접근 권한, 저장 원본, API 응답을 보존한다.

## 설계와 함정

- 연애 비책은 기존 연이·서한비 초상/화자 키를 쓴다. 신규 결과의 `sajuSummary.calendar`와 보관함의 `sajuResult.calendar`에서 기존 계산값만 같은 모양으로 읽는다. 인연의 서는 공식 초상과 저장된 `loveDna`를 쓴다. 실제 점수 0을 보존하며 누락된 값은 그리지 않는다.
- [달빛 예화 정본](../context/design-canon.md#달빛-예화-기본-ui-계약--2026-10-25-사용자-확정)과 `DESIGN.md`를 따른다. `lib/pdf/consultation-book-editorial.ts`는 기존 `public/icons/yehwa-branch.svg`를 재사용한다. 표지는 초승달·꽃가지·이중 테두리, 연애 비책 크림/로즈, 인연의 서 밤색/골드다. 본문은 종이색을 사용하며 초승달 페이지 표시, 구분선이 있는 링크 목차, 실제 헤더가 있는 일진 표, 지표별 근거를 막대 아래에 둔다. 두 서비스만 선택형으로 적용한다.
- PDF 샘플은 시스템 한글 글꼴과 실제 이미지로 오프라인에서 만들었다. 실제 내보내기가 가져오는 Paperlogy 폰트와 SVG 래스터화의 동작, Safari/크롬의 이미지 실패 경로는 별도로 확인한다. 샘플에서 연애 비책 표지의 초상과 이름 사이 간격이 넓으므로 이름을 초상 바로 아래에 붙이는 조정도 우선 검수한다. 긴 근거로 표가 다음 쪽으로 넘어갈 때 헤더의 현재 배치와 반복을 확인한다.
- 재현 자료는 `D:\Development\code-destiny\.tmp\report-readability-pdf.mjs`, `report-readability-love.pdf`, `report-readability-codex.pdf`에 있다. 워크트리에서 `node ../report-readability-pdf.mjs`로 재생성하고 `pdftoppm`으로 렌더한다. 실제 브라우저 PDF 저장 검증과 구분한다.

## 단계

- [x] 결과 화면·보관함·PDF에 공식 초상과 기존 요약·시각화 연결.
- [x] 모의 브라우저로 두 화면을 360·390·430·1280px에서 확인. 초상 로드, 가로 넘침 없음, 연애 비책 표 두 개, 인연의 서 글자 크기 토글과 연애 DNA 앵커를 확인했다.
- [x] 관련 Node 회귀 23개 및 `npm run verify:love-secret-ai-flow`, `npm run verify:master-love-codex-flow` 통과. 첫 구현에서 `npm run typecheck` 통과. 달빛 예화 샘플을 조판·렌더해 표지, 요약, 목차 PDF 링크 어노테이션과 A4 페이지 수 확인. 연애 비책 34쪽, 인연의 서 4쪽.
- [ ] 달빛 예화 커밋 기준 typecheck 결과를 확인 또는 재실행한다. 실제 브라우저 PDF 저장에서 초상·꽃가지·한글 복사·목차 링크를 확인한다. 긴 데이터와 자산 실패, 보관함 경로도 확인한다.
- [ ] `npm run check:fast`는 78개 중 76개 통과, `verify:llm-generation-resilience`와 `verify:analysis-basis-contract` 실패로 중단됐다. 원인은 독립 확인하지 않았다. 최신 main과 분리 비교한 뒤 작업 관련 회귀만 수정한다.
- [ ] 공유 main 작업과 충돌이 안전하게 풀리면 최신 원격에 정리하고 프로젝트의 main 병합, `npm run check:pre-push`, push, CI 확인 절차를 따른다. 마무리 시 이 문서를 done으로 닫고 작업 워크트리와 임시 산출물을 정리한다.
