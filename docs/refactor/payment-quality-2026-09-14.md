# 결제 품질 검증 기록 — 2026-09-14

실결제·과금 LLM·운영 DB 쓰기·운영 승격은 실행하지 않았다. 이 기록은 로컬 mock 및 GitHub CI 검증 범위이며, 모든 실제 단말·PG 조합의 결과 제공을 보증하지 않는다.

## 반영한 수정

- check:fast 검사 계획이 CI의 Paid Flow 경로 계약을 읽어 기존 스위트를 자동 선택한다. 마스터 인연의 서 경로 전체도 트리거에 포함했다.
- access-store의 서버 생산자가 없는 revokedFeatureIds 분기를 제거했다. 완전 응답과 부분 응답의 권한 보존·회수 검사를 유지했다.
- 마스터 인연의 서 결제 복귀 후 /start 실패 시 같은 구매 근거로 재시도할 수 있게 했다. 궁합 상대 입력도 복원한다.
- React 화면이 사라질 때 해당 화면의 결제 복귀 핸들러만 해제한다. 오래된 핸들러가 새 화면의 복귀를 가로막지 않는다.
- 독립 정적 페이지의 checkout-entry/pass-verdict 캐시 버전을 갱신했다. geomancy 정적 별칭도 정본 동기화에 포함했다.
- 스테이징 전용 키 5개가 양쪽 설정에서 사라져도 파리티 검사가 실패한다. 삭제 변이 5건을 포함한 self-test 17건 통과.
- 불필요한 vars 3개를 제거했다. 시크릿 69개라는 관측 기준과 COMMIT_SHA를 합하면 다음 업로드는 126/128이다. 업로드 직전 실제 시크릿 목록으로 다시 계산하고 2자리 미만이면 차단한다. 운영의 현재 바인딩을 변경한 것은 아니다.
- D6 문서는 문자열 배열 계약과 unlockedFeatureGrants를 보존하고 PASS 구매 해금에 임의 만료를 부여하지 않도록 수정했다.
- 호출 없는 결제 헬퍼·상수를 제거하고 죽은 소스 문자열을 검사하던 가드를 실제 과금 정책 검사로 바꿨다.
- 운세 프로필 24종의 영문·일문·중국어 간체·번체 라우트를 다시 반영했다. 기간별 해설·FAQ·띠별 명리 해설과 일진·월건·절기·달 위치의 계산 근거를 로케일별로 표시하고, 아직 한국어 전용인 초융합 상품 교차 추천은 비한국어 라우트에서 노출하지 않는다.

## 검증 증거

- Paid Flow Gates: 최종 로컬 실행 88/88, 333.1초.
- 결제 복귀 배선: React 41/41, 정적 46/46, kind 43, 미배선 backlog 없음. 이는 배선 검사이며 서비스별 실제 PG E2E와 구분한다.
- 마스터 구매 복구/결과 재개 8/8, 공통 직접결제 재개 16/16.
- 권한·검사 계획·writer divergence 51/51.
- 사주 브라우저: 최종 16/16. 최초 실패에서 산출물 SHA 변화나 브라우저 오류는 없었으며 긴 리포트의 scrollIntoViewIfNeeded가 가시성 임계점을 충족하지 못했다. 실제 가시 상태를 기다리도록 수정했다.
- 마스터 reader: 360/390/430/1280px, 목차·초점·저장소 차단·터치·가로 넘침·취소 상태 검사 통과.
- 다국어 운세: 24 sign × 4기간 × 4로케일 해설·FAQ·계산 근거 테스트 통과. 대표 sign의 16개 상세 경로를 360px에서 확인했고 오류·한글 잔존·가로 넘침이 없었다. 4개 로케일의 주간 경로는 1280px에서도 같은 기준을 통과했다.
- GitHub main 6828cfb4d: PR CI 및 Paid Flow Gates 성공. 최종 보고에서 최신 SHA의 CI를 별도로 확인한다.

## 남은 범위

