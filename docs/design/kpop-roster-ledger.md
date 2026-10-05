# K-POP 로스터 검증 원장

- 데이터 정본: `lib/idol-chemi/data/roster.js`
- `ROSTER_VERSION`: `kpop-roster-2026.10-v1`
- `ROSTER_CHECKED_ON`: `2026-10-04`
- 범위: 12그룹 76명 (현재 활동 라인업만)

## 검증 절차

1. 멤버 전원의 **공개 양력 생년월일**을 서로 독립된 **출처 2곳**에서 확인한다. 허용 출처: 소속사 공식 프로필, 나무위키, 한국어/영어 위키백과, kprofiles.com, 멜론/지니 아티스트 페이지, 다음/네이버 인물 프로필.
2. 그룹 단위 페이지(멤버 전원의 생년월일을 나열하는 위키·Kprofiles 그룹 문서)를 그 그룹 멤버 전원의 출처 1개로 쓸 수 있다. 두 번째 출처도 **다른 사이트**의 그룹 단위 페이지면 된다. 두 출처 URL을 멤버마다 `sources`에 기록한다.
3. 두 출처가 다르면 멤버를 유지하되 `missing: ["birthDate-conflict"]`, `status: "inactive"`, 날짜는 더 공식적인 출처 것을 쓴다.
4. 출처가 1곳뿐이면 그 출처만 기록하고 `missing: ["single-source"]` (status 는 active 유지).
5. 라인업: 2026년 현재 활동 멤버만 수록한다. 탈퇴·계약 종료 멤버는 **넣지 않는다**(전 멤버 항목을 만들지 않음). 라인업 사실이 불확실하면 `status: "inactive"` + `missing: ["lineup-uncertain"]`. 군 복무 중인 멤버는 그룹 멤버 지위가 유지되므로 `active`.
6. `aliases`는 검색용 문자열이다: 한글 활동명 변형, 영문, 로마자 표기, 비하적이지 않은 널리 쓰이는 팬 애칭, 그룹 약칭. **법적 본명은 그것이 곧 공개 활동명인 경우(안유진·장원영·김채원 등)에만** 넣는다.
7. `id`는 `"<groupId>-<stageNameEn 소문자 kebab>"` (예 `bts-jungkook`, `seventeen-s-coups`, `stray-kids-i-n`).

## 그룹별 로그 (2026-10-04 조회)

