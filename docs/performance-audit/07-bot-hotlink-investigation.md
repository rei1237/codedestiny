# 07 Bot Hotlink Investigation

## 조사 범위

- 코드 검색 대상: `app/`, `src/`, `lib/`, `public/`, `index.html`, `middleware.ts`, `worker/`.
- 외부 확인: production `robots.txt`, `sitemap.xml`, 주요 페이지 meta, R2/custom-domain asset HEAD 요청.
- 수정 없음: 이번 단계는 원인 후보와 무료 방어안 문서화만 수행했다.

## 핵심 결론

브라우저 Network 기준 초기 로딩보다 Cloudflare Bandwidth가 계속 크다면, 가장 강한 후보는 `music.code-destiny.com`의 공개 음원 직접 접근이다. 코드와 운영 문서가 R2 음원 URL을 공개 URL로 생성하고, HEAD 요청만으로도 `.wav` 원본이 51MB 규모로 직접 접근 가능함이 확인됐다.

이미지 쪽은 `assets.code-destiny.com`의 `DestinyWar`, `DestinyCafe`, `DestinyCafe/caretaro` 경로가 직접 접근 가능하다. 단일 파일 크기는 음원보다 작지만, 예측 가능한 폴더/파일명과 다수의 카드/스프라이트/원본 PNG가 있어 크롤러나 외부 미리보기 반복 요청에는 취약하다.

## 확인 근거

- `lib/r2-public-url.ts:34-42`: `buildMusicPublicUrl()`이 기본값으로 `https://music.code-destiny.com`을 사용한다.
- `app/music/_data/musicManifest.ts:21-286`: 공개 `audioKey`와 `audioUrl`을 가진 음악 manifest를 생성한다. 코드상 음원 파일명은 101개가 잡혔다.
- `app/music/README.md:5-14`: 음악 플레이어 URL은 새 탭에서 직접 열릴 수 있어야 한다고 명시되어 있다.
- `src/features/fortune-tea-house/FortuneTeaHousePage.tsx:35-60`: 운명의 찻집 BGM mp3 URL 6개가 코드에 직접 노출된다.
- `src/features/neo-war-room/data/assets.ts:23-39`: `DestinyWar` asset base와 BGM mp3 URL이 직접 노출된다.
- `src/features/fortune-tea-house/lib/tarotCardImageMap.ts:3-6`: `DestinyCafe/caretaro` prefix의 R2 카드 이미지 목록이 코드에 존재한다. 배열에서 178개 파일명이 확인됐다.
- `app/fortune-tea-house/page.tsx:19-25`: `og:image`가 `fortuneTeaHouseAssets.pig.transform`으로 설정되어 R2 asset URL을 사용한다.
- `app/music/page.tsx:25-31`: `/music`은 noindex다. production sitemap에는 `/music/` 본 페이지는 없고 `/music/guide/`만 확인됐다.
- production `robots.txt`: `/api`, `/admin`, `/login`, `/points`, `/premium-unlock`, `/result` 등 private/action 경로는 차단하지만 `/images/`, `/fuctionassets/`, `/DestinyCafe`, `/DestinyWar`, asset custom domain은 차단하지 않는다.
- production `sitemap.xml`: 448개 URL. `/fortune-tea-house/`, `/music/guide/`, `/tarot/mindscan/` 등은 포함된다. `/neo-operation-room/`은 확인되지 않았다.

## 직접 접근 샘플

| 샘플 URL | HEAD 결과 | Content-Length | 판단 |
|---|---:|---:|---|
| `https://assets.code-destiny.com/DestinyCafe/운명의 찻집.webp` | 200 | 210,268 B | 직접 접근 가능 |
| `https://assets.code-destiny.com/DestinyWar/네오 전략실 베다점 이미지.png` | 200 | 3,319,544 B | 대형 PNG 직접 접근 가능 |
| `https://assets.code-destiny.com/DestinyCafe/caretaro/고위여사제.webp` | 200 | 305,490 B | 카드 이미지 직접 접근 가능 |
| `https://music.code-destiny.com/DestinyCafe/Moonlit Tea House.mp3` | 200 | 2,679,971 B | mp3 직접 접근 가능 |
| `https://music.code-destiny.com/DestinyWar/Moonlit Strategy Map.mp3` | 200 | 3,136,608 B | mp3 직접 접근 가능 |
| `https://music.code-destiny.com/yeonisong/Moonlight Daydream.wav` | 200 | 51,095,212 B | 매우 큰 wav 원본 직접 접근 가능 |
| `https://code-destiny.com/og/code-destiny-og.png` | 404 | - | 기본 OG 경로 누락 또는 배포 불일치 |
| `https://code-destiny.com/icons/icon-512x512.png` | 404 | - | 일부 정적 OG fallback 경로 누락 |

