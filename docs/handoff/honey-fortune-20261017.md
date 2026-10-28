---
status: done
updated: 2026-10-17
next: "구현·통합·로컬 검증 완료. 전달 커밋의 main CI 결과는 GitHub에서 확인하며 운영 승격은 별도 요청이다."
---

# 기본 운세·출석 꿀방울 개편 인수인계

## 2026-10-17 재개 결과
- 통합 구현 커밋: `e518f1dc6a560f7bf6aad6ac46b7b3e9b8b45e5e`. 워크트리와 브랜치는 아래와 같다.
- 모바일 토글 복구 `e6da3131ce2c16525786c54c08351990936fc718`를 main에 push했다. 108×48px/44px 버튼을 유지하고 공통 CSS 규칙은 1벌로 정리했다.
- 복구 CI: https://github.com/rei1237/codedestiny/actions/runs/39028951396 — completed / success 확인. 꿀방울 전달 차단 해소.
- 최신 origin/main을 통합했고 CSS 양쪽 변경 보존 후 sync:public 재생성 완료.
- 통합 검증: mock Jest 7 suites/463 tests, Node UI 8 tests, billing policy 및 PortOne 가드, check:pre-push 모두 PASS. PortOne mock 실패 로그 모델 buffering 경고 2건은 기존과 동일하며 실제 연결 없음.
- check:fast --plan 확인. CSS 복구에서 시작한 check:fast 전체 실행은 전체 Jest를 포함하므로 CI 복구 시 실패 검사만 재실행하는 규칙에 따라 중단했다. 전체 통과로 보고하지 않는다.
- Chromium: 변경 전후 토글 computed style 4폭×2모드 동일. 통합 셸 360/390/430/1280px 가로 넘침 없음, 모바일 토글 108×48px와 버튼 44px 확인. 외부 통신/API 차단.
- 화면 캡처: `C:/Users/user/.codex/visualizations/2026/10/17/01a14990-8394-7431-8452-abfe38b354dc/honey-integrated-mobile.png`. API 차단에 따른 잔액 조회 실패 상태이며 운영 결과가 아니다.
- 전달 종료: 이 문서 종료 커밋을 포함해 clean 트리 check:pre-push 후 main으로 전달한다. 최종 main CI는 1회 확인하고, 진행 중이면 성공으로 간주하지 않고 상태와 URL을 보고한다. 원격 main에 포함된 자기 워크트리만 배수한다.
- 공유 main의 다른 세션 미커밋 변경은 보존했다. 운영 승격/실결제/실 LLM 실행 없음.

## 이전 중단 시점 기록
- 작업 디렉터리: `D:\Development\codedestiny-worktrees\honey-fortune-20261017-190713`
- 브랜치: `wt/honey-fortune-20261017-190713`
- 마지막 구현/검증 커밋: `725e7f0f27e3b9f9a6c9d00b40f1c1ab3aac0021`. 이 문서는 그 뒤의 인수인계 전용 커밋이다.
- main push: **미실행**. 정상 fast-forward 가능 여부 확인에서 중단했으며 원격 변경은 없다.
- 마지막 통합한 origin/main: `0314d3d17fb11f66e144b4827c4948cdacd930c4`.
- 이후 다른 세션의 `08e321aae2dcc19fb6239261ad902f45a5a0d882`가 main에 추가됐다. 아직 이 작업에 통합하지 않았다.
- 해당 main CI: https://github.com/rei1237/codedestiny/actions/runs/39026685632 — failure.
- 실패: `__tests__/ui/yeoni-garden-header.static.test.js:20`, 토글 크기 규칙 1벌 기대 / 실제 2벌. 이번 꿀방울 변경은 그 실행에 포함되지 않았다.
- CLAUDE.md와 docs/context/delivery-and-ci.md의 실패한 다른 main 위에 push를 쌓지 않는 규칙에 따라 전달을 보류한다. 실패한 CI를 통과로 보지 않았다.
- 공유 `D:\Development\code-destiny`에는 다른 세션의 수정·스테이징 삭제가 많다. reset/stash/clean/add -A 금지. 이 워크트리를 유지한 이유는 미전달 커밋 보존이다.