| 그룹 | 멤버 수 | 출처 1 | 출처 2 | 불일치/비고 |
|---|---:|---|---|---|
| BTS (방탄소년단) | 7 | Namu Wiki `namu.wiki/w/방탄소년단` | Wikipedia (ko) `ko.wikipedia.org/wiki/방탄소년단` | 불일치 없음. Kprofiles 그룹 페이지는 조회 시 이미지 응답(본문 없음)이라 나무위키로 대체. |
| TWICE (트와이스) | 9 | Kprofiles `kprofiles.com/twice-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/트와이스` | 불일치 없음. Kprofiles 기준 정연·채영은 2026-08 JYP 와 개인 계약을 종료했으나 9인 그룹 활동은 유지 → 전원 active, 그룹 `agencyLabel`은 JYP 유지. |
| BLACKPINK (블랙핑크) | 4 | Kprofiles `kprofiles.com/black-pink-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/블랙핑크` | 불일치 없음. 개인 활동 소속사는 각자 다르지만 그룹 소속은 YG. |
| NewJeans (뉴진스) | 4 | Kprofiles `kprofiles.com/newjeans-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/뉴진스` | 불일치 없음. **다니엘은 2025-12-29 어도어 전속계약 종료**(두 출처 + Korea Herald/Forbes 보도 일치) → 절차 5에 따라 미수록. 기대값 5 → 실측 4. `NJZ`는 2025-02~04 공식 임시 사용 후 중단된 명칭이라 검색 별칭으로만 보존. |
| IVE (아이브) | 6 | Kprofiles `kprofiles.com/ive-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/아이브_(음악_그룹)` | 불일치 없음. |
| aespa (에스파) | 4 | Kprofiles `kprofiles.com/aespa-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/에스파` | 불일치 없음. |
| LE SSERAFIM (르세라핌) | 5 | Kprofiles `kprofiles.com/le-sserafim-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/르세라핌` | 불일치 없음. 김가람(2022-07 탈퇴) 미수록. |
| i-dle (아이들, 구 (여자)아이들) | 5 | Kprofiles `kprofiles.com/idle-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/(여자)아이들` | 불일치 없음. 2025-05-02 `(G)I-DLE` → `i-dle` 로 공식 리브랜딩(Kprofiles·ko/en Wikipedia 일치) → `nameKo: "아이들"`, `nameEn: "i-dle"`, 구 명칭은 aliases 에 전부 보존. 그룹 id 는 `gidle` 유지. 수진(2021 탈퇴) 미수록. 구 URL `kprofiles.com/g-i-dle-members-profile/`는 404. |
| SEVENTEEN (세븐틴) | 13 | Kprofiles `kprofiles.com/seventeen-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/세븐틴_(음악_그룹)` | 불일치 없음. 복무 중 멤버(원우·민규·도겸·버논 등)는 멤버 지위 유지 → active. |
| Stray Kids (스트레이 키즈) | 8 | Kprofiles `kprofiles.com/stray-kids-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/스트레이_키즈` | 불일치 없음. 우진(2019 탈퇴) 미수록. |
| TXT (투모로우바이투게더) | 5 | Kprofiles `kprofiles.com/txt-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/투모로우바이투게더` | 불일치 없음. |
| ENHYPEN (엔하이픈) | 6 | Kprofiles `kprofiles.com/enhypen-members-profile/` | Wikipedia (ko) `ko.wikipedia.org/wiki/엔하이픈` | 불일치 없음. **희승은 2026-03-10 그룹 탈퇴, 솔로 EVAN 으로 활동**(Kprofiles·en Wikipedia·Billboard 일치; ko Wikipedia 는 "일시적으로 탈퇴" 표기이나 소속사가 03-15 복귀 불가를 재확인) → 절차 5에 따라 미수록. 기대값 7 → 실측 6. |

합계: 12그룹 76명. `missing` 플래그가 붙은 멤버 0명, `inactive` 0명.

### 보조 확인 (라인업 변동 교차 검증)

- NewJeans: Korea Herald `koreaherald.com/article/10645178`, Forbes 2025-12-29 보도, en Wikipedia `Danielle_(singer)`.
- ENHYPEN: Billboard 2026-03-10 보도, Soompi(EVAN 솔로 데뷔), Kprofiles `kprofiles.com/heeseung-enhypen-profile/`, en Wikipedia `Enhypen` (03-15 복귀 불가 재확인 문장).
- i-dle: en Wikipedia `I-dle` (2025-05 리브랜딩), Kprofiles 그룹 페이지.

## 제외한 그룹과 이유

| 그룹 | 이유 |
|---|---|
| RIIZE | v1 범위 밖. 라인업 변동(2024~) 재확인 필요 → **v2 예정** |
| ILLIT | v1 범위 밖 → **v2 예정** |
| BABYMONSTER | v1 범위 밖 → **v2 예정** |
| NMIXX | v1 범위 밖 → **v2 예정** |

## 금지 사항

- **생시(출생 시각)** 는 어떤 출처에서 보이더라도 기록하지 않는다. `birthTimeKnown`은 항상 `false`.
- **MBTI·혈액형·성격 묘사·연애/가족·건강·사생활** 정보는 기록하지 않는다.
- 법적 본명은 공개 활동명과 동일한 경우를 제외하고 aliases 에 넣지 않는다.
- 비하적·조롱성 팬 별칭은 넣지 않는다.
- 전 멤버는 수록하지 않는다(별칭 매칭 대상에서도 제외).

## 검증 명령

```
node -e "import('./lib/idol-chemi/data/roster.js').then(m=>{const g=m.ROSTER_GROUPS;let n=0;for(const x of g){n+=x.members.length;for(const mem of x.members){if(!/^\d{4}-\d{2}-\d{2}$/.test(mem.birthDate))throw new Error(mem.id);if(mem.sources.length<1)throw new Error('src '+mem.id);if(mem.birthTimeKnown!==false)throw new Error('time '+mem.id)}}console.log(g.length,'groups',n,'members')})"
```

2026-10-04 실측 출력: `12 groups 76 members`
