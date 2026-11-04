---
status: blocked
updated: 2026-11-04
next: "사용자가 package-lock.json 수정을 승인하면 runtime 경고부터 Capacitor 8.4.3, Next 15.5.28, DOMPurify 3.4.17 순서로 묶음별 PR을 낸다"
---

# 의존성 보안 경고 정리

## 왜

GitHub Dependabot 경고가 127건 열려 있다. 이전 작업 제약 ".env*, package-lock.json, ads.txt, worker/ ... 수정하지 마"에 걸려 업그레이드하지 않았다. 이 문서는 승인 뒤 바로 시작하기 위한 조사 결과다.

## 지금 상태

2026-11-04 실측이다.

- 127건: critical 8, high 57, medium 49, low 13. 범위는 runtime 49, development 78. 파일은 `package-lock.json` 125, `apps/mobile/package.json` 2.
- 아무것도 업그레이드하지 않았다.

| 패키지 | 설치 | 수정 버전 | 범위 | GHSA | 지금 노출 |
|---|---|---|---|---|---|
| `next` | 15.5.15 | 15.5.24, 15.5.28 | runtime | 2xp9-vwfh-vxw4, p293-qw3h-jr36, 2464-fhr4-w9xw | 운영은 `output:"export"`이고 라이브 `/_next/image`가 404라 Image Optimization 경로는 없다. Windows 로컬 개발 서버는 확인하지 않았다 |
| `dompurify` | 3.4.11 | 3.4.17 | runtime | cg2g-xh64-v4q7 | `SAFE_FOR_TEMPLATES` 우회다. `js app lib components worker`에 이 옵션이 없다. 같은 버전으로 풀리는 high도 있다 |
| `@capacitor/android`, `@capacitor/ios` | 8.4.1 | 8.4.3 | runtime | rvm3-566m-v7fv | 앱 오리진에 원격 콘텐츠를 불러올 수 있다. 실제 앱 흐름에서 도달하는지 확인하지 않았다 |
| `proxy-addr` | 미확인 | 2.0.8 | development | jqcg-44mw-7w3h | 운영 번들 밖이다 |

"지금 노출"은 코드 검색과 라이브 요청으로 본 판단이고 침투 시험이 아니다.

## 남은 작업

- [ ] **1. 사용자 승인.** `package-lock.json` 수정 허용, Capacitor 스토어 재배포 여부.
- [ ] **2. Capacitor 8.4.3.** 루트와 `apps/mobile/package.json`을 함께 올린다. 판정: 안드로이드·iOS 빌드 성공, 스토어 배포 일정은 사용자가 정한다.
- [ ] **3. Next 15.5.28.** 판정: `npm run check:fast`, 정적 export 빌드, 스테이징 릴리스 통과.
- [ ] **4. DOMPurify 3.4.17.** 판정: 살균을 쓰는 화면 테스트 통과.
- [ ] **5. 나머지 runtime 경고 재집계.** 위 묶음 뒤 경고 수를 다시 잰다. 판정: runtime critical·high 0건, 남은 것은 사유를 표로 적는다.
- [ ] **6. development 78건.** runtime이 끝난 뒤 메이저 업데이트 없이 풀리는 것만 묶는다.

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
