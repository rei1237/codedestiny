---
status: active
updated: 2026-11-04
next: "development 경고를 메이저 업데이트 없이 풀리는 것부터 묶고, 스토어 재배포 일정은 사용자가 정하면 진행한다"
---

# 의존성 보안 경고 정리

## 왜

GitHub Dependabot 경고가 127건 열려 있었다. 사용자가 2026-11-04에 `package-lock.json` 수정을 포함한 업그레이드를 승인했다("니가 직접 진행해", "승인할께").

## 지금 상태

2026-11-04 실측이다.

- 업그레이드 전 127건: critical 8, high 57, medium 49, low 13. 범위는 runtime 49, development 78. 파일은 `package-lock.json` 125, `apps/mobile/package.json` 2.
- 업그레이드 후 76건(2026-11-05 재측정): critical 1, high 36, medium 31, low 8. 범위는 runtime 2(`satori`, `mongoose`, 둘 다 medium), development 74. 파일은 전부 `package-lock.json`. critical은 development의 `proxy-addr` 1건이다. `sharp`는 `npm audit`에만 high로 잡히고 Dependabot runtime에는 없다.
- 올린 버전: next 15.5.29, `@next/bundle-analyzer`·`eslint-config-next` 15.5.28 이상, Capacitor 8.4.3(루트 `~8.4.3`, 모바일 고정), dompurify 3.4.17, tiptap 3.32.2 단일화, nanoid 3.3.20, postcss 8.5.32(next 내부 포함, `overrides`), prosemirror-view 1.42.9, source-map-js 1.2.2, ip-address 10.7.6.
- `npm audit` 재집계. `--omit=dev`는 high 1, moderate 3이다. 전체는 critical 1, high 23, moderate 63, low 2다.
- runtime 잔여와 제외 사유:

| 패키지 | 등급 | 제외 사유 |
|---|---|---|
| `sharp` 0.34.5 | high | `app lib worker js components`에서 import하지 않고 `scripts/`의 빌드 처리에서만 쓴다. 입력은 저장소 안 이미지다. 수정판 0.35.5는 메이저 취급이고 next·miniflare가 0.34 계열을 끌어온다 |
| `mongoose` 9.3.0 | moderate | 수정판은 9.7.2다. 실제 DB 없이 결제·프로필 경로를 검증할 수 없어 따로 올린다 |
| `satori` 0.15, `workers-og` | moderate | satori 수정판 0.33.5는 `workers-og`가 끌어오는 범위 밖이다. OG 이미지 렌더 회귀 검증이 함께 필요하다 |

| 패키지 | 설치 | 수정 버전 | 범위 | GHSA | 지금 노출 |
|---|---|---|---|---|---|
| `next` | 15.5.15 | 15.5.24, 15.5.28 | runtime | 2xp9-vwfh-vxw4, p293-qw3h-jr36, 2464-fhr4-w9xw | 운영은 `output:"export"`이고 라이브 `/_next/image`가 404라 Image Optimization 경로는 없다. Windows 로컬 개발 서버는 확인하지 않았다 |
| `dompurify` | 3.4.11 | 3.4.17 | runtime | cg2g-xh64-v4q7 | `SAFE_FOR_TEMPLATES` 우회다. `js app lib components worker`에 이 옵션이 없다. 같은 버전으로 풀리는 high도 있다 |
| `@capacitor/android`, `@capacitor/ios` | 8.4.1 | 8.4.3 | runtime | rvm3-566m-v7fv | 앱 오리진에 원격 콘텐츠를 불러올 수 있다. 실제 앱 흐름에서 도달하는지 확인하지 않았다 |
| `proxy-addr` | 미확인 | 2.0.8 | development | jqcg-44mw-7w3h | 운영 번들 밖이다 |

"지금 노출"은 코드 검색과 라이브 요청으로 본 판단이고 침투 시험이 아니다.

## 남은 작업

- [x] **1. 사용자 승인.** `package-lock.json` 수정은 승인됐다.
- [ ] **2. Capacitor 8.4.3.** 의존성은 올렸다. 안드로이드·iOS 네이티브 빌드와 스토어 재배포는 실행하지 않았고 일정은 사용자가 정한다. 그 전까지 설치된 앱에는 수정이 닿지 않는다.
- [x] **3. Next 15.5.29.** `check:fast`(node 4,248, Jest 7,282)와 `build:cf`(verify-dist 실패 0) 통과.
- [x] **4. DOMPurify 3.4.17.** 같은 `check:fast`로 확인.
- [ ] **5. 나머지 runtime 경고.** 위 표의 `sharp`, `mongoose`, `satori`가 남았다. 각각 제외 사유의 검증을 갖춘 뒤 올린다.
- [ ] **6. development 경고.** `proxy-addr`(critical), `@opennextjs/cloudflare`, `lighthouse` 등이다. 메이저 업데이트 없이 풀리는 것만 묶는다.

## 정본 예시

- 재현: `gh api --paginate "repos/rei1237/codedestiny/dependabot/alerts?state=open&per_page=100"`
- 정적 export 설정: `next.config.mjs:160,187-188`

## 함정

- `package.json`의 `next`는 `^15.0.0`이라 실제 버전은 lockfile이 정한다. 설치 버전은 `package-lock.json`으로 확인한다.
- 루트 `package.json`과 `apps/mobile/package.json`의 Capacitor는 따로 고정돼 있다.
- 🔴 롤백은 `git revert` 후 재배포만 한다. force-push, reset --hard, 로컬 wrangler 배포는 금지다.
- 🔴 결제·인증 경로에 닿는 업그레이드는 RED로 다루고, 실결제와 과금 LLM 호출로 검증하지 않는다.

## 검증

- 묶음마다 `npm run check:fast`, push 전 `npm run check:pre-push`, main CI, 스테이징 릴리스.
- 경고 수는 위 재현 명령으로 전후를 잰다.

## 모르는 것

- Windows에서 돌리는 로컬 Next 개발 서버가 해당 RCE에 실제로 노출되는지.
- Capacitor 경고가 현재 앱의 웹뷰 설정에서 도달 가능한지.
- high 57건의 패키지별 도달 가능성. critical과 일부 high만 읽었다.
