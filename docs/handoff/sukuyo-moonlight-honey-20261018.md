---
status: done
updated: 2026-10-18
next: "코드 전달 차단 해소 및 원격 main 반영 완료. 사용자 승인 운영 릴리스의 최종 상태는 이 대화에서 확인한다."
---

# 숙요 달빛 UI·무료 궁합·꿀방울 범위 제한

## 2026-10-18 추가 요청 반영
- fd9f11cbf5f0457ada41ddea3d9caa0231297f80 운영 릴리스 39045968183 SUCCESS, Pages/Worker SHA 일치 확인. 기존 전체 Jest418 suites/6634 tests 및 check:fast PASS. 아래 최초 조사 기록의 미검증·차단 상태는 이후 해소됨.
- 꿀방울 홈 영역을 모바일 약190px로 축소. 기존 폰트 재사용, 크기/행간/숫자 정렬 조정, 44px 조작 영역. 회색 이미지 배경 제거 유지. 잔액과 사용 개수에 개 단위 적용.
- 사용처 안내는 서버 카탈로그24상품/6분류와 실제 개수 표시, 접이식 탐색, 꿀방울 사용 가능처 배지. 프로필 해금과 요청별 사용 조건을 안내창/확인창에서 구분. 폐지된 앨범 신규 사용 안내 제거.
- 찻집 연이 사주10000원, 타로3장5000원/5장7000원을 서버 레지스트리에 반영. 공동 상담은 별도 진입과 fortune-tea-house-saju-joint-consultation 키로 분리, 기존15000원 유지. 서버가 요청의 상품을 재검증하며 이전 구매 복구는 소유자별 저장 기록의 키를 유지.
- 4폭 mock 브라우저:360/390/430/1280, 무료 궁합/상세/저장 재시도/키보드/사용처24상품 PASS. UI15 tests, 결제 레지스트리/전문상담13 tests, 지급/복구10 tests PASS. 외부 결제·LLM·운영 DB 쓰기 없음.
- impeccable detector 1회: 변경 밖 기존 덱 점의 width 애니메이션1건, 기존 타이포 스케일 advisory. 요청 범위 밖 스타일은 보존.
- 추가 전체 검사에서 타로 이전 가격10000원을 기대한 테스트를5000원으로 수정, 해당94 tests 재실행 PASS. 타입 검사 및 worker-no-undef PASS. 전체 검사 최종 상태는 CI에서 확인한다.
- 최종 추가 변경 CI 및 운영 릴리스 증거는 대화 최종 보고와 외부 release-evidence.json에 기록한다. 공유 체크아웃의 타 세션 작업은 수정하지 않는다.

## 2026-10-18 전달 차단 해소
- 원격 main에 40a2b6600778f7d5fd854783514789b376e5e796 push 완료. 공유 main 체크아웃은 다른 세션이 사용 중이므로 파일·인덱스·로컬 main ref를 변경하지 않고 격리 워크트리에서 HEAD:main으로 정상 fast-forward 전송했다. force push 없음.
- 결제 동결 원인: 0c7e96a7d에서 billing-client.ts의 PAID_SERVICE_RUNTIME_SRC 캐시 키만 변경하고 manifest 갱신 누락. b46531856 이후 파일 diff가 이 한 줄뿐임을 확인했다. worker/payments의 결제 정책 대응 변경은 필요 없다. config/payment-freeze.json의 해당 해시 한 개만 정식 --update로 갱신했다.
- verify:payment-freeze PASS (region4/file3/ceiling2), verify:payment-choice-parity PASS, check:pre-push PASS. 출석 UI7개, 숙요 관계 방향·천문검사,4폭 mock 재검증 PASS.
- CI: https://github.com/rei1237/codedestiny/actions/runs/39044937817 . 운영 배포는 사용자가 이 대화에서 명시적으로 요청했다. 최종 CI·배포·실서비스 SHA 증거는 대화 최종 보고에 남긴다.
- 아래 차단 상태와 다음 순서는 재개 전의 역사적 기록이다. 공유 로컬 main은 동시 작업을 보호하기 위해 자동 갱신하지 않는다.

## 재개 위치와 전달 상태
- 작업 디렉터리: D:\Development\codedestiny-worktrees\sukuyo-moonlight-free-20261017-230113
- 브랜치: wt/sukuyo-moonlight-free-20261017-230113
- 검증한 구현 HEAD: ba3c2b827c1ac8ec16092cc29740b7631fd69fe8 (이 문서는 이후 기록 커밋)
- 최초 구현: 9336b44a00acf09afb9a3a4e99a63b3133db815a
- 통합된 origin/main: dc940705fb99d9f4fa097fd6ed1b6054602f3365
- main CI 마지막 확인: in_progress, https://github.com/rei1237/codedestiny/actions/runs/39041954349 . 이 작업의 CI가 아니다.
- main merge --ff-only를 시도했으나 공유 체크아웃의 index.html, templates/home-funnel.html, public 셸, workflow 등 다른 세션 미커밋 변경으로 Git이 거절했다. 아무것도 stash/reset/overwrite하지 않았다.
- main push 및 운영 배포 미실행. 워크트리는 미통합이므로 보존한다.