- 독립적인 실결제 및 실제 모바일 앱/PG 복귀 확인은 실행하지 않았다.
- 상세 소개 레지스트리 65개 중 63개 적용 완료. 제외 2개는 points 관리 화면과 무료 saju-animal 별칭이다. 기존 상세창 문구/이미지는 변경하지 않았다. 레지스트리 밖 인라인 구매 화면의 마케팅 개선은 완료로 판정하지 않았다.
- 소설 en/ja/zh-CN는 번역 소스가 채워져 있으며 일본어 잔존 문장을 수정했다. zh-TW는 HTTP 429로 중단됐으며 저장 지점에서 제한된 재시도를 실행해도 다시 429가 발생했다. 소설 전체 발행과 언어별 정밀 편집 검수는 미완료다.
- 전체 소스 삭제 후보는 동적 호출/등록을 포함해 추가 분류가 필요하다. unused-files 감사의 도달 불가 판정만으로 삭제하지 않았다.

## 가격 정본 기반 프런트 유료 키 검사표

출처: worker/lib/paid-feature-registry.js의 FRONTEND_PAID_FEATURE_KEYS, normalizePaidFeatureKey, getPaidFeatureBillingType, FEATURE_KEY_PRICE_TABLE. 별칭을 포함한 서버 가격 키는 213개, 프런트 계약 키는 88개다. 이용권·월정석·단건 선택은 기존 공통 게이트와 정책 가드로 검증했으며 아래 금액은 해당 시점의 정본 기록이다. 가격을 UI에 복제하지 않는다.

