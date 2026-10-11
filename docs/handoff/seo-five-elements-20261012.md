---
status: blocked
updated: 2026-10-12
next: 기존 main CI 복구 확인 후 이 워크트리 변경을 main에 통합하고 push 및 main CI 확인
---

# 검색 노출 진단과 오행 콘텐츠 전달

- 작업 디렉터리: `D:\Development\codedestiny-worktrees\seo-five-elements-20261011-20261011-235701`
- 브랜치: `wt/seo-five-elements-20261011-20261011-235701`
- 기반: `aa70afbcd951ab84daab1874b187756c65c05250`
- 구현 커밋: `efdc087f479364c3b94d7ea14c0d551a860f89b5`
- PR 생성, main 통합, push, 운영 배포: 미실행.

## 전달 차단

기존 main CI https://github.com/rei1237/codedestiny/actions/runs/38148771754 가 `verify:ziwei-chart-detail-view`에서 실패했다. `js/saju-engine.js:21591 panel.before(questionGuide)`에 대해 `TypeError: panel.before is not a function`이다. 이번 변경은 해당 파일을 수정하지 않았다. 기존 main이 실패 중이면 그 위에 push하지 않는 프로젝트 지침을 적용했다. 다른 세션의 미커밋 변경과 main HEAD는 보존했다. 미통합 변경을 잃지 않도록 워크트리는 유지한다.

## 진단

첨부 그래프는 10월 6~7일 이후 감소, 개명 커밋은 10월 10일이다. 개명만으로 전체 하락을 설명할 근거가 없다. 10월 6일 `8d9843c1b`의 날짜별 보관 페이지 noindex 및 사이트맵 제외가 우선 조사 후보다. 커밋 전후 sitemap-ko의 해당 URL은 361개(상세 360+허브 1)에서 0개로 감소했다. 운영 표본은 HTTP200이지만 HTML과 헤더 모두 noindex였다. 중복 페이지 정리 의도가 있으므로 무조건 되돌리지 않는다.

홈·내일운세 표본은 HTTP200, self-canonical, index/follow이며 robots.txt에 전체 검색봇 차단은 없었다. UA 문자열 표본은 실제 검색봇 수집 증거가 아니다. Google 검색 결과 미노출과 URL 미색인은 구별해야 한다. 원인 확정에는 네이버 하락 전후 URL별 노출·클릭, GSC 검색어·페이지·순위·색인 데이터, 후보 변경 실제 배포 시각이 필요하다. 계정 접근 질문은 답변되지 않았으므로 계정에 접근하지 않았다.

## 구현

- `lib/lifestyle/recipes.mjs`: 오행별 5개 상세 레시피, 계량·시간·조리 판단·실패 대처·대체재·알레르기, Recipe JSON-LD 공통 원천.
- `app/recipes/page.jsx`, `app/recipes/[slug]/page.jsx`, `app/recipes/ReadingLayout.jsx`: 허브+상세 5개, 모바일 편집형 레이아웃.
- `app/crystals/page.jsx`: 오행·색상·천연석 상징, 일상 행동 제안, 구매·관리·안전 설명.
- `app/components/AppChrome.tsx`, `app/insights/page.js`: 신규 읽기 화면의 전역 chrome 제외 및 진입 링크.
- `public/images/five-elements/`: 직접 생성한 WebP 이미지 6개와 프롬프트 provenance.
- 사이트맵 생성기와 산출물, 콘텐츠 계약 테스트, SEO_STATE, 시각 검증 기록.
- 실행 프롬프트: `docs/seo/seo-recovery-prompt-20261012.txt`.

오행·천연석의 상징을 의학적 효능이나 운 상승 보장으로 표현하지 않았다. 실제 셰프 제작·시식·영양 성분·평점을 지어내지 않았다. 결제 가격·이용권·월정석·단건결제·인증·API·DB 정책은 수정하지 않았다. 기존 내일운세 제목 실험과 보관 페이지 noindex는 유지했다.

## 검증

- `npm run check:fast -- --plan`: 위험도 자동 승격 계획 확인.
- `npm run check:fast`: 결제 mock 검사 88/88, 문서 freshness와 lint 통과 후 최종 UI 수정에 따른 sitemap drift에서 중단. 명령 전체 통과로 보고하지 않는다.
- `npm run sitemap:generate`, `npm run verify:sitemap-drift`: 수정 후 통과, 962 URL.
- 나머지 계획 검사를 개별 실행: typecheck 통과, Node 3174/3174, Jest 385 suites·5883/5883, Worker dry-run 및 strict encoding 등 통과.
- 신규 콘텐츠 계약 3/3 통과. 시각 검증 3페이지×4뷰포트(360/390/430/1280) 12개 통과, 7개 경로 SSR HTTP200·H1·canonical·JSON-LD 확인.
- `npm run check:pre-push`: 최종 통과(home-service-registry, public-mirror-fresh, sitemap-drift 962 URL). 최초 `.ignore`의 기존 mirror 항목 누락은 `npm run sync:public`으로 `/public/styles/saju-reading.css` 자동 생성 항목을 보완해 해결했다.
- `build:cf`, Google Rich Results Test, 실제 검색 색인·노출·CTR 개선, 운영 배포: 미검증.

## 재개

1. 현재 main 상태와 기존 실패 CI 복구를 확인한다. 다른 세션 파일·커밋을 덮어쓰지 않는다.
2. 이 브랜치의 검증된 커밋을 main에 직접 통합한다. PR을 만들지 않는다. 충돌은 현재 소유 세션과 조정한다.
3. 통합 트리에서 필요한 targeted 검사와 `npm run check:pre-push`를 실행하고 `git push origin main` 후 마지막 보고 전에 main CI를 한 번 확인한다. 반복 polling과 정례 staging 점검은 하지 않는다.
4. 공개 후 D0를 SEO_STATE에 기록한다. 네이버/GSC 근거를 확보해 URL군별 손실을 분석하고 제목·설명 실험은 동일 조건에서 14/28일 평가한다. 현재 생산 노출 증가는 입증되지 않았다.
5. 전달 완료 시 이 문서를 `status: done`으로 닫고 본인 임시 파일만 정리한다. 본인 node_modules junction을 먼저 해제한 뒤 워크트리 제거 및 머지된 wt 브랜치 삭제로 배수한다.
