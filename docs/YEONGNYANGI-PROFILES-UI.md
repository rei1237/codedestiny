# 영냥이 프로필과 상담 입력 화면

## 동작과 정책

- 방의 출석 조회와 유료 상담의 상품 조회는 프로필 조회를 기다리게 하지 않는다.
- 계정 범위가 확인된 저장 목록을 먼저 표시한다. 영냥이 선택 ID·목록은 계정별 sessionStorage에 보관하며 Code Destiny 기본 프로필을 변경하지 않는다.
- 늦은 목록 응답은 사용자 선택·방금 저장한 프로필·전환 전 계정의 상태를 덮어쓰지 않는다. 삭제된 선택은 재선택하도록 안내한다.
- GET/POST `/api/yeongnyangi/profiles`는 기존 ProfileCard 저장·출생정보 검증·인증·소유권·보안을 재사용한다. 영냥이의 생성 개수 제한과 추가 결제만 적용하지 않는다.
- 공용 `/api/profile`의 정책, 이용권·월정석·상담 단건 결제, 무료 운세 출석·당일 결과 보관 정책은 유지한다. 같은 저장소를 공유하므로 영냥이에서 등록한 프로필도 공용 목록과 기존 개수 계산에 포함된다.
- 등록은 고정 profileId로 재시도한다. 저장 이후 공용·영냥이 목록의 자격증명 캐시와 클라이언트 프로필 캐시를 무효화한다. 강제 갱신은 기존 cache-refresh 헤더를 사용한다.

## 디자인과 에셋 출처

한 화면에서 운세·생선 상품·프로필·주제·질문을 선택한다. 1024px 이상은 안내와 폼을 1:2로 배치하고 작은 화면은 짧은 안내와 한 열 입력으로 구성한다. 기존 영냥이 서체와 보라·아이보리·금색을 유지한다. 방 배경은 기존 `original/room-1440.webp`, `original/room-780.webp`를 사용한다.

제공 폴더 `C:\Users\user\Desktop\사주보는 고양이 영냥이\영냥이 표정`의 아래 두 이미지를 변형 없이 복사했다. 두 원본은 직접 확인한 결과 하단 텍스트가 없다.

| 원본 | 배포 경로 | SHA-256 |
| --- | --- | --- |
| 작은 영냥이 표정 환영.webp | /assets/yeongnyangi/profiles/welcome.webp | e3f1b9cee711a1c32cfe340f53c6d4b1415db91544f9acf85617bc966cea2bd4 |
| 작은 영냥이 표정 진지.webp | /assets/yeongnyangi/profiles/serious.webp | 70421d7212097fbbf5e91bcb7ffa20e685bd1446b577b1bc8ca38a4156f754c8 |

## 재현과 검증

`npm run dev`가 출력한 로컬 mock URL을 사용한다. 다음 UI 검사는 모든 API를 synthetic fixture로 응답하고 외부 요청을 차단한다.

```powershell
$env:YN_UI_ORIGIN='http://127.0.0.1:<mock 서버 포트>'
node scripts/verify-yeongnyangi-profiles-ui.mjs
node scripts/verify-credential-cache.mjs --self-test
node scripts/verify-profile-card-action-policy.mjs
npm run check:fast
```

UI 보고서·스크린샷은 `build-cache/yeongnyangi-profiles-ui/`에 저장한다. 출석·상품 응답에 3초 지연을 주고 프로필 표시의 독립성, 클릭→선택 반영 100ms 이내, 저장 재시도 ID, 계정 전환·로그아웃, 삭제된 선택, 조회 실패, 타로·숙요·출생시간 보완을 검증한다. 360/390/430/1440px에서 axe 접근성과 넘침·44px 터치 영역을 확인한다.

변경 전 mock 표시 측정은 방 4236.4ms, 상담 3974.8ms였다. 최종 변경 후 확인은 방 599.6ms, 상담 1192.0ms, 클릭 반영은 5.9~11.3ms였다. 개발 서버·mock 조건의 측정이며 운영 지연 시간이나 실결제·실 LLM·운영 DB·배포 증거가 아니다.

## 수정 파일과 의도

- `worker/routes/profile.js`, `yeongnyangi.js`, `yeongnyangi-profiles.js`: 기존 저장 처리를 재사용하는 영냥이 전용 정책·라우팅·목록 캐시.
- `worker/lib/credential-scoped-cache.js`, `app/_lib/auth-client.ts`: 새 목록을 기존 자격증명 분리·갱신·요청 중복 방지 규칙에 등록.
- `app/_lib/profile-card-storage.ts`, `app/yeongnyangi/_lib/use-profiles.ts`: 계정별 저장 목록의 빠른 표시와 즉시 선택·늦은 응답 보호.
- `app/yeongnyangi/_components/ProfilePicker.tsx`, `ProfileForm.tsx`, `profiles.module.css`: 공통 프로필 선택·검색·인라인 등록·저장 즉시 선택.
- `app/yeongnyangi/_components/FreeFortune.tsx`: 출석과 독립된 프로필 UI, 무료 운세 잠금 중에도 선택·등록.
- `app/yeongnyangi/_components/Consultation.tsx`, `app/yeongnyangi/yeongnyangi.module.css`: 상품과 독립된 프로필 표시, 달빛 방 배경과 안내·입력 구성.
- `public/assets/yeongnyangi/profiles/{welcome,serious}.webp`: 하단 글자가 없는 원본 캐릭터 이미지.
- `config/sitemap-lastmod.json`: 공통 클라이언트 소스 변경에 따른 자동 서명 갱신. URL·색인 정책은 유지.
- `__tests__/worker/profile.create-first-card.test.js`, `yeongnyangi-route.test.js`, `yeongnyangi-profiles-cache.test.js`: 전용 정책·보안·재시도·캐시 회귀 검증.
- `scripts/verify-credential-cache.mjs`, `verify-profile-card-action-policy.mjs`, `verify-yeongnyangi-profiles-ui.mjs`: 새 경로를 포함하는 기존 보안 검사와 로컬 전용 UI·성능 검사.

`check:fast`의 자동 확장 결제·인증 회귀 88개와 lint는 통과했다. 사이트맵 원장 갱신 후 계획의 해당 단계부터 남은 검사를 이어서 실행했다. 모든 검사는 mock 네트워크 경계에서 실행하며 실결제·유료 LLM·운영 DB 쓰기·운영 승격은 수행하지 않는다.
