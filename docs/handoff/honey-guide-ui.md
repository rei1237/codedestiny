---
status: blocked
updated: 2026-10-21
next: "기존 main CI 실패를 담당 변경에서 해결한 뒤 최신 main을 통합하고 이 워크트리 변경을 main에 전달한다."
---

# 꿀방울 개수·획득 안내·다크 가독성·연이 튜토리얼

- 작업 디렉터리: D:\Development\code-destiny\.codex-worktrees\honey-guide-20261021-011220
- 브랜치: wt/honey-guide-20261021-011220
- 구현 커밋: 0b271e17bccf8233a2c0037e4da3cc935c36d0f3
- 사이트맵 원장 커밋: 3b6c2d5c2 (이 문서 커밋 직전 HEAD)
- push/운영 배포 없음. 원본 main의 다른 세션 미커밋 변경을 보존했다.
- 차단: 기존 main 3d6f120190114e1c5bfe3ac8dae4a3606d3038c0의 Static guards 및 CI required 실패. https://github.com/rei1237/codedestiny/actions/runs/39455017301

## 변경
- js/prompt-hub-honey.js: 잔량 숫자 구분+개, 서버 잔량 증가 확인 후 실제 증가분·현재 잔량을 role=status 영역에 안내. 기존 꿀방울 이동 모션과 reduced-motion 유지.
- styles/home-funnel.css: 홈 전용 색상 fallback 대신 테마 공통 토큰으로 사용처 본문·설명·잔량·조건 색상 수정, 알림과 튜토리얼 스타일.
- templates/home-funnel.html: 연이 3장면 이미지와 HTML 설명 추가. index.html 및 public 미러는 sync:public 생성.
- public/assets/yeoni/honey-guide/: built-in image_gen 이미지(WebP 1500x500)와 프롬프트 출처.
- __tests__/ui/honey-ui.test.mjs: 획득 알림·모션 감소·미지급·실패 회귀 검증.
- config/sitemap-lastmod.json: npm run sitemap:generate로 갱신. 공개 URL/SEO 제목/canonical/색인 정책 변경 없음, 이미지 alt와 고정 크기 제공.
- 결제 가격/지급량/차감/인증/API/DB/계산 로직 변경 없음.

## 검증
- node --test __tests__/ui/honey-ui.test.mjs: 10/10 PASS.
- npm run sync:public: PASS.
- npm run sitemap:generate 및 커밋 후 npm run check:pre-push: PASS (미러, sitemap 1019 URLs, SEO entity 포함).
- Playwright 외부 네트워크 차단+mock: 360/390/430/1280px 가로 넘침 없음, 이미지 로딩 성공, 다크 본문 rgb(244,238,255), 실제 사용처 버튼의 보유 7개 표시, 출석 후 1개 획득/현재 8개 표시. 모달 body overflow:auto 및 하단 접근 확인.
- 시각 검증 에이전트: 최종 다크/라이트/획득/모달 하단 캡처 통과.
- impeccable detect: 기존 CSS line1046 width transition 지적 1개, 기존 토큰 크기 advisory 다수. 이번 범위 밖.
- npm run check:fast -- --plan: 공통 JS이므로 critical 자동 승격.
- npm run check:fast: whitespace/doc freshness 통과 후 공통 paid-gate suite 실행 중 기존 main CI 실패 확인. 자체 PID 52244 트리 종료, 전체 검사는 미완료이며 통과 주장 금지.
- 증거: C:\Users\user\.codex\visualizations\2026\10\20\01a15a14-1902-7512-b5e8-8bc5a4200de7\honey-guide

## 재개
1. 최신 main SHA 및 CI 실패 해소 확인. 기존 main 미커밋 작업을 reset/stash하지 않는다.
2. 최신 main 통합 후 변경 충돌만 해결하고 sync:public/sitemap:generate 필요 여부 확인, 관련 테스트와 check:fast 재실행.
3. 검증 커밋을 main에 통합, check:pre-push 후 main push. 최종 공식 CI를 한 번 확인. 운영 배포는 별도 승인.
4. 완료 시 이 문서 status: done, node_modules 정션 해제 후 자기 워크트리와 병합 브랜치 정리.
