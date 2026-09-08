# 구현 검증

2026-09-08, 격리 브랜치 `codex/seo-search-recovery-20260908`.

| 검사 | 결과 |
| --- | --- |
| 수정 전 worktree:status | 다른 작업과 index/template 중첩 확인, 격리 워크트리 사용 |
| check:fast -- --plan | critical로 자동 승격, 전체 검사 선택 |
| check:fast | 통과: lint·typecheck·Node 930개·Jest 218 suites/2,417 tests 및 결제/인증 정책 가드·worker dry-run |
| 신규 URL/번역 mock 테스트 | 5개 통과, 실제 유료 LLM 호출 없음 |
| build:cf | 제목 폭 62→기준 이내 교정 후 통과. 추가 유명인 수정 후 최종 재실행도 exit 0 |
| 유명인 원고 verifier | 12개 원고의 엔진 정합·분량·출처·중복도 통과. 개별 주장 사실 검수 완료를 의미하지 않음 |
| 정적 브라우저 검사 | 13건 통과: 360/390/430/1440px, 첫 입력 버튼 키보드 진입, JS 비활성 주요 9개 URL |
| 사이트맵 drift | 488 URL, 원장 352개 안정. 재생성 결과 일치 |
| 전체 i18n / public parity / runtime | 원격 정적 검사에서 다른 지원 언어 7개에 새 키 누락 발견 후 번역 보완. 12개 언어 11,417개 키·1,602개 native marker 검사 통과 |

실행 명령:

```sh
npm run worktree:status
npm run check:fast -- --plan
node --test __tests__/ui/seo-search-recovery.test.mjs
npm run check:fast
npm run build:cf
node scripts/seo-search-inventory.mjs
node scripts/seo-search-browser-check.mjs
npm run verify:famous-saju-editorial
npm run verify:sitemap-drift
```

빌드는 `.env`를 복사하지 않은 워크트리에서 LLM_DRY_RUN=true, WORKERS_AI_ENABLED=false로 실행했다. check:fast의 기존 test runner는 mock이다. 브라우저 smoke는 외부 네트워크 차단·로컬 API mock이며 실제 로그인/결제 성공을 검증한 것이 아니다.

## 판정 범위

- [BROWSER_VALIDATION.json](BROWSER_VALIDATION.json): 실제 빌드의 title, description, canonical, lang, H1, JSON-LD 파싱 결과 및 화면 너비. 로컬 서버 200은 운영 edge의 status/redirect를 보장하지 않는다.
- 전체 빌드의 기존 SEO 가드에서 title 폭, 구조화 데이터, hreflang, 공개 미러, 정적 색인 정책을 확인한다. `i18n:check`는 저장소에서 optional인 광범위 커버리지 검사이므로 이것을 모든 번역 완료로 보고하지 않는다.
- 추가 `node scripts/seo-build-inventory.mjs`로 777개 HTML을 파싱했다. React 랜딩의 JS 비활성 H1 가시성은 스트리밍 컨테이너 때문에 0으로 기록될 수 있다. 전달된 원본 H1은 PAGE_INVENTORY.md에서 확인한다. 전체 777개 모바일 상호작용을 테스트한 것은 아니다.
- 커밋 후 `verify:public-mirror-fresh` 통과. staging noindex self-test 6개 변이·오리진·잡 경계 검사 통과. 이는 운영 응답 검증과 별개다.
- 새 홈 핵심 번역 키는 누락 때 실패한다. 전체 상담/모달의 번역, 모든 언어의 문장 품질까지 검증한 것은 아니다.
- 사이트맵 원장은 공유 파일 의존성만으로 수정하지 않은 페이지 날짜도 올릴 수 있었다. 이번에는 실제 본문/안내를 바꾼 홈·숙요·인사이트·브랜드 경로를 제외한 105개 날짜를 기존 값으로 보존한 후 생성기 재실행과 drift 검사를 통과시켰다. 서명은 최신 소스값이다. 향후 생성기의 페이지별 의미 비교는 별도 개선 과제다.
- 실제 LCP/CLS 전후 동일 조건 실험과 INP 필드값은 미측정. 이미지 크기/우선순위·기존 WebP를 유지했으며 CWV 개선 수치를 주장하지 않는다.
- 운영·스테이징의 일반 요청 403과 브라우저 접근 차이는 남아 있다. staging의 실제 응답 헤더 및 Google URL Inspection 재검사는 배포 후 확인해야 한다.

결제 정책·이용권·월정석·단건 결제·인증 API·DB 스키마·운세 계산 로직은 수정하지 않았다. AppVersionGuard/share는 주소 표시 정리만 추가했으며 결제 재개 쿼리를 보존하는 테스트가 있다.
