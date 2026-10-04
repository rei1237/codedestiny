# 연이 찻집 개편 구현 기록 (2026-10-04)

status: done — 구현·mock 검증·main 전달 완료. 운영 미배포.

## 계약
- 기존 로직 재사용·개선. 계산/타로/결제/권한/복구 복제 금지.
- /fortune-tea-house 및 기존 구매 결과·사주 궁합 유지. 프롤로그/찻잔/앨범 선택형.
- 크림·찻잎·분홍·원목 홈, 질문 우선. 기존 꽃돼지 기준 시트와 인간형 원본 사용.
- 실 LLM/결제/운영 DB/운영 승격 없음. mock 검증 → scoped commit → main push → CI.
- primary의 기존 index/public/marketing 미커밋 변경은 다른 작업. pull 충돌로 안전 워크트리 사용.

## 단계
- [x] 코드·공개 홈·캐릭터 기준 조사, 재사용 선호 메모리 저장
- [x] 기준 시트·대표 에셋 생성
- [x] 홈·질문·확인·프로필·초안 복원
- [x] 공통 사주 정책 및 동일 입력 회귀
- [x] 영냥이 타로 덱·스프레드 재사용, 서버 선택 보존
- [x] 숙요 관계 방향 및 임의 점수 제거
- [x] 상태/반응/상담 에셋 적용 및 manifest (추가 배치용은 별도 표시)
- [x] 결과·보관·공유·복구·분석·번역 키 연결 (일부 언어 영어 fallback)
- [x] mock 및 모바일 360/390/430/desktop 검증 (물리 기기·실결제 제외)
- [x] commit/main 통합/push/CI

## 근거와 미검증
- 공개 홈 실제 Chrome 캡처 확인: 프롤로그 중심, 기능·가격 비교 부족.
- 영냥이 spread-v3: crypto Fisher–Yates, 방향 고정, prepare→draw→pay 계약.
- 찻집: 기존 pending/results/ensure-access/consult 및 부분 생성 checkpoint 재사용.
- 숙요 adapter: normalizeScoreTotal이 70–80 범위로 강제 보정. 새 결과에서 제외.
- 꽃돼지 정본: C:/Users/user/Desktop/CodeDestiny-Build/연이 프로필1.png
- 인간형: public/images/fortune-tea-house/yeoni-sprite7-tarot-photoroom.webp
- 현재 조사만으로 계산 일치·실결제·실 LLM 품질·모바일 E2E를 검증했다고 하지 않는다.

## 디자인 계약
질문을 내려놓는 밝은 찻집. 첫 화면에는 짧은 질문, 제공 결과, 시작 버튼이 보이고 오른쪽/아래에 연이가 차를 건넨다. 긴 상담은 종이 위 편지처럼 읽는다. 상담 중 캐릭터는 한 장면에 한 모습만 사용. 기존 폰트와 공통 토큰을 사용하고 찻집에만 색상을 제한한다.