| 프런트 키 | 정규화 키 | 과금 유형 | 단건 원화 | 검증 범위 |
| --- | --- | --- | ---: | --- |
| animal-destiny-unlock | animal-destiny-unlock | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| animal-totem-basic | animal-totem-basic | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| animal-totem-deep | animal-totem-deep | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| astrology-ai-consultation | astrology-ai-consultation | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| coin-gate-per-use | coin-gate-per-use | 하위 상품별 | 하위 상품별 | 공통 가격·정책·복귀 배선 계약 |
| compat-sukuyo-compatibility | compat-sukuyo-compatibility | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| cosmic-soul-meditation | cosmic-soul-meditation | per_use | 20000 | 공통 가격·정책·복귀 배선 계약 |
| destiny_meeting_place | destiny_meeting_place | per_use | 10000 | 공통 가격·정책·복귀 배선 계약 |
| dream-psycho-analysis | dream-psycho-analysis | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| egyptOracle | egyptOracle | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| egyptian_oracle_ai_prompt | egyptian_oracle_ai_prompt | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| fun.quantumLotto.ritualReport | fun.quantumLotto.ritualReport | unlock | 5000 | 공통 가격·정책·복귀 배선 계약 |
| geomancy | geomancy | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| ifa-oracle | ifa-oracle | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| karma-destiny-ai-consultation | karma-destiny-ai-consultation | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| life-book-ai-consultation | life-book-ai-consultation | per_use | 20000 | 공통 가격·정책·복귀 배선 계약 |
| life-fortune-ai-consultation | life-fortune-ai-consultation | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| love-code | love-code | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| love-secret-ai-consultation | love-secret-ai-consultation | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| master-love-codex | master-love-codex | per_use | 20000 | 공통 가격·정책·복귀 배선 계약 |
| master-love-codex-compat | master-love-codex-compat | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| maya-prompt-generator | maya-prompt-generator | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| neo-operation-room-consultation | neo-operation-room-consultation | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| neville-meditation | neville-meditation | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| new-year-ai-consultation | new-year-ai-consultation | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| openGeomancyOracle | openGeomancyOracle | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| openJuyukModal | openJuyukModal | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| openKemetModal | openKemetModal | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| palm-reading-ai-consult | palm-reading-ai-consult | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| palm-reading-general | palm-reading-general | per_use | 10000 | 공통 가격·정책·복귀 배선 계약 |
| pet-compatibility-ai | pet-compatibility-ai | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| pet-saju-ai-consultation | pet-saju-ai-consultation | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| premium-fpti-report | premium-fpti-report | unlock | 20000 | 공통 가격·정책·복귀 배선 계약 |
| premium-naming-prompt | premium-naming-prompt | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| premium-naming-report | premium-naming-prompt | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| premium-sibyl-dominator | premium-sibyl-dominator | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| premium-sukuyo-compat-extra | premium-sukuyo-compat-extra | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| premiumTarot | premiumTarot | per_use | 10000 | 공통 가격·정책·복귀 배선 계약 |
| profile-card-manage | profile-card-manage | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| relationship-boundary-test | relationship-boundary-test | per_use | 10000 | 공통 가격·정책·복귀 배선 계약 |
| royal-tea-oracle | royal-tea-oracle | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| rpt_energyCoordCard | rpt_energyCoordCard | unlock | 5000 | 공통 가격·정책·복귀 배선 계약 |
| rpt_healthReportCard | rpt_healthReportCard | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| rpt_quantumCard | rpt_quantumCard | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| rpt_secretHouseEntryCard | rpt_secretHouseEntryCard | unlock | 5000 | 공통 가격·정책·복귀 배선 계약 |
| rpt_skillTreeCard | rpt_skillTreeCard | unlock | 3000 | 공통 가격·정책·복귀 배선 계약 |
| rpt_specialCharmCard | rpt_specialCharmCard | unlock | 3000 | 공통 가격·정책·복귀 배선 계약 |
| rpt_villainCard | rpt_villainCard | unlock | 5000 | 공통 가격·정책·복귀 배선 계약 |
| saju-guardian-unlock | saju-guardian-unlock | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| stonehenge-runes-ai-prompt | stonehenge-runes-ai-prompt | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| stonehenge-runes-deep | stonehenge-runes-deep | per_use | 10000 | 공통 가격·정책·복귀 배선 계약 |
| stonehenge-runes-single | stonehenge-runes-single | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| stonehenge-runes-triad | stonehenge-runes-triad | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| stonehenge-runes-yearly | stonehenge-runes-yearly | per_use | 10000 | 공통 가격·정책·복귀 배선 계약 |
| stonehengeRunes | stonehengeRunes | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| sukuyo-compatibility-ai | sukuyo-compatibility-ai | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| sukuyo-extreme-t-relationship | sukuyo-extreme-t-relationship | unlock | 5000 | 공통 가격·정책·복귀 배선 계약 |
| sukuyo-monthly-fortune | sukuyo-monthly-fortune | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| sukuyo-nature-deep-dive | sukuyo-nature-deep-dive | unlock | 5000 | 공통 가격·정책·복귀 배선 계약 |
| sukuyo-past-life-reading | sukuyo-past-life-reading | per_use | 10000 | 공통 가격·정책·복귀 배선 계약 |
| sukuyo-relationship-encyclopedia | sukuyo-relationship-encyclopedia | unlock | 5000 | 공통 가격·정책·복귀 배선 계약 |
| sukuyo-symbolic-comparison | sukuyo-symbolic-comparison | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| sukyo_yearly_fortune_unlock | sukyo_yearly_fortune_unlock | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-celestial-harmony | tarot-celestial-harmony | per_use | 10000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-crystal-soul-reading | tarot-crystal-soul-reading | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-ijik | tarot-ijik | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-love-relationship | tarot-love-relationship | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-mindscan | tarot-mindscan | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-myeongri-three-card | tarot-myeongri-three-card | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-numerology-reading | tarot-numerology-reading | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-prompt-maker | tarot-prompt-maker | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-prompt-maker-deep | tarot-prompt-maker-deep | per_use | 7000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-prompt-maker-master | tarot-prompt-maker-master | per_use | 10000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-prompt-maker-standard | tarot-prompt-maker-standard | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-reunion-reading | tarot-reunion-reading | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| tarot-year-fortune | tarot-year-fortune | per_use | 10000 | 공통 가격·정책·복귀 배선 계약 |
| turtleIChing | turtleIChing | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| vedic-ai-consultation | vedic-ai-consultation | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| vedic-compatibility-per-use | vedic-compatibility-per-use | per_use | 5000 | 공통 가격·정책·복귀 배선 계약 |
| yoga-guru-per-use | yoga-guru-per-use | per_use | 3000 | 공통 가격·정책·복귀 배선 계약 |
| ziwei-ai-consultation | ziwei-ai-consultation | per_use | 30000 | 공통 가격·정책·복귀 배선 계약 |
| ziwei-island-deep-report | ziwei-island-deep-report | unlock | 5000 | 공통 가격·정책·복귀 배선 계약 |
| ziwei-island-palace-consult | ziwei-island-palace-consult | per_use | 20000 | 공통 가격·정책·복귀 배선 계약 |
| ziwei_decade_luck | ziwei_decade_luck | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| ziwei_life_yearly_flow | ziwei_life_yearly_flow | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| ziwei_love_deep | ziwei_love_deep | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| ziwei_symbolic_layer | ziwei_symbolic_layer | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
| ziwei_twelve_palaces | ziwei_twelve_palaces | unlock | 10000 | 공통 가격·정책·복귀 배선 계약 |