## 확정 정책과 구현
- 기본 종합 사주 풀이: 10,000원 또는 꿀방울 60개. 대운: 20,000원 또는 120개.
- 매력/스킬 각 6개, 기존 5,000원 대상 18종 각 30개. 총 22개 개별 콘텐츠. 기존 현금/이용권/월정석 경로 유지.
- KST 하루 출석 1개. 당일 구정책 0개 원장만 1회 보충. 과거 소급 없음.
- 서버 카탈로그/계정 소유 저장 프로필/출생 신원 기준. 원장·차감·권리 지급은 같은 Mongo transaction. 기존 권리 및 같은 출생정보 재열람은 추가 차감 없음.
- 홈 히어로 아래 출석/사용처 시트. 게스트 안내, 오류·재시도. 각 기본 잠금에 현금과 꿀방울 버튼. 숙요 및 별도 베다 페이지도 연결.
- 5개 체계 19개 상세 안내를 짧은 HTML로 전환. 기본 종합/전문가 AI 상담 역할 구분과 결과 하단 상담 CTA.
- 점성술 렌더 교체 중 요청/쿨다운 상태가 빈 본문을 남기는 결함 수정. 실패 시 재시도 버튼 유지.
- 프롬프트 1개, 꿀편지/앨범 각 10개, 상담 보상, 사자 휘장 및 나머지 프리미엄 가격 유지. 운영/실결제/실 LLM 검증 없음.
- 정책과 오프라인 소비·비용 집계: `docs/context/honey-fortune-policy.md`, `scripts/report-honey-economy.mjs`.

## 검증 증거
- 핵심 worker 5 suites / 31 tests PASS, 새 UI/경제/점성술 6 tests PASS.
- `check:fast` 실행: paid-gate-suite 90항목 중 최초 3항목 실패. 전체 npm test의 구 상품명/본문 해시 2 suites, 구 가격 가드 2개였다. 모두 아래처럼 해당 실패 검사만 수정·재실행했다. check:fast 전체를 다시 실행하지 않았다.
- Jest 전체 최초 416 suites: 414 PASS, 2 FAIL(27 assertions). 수정 뒤 `saju-section.test.js` + `payments-v2.prepare-compat.test.js`: 2 suites / 432 tests PASS. 과거 본문 fixture는 보존하고 승인된 제목 차이만 분리해 본문 동일성을 검사한다.
- Node 전체: 3354/3355 PASS. 의도적으로 바뀐 상세 출력 snapshot 1건 실패. 승인된 19개 compact guide 행만 갱신하고 다른 fixture 행은 보존. 해당 테스트 재실행 PASS.
- `verify:portone-single-payment`, `verify:paid-feature-billing-policy`: 수정 후 PASS. 신규 주문은 새 가격, 과거 30,000원 확정 주문 fixture는 보존. PortOne mock은 failure-log 모델 buffering 경고 2건이 있었으나 실제 연결 없이 PASS.
- `typecheck`, `build:worker`(dry-run), 최종 `check:pre-push`: PASS.
- 변경 핵심 JS eslint: errors 0, warnings 56(var/미사용 catch 변수). 기존 기계 검출 경고 4개는 기존 비변경 스타일에서 발생.
- 브라우저 로컬 mock: 360/390/430/1280px 출석·잠금 카드 overflow 없음, 두 가격/44px 버튼/상세3답/확인 후 본문 해금 확인. Vedic 실제 잠금 markup과 영수증 적용 callback 확인. 외부 HTTP/WS 차단. 전체 실제 결제·실기기 검증으로 확대 해석하지 않는다.
- 시각 검수 2회 완료(출석 여백, 상세 CTA 보정). 캡처는 `C:\Users\user\.codex\visualizations\2026\10\17\01a14947-bb2f-7c40-b103-9f224669ec1e`에 보존.

## 재개 순서
1. 이 작업 디렉터리/HEAD와 공유 main의 다른 변경을 확인한다. main CI 실패를 먼저 해결한 최신 SHA를 확인한다. 실패 중이면 이번 변경을 push하지 않는다.
2. `git fetch origin main`, 이 워크트리에 최신 origin/main을 통합한다. 08e321aa는 index.html/styles/home-funnel.css 및 미러와 겹치므로 소스 변경을 양쪽 보존한 뒤 `npm run sync:public`, 필요 시 `npm run sitemap:generate`로 생성한다. 미러를 손으로 병합하지 않는다.
3. eol=lf 소스에 CRLF를 쓰지 않는다. Windows Python write_text의 줄바꿈 변환이 과거 raw-string 가드와 미러 비교에 영향을 줬고, 현재 LF로 정리됐다.
4. 변경된 부분의 targeted 검사 → 변경 파일만 commit → 커밋된 clean 트리에서 `npm run check:pre-push` → 정상 fast-forward main push → 최종 main CI 1회 확인. CI 진행 중이면 URL과 상태로 보고한다.
5. 운영 승격/실결제/실 LLM은 별도 요청 없이는 실행하지 않는다. 완료 후 이 문서를 done으로 닫고 자신이 만든 워크트리만 배수한다. node_modules junction부터 해제한다.