## 구현 근거 / 현재 검증
- 실제 생성 원본 6장 → 기준 시트·대표 장면·반응·상태·소품 WebP 29개. 원본 assets/yeoni-teahouse/originals, 사용 명세 public/images/fortune-tea-house/renewal/manifest.json.
- 공통 crypto 덱, 영냥이 스프레드/조합 해석을 연이의 3/5장 상품에 연결. owner+attempt 기반 서버 원자적 첫 선택 확정. 카드 앞면은 기존 정본 사용.
- 사주 presentation adapter 및 십성 메타를 lib/fortune-tea-house로 추출하여 브라우저/Worker가 같은 함수를 사용. v2는 클라이언트 draft 계산값을 신뢰하지 않음.
- 사주 parity: calculateScreenSaju(영냥이), calculateNatalSaju, 연이 브라우저 adapter 및 서버를 8개 입력으로 대조. 시간 미상/윤달/DST/해외 시간대 포함. node 신규 테스트 12건 통과.
- 기존 Worker targeted: 결제 전달/체크포인트/숙요 관계·천문 35건 + 사주 시기/타로 카드별 해석 22건 통과. TS adapter 직접 Worker import 시 Jest가 TS를 파싱하지 못함 → 공통 JS 정본 추출 후 통과.
- 기존 UI 복구/번역/attempt 24건 통과. 회귀 harness에 개인정보 없는 analytics 의존성 추가. static attempt는 결제 전 서버 준비 ID 추가를 반영하고 유료 attempt 우선순위 보존.
- 타입 검사 통과(현재 후속 UI 변경은 최종 검사 예정).
- Chrome 390px: 홈→질문→확인→mock 로그인 복귀(질문/닉네임 유지)→수동3장→새로고침→저장된 선택 복원→mock 이용권→결과 확인.
- mock 결과에 오래된 client draft 카드 이름이 남는 문제 발견. mock 전체 서술은 명시적인 개발용 자리표시자로 수정하여 실제 생성 품질의 증거처럼 보이지 않게 함. 실제 Worker는 서버 카드로 fallback 구성.
- check:fast 첫 실행은 새 줄의 후행 공백에서 중단. 정리 후 다시 실행 필요.
- 실수로 node runner가 전체 테스트를 시작함(인자가 범위를 대체하지 않음). 해당 프로세스만 중단하고 node --require mock-network-guard --test로 targeted 검증 완료. 전체 통과로 기록하지 않음.

## 남은 검증
360/430/desktop·사주/숙요 실제 mock 동선, 카드 ID/이미지·공유/보관 캡처, 공식 check:fast 및 exact SHA CI. 실결제·실 LLM·운영 DB·운영 공개는 수행하지 않음.

## 계산 체계 출처와 한계
- 사주 정책 정본: lib/korean-calendar, engine saju-natal-v2 / policy local-mean-minute-shift23-v1. 지역 평균태양시 보정(분 반올림), 보정 후 23시 일자 변경, 절입은 실제 instant에서 판정. 대운은 기존 엔진 방향/절기 차이 기준을 그대로 사용.
- 숙요 천문 계산: 기존 worker/lib/sukuyo-astronomy.js 및 sukuyo-coordinate.js. Swiss Ephemeris 지심 항성 달 황경(Lahiri), 27등분과 기존 offset16. 이는 음력 생일 조견표와 같은 결과를 약속하지 않는 서비스 기존 정책이다. 변경·혼합 계산은 하지 않았다.
- 천문 API 출처: https://www.astro.com/swisseph/swephprg.htm (항성 모드, 시간 변환). 이 자료는 관계 해석의 타당성을 증명하지 않는다.
- 관계 상대 순서: CBETA 宿曜經 T1299 三九祕宿品 https://cbetaonline.dila.edu.tw/zh-tw/T1299 (T21n1299_p0391b12 및 p0397c07-c10). 명/영/쇠/안/위/성/괴/우/친,9업,18태의 상대 순서를 기준 fixture로 고정. 원문 순서와 현대 서비스의 관계 조언은 구분한다.
- 가까움/멀어짐은 전통 분류의 이름이며 실측 친밀도나 성공 확률이 아니다. 안괴를 파국·배신으로 확정하지 않는다.

