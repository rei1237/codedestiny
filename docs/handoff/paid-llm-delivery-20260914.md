---
status: active
updated: 2026-09-14
next: "찻집 저장 실패 mock을 재현하고 결과 저장과 리워드 실패 처리를 분리한다."
---

# 유료 LLM 결과 전달 후속 인수인계

사용자 요청: 마스터 인연의 서 작업 후 다른 LLM 기능의 결제·생성·전달 경로를 조사하고 후속 문서를 남길 것. **아래 미수정 기능을 해결 완료로 보고하지 않는다.**

## 현재 기준

- 작업 디렉터리: `D:\Development\code-destiny`, main.
- 마지막 구현 커밋: `0e2dff85192f077ab62bb58795937b1515a50fd5`, origin/main push 완료. 본 문서는 그 이후 문서 커밋으로 전달한다.
- 구현 내역: `git log --oneline 5f7594dd5..0e2dff851`. 인연의 서 계산 입력·근거 계약, 지도/휴먼 디자인 부분 완료 처리, 공통 캐시 재검증. 가격·이용권·월정석·단건 결제 및 환불 정책 유지.
- 조사 상세: [paid-llm-delivery-findings-20260914.md](paid-llm-delivery-findings-20260914.md). 코드 경로 확인이며 운영 주문 장애 재현은 아니다.

## 남은 작업 순서

1. 찻집 결과 저장 예외가 성공 응답이 되는 경로부터 mock으로 재현. 저장과 리워드를 분리하고 원래 결제 증빙·멱등키로 복구. 이어서 심화 자미두수 PDF와 초융합 저장 경로.
2. 점성술·베다·자미두수·신년운세·연애 비책의 품질 미달 결과를 partial로 보존. 정상 부분 유지, 실패 부분만 제한된 예산으로 수선. 상태만 바꾸면 재열람 필터가 차단하므로 서버·화면을 함께 변경.
3. registry의 나머지 기능군을 상세 표 순서로 검사. 기존 구매의 재열람은 새 품질 계약으로 차단하지 않는다.
4. 이번 인연의 서의 남은 의미 검증: 현재 근거 ID·대상·기간·판정 메타데이터 검사는 있으나 자유 본문/지표의 의미적 모순 전수 검사는 없다. 개인판 교차 방향은 산출 근거가 없어 판단 보류다. 절기/자정 경계 fixture 확대와 실제 LLM 품질 검증을 별도 구분한다.

완료 조건: 이용권·월정석·단건 결제 각각 중복 콜백/409/503/저장 실패/응답 유실/재로그인/취소·환불에서 추가 차감 없이 원래 결과를 저장·재열람. 모든 필수 부분의 품질 통과와 DB 저장 성공 뒤에만 완료. 실결제·실 LLM·운영 DB 작업은 별도 승인.

## 검증 근거

- 인연의 서 근거·품질 Jest 99/99; 부분 전달 행동 검사 5/5(개인·궁합 각 20장 저장·재조회 포함).
- reader mock: 360/390/430/1280px, 저장소 접근 불가와 취소 구매 검사 통과. 개인판 브라우저 검증이며 실 모바일 PG 복귀가 아니다.
- 공통 캐시 행동 검사 5/5, 분석 근거 계약 94개 통과.
- `check:fast`는 실행했으나 종료하지 않는 PG mock 검사로 중단. 해당 jsdom 정리 수정 후 단독 검사 통과. 이전 구현 push의 Paid Flow Gates 통과.
- 최신 코드 main CI **success**: https://github.com/rei1237/codedestiny/actions/runs/34814700582 (타입·린트, 전체 테스트, Pages/Worker 빌드, 정적 가드, CI required 통과).

```powershell
npm run verify:handoff-contract
node --test __tests__/ui/paid-report-partial.behavior.test.js __tests__/ui/llm-cache-quality.behavior.test.js
npm run test:jest -- --runInBand __tests__/worker/master-love-codex-evidence.test.js __tests__/worker/master-love-codex-quality.test.js
```

## 복사할 재개 지시

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\paid-llm-delivery-20260914.md와 연결된 조사 문서를 읽고, main 작업 상태와 구현 커밋 0e2dff85192f077ab62bb58795937b1515a50fd5를 확인한 뒤 찻집 handleConsult의 저장 실패 mock 재현부터 이어서 진행하라. 기존 변경을 보존하고 실 LLM·실결제·운영 DB 없이 검증한다.
```
