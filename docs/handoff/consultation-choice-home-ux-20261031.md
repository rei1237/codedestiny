# 상담 선택·카카오·이용 길잡이 UI 개선

status: active
updated: 2026-10-31

## 최신 요청과 승인 범위

- 상담 선택 시안에 맞춰 영냥이·네오 카드를 최적화하고 실제 데스크톱·모바일 브라우저에서 검증한다.
- 추가 요청: “궁금한 순간에도, 길을 잃지 않도록” 안내 영역을 더 직관적으로 만들고 귀여운 캐릭터를 넣은 뒤 운영 반영까지 진행한다.
- 이 추가 요청으로 종전의 운영 배포 보류 지시는 대체됐다. 브랜치 정리 보류는 유지한다.
- 결제·가격·이용권·월정석·단건 결제·인증·API·DB·카카오 동의/CRM 동작은 변경하지 않는다.

## 통합 기준

- 원래 작업 폴더: D:\Development\code-destiny
- 원래 체크아웃: feat/world-cast-page / 66e00891df1334854c5a3608e7f46027897ed1fe
- 통합 폴더: D:\Development\code-destiny\.codex-tmp\consultation-ui\release
- 통합 기준: origin/main / 796fcc08170617625c412207f8153f57e5e0490b
- 기존 main 체크아웃에는 다른 세션의 미커밋 변경이 있어 편집하지 않았다. 새 브랜치 없이 detached worktree에서 이번 UI 소스만 통합했다. 오래된 브랜치의 나머지 커밋은 가져오지 않았다.
- 선행 미커밋 .claude/skills/fire-your-seo-agency/, docs/handoff/ggulggul-master-repair-release.md, outputs/는 보존한다.

## 구현

- 상담: 하나의 달빛 방 배경, 국소적인 제목 배경, 데스크톱의 좌우 대칭 가로 카드와 동일 높이 CTA, 모바일의 세로 카드·항목별 양쪽 비교표.
- 영냥이: 기존 투명 hero-480.webp, 네오: 기존 반응형 320/640/960 WebP. 이미지 크기·lazy loading·고유 상담 경로를 유지한다.
- 네오: “AI 작성 · 사람 검수 · 이메일 전달”을 표시하고 기존 가격 함수·판매 상태·답변 안내를 보존한다. 기존 standalone CTA 규칙이 새 금색 CTA를 덮지 않도록 원래 규칙의 대상 범위를 제한했다.
- 카카오: 투명 연이 그림, 본문·버튼·상태·설정 영역의 위계와 터치 영역을 정리했다. 기존 동의·저장·철회·친구 상태 로직은 그대로다.
- HelpDesk: 연이 그림과 소개, 자주 묻는 질문·내 결과 다시 보기·문의하기의 세 안내 행, 각 행의 목적 설명·아이콘·화살표. /about/, /faq/, /records/, /contact/를 유지한다.
- SEO: 공개 문구·관련 링크를 서버 HTML/정적 마크업에 유지하며 metadata·canonical·hreflang·robots·사이트맵의 기존 계약은 변경하지 않는다. /channel/의 noindex도 그대로다.

## 검증

- node scripts/verify-consultation-choice-ui.mjs: PASS 14 cases. Chrome/Edge, 폭 360/390/430/768/1280/1440px, DPR 1 및 1.25. 실제 셸 + 실제 HelpDesk/Kakao 컴포넌트와 모의 인증/API. 외부 통신·실결제·LLM·운영 DB 접근 차단.
- 모든 조건 가로 넘침 0, 기존 상담/안내 링크·44px 이상 터치·키보드 포커스·고정 크기 및 lazy 이미지 확인. 셸 런타임 예외 0. 카카오 동의 저장·철회·실패 안내를 mock으로 확인.
- 360/1440px 합성 배경 픽셀 대비 표본 검사: 상담 최소 10.04/8.98:1, HelpDesk 기본 6.09:1·neo 10.29:1, 카카오 6.36:1. 실제 기기·스크린리더 인증을 뜻하지 않는다.
- 컴포넌트 캡처는 고정 내비게이션만 시험용 스타일로 제외해 긴 요소의 스크린샷 합성 간섭을 방지한다. 제품의 내비게이션 소스는 바꾸지 않았다.
- node --test __tests__/ui/neo-consultation.test.mjs: 41/41 PASS.
- npm run verify:neo-consultation-ui: PASS. 결제/메일 숫자는 메모리 mock 내 기록이다.
- npm run verify:hero-contrast: PASS.
- npm run verify:mobile-detail-nonintrusive: PASS.
- node scripts/design/build-home-funnel.mjs --check: current.
- impeccable detect: [] (접근성·시각 품질의 보증으로 간주하지 않음).
- npm run check:fast -- --plan: critical 자동 승격. check:fast 실행 중이며 전체 통과로 보고하지 않는다. 첫 중단 세션 후 최종 로그는 build-cache/consultation-choice-ui/check-fast-final.log.

## 증거와 남은 절차

- 캡처·수치: 통합 폴더의 build-cache/consultation-choice-ui/.
- 운영 반영: 이번 UI만 커밋 → check:pre-push → fast-forward main push → 공식 main CI 확인 → 승인된 production workflow 실행.
- CI/운영 배포 결과는 실행 시점의 실제 런으로 기록한다. 미실행·진행 중 상태를 완료로 표현하지 않는다.
- 사용자 지시에 따라 기존 브랜치·워크트리는 정리하지 않는다.