## 구현 검증 및 전달 기록
- 360/390/430px 및 1440px Chrome viewport: 홈·입력·결과의 가로 넘침 없음. 실제 모바일 기기/OS 키보드 검증은 아님.
- 사주(시간 미상), 5장 타로 자동 선택, 숙요 고정 표본을 mock 기존 권한으로 생성→상담함→재열람. 수동 3장 선택의 새로고침 복구도 확인.
- 타로 펜타클7 정/완드9 역/소드4 정/연인 정/악마 정: 저장 결과 재열람 일치. 기존 카드 정본 5개 로딩과 역방향 CSS 180도 회전 확인.
- 공유는 개인정보 없는 초대 문구 기본, 선택형 요약 미리보기. 실제 외부 전송은 수행하지 않음.
- 키보드 Tab으로 시작 버튼→예시 링크 이동 및 포커스 테두리 확인. 모션 줄이기는 CSS/기존 hook로 지원, 물리 기기 설정 전환 미검증.
- 실제 브라우저에서 번역 사전 force-cache로 이전 문구가 남음. 같은 URL의 사전을 no-cache 재검증하고 페이지 내 Promise 재사용은 유지. 새로고침 후 새 3/5장 설명 반영 확인.
- 결과의 lazy CSS 누락과 캐릭터 wrapper 높이 0을 발견해 정적 CSS import 및 명시적 이미지 크기로 수정. 사주 명식/십성도 밝은 결과 스타일로 통일.
- 기존 찻잔의 연애 문구가 다른 질문에 섞이지 않도록 v2 결과에서는 찻잔 해설을 제외. 과거 저장 결과는 원래 경로 유지.
- TypeScript 검사 exit 0. 최신 핵심+사이트맵 targeted 18/18 통과. check:fast의 88 paid gate 중 npm test 이외 87개 통과, npm test 2415 통과/사이트맵 lastmod 1 실패 후 생성 원장 갱신하여 해당 6개 통과. 통합 후 공식 CI 결과를 별도로 확인한다.
- 실 LLM·실결제·운영 DB 쓰기·운영 배포 없음. 상담 문장의 전문가 수준은 실제 모델 결과 평가 없이는 달성했다고 단정할 수 없다. 원국/추첨/관계 근거를 서버에서 고정하고 기존 품질·부분 복구·비용 상한을 유지한 구현 검증이다.
- 생성 에셋 29개 중 기준 시트 1, 화면 적용 16, 추가 배치용 12. manifest의 screens/status로 구분. 일부 보조 반응을 한 화면에 중복 배치하지 않았다.
- 번역 키는 12개 지원 언어와 연결했다. 핵심 홈 안내 KO/EN/JA/ZH 및 나머지 영어 fallback, 새 스프레드 상세는 KO/EN 기준이다. 나머지 언어의 원어민 품질 검수는 남아 있다.

## 통합 후 보완
- main 통합·push: 17c4e9ab5c153d6d078c90b92628eb5e8eddfb6d. primary의 다른 세션 미커밋 파일은 보존했다.
- 통합 후 check:fast: paid-gate-suite 88/88 및 npm test 통과. 이후 env-parity가 새 개발 디버그 플래그를 거부했다. 새 env를 늘리지 않고 제품 UI의 디버그 패널 연결을 제거, verify:env-parity 재실행 PASS.
- 해당 SHA CI: Pages/Worker 빌드, Typecheck/lint 통과. Critical checks는 같은 env-parity 사유로 실패했으며 테스트 자체는 통과. 수정 SHA의 CI를 다시 확인한다.
- 마지막 타로 캡처에서 부모 CSS 의존으로 카드가 늘어남을 발견. visualOnly 카드 스타일을 자체 모듈로 분리하고 화면 루트에서 로드해, 390px에서 약 90×135px(2:3)·역방향 180도·5장 전체 배열을 실측 확인했다. 카드 이름 뒤 조사는 '카드가'로 정리했다.

- 공통 공유 컴포넌트의 tea 색상 토큰을 크림/찻잎 계열로 교체하고 스타일을 진입점에서 로드하여 밝은 결과 화면의 대비를 확인했다. 다른 브랜드의 공유 색상은 유지.
- 새 consultationVersion=tea-v2의 LLM 캐시 keyExtra를 yeoni-evidence-v2로 분리. 기존 v4/v5 상담 키는 보존. 22개 사주 시기/타로 해석 테스트 및 LLM 복구 가드 통과.
- 현재 코드의 모델은 공통 callGeminiText→callLLM의 gemini-2.5-flash. 이 라우트는 Workers AI fallback을 끈다. 그룹 최대 출력 12,000토큰, 62초/보완30초/전체86초 제한, checkpoint 그룹별 최대2회 기존 정책 유지. 실제 제공자 청구액은 호출하지 않아 측정하지 않았다.

