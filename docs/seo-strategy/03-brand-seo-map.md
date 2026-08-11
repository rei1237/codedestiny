# Brand SEO Map — CODE DESTINY / 꿀꿀운세 / 꽃돼지

> [세트 인덱스](README.md) · 이 문서는 3/10부다. 자산 **현황(정적) 인벤토리**만 다룬다. GSC/네이버
> 등록 절차는 [SEO_SUBMISSION_GUIDE.md](../../SEO_SUBMISSION_GUIDE.md)를 참고하고 여기서 복제하지 않는다.

## 1. 브랜드 엔티티 정의 (정본: `lib/seo/entity-registry.mjs`의 `SEO_BRAND_ENTITY`)

```
canonicalName: "CODE DESTINY"
displayName:   "Code Destiny"
koreanName:    "코드데스티니"
characterBrand: "꽃돼지"
aliases: [CODE DESTINY, Code Destiny, CodeDestiny, code-destiny, 코드데스티니,
          코드 데스티니, CODEDESTINY, 꿀꿀운세, 꿀꿀 운세, 꿀꿀만세력, 꿀꿀 만세력]
```

## 2. 노출 표면 인벤토리

| 표면 | 상태 | 근거 |
|---|---|---|
| `index.html`(+5개 로케일 미러) title/description/OG | ✅ 반영 | "꿀꿀 운세 · 꿀꿀 만세력 \| 무료 사주·타로·자미두수 — CODE DESTINY", description에 "꽃돼지 연이" 명시 |
| `app/layout.js` 전역 metadata | ✅ 반영 | `ROOT_SEO.title = "꿀꿀 운세 \| 무료 사주팔자·타로·궁합 — Code Destiny"` |
| JSON-LD `Organization.alternateName` | ✅ 반영 | `lib/structured-data.ts`의 `buildOrganizationJsonLd()`, index.html·app/layout.js 양쪽에 동일 별칭 목록 |
| JSON-LD `WebSite.name`/`alternateName` | ✅ 반영 | `BRAND_WEBSITE_JSON_LD.name = "꿀꿀 운세 — Code Destiny"` |
| 브랜드 별칭 전용 페이지 `/kkul-kkul-unse` | ✅ 존재 | entity-registry 등록됨(§9 in [02](02-topic-cluster-map.md)), "꿀꿀 운세는 어떤 서비스인가요" 안내 |
| 파비콘/아이콘 세트 | ✅ 존재 | `public/icons/`에 "꿀꿀 운세 로고.png/.webp" 한글 파일명으로 직접 존재 |
| 기본 OG 이미지 | ✅ 존재 | `public/og/code-destiny-og-vvip.png` 등 3종, `og:render`/`og:cache-bust` 스크립트로 관리 |
| GSC `google-site-verification` | ❌ placeholder | `index.html`·`app/layout.js` 둘 다 주석 처리 상태 — Cloudflare DNS TXT로 별도 인증됐는지 미확인, 사용자 확인 필요 |
| 네이버 `naver-site-verification` | ⚠️ 2개 병기 | 어느 쪽이 유효한지 서치어드바이저 로그인 필요(`SEO_SUBMISSION_GUIDE.md §2` 이미 문서화) |

## 3. sameAs / 외부 신뢰 신호

| 채널 | URL | 상태 |
|---|---|---|
| 네이버 블로그 | `blog.naver.com/codedestiny` | 운영 중 — `SEO_SUBMISSION_GUIDE.md §2-4`가 네이버 브랜드 검색 신호의 핵심 채널로 명시 |
| 인스타그램 | `instagram.com/code_destiny_official` | sameAs 등록됨 |
| 유튜브 / X(트위터) / 틱톡 | — | 없음(코드 전체 검색 결과 0건 — 추측 아님) |

공백 조치는 [06-content-roadmap.md P3](06-content-roadmap.md)로 라우팅(신규 SNS 채널 개설은 SEO
문서 범위를 넘는 운영 결정이라 여기서는 공백 기록만 한다).

## 4. 브랜드 질의 목록 (실측 순위는 [09](09-measurement-plan.md)로 라우팅)

CODE DESTINY / CODEDESTINY / code destiny / code-destiny / 코드 데스티니 / 코드데스티니 /
꿀꿀운세 / 꿀꿀 운세 / 꿀꿀만세력 / 꿀꿀 만세력 / 꽃돼지 운세 / 꽃돼지 사주

`CODE DESTINY 자미두수` / `CODE DESTINY 숙요점` / `CODE DESTINY 사주` 같은 "브랜드+전문분야" 조합
질의는 신규로 반복 삽입하지 않는다 — §2의 기존 표면(별칭 페이지, JSON-LD alternateName)과 각 토픽
허브(02번 문서)가 자연스럽게 함께 색인되면 조합 질의는 그 결과로 따라온다는 것이 이 세트의 전제다.

## 5. `SEO_SUBMISSION_GUIDE.md`와의 경계

| | 이 문서 | `SEO_SUBMISSION_GUIDE.md` |
|---|---|---|
| 성격 | 자산 현황(정적 인벤토리) | 등록·운영 절차(액션 가이드) |
| GSC/네이버 인증 코드 상태 | §2 표에 상태만 기록 | 인증 방법·절차 상세 |
| "꿀꿀 운세" 브랜드 검색 개선 팁 | 링크만 | §2-4에 이미 존재 — 재작성 금지 |

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-11 | 최초 작성. 브랜드 노출 표면 8종 현황, sameAs 2건, GSC/네이버 인증 미확정 상태 기록 |