## 의심 경로 표

| 의심 경로/파일 | 외부 직접 접근 가능 여부 | 노출 위치 | 위험도 | 무료 대응 가능 여부 | 추천 조치 |
|---|---|---|---|---|---|
| `https://music.code-destiny.com/yeonisong/Moonlight Daydream.wav` 및 `yeonisong/*.wav` | 가능: HEAD 200, 51MB 샘플 확인 | `app/music/_data/musicManifest.ts`, `app/music/README.md` | Critical | 가능하나 단계적 적용 필요 | 원본 wav를 mp3/aac 스트리밍용으로 변환하고, 공개 manifest에는 경량 파일만 노출. 원본 wav는 비공개 bucket 또는 admin 전용으로 이동 검토 |
| `https://music.code-destiny.com/neosong/*.wav` | 가능성이 높음: manifest에 다수 wav 파일명 노출 | `app/music/_data/musicManifest.ts:88-119` | Critical | 가능 | `/music` 사용자 재생 시점에만 signed/proxy URL을 받는 구조 검토. 당장 적용 전에는 Rate Limiting으로 `music.code-destiny.com/*.wav` 과다 요청 제한 |
| `https://music.code-destiny.com/DestinyCafe/*.mp3` | 가능: HEAD 200, 2.6MB 샘플 확인 | `FortuneTeaHousePage.tsx:35-60`, music manifest | High | 가능 | BGM URL 직접 노출 최소화. 즉시 차단보다 referer 없는 대량 요청을 관찰 후 rate limit 후보로 등록 |
| `https://music.code-destiny.com/DestinyWar/*.mp3` | 가능: HEAD 200, 3.1MB 샘플 확인 | `src/features/neo-war-room/data/assets.ts:29`, music manifest | High | 가능 | 재생 클릭 전 URL 비노출 구조 검토. `neo-operation-room`은 `referrer: no-referrer`라 단순 referer allowlist 적용 전 조정 필요 |
| `https://assets.code-destiny.com/DestinyWar/*.png` | 가능: HEAD 200, 3.3MB 샘플 확인 | `src/features/neo-war-room/data/assets.ts`, page components | High | 가능 | 원본 PNG를 WebP/AVIF 대표본으로 분리. 원본 경로는 robots 차단과 WAF rate limit 후보. hotlink 차단은 `referrerPolicy="no-referrer"` 영향 확인 후 적용 |
| `https://assets.code-destiny.com/DestinyCafe/caretaro/*.webp` | 가능: HEAD 200, 178개 파일명 코드 노출 | `tarotCardImageMap.ts` | High | 가능 | 카드 원본은 상세 진입 시만 노출. 앨범/목록용 thumbnail prefix를 따로 두고 원본 prefix는 rate limit 또는 signed URL 후보 |
| `https://assets.code-destiny.com/DestinyCafe/nobackground/*.png` | 가능성이 높음: asset helper와 코드에 파일명 노출 | `src/features/fortune-tea-house/data/assets.ts:12-35` | High | 가능 | 대형 투명 PNG는 WebP 변환 후 public 노출. 원본 PNG prefix는 referer/rate limit 후보 |
| `public/images/fortune-tea-house/*.png` | 가능: 정적 public 파일이며 2MB대 스프라이트 다수 존재 | `public/images/fortune-tea-house`, CSS background-image | High | 가능 | `/images/fortune-tea-house/*sprite*.png` robots 차단 제안. 사용자 기능 경로는 유지하되 sitemap/OG 노출 금지 |
| `https://assets.code-destiny.com/DestinyCafe/꽃돼지 연이 변신.webp` | 가능: HEAD 200, 129KB | `app/fortune-tea-house/page.tsx` OG image | Low | 가능 | 크기는 양호. 유지 가능. 단, SNS 공유용 이미지는 별도 `/og/fortune-tea-house-1200x630.webp`로 고정하면 R2 직접 요청 추적이 쉬워짐 |
| `https://code-destiny.com/og/code-destiny-og.png` | 현재 production HEAD 404 | `lib/seo/siteSeo.ts`, `app/layout.js`, 다수 page metadata | Medium | 가능 | 1200x630 WebP/JPG 대표 이미지를 실제 배포 경로에 생성. 404 반복 요청과 SNS 미리보기 실패 제거 |
| `https://code-destiny.com/icons/icon-512x512.png` | 현재 production HEAD 404 | 정적 fortune HTML OG fallback | Medium | 가능 | 실제 존재하는 경량 WebP/JPG로 교체하거나 파일 복구. 크롤러 404 반복을 줄임 |
| `/robots.txt` | 접근 가능, asset 경로 차단 없음 | `app/robots.ts`, production robots | Medium | 가능 | `/images/fortune-tea-house/`, 무거운 sprite/debug/result asset 경로만 신중히 Disallow. 일반 서비스 페이지와 Googlebot 색인은 유지 |
| `/sitemap.xml` | 접근 가능, production 448개 URL | `app/sitemap.ts`, `lib/seo-site-urls.ts`, worker feed merge | Medium | 가능 | noindex/무거운 체험형 URL이 sitemap에 섞이지 않는지 정기 검증. `/music/guide/`는 유지 가능하나 `/music/` 본 페이지는 계속 제외 |
| `img-src https:` CSP | 모든 HTTPS 이미지를 허용 | `public/_headers` | Medium | 제한적 | CSP는 외부가 우리 asset을 퍼가는 것을 막지 못한다. 외부 표시 방어는 WAF/Worker/asset domain rule로 해야 함 |
| `referrerPolicy="no-referrer"` in Neo asset images | 첫 방문자 asset 요청도 Referer 없음 | `NeoWarRoomAssetImage.tsx:79-81`, `app/neo-operation-room/page.tsx:7` | Medium | 적용 전 조정 필요 | referer 기반 hotlink 방어를 바로 켜면 정상 Neo 이미지도 차단될 수 있음. 먼저 referrer policy 조정 또는 no-referer 예외 설계 |

