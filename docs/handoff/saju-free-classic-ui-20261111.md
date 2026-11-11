---
status: in_progress
updated: 2026-11-11
---

# 사주 무료화와 클래식 결과 화면: 추가 승인 대기

## 현재 상태

확정된 49개 기능키의 무료 전환, 기존 기본풀이 복구, 개별 재미 콘텐츠 이미지, 명리 아이콘, 달빛 예화 버튼, 두 서비스 진입 로딩을 구현하고 검증했다. 추가 4항목의 답변을 기다리므로 전체 작업 완료로 처리하지 않는다. 원격 main push, 운영 승격, 최종 앱 빌드는 하지 않았다. 컴퓨터 절전도 하지 않았다.

- 작업 경로: D:\Development\codedestiny-worktrees\saju-free-classic-ui-20261111-20261111-094658
- 브랜치: wt/saju-free-classic-ui-20261111-20261111-094658
- 검증된 구현·테스트 커밋: ec83f8a9c5f76e9379c14883a06a2bcca3343044
- 생성물 커밋: 8275ce04a0672a4bd102be51ead0aaabaa2a2ba6
- 통합 기준 main: 2a53c1dfb93ae2f5f1be50657d7f9b553f45164f
- 공유 main 작업공간에 다른 변경이 있으므로 해당 체크아웃·스테이지·파일을 건드리지 않았다.

## 승인 대기 범위

나의 일 스타일, LOVE CODE, 인연의 장소, 내 뇌구조·휴먼 디자인 해석. 현재 무료 정책에서 제외하고 기존 잠금·묶음·결제 권한을 유지한다. 특히 saju-career-style도 현재 무료로 표시하지 않는다. 구체적인 추가 승인을 받은 뒤에만 무료 전달 경로를 변경한다.

## 보존한 정책

- 정본: lib/payment/free-fortune-policy.mjs. 브라우저 IIFE/ESM은 공식 생성기로 복제한다.
- 일반 라이트 사주(section_summary), 사주 대운(section_daewun), 실제 LLM은 유료다.
- saju_lifetime_bundle의 29,000원·영구 권리·기존 구매 별칭은 유지했다. 현재 유료 안내의 주 항목은 라이트·대운이며, 무료 공개된 기본·재미 콘텐츠를 구매 혜택으로 표시하지 않는다.
- 기존 제휴 코드·로그인·서버 권한은 유지하고 사용자 화면의 제휴 명칭만 제거했다.
- compat-saju-compatibility는 실제 Gemini 생성 상품이다. 무료 section_compat와 별개이므로 유료를 유지한다.
- 새 무료 요청은 결제·차감·구매증빙을 만들지 않는다. 이전 주문·영수증 검증 및 복원, 본인 프로필·결과 소유권은 보존했다.
- Play 신규 products/free-grant/intent만 무료 정책을 적용하고 기존 receipt verify/restore/RTDN 경로는 유지했다.
- 베다 프라슈나의 새 요청은 /api/fortune/vedic/prashna/free를 사용한다. 기존 유료 결과 재개 경로는 남겼다.

## 검증

생산 소스는 동결했다. check:fast의 Node 이후 마지막 Jest에서 구형 유료 fixture 기대만 실패해 테스트 7파일을 새 정책에 맞춘 뒤 전체 Jest를 별도로 재실행했다. 생산 코드나 실제 판매목록을 테스트 통과 목적으로 변경하지 않았다.

- 전체 Node: 4,900/4,900 통과.
- 전체 Jest: 472 suites, 7,859 tests 통과. 기존 1 suite/1 test skip 유지.
- 결제 안전 검사 77개, 전체 lint, 타입, Worker build, 인코딩 및 나머지 critical 단계 통과.
- check:pre-push 통과. 미러·사이트맵·서비스 레지스트리·저장소 위생 확인.
- 무료 정책·과거 영수증 인접 13 suites: 332/332 통과, skip 없음.
- 버튼 40화면: 360/390/430/1280px, 가로 넘침 없음, 최소 높이48px, 대비15.06:1.
- 무료 프라슈나 클릭: mock 결과 표시, 결제 호출0.
- 과거 조건 안내52패널만 현재 무료 텍스트로 전환하고 고유 이미지302개와 면책을 유지했다.
- 모든 개발 검증은 mock으로 수행했고 실결제·실LLM·운영 데이터 변경은 하지 않았다.

검증 로그는 .tmp/free-classic-check-fast.log, .tmp/free-classic-final-jest.log, .tmp/free-classic-pre-push.log와 .tmp/payment-policy-related.log에 있다. 화면 자료는 .tmp/reading-actions-*-390.png, .tmp/saju-classic-390.png, .tmp/free-crafted-yearly-390.png 등에 있다. 작업이 끝나지 않아 재개와 검수를 위해 보존했다.

## 다음 순서

1. 추가 4항목의 정확한 승인 답변을 확인한다.
2. 해당 기능의 서버 전달·클라이언트 진입·가격 안내를 기존 로그인/소유권 보호와 함께 통합한다. 실제 LLM이나 라이트·대운으로 확장하지 않는다.
3. 최신 origin/main의 변경과 별도 작업을 확인하고 보존한다. sync:public, extract-saju-section-runtime, sitemap:generate를 필요한 순서로 실행하고 최종 변경을 검증한다.
4. 완전한 범위가 준비된 뒤에만 main 전달과 공식 GitHub 운영 승격을 진행하고 고정 SHA를 확인한다. 그 SHA를 Android/스토어 빌드에 전달한다.
5. 운영 검증과 나머지 출시 작업까지 모두 끝난 뒤 정리 및 요청된 절전을 진행한다.
