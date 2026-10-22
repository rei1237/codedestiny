---
status: awaiting-approval
updated: 2026-10-22
---
# 네이버 D+14 읽기 경로 개선 — sitemap 추적본 승인 대기

## 요청과 완료 범위
사용자 요청: 돼지띠·뱀띠 내일 운세 수집·색인 상태 확인과 본문 개선, 기존 제목 실험 유지, 자미두수·유명인·인사이트 내부 링크 최적화.

작업 디렉터리: D:\Development\code-destiny
소스 커밋: 90f6a3d7eb3a9081ebae3b9c7298ddf55990d3e1 (main, 미푸시)
시작 시 로컬 main d19405da6942419a2b81b139c384d2ac09079708은 다른 세션의 문서 커밋이며 보존했다. 마지막 확인 원격 main c63a2eac1cf91a1cd724b13081758448a56445c3의 CI는 success.

- 네이버 URL 검사·색인 상태: pig, snake 모두200·수집허용/완료·색인허용/완료. 최종 업데이트 표시 각각1시간 전/8시간 전. 절대 시각 미추정. 수집 요청 미제출.
- 한국어 pig/snake 내일 상세에 계산 근거와 현실적 준비를 연결하는 가이드 추가. 계산 엔진/점수는 그대로.
- /ziwei/ 관련읽기 우선순위 개선. /insights/에 접지 않은 링크, 유명인 상세 CTA에 명리 가이드·체계 비교·명반 링크 추가. 새 문구는 lib/i18n/search-reading-paths.mjs.
- title/description 생성·10/03 제목실험·canonical/hreflang·색인 정책·결제/인증/API/DB 변경 없음. 운영 배포 승인/실행 없음.

## 검증
- npm run check:fast 최종 exit0. 초기 sandbox Temp EPERM 실패 후 로컬 권한으로 재실행.
- Node3482개, Jest424suite/6738개 통과. lint/typecheck/sitemap drift/정책 mock/worker dry-run 포함 통과.
- node --test __tests__/ui/fortune-seo-title.test.mjs: 6개 통과.
- 로컬 SSR: pig/snake/ziwei/insights/IU200, 새 본문·링크 포함. 새 목적지4개200/self-canonical.
- IU 첫500은 로컬3187 천문파일 서버 부재. scripts/serve-novel.mjs를 PORT3187로 실행 후200. 소유한3137/3187서버와 미리보기탭 모두 종료.
- 로컬 운세 자료는10/20스냅샷, 운영 네이버 검사 날짜는10/23. 로컬 확인을 운영배포 증거로 쓰지 않음.
- 시각 확인: 현재 데스크톱1920px. 인사이트 가로넘침 없음. 390/960px 실제 렌더는 미검증. 기존 레이아웃 클래스 유지.
- impeccable detect: 기존 유명인 상세 border-l-2 1건(변경범위 아님), 신규 지적 없음.
- 검증 로그: C:\Users\user\.codex\visualizations\2026\10\07\01a1174a-e2be-7561-8586-ba6cbd6699fa\naver-improvement-check-fast.log

## 승인 게이트와 남은 작업
초기 사용자 지침: "sitemap.xml 같은 빌드 부산물은 산출물이 아니라 생성 스크립트를 고친다. 산출물은 커밋하지 않는다."
현재 레포 verify:sitemap-drift/check:pre-push는 추적XML과 lastmod원장이 재생성 결과와 일치해야 통과한다. 소스수정으로 drift가 발생하여 npm run sitemap:generate를 실행했고, URL집합1019개 그대로다. 아래 생성추적본13파일은 승인 전 미커밋으로 보존했다. 직접 편집하지 않았다.

- config/sitemap-lastmod.json
- sitemap.xml, sitemap-ko.xml, sitemap-en.xml, sitemap-ja.xml, sitemap-zh.xml, sitemap-zh-tw.xml
- public/ 아래 위6개 XML 미러

질문 도구로 "생성된 추적본 함께 커밋 / 산출물 제외하고 전달 보류"를 요청했으며 아직 답변 없음. 승인 없이 생성추적본 커밋 또는 검증 우회 금지. 소스커밋만 현재 상태로 push하면 committed-tree 동기화 검사에 맞지 않으므로 push도 보류했다.

승인 후: 상태/원격 main SHA/CI 확인 → 생성추적본만 명시적 stage·별도commit → 본 문서 status done 갱신commit → npm run check:pre-push → git push origin main → 최종보고 직전 CI1회 확인. 운영배포는 하지 않는다. 사용자 불승인 시 소스/생성추적본을 보존하고 전달대기 상태 유지.

다른 세션의 .claude/skills/fire-your-seo-agency/ 및 docs/handoff/ggulggul-master-repair-release.md는 읽거나 stage/삭제하지 않았다. 워크트리/임시브랜치 없음.

재개: D:\Development\code-destiny에서 이 문서와 소스커밋90f6a3d7eb3a9081ebae3b9c7298ddf55990d3e1을 확인하고, 사용자의 sitemap 추적본 포함 승인 여부에 따라 위 전달 절차를 진행한다.