## 봇/SNS 미리보기 가능성

- 카카오, 네이버, 페이스북, X, 디스코드 같은 미리보기 봇은 페이지 HTML을 열고 `og:image` 또는 `twitter:image`를 가져간다.
- 운명의 찻집 OG 이미지는 R2 WebP지만 129KB로 작아 대역폭 주범 가능성은 낮다.
- 여러 Next metadata fallback은 `https://code-destiny.com/og/code-destiny-og.png`를 가리키는데, production HEAD가 404였다. 대역폭 주범보다는 반복 404와 공유 품질 문제다.
- 음악 페이지는 noindex지만, 공개 manifest와 직접 음원 URL이 있으면 SNS 봇보다 외부 직접 다운로드/크롤러가 더 큰 위험이다.

## R2 파일명 예측 가능성

- `music.code-destiny.com` 경로는 `neosong/`, `yeonisong/`, `DestinyCafe/`, `DestinyWar/`처럼 의미 있는 폴더명과 사람이 읽을 수 있는 파일명을 사용한다.
- `DestinyCafe/caretaro`는 카드명 기반 파일명 178개가 코드에 포함되어 있어 목록 추출이 쉽다.
- `DestinyWar`와 `DestinyCafe/nobackground`는 한글 원본명과 역할 기반 파일명이 섞여 있어 추측 가능성이 높다.
- 예측 가능한 URL 자체는 보안 취약점은 아니지만, public bucket에서는 대량 접근 비용 리스크가 된다.

## 무료 대응 후보

1. `og:image` 경량화 및 경로 복구
   - `https://code-destiny.com/og/code-destiny-og.png` 404를 없앤다.
   - 공유 전용 1200x630 WebP/JPG를 별도로 만들고 모든 fallback OG를 해당 파일로 통일한다.
   - 서비스별 OG는 R2 원본이 아니라 `/og/service-name-1200x630.webp` 경량본을 사용한다.

2. robots.txt 정리
   - 일반 페이지 색인은 유지한다.
   - `/images/fortune-tea-house/*sprite*`, 대형 debug/demo asset, 결과 전용 이미지 경로처럼 검색 유입 가치가 낮은 asset 경로만 Disallow 후보로 둔다.
   - `music.code-destiny.com`과 `assets.code-destiny.com`가 별도 zone이면 각 zone의 robots 또는 방어 룰을 따로 봐야 한다.

3. 음원 원본 노출 최소화
   - public manifest에 `.wav` 원본 URL을 노출하지 않는다.
   - 사용자 재생 클릭 시 worker에서 짧은 만료의 signed/proxy URL을 받아오는 구조를 검토한다.
   - Free 단계에서는 먼저 `.wav` 원본을 public에서 제거하거나 경량 변환본만 public에 둔다.

4. Cloudflare Free 룰 사용
   - Custom Rules Free quota는 5개로 확인된다.
   - Rate Limiting Rules Free quota는 1개로 확인된다.
   - 1개 rate limit은 먼저 `music.code-destiny.com`의 `.wav` 또는 대형 audio 경로에 쓰는 것이 가장 효과적이다.
   - 예: 같은 IP가 짧은 시간에 `*.wav` 또는 `audio/*`를 반복 요청하면 Managed Challenge 또는 Block. 단, 정상 재생의 Range 요청을 과도하게 막지 않도록 threshold를 넉넉히 둔다.