## 사용자 확정 정책
- 꿀방울은 꿀꿀운세의 기존 기본 사주·자미두수·베다·점성술 해석과 기본 타로 유료 해석, 숙요 궁합 상세에만 사용.
- 기존 birth_unlock 22종 유지. per_use는 compat-sukuyo-compatibility와 tarot-myeongri-three-card 두 개, 각30. 가격·이용권·월정석·단건 결제 구조 유지.
- 꿀편지·타로 앨범·종합 프롬프트·프로필 정령 신규 꿀방울 사용 차단. 기존 권리/원문/이미 차감된 복구·환불 유지. Neo 배지는 별도 재화라 변경하지 않음. (프롬프트는 2026-10-18 후속 결정으로 꿀방울 1개 사용 복원 — 나머지 차단은 유지)
- 무료 숙요 궁합에는 차감·결제·LLM·archive 쓰기 없음. 상세만 기존 결제 또는 꿀방울 증빙 사용.

## 구현
- basicFortunePresentation.js, 숙요 렌더러, 숙요 전용 CSS: 달빛 색상, 명확한 native disclosure, 본명숙/기본 해석/무료 궁합/상세/부가 콘텐츠 순서. 동물 접힘, 도감·읽을거리 열람 시 준비. 입력 보존 재시도·계산 in-flight 공유·performance marks.
- Lahiri 황경 계산 유지, 음력표 방식과 구분. 시간 미상 정오 가정/경계 가능성 표시. 무료와 상세 동일 계산, 방향 한글 안내.
- honey-per-use.js: 서버 카탈로그/프로필/입력 해시/영수증/차감 트랜잭션 및 재시도 idempotency. 클라이언트 가격·소유권 신뢰하지 않음.
- 숙요 archive: 증빙과 입력 연결, 원문 setOnInsert 보존, 저장 상태·무차감 재시도·records 링크.
- 출석: 기본 '출석 체크 하기', 서버가 완료 확인한 뒤 '오늘 출석 체크 완료'. busy 중 중복 방지, 오류 재시도 유지.
- 회색은 원본 이미지가 아닌 공통 img 배경 CSS. 꽃돼지·잔액 이미지·수집 애니메이션 이미지에만 투명 배경. 다른 세션의 새 jewel 이미지와 수집 애니메이션을 보존하여 통합.

## 검증 증거와 한계
- sync:public 실행, commit 뒤 캐시키 고정점까지 재생성. sitemap:generate 원장 갱신.
- 마지막 check:pre-push PASS: home registry/public mirror/sitemap/llms/SEO registry.
- 통합 후 Jest4 suites 537 tests PASS (tea honey, honey unlocks, saju section, sukuyo archive).
- 그 전 관련 Jest10 suites639 tests PASS, 이후 honey UI7 PASS. typecheck PASS, worker-no-undef PASS, build:worker dry-run PASS.
- verify:llm-generation-resilience 최종1275 PASS.
- 27 경계·729 관계/역방향·Swiss WASM 자정 검증 PASS. 공식 문서: https://www.astro.com/swisseph/swisseph.htm
- verify-sukuyo-reading-house 최종 PASS:360/390/430/1280px, 무료 무차감, 결제취소, 꿀방울 상세/저장 실패·재시도, disclosure 키보드, 닫기 focus 복귀, 출석 상태, 모든 꿀방울 이미지 투명 배경,27숙/25읽을거리 보존. 모든 네트워크 mock fail-closed.
- 단회 로컬 동일 초기 조건 측정: 변경 전940ms/1112nodes/초기 도감 요청1, 변경 후527ms/961nodes/요청0. 운영 성능 추정 불가. 최종 통합 mock737ms/962nodes/요청0은 출석 애니메이션 조건이 추가되어 직접 비교하지 않음.
- check:fast -- --plan critical. 전체 check:fast 미통과: payment-freeze의 app/_lib/billing-client.ts 기대d584c22a0f892a7c/실제bf6973b138b70a6b. 해당 파일은 origin/main과 동일하며 이 작업에서 수정하지 않음. 해시를 임의 갱신하지 않았음.
- 최초 전체 Jest6631/6632: per-use를 영구권으로 기대한 테스트 수정 후 관련 재검사 통과. 전체 Node3359/3361: 편집 도중 실행한 mirror 비교2개 실패, sync 후 해당14개 재검사 통과. 전체 재실행 통과로 주장하지 않음.
- 실결제·실LLM·운영DB·배포 미실행. 실제 사용자 보관함/결제복귀는 mock 계약까지만 검증.

## 남은 순서
1. 공유 main 소유 세션이 미커밋 변경을 정리할 때까지 보존. 강제 병합/임시 stash 금지.
2. fetch 후 최신 main CI 확인. 타인 red main 위에 push하지 않기.
3. 최신 main을 이 워크트리로 통합하고 소스 충돌만 해결, sync:public 및 필요한 sitemap 재생성. 관련 targeted 검사와 committed check:pre-push.
4. 기존 payment-freeze 불일치의 소유 변경을 확인하고 승인된 의도에 맞춰 해결. 임의 --update 금지.
5. main 통합·push, 최종 CI 한 번 확인. 진행 중을 성공이라 부르지 않기.
6. 완료되면 문서 status:done, 자기 node_modules 정션 해제 후 워크트리·병합된 wt 브랜치 배수. 다른 세션 파일 유지.
