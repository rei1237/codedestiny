---
status: in-progress
updated: 2026-11-14
next: Linux run 43551511688 완료·아티팩트 다운로드, 11경로 증거·QR; 브라우저 새 공간 승인 답변 확인
---

## 첫 행동
D:/Development/codedestiny-worktrees/toss-three-rooms-20261114-105958의 git 상태와 TEMP/three-method-checkfast.txt(세션 48391)를 확인한다. 같은 세션에서 끝까지 진행한다.

## 지금 상태
- 브랜치 wt/toss-three-rooms-20261114-105958. b69eea884까지 main push 완료. 네오 초안 복원과 과거 결과 열람 시 초안 보존, 4방식 모의 응답 정규화 포함.
- 원 체크아웃 D:/Development/code-destiny는 다른 세션 feat/world-cast-page. 수정·정리하지 않는다.
- 최신 Windows AIT deployment 01a1d811-b7a6-730c-9744-dbc17dc96dd0, expanded 99,888,038 bytes. 네오 4방식 E2E 통과. 편지 6방식과 찻집은 직전 AIT에서 통과.
- 첫 push CI 43547532590은 in-progress 허용값 불일치만 실패. 호환 수정 self-test 12개 및 233문서 통과. Linux run 43547540005, 43550600727은 후속 수정 반영 때문에 취소했다. 최종 런타임 b69eea884의 Linux run 43551511688 진행, watch 세션 88500/TEMP/three-linux-verified-ci.txt.

## 승인 상태
2026-11-14 사용자: “기능표에서 ‘일부만 이식’인 96개 중 코드로 마저 구현할 수 있는 항목부터 계속 진행해줘. 연이 상담 편지·운명의 찻집·네오 팩폭 전략실부터 웹 원본과 대조해서, 달빛 예화 디자인을 유지하고 실제 AIT에서 홈 → 입력 → 모의 구매·생성 → 보관함 재열람까지 검증해줘. 실결제와 검토 요청은 계속 보류해.”
main push·Linux AIT·비공개 QR은 승인 범위. 운영 Worker·실 DB·실 LLM·실결제·검토 요청 금지.

## 작업 규칙과 함정
- mock fixture 통째 import는 100MB 초과. roomOrderRequest/characterRoomReading/roomRecords로 필요한 기존 코드를 재사용.
- 찻집 toss localhost preview fallback 금지. ensure-access 모의 계약 연결.
- 네오 휘장은 원본 CDN 아트의 320px WebP. 로딩 sprite 대체는 잘린 그림이 되어 폐기.
- sitemap generator 뒤 해당 소스 signature 변경 URL만 유지. XML은 LF로 써야 drift 통과.
- pre-push는 문서 포함 미커밋 변경도 거절하므로 현재 문서 먼저 커밋.
- ego space 54가 사라져 목록에도 없다. 새 공간을 여는 확인을 async로 요청했고 답변 대기. 스킬이 복구용 새 공간을 승인 없이 금지하므로 우회하지 않는다. 스크립트 C:/Users/user/ego/toss-three-rooms-20261114-1150. 마지막 확인 버전 20261114-13. Linux artifact 확정 후 업로드·임시저장·테스트만. 완료 시 task.finish({keep:[]}) 한 번.
- Python은 py. root node_modules는 junction. 자기 워크트리만 안전하게 배수.

## 설계
docs/toss/character-rooms-20261114.md. 운영 원장·SKU는 그대로. 모의 주문·원문·추가 답변 저장, 계정별 재열람. 네오 질문 초안은 Toss 어댑터에서만 계정별 24h, 구매 결과와 별도.

## 단계
- [x] 원본 대조, 세 상담 사주 대표 경로와 다른 계정 거절, 독립 리뷰
- [x] targeted private/offline 7개, draft 2개, inventory 6개
- [x] 첫 check:fast 계획 전체 완료(날짜 파일 복구 후 해당 90개 재검사), Jest 8000개 통과
- [x] 네오 구매 전 질문 복원 구현·AIT 재검사·커밋
- [x] 두 번째 check:fast 전체 통과: Node 5037, Jest 479 suites/8000 tests. 로그 TEMP/three-draft-checkfast.txt
- [ ] 세 번째(방식 alias·11경로 CI 검사 변경) check:fast -- --base=f63ff9bb069a41bbfe9c93ee61f2d287c63430e1 진행. 로그 TEMP/three-method-checkfast.txt
- [x] b69eea884 pre-push·main push·Linux artifact dispatch(full_ci/toss_artifact/toss_simulation_artifact=true)
- [ ] Linux 11경로 검사·QR·기능표 증거 확정·최종 문서 커밋 push
- [ ] handoff done, 자신 워크트리·스크래치 정리, 최종 보고

## 최신 함정과 산출물
- 웹 네오 payload는 method를 보낸다. 기존 fixture는 selectedMethod만 써서 결과 방식이 빠졌다. 원본 Worker의 selectedMethod || method 규칙으로 수정. 다른 방식 재시도 409와 브리핑·수정 작전 방식 보존 검증.
- 편지 6방식 E2E는 모두 PASS였으나 PowerShell foreach 뒤 직접 *>를 붙인 로그 리다이렉션만 실패했다. & { foreach (...) {...} } *> 파일로 감싸야 한다. Linux 최종 실행은 이 구문 사용.
- 최종 CI는 letter --letter-domain 6종, tea, neo --neo-method 4종을 모두 실제 AIT에서 실행.
- 증거 JSON 기존 ait-verification-20261114.json의 상위 1915f9705 번들 기록은 보존. 새 checks에 별도 run/commit/deploymentId를 넣고 followupBundles에 b69eea884 아티팩트 기록. generator는 checks를 이미 기능별로 연결한다.
- metadata helper TEMP/three-ait-metadata.cjs. Downloads/CodeDestiny/<run>에 일반(toss-preview-<SHA>)·모의(toss-private-simulation-<SHA>) 저장.