5. Hotlink Protection 한계
   - Cloudflare built-in Hotlink Protection은 `gif`, `ico`, `jpg`, `jpeg`, `png` 확장자를 대상으로 한다.
   - 현재 큰 위험인 `.webp`, `.mp3`, `.wav`에는 기본 Hotlink Protection만으로는 충분하지 않다.
   - PNG 원본에는 일부 도움이 될 수 있지만, WebP/음원은 Custom Rule, Worker, R2 접근 구조 변경이 필요하다.

6. referer 검사 주의
   - `NeoWarRoomAssetImage`와 `app/neo-operation-room/page.tsx`가 no-referrer 정책을 쓴다.
   - 따라서 `Referer`가 없으면 무조건 차단하는 규칙은 정상 사용자까지 막을 수 있다.
   - 적용 전에는 `Sec-Fetch-Site`, path, extension, request rate를 함께 보는 완화 규칙이 낫다.

## Cloudflare Free로 가능한 간접 확인

- Security Events에서 `music.code-destiny.com` 또는 `assets.code-destiny.com`에 대한 User-Agent, path pattern, action 결과를 표본으로 확인한다.
- Analytics의 total requests, bandwidth, cached/uncached 변화 추이를 배포 전후로 비교한다.
- Browser Network 측정값과 Cloudflare 전체 bandwidth 차이가 계속 크면 직접 asset 접근 가능성을 우선 의심한다.
- 직접 HEAD/GET 샘플로 공개 접근 가능 여부와 파일 크기를 확인한다. 단, 반복 GET은 비용을 만들 수 있으므로 HEAD 위주로 확인한다.

## Pro 또는 Logpush가 필요한 확정 항목

- R2 object별 실제 egress 상위 파일.
- `music.code-destiny.com/yeonisong/Moonlight Daydream.wav` 같은 단일 파일이 실제 몇 GB를 썼는지.
- 특정 referrer, User-Agent, ASN, 국가, IP가 bandwidth를 만든 비율.
- URL별 Cache HIT/MISS와 uncached bandwidth.
- SNS 미리보기 봇이 어떤 OG 이미지를 몇 번 가져갔는지.
- 외부 사이트 hotlink가 실제로 어느 페이지에서 발생했는지.

## 코드/브라우저 Network로 확인된 원인

- 공개 음악 URL 구조는 확인됐다.
- 공개 R2 이미지 URL 구조는 확인됐다.
- 일부 음원과 이미지가 직접 HEAD 200으로 접근 가능함이 확인됐다.
- 브라우저 초기 로딩에서는 5단계 수정 후 자동 음원 로딩이 줄어든 것으로 보이나, public URL 자체는 여전히 외부에서 직접 열 수 있다.
- `/og/code-destiny-og.png`, `/icons/icon-512x512.png` production 404는 확인됐다.

## 봇/핫링크로 의심되지만 Cloudflare Free로 확정 불가능한 원인

- 외부 사이트가 `music.code-destiny.com` 음원을 직접 링크했는지.
- 봇이 `DestinyCafe/caretaro` 또는 `DestinyWar` 이미지를 대량 순회했는지.
- 특정 SNS/메신저 미리보기 봇이 OG 이미지를 반복 요청했는지.
- `Moonlight Daydream.wav` 같은 51MB 원본이 실제 3.98GB Bandwidth의 주범인지.
- R2 custom domain별, object별 전송량.

## Pro 없이 할 수 있는 방어 조치

- 공유용 OG 이미지를 실제 존재하는 경량 파일로 통일한다.
- public manifest에서 `.wav` 원본 노출을 제거하고 경량 스트리밍 파일만 남긴다.
- Free Rate Limiting 1개는 `music.code-destiny.com`의 큰 음원 파일 반복 요청에 우선 배정한다.
- Custom Rules 5개는 대형 음원, 대형 PNG, 카드 원본 prefix, 비정상 UA, 과도한 no-referer 직접 요청에 배분한다.
- robots.txt에 검색 가치 없는 sprite/debug/result asset 경로 차단을 추가하는 안을 준비한다.
- no-referrer 정책이 있는 Neo 경로는 referer 차단 적용 전에 정책을 정리한다.

## Pro 또는 Logpush/상세 Analytics가 있어야 확정 가능한 항목

- URL별 Data Transfer Top N.
- R2 object별 egress.
- referrer별 hotlink 증거.
- User-Agent/ASN/IP별 대역폭 집중도.
- Cache MISS bandwidth.
- SNS preview bot의 반복 요청 횟수.

## 참고한 Cloudflare 공식 문서

- R2 public buckets: https://developers.cloudflare.com/r2/buckets/public-buckets/
- Hotlink Protection: https://developers.cloudflare.com/waf/tools/scrape-shield/hotlink-protection/
- WAF Custom Rules: https://developers.cloudflare.com/waf/custom-rules/
- Rate Limiting Rules: https://developers.cloudflare.com/waf/rate-limiting-rules/
- Logpush / logs: https://developers.cloudflare.com/logs/
