---
status: done
updated: 2026-10-19
next: "완료. 운영 승격은 별도 요청이 있을 때 진행한다."
---

# 영냥이 선택 회귀 및 상담 안내

- 작업 디렉터리: `D:\Development\code-destiny`
- 기능 변경 커밋: `f0d183b062d227aaa58d626d25259b4df0dbc1bc` (main push 완료).
- 최초 CI: https://github.com/rei1237/codedestiny/actions/runs/39147516224 — QA 스크립트의 `module` 변수명 규칙 위반, 인연의 서 검색 제목 폭 61/60 초과, 이전 신점 소개 문구를 기대하던 정적 검사 실패를 확인했다.
- 두 번째 CI: https://github.com/rei1237/codedestiny/actions/runs/39148303601 에서 lint 이후 타입 검사가 실행되며 `tarotSample.excerpts`의 optional 타입 오류 4곳을 확인했다. 원문 4개가 있는지 검증한 뒤 확정된 배열을 렌더하도록 수정했다. 원문과 화면 출력은 유지한다.
- 후속 수정: 변수명을 `catalogModule`로 변경, 검색 제목을 20개 챕터를 유지하면서 폭 47로 단축, 정적 검사를 요청한 별의 기운·프라슈나/호라리 설명에 맞췄다. 계산·결제 동작 변경은 없다.
- 작업 워크트리와 wt 브랜치, 임시 로그를 정리했다. 이 문서와 후속 CI 수정은 별도 커밋으로 전달한다.

## 반영 사항

- 카탈로그 로딩 중 선택 화면이 잠깐 노출됐다 사라지는 현상과 명시한 운세 선택을 과거 질문 초안이 덮어쓰는 현상을 수정했다.
- 운세 종류·질문 화면에 영냥 신점 진입 추가. 실제 프라슈나 계산과 별도 호라리 기능을 구분하여 질문 순간의 별을 영냥이가 풀이하는 방식으로 설명했다.
- 홈의 중복 설명·이미지와 펼쳐진 FAQ를 줄였다. 질문 입력 UI를 정리하고 가상 프로필의 실제 타로 원문 발췌를 보강했다.
- 인연의 서 개인판·궁합판 각각 20개 챕터·총 5만 자 목표, 초융합 오마카세 44개 챕터·최대 약 12.6만 자 목표를 현재 코드 기준으로 안내한다. 페이지 수나 모든 상품의 고정 분량을 보장하지 않는다.
- 가격·결제/이용권/월정석 정책, 인증, 서버 API·DB·계산 로직은 변경하지 않았다.

## 검증

- 관련 node 테스트 5개 파일: 31/31 통과.
- `node scripts/qa/verify-yeongnyangi-intake.mjs`: 7개 운세 진입, 지연 카탈로그, 오래된 초안, 선택 유지, 4개 화면 폭, 프로필 저장 재시도·로그인 복원·mock 요청 통과.
- `node scripts/qa/verify-yeongnyangi-clear-flow.mjs`: 360/390/430/1440px 12개 화면과 최신 영냥 신점 선택·설명 details targeted 검증 통과. 외부 트래픽·실 LLM·결제·DB 없음.
- 변경한 TSX/TS eslint, `npm run sync:public`, `npm run verify:sitemap-drift`, `npm run check:pre-push` 통과.
- 후속 실패 재현 검사: 두 QA 스크립트 eslint 및 문법 검사 통과. `node --test __tests__/ui/yeongnyangi-copy.test.mjs` 4/4 통과. CI의 실제 `serpTitleWidth` 함수를 실행한 제목 폭 검사 47 <= 60 통과. 사이트맵은 정식 생성기로 갱신했다.
- `npm run check:fast -- --plan` 실행. `npm run check:fast`는 90개 전체 유료 게이트로 확대되어 중단했으며 통과로 간주하지 않는다. 공식 CI 결과는 위 실행에서 확인한다.
- 캡처와 targeted 보고서: `C:\Users\user\.codex\visualizations\2026\10\18\01a14fdd-9cba-73e3-8b43-3a3cb285c2bc\yeongnyangi`.
- 미검증: 실제 모바일 OS 키보드, 실결제·LLM·운영 배포. 이번 작업은 운영 승격을 실행하지 않았다.

## 다음 명령

```powershell
Set-Location 'D:\Development\code-destiny'
git log -1 --format='%H %s'
gh run list --workflow pr-ci.yml --branch main -L 1 --json status,conclusion,headSha,url
```

최종 기능 커밋의 공식 CI를 통과해 이 기록을 done으로 닫았다. 다른 세션의 `.claude/skills/fire-your-seo-agency/`는 보존한다.

- 타입 오류 후속 검증: `npm run typecheck` 전체 통과(exit 0), 해당 Guide eslint 통과, 상담 예시·영냥이 문구 테스트 10/10 통과.

## 요구사항 재대조

- 현재 main 소스에서 카탈로그 전 로딩 처리, 명시적 운세 선택과 이전 질문 초안 분리, 운세 카테고리의 영냥 신점 링크를 확인했다. QA는 지연 카탈로그·7개 운세·이전 초안 덮어쓰기를 직접 검증한다.
- 보존한 targeted QA 보고서는 360/390px 홈·운세 선택에서 넘침 0, 이미지 누락 0, 신점 Enter 이동과 프라슈나/호라리 설명 펼치기 PASS를 기록한다. 실제 상담 해석·행동 조언 두 문단이 기본 노출된다.
- 개인판·궁합판 worker 메타데이터의 totalCharTarget은 각각 50,000이다. 초융합 상수는 오마카세 44개 챕터, 목표 상한 126,360자다. 안내 문구가 해당 원본과 일치한다.
- 기능 변경의 파일 목록에 서버·결제·인증·DB 파일은 없다. 추가 필수 구현은 없으며 수정 후 공식 CI도 통과했다.

## 최종 완료 근거

- 최종 기능 커밋: `4d1c80b1d8296de5cc74476c6275cbb517b2bdb7`, main push 완료.
- 공식 CI: https://github.com/rei1237/codedestiny/actions/runs/39148811159 — completed / success. Typecheck and lint, Static guards, Build Pages and Worker, CI required 모두 success. Critical checks는 이번 수정의 위험도 분류에 따라 skipped이며 전체 aggregate가 성공했다.
- 최종 main의 홈·영냥 신점 선택·설명 targeted mock 캡처 4개 PASS. 보존 경로: `C:\Users\user\.codex\visualizations\2026\10\18\01a14fdd-9cba-73e3-8b43-3a3cb285c2bc\yeongnyangi\verified-main`.
- `npm run verify:detail-first-entry` PASS: 7개 상품 × 360/390/430/1280px, 상세 열기·닫기·포커스 복원·상담 이동·뒤로가기 28개 경우 확인, 결제 호출 없음.
- 개발 변경과 main 전달은 완료했다. 실제 운영 승격과 실결제·실 LLM 검증은 실행하지 않았다.