## 추가 요청: 기존 공간·음악과 직접 제작한 결과 연이
- 기존 장면별 데스크톱/모바일 배경 및 FloatingPetals를 새 상담 화면에 재사용. 기존 프롤로그·변신 영상·찻잔·앨범은 유지한다.
- 기존 BGM audio/트랙/음량/저장 설정을 재사용하고 홈·입력·생성·결과에도 켜기/끄기 버튼을 제공한다. Chrome에서 재생 readyState=4/currentTime 증가, 끄기 후 paused=true 확인. 실제 청취 평가는 별도.
- 새로 생성한 pig-empathy/pig-advice/prop-envelope를 핵심 답변 말풍선·행동 조언·편지 머리말에 적용. 0.45초 등장 효과만 사용하고 모션 줄이기에서는 애니메이션 없이 즉시 읽힌다.
- 390px 결과에서 투명 테두리·꽃 장식·말풍선·배경 겹침 확인. 360px 결과 clientWidth=scrollWidth=345(스크롤바 제외), 가로 넘침 없음.
- check:fast -- --base=17c4e9ab5c153d6d078c90b92628eb5e8eddfb6d exit 0. paid-gate 88/88, Jest 333 suites / 4984 tests, lint/typecheck 통과. 추가 UI 변경 후 typecheck exit 0.
- d9eaa7a CI는 type/lint, critical, Pages/Worker build 통과. Static guards가 메인 카드 가격 누락을 검출하여 기존 레지스트리 검증 대상 가격 키를 복원했다. verify:home-service-registry PASS. 수정 SHA의 CI 확인은 전달 마지막 단계.- c4da9f728 CI의 빌드/type/lint는 통과. verify:payment-policy-md가 서버 레지스트리 초기화 전의 리터럴 0을 읽는 것을 확인하여 프런트 모듈을 번들·실행한 최종 가격과 정책 문서의 5종 가격을 대조하도록 수정했다. 상품 누락/중복 및 가격 차이는 계속 실패하며 정책 가격은 변경하지 않았다. 실제 대조 PASS.

## 전달 완료
- 최종 코드 SHA e59bfe07157031b995d5bec300a320ab30a357cc: main push 및 PR CI 전체 성공. https://github.com/rei1237/codedestiny/actions/runs/37199021220
- Typecheck/lint, Pages/Worker build, Static guards, CI required 성공. 이 검증기 변경의 Critical lane은 변경 범위 판정에 따라 skip. 앞선 d9eaa7a의 Critical checks 및 로컬 333 suites/4984 tests는 통과했다.
- UI SHA c4da9f72887de72917d855e896915453fc4c9bd7의 별도 Paid Flow Gates 성공. https://github.com/rei1237/codedestiny/actions/runs/37198388010
- 공개 미러 freshness와 sitemap drift PASS. 기존 BGM 재생/정지 및 새로고침 OFF 유지, 새 공감·조언 이미지의 모바일 결과 캡처를 보존했다.
- 지속 보관: C:/Users/user/Desktop/CodeDestiny-Yeoni-TeaHouse-20261004/ (미리보기, 13개 화면, 원본6장, WebP29개/약1.51MB, 적용 manifest, 전체 변경 목록, 검증 로그, 최종 보고). 같은 이름의 ZIP 제공.
- 실제 LLM/PG/운영 DB/물리 기기 및 원어민 번역 검수는 미실행. 운영 승격은 하지 않았다. 이 문서는 코드·mock·CI 전달 완료 기록이며 실제 전문가 품질 및 운영 성공의 증거로 확대하지 않는다.