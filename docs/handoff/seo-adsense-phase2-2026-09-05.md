---
status: active
updated: 2026-09-06
next: Phase 2-4 PR 머지(사용자) → 스테이징 확인 → 프로덕션 승격(사용자) → 승격 + 1주 뒤 AdSense 재신청(사용자 판단) → 2026-09-20 GSC 재측정 뒤 2-3(신규 콘텐츠 15편) 착수 여부 판단(사용자)
---

# SEO 진단 + AdSense 승인 최적화 — Phase 2 인수인계

## 왜

사용자 지시 "[Code Destiny] SEO 현황 진단 + 애드센스 승인 최적화". Phase 0 진단·Phase 1 리포트 승인(2026-09-05). 발견 사항 F-01~F-17·실행 계획은 `C:\Users\user\.claude\plans\code-destiny-seo-piped-bentley.md` 가 정본이다 — 다시 조사하지 말고 그 파일을 읽는다.

## 지금 상태

- 2-1 머지(#1595), 2-2 머지(#1598). **2-4 구현 완료, PR 로 올라가 있다**(`gh pr list --search seo-phase2-4`). 머지는 사용자 몫.
- 2-3(신규 콘텐츠 15편)은 09-20 GSC 재측정 뒤로 연기(색인 수 451 동결과 양립). 재측정 결과가 나오기 전엔 시작하지 않는다.
- AdSense 재신청 시점은 계획 권고대로 **2-4 프로덕션 승격 + 1주**. 재신청 전에 사용자가 `/privacy` §4·푸터 면책·기사 하단 저자 줄을 프로덕션에서 눈으로 한 번 확인한다.

## Phase 2-4 결과 (커밋 메시지가 상세 정본)

- F-02: `/privacy` §4 + 4로케일 `PRIVACY_CONTENT` 에 DoubleClick 쿠키·aboutads.info/NAI 옵트아웃·Google 광고 쿠키 정책 링크 문단.
- F-05: `SiteFooterHub`·`LocaleFooterHub` 에 "면책 고지" 섹션(두 문장 + `/disclaimer/`), 정적 홈 셸 `.cd-footer-legal` 에 한 문단(`footer.disclaimerNote`, 12개 사전 손저작). 죽은 `FooterLegal.jsx` 삭제.
- F-04: `ContentIntegrityNote` 의 비템플릿 지면에 "글 <저자> · 검수 박병하 · 명리학자(명리 10년) · 저자 소개(`/about#author`)". JSON-LD 는 손대지 않았다(`SITE_AUTHOR` Person 노드 그대로).
- 사주 로또 카피: 라이브 기능이고 면책이 이미 있어 변경 없음.
- 하지 않은 것: `SITE_AUTHOR.sameAs`(URL 미제공) · `/advertising-policy` §5 에 같은 옵트아웃 문장 추가(선택, 가드 요구 사항 아님) · 2-1 부터 이어지는 미착수 4건(`/pdf/new-year` 301, lastmod 정직화, robots Disallow, SearchAction).

## 검증 (2026-09-06 실측)

```
node --test __tests__/ui/locale-footer.static.test.js      # 8/8
npm run verify:i18n-runtime && node scripts/verify-i18n-public-parity.mjs --all
npm run verify:famous-saju-editorial                       # 12건 OK
npm run build:cf                                           # [adsense-readiness] OK
SEO_AUDIT_OUT_DIR=dist node scripts/seo-audit.mjs --source=out --crawl-sitemap   # Issues: 0
npm run verify:sitemap && npm run verify:sitemap-drift     # 451 / 원장 서명 20 갱신
npm run verify:seo-heading-integrity && npm run verify:hydrated-h1-integrity
npm run verify:editor-notes && npm run verify:indexable-prose-depth && npm run verify:internal-link-depth
npm run verify:hero-contrast && npm run verify:mobile-detail-nonintrusive && npm run verify:public-parity
npm run lint && npm run typecheck                          # lint 는 경고만(기존 <a> 패턴)
npm run check:quick    # 로컬 build:worker 의 workers-og 미해결만 실패 — 기지 로컬 헛실패, CI 가 정본
```

## 함정

- 워크트리엔 node_modules 정션을 손으로 건다(PowerShell `New-Item -ItemType Junction`). `git add .` 금지. 🔴 이번 세션에서 워크트리 등록이 다른 세션에 의해 지워져 디렉터리가 비어 있었다 — `git worktree list` 로 먼저 확인하고, 없으면 `git worktree add <path> <기존 브랜치>` 로 다시 붙인다.
- 워크트리 Bash 가드는 `git` 이 들어간 복합 명령을 거부한다 — `git` 명령은 단순하게 따로 보낸다.
- 새 체크아웃은 `app/**`·`lib/**` 대부분이 CRLF 다. Edit/sed 대신 CRLF 보존 node 패치로 고친다.
- `index.html`·`js/**` 를 고치면 `npm run sync:public` 산출물(미러 5개 + js 캐시 키)을 **커밋**한다. `rss.xml` 4개(`public/` 미러 포함)·`.ignore` 는 되돌린다. 라우트 소스를 고쳤으면 원장 `config/sitemap-lastmod.json` 을 같은 커밋에 담는다(셸 1곳 = 서명 5개, `legalContent.ts` 1곳 = 로케일 정책 라우트 12개).
- React 한국어 리터럴은 런타임 역인덱스로 번역된다 — 새 문구는 `i18n/authored/shellRuntime-NN.json` 에 12로케일 저작 후 `node scripts/i18n-merge-authored.mjs --namespace shellRuntime`. SSR 에서 `{expr}텍스트` 는 텍스트 노드가 갈라지므로 한 문구는 한 표현식/한 span 으로 묶는다.
- 정적 셸 `data-cd-trans` 키는 `public/i18n/<lang>.json` 12벌에 직접 넣는다(`JSON.stringify(obj,null,2)+"\n"` 왕복이 바이트 동일). Gemini 배치 번역은 절대 규칙 1.
- `verify:indexable-prose-depth`·`internal-link-depth` 는 dist/ 를 읽는다 — `build:cf` 뒤에 돌린다.

## 모르는 것

- 저자 `sameAs` 공개 프로필 URL — 사용자 제공 대기. 받으면 `lib/structured-data.ts` `SITE_AUTHOR.sameAs` 에 넣는다(한 줄, 가드 영향 없음).
- 2-2 해설 본문의 사실 검토(빔쇼타리 연수·오행국·서머타임 연도 등)는 외부 대조를 안 했다 — 사용자가 훑어볼 것.
