# AdSense Route Audit

Generated: 2026-06-21
Source: out

## Summary

- Total routes scanned: 998
- AdSense eligible candidates: 330
- AdSense blocked/excluded routes: 668
- Noindex or non-indexable routes: 560
- Indexable routes missing sitemap entry: 0
- Routes below 1200 visible chars: 34

## 핵심 문제 요약

- 현재 out 산출물 기준 전체 998개 라우트 중 광고 가능 후보는 330개, 광고 제외 라우트는 668개입니다.
- indexable 라우트의 sitemap 누락은 0개입니다.
- 1200자 미만 라우트는 34개이며, 대부분 noindex/오류/관리자/액션성 페이지로 광고 제외 상태를 유지합니다.
- AdSense 코드는 허용 라우트에서도 정적 광고 슬롯으로 직접 삽입하지 않고, canonical/robots/route policy를 통과한 경우에만 조건부 로딩하도록 관리합니다.

## 애드센스 정책상 위험한 페이지 목록

| Route | Page Type | Content Amount | AdSense | Problem | Direction |
|---|---|---:|---:|---|---|
| / | 기능/도구 소개 | 2411자 (충분) | 제외 | 정적 메인 셸은 광고 직접 삽입 제외 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /404 | 검색 제외 페이지 | 165자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /500 | 검색 제외 페이지 | 109자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /admin | 관리자 | 7자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/cache-status | 관리자 | 1925자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/content | 관리자 | 2008자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights | 관리자 | 2623자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights/edit | 관리자 | 1674자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights/new | 관리자 | 1996자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/login | 관리자 | 1727자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /advertising-policy | 기능/도구 소개 | 3940자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /animal/mbti | 기능/도구 소개 | 3129자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /animal/physio | 검색 제외 페이지 | 3157자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /api-hello-test | 검색 제외 페이지 | 1749자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /astrology | 기능/도구 소개 | 2347자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /astrology/cosmic | 기능/도구 소개 | 3173자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /auth/google/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /auth/kakao/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /auth/naver/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /blog | 검색 제외 페이지 | 1456자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /compatibility | 기능/도구 소개 | 2317자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /contact | 정책/신뢰 고지 | 2535자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /contact-us | 기능/도구 소개 | 2538자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /daily-fortune | 기능/도구 소개 | 2347자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dev-status | 검색 제외 페이지 | 1973자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /disclaimer | 정책/신뢰 고지 | 3361자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream | 기능/도구 소개 | 2324자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream/psycho | 기능/도구 소개 | 3113자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream/tarot | 기능/도구 소개 | 3119자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /editorial-policy | 정책/신뢰 고지 | 2842자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /en | 검색 제외 페이지 | 3237자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en-us | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights | 검색 제외 페이지 | 2084자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights/sukuyo-basics-en | 검색 제외 페이지 | 2376자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights/ziwei-basics-en | 검색 제외 페이지 | 2458자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/sukuyo | 검색 제외 페이지 | 2940자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/today | 검색 제외 페이지 | 2867자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/ziwei | 검색 제외 페이지 | 2938자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /face-reading | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous | 검색 제외 페이지 | 8834자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |

## 광고를 제거하거나 차단해야 할 페이지 목록

| Route | Page Type | Content Amount | AdSense | Problem | Direction |
|---|---|---:|---:|---|---|
| / | 기능/도구 소개 | 2411자 (충분) | 제외 | 정적 메인 셸은 광고 직접 삽입 제외 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /404 | 검색 제외 페이지 | 165자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /500 | 검색 제외 페이지 | 109자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /admin | 관리자 | 7자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/cache-status | 관리자 | 1925자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/content | 관리자 | 2008자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights | 관리자 | 2623자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights/edit | 관리자 | 1674자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights/new | 관리자 | 1996자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/login | 관리자 | 1727자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /advertising-policy | 기능/도구 소개 | 3940자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /animal/mbti | 기능/도구 소개 | 3129자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /animal/physio | 검색 제외 페이지 | 3157자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /api-hello-test | 검색 제외 페이지 | 1749자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /astrology | 기능/도구 소개 | 2347자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /astrology/cosmic | 기능/도구 소개 | 3173자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /auth/google/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /auth/kakao/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /auth/naver/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /blog | 검색 제외 페이지 | 1456자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /compatibility | 기능/도구 소개 | 2317자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /contact | 정책/신뢰 고지 | 2535자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /contact-us | 기능/도구 소개 | 2538자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /daily-fortune | 기능/도구 소개 | 2347자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dev-status | 검색 제외 페이지 | 1973자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /disclaimer | 정책/신뢰 고지 | 3361자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream | 기능/도구 소개 | 2324자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream/psycho | 기능/도구 소개 | 3113자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream/tarot | 기능/도구 소개 | 3119자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /editorial-policy | 정책/신뢰 고지 | 2842자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /en | 검색 제외 페이지 | 3237자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en-us | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights | 검색 제외 페이지 | 2084자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights/sukuyo-basics-en | 검색 제외 페이지 | 2376자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights/ziwei-basics-en | 검색 제외 페이지 | 2458자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/sukuyo | 검색 제외 페이지 | 2940자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/today | 검색 제외 페이지 | 2867자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/ziwei | 검색 제외 페이지 | 2938자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /face-reading | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous | 검색 제외 페이지 | 8834자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |

## 콘텐츠를 보강해야 할 페이지 목록

| Route | Page Type | Content Amount | AdSense | Problem | Direction |
|---|---|---:|---:|---|---|
| - | - | - | - | 해당 없음 | - |

## 새로 추가할 정보성 페이지 목록

- 필수 정보성 페이지는 현재 모두 존재합니다. 신규 대량 생성보다 기존 페이지의 고유성, 예시, FAQ, 내부 링크 유지가 우선입니다.

## 수정한 파일 목록

- app/components/adsense-route-policy.js: 광고 가능/불가 라우트와 민감 쿼리 차단 정책
- app/components/DeferredAdsense.tsx: canonical/robots 기준 AdSense 조건부 lazy 로딩
- scripts/verify-adsense-route-policy.mjs: 유료/개인/결제 라우트 광고 차단 회귀 검증
- scripts/verify-adsense-readiness.mjs: 콘텐츠 품질, 중복, sitemap/robots, 광고 슬롯 삽입 방지 검증
- scripts/generate-adsense-route-audit.mjs: 빌드 산출물 기준 전체 라우트 광고 감사 보고서 생성
- reports/adsense-route-audit.md: 현재 산출물 감사 결과

## 주요 코드 변경 요약

- 광고 허용은 allowlist 기반으로 제한하고, 로그인/결제/유료/개인 결과/민감 입력 라우트는 기본 차단합니다.
- `premiumIntent`, `payment`, `resultId`, `birthDate`, `email`, `token` 등 유료·개인화 쿼리는 공개 라우트에서도 광고를 차단합니다.
- 승인 전 정적 HTML에 `adsbygoogle` 광고 슬롯이 직접 들어가면 readiness 검증이 실패합니다.
- AdSense 가능 self-canonical 페이지는 sitemap 포함, noindex 미충돌, 충분한 본문, 중복 fingerprint 없음 조건을 통과해야 합니다.

## 각 페이지별 콘텐츠 보강 예시

| Route | Example Reinforcement |
|---|---|
| /saju/guide | 사주가 보는 네 기둥의 범위, 입력값 의미, 해석 순서, 무료/유료 리포트 차이를 한 페이지에서 먼저 안내 |
| /saju/ten-gods | 십성별 관계·일·재물 해석을 단정 대신 경향과 참고점으로 설명하고 예시 리딩과 FAQ 연결 |
| /saju/five-elements | 오행 균형을 건강 진단처럼 쓰지 않도록 주의 문구와 생활 참고 예시를 함께 제공 |
| /ziwei/guide | 명반 궁위 읽는 순서, 주요 별의 역할, 결과에서 확인할 항목과 자미두수 한계를 설명 |
| /sukuyo/guide | 27숙 구조와 궁합 해석 흐름을 소개하고 관계 판단의 유일한 근거로 쓰지 말라는 고지 포함 |
| /astrology/guide | 하우스·사인·행성의 기본 구조와 샘플 차트 읽기 흐름, 현실 판단 병행 안내 |
| /vedic/guide | 라그나·나크샤트라·다샤의 기초를 입문형으로 설명하고 투자/건강 결정 대체 금지 고지 |
| /tarot/guide | 카드 질문법, 스프레드 예시, 결과를 자기성찰 참고로 읽는 방식과 FAQ 제공 |
| /mayan-calendar/guide | 마야 달력의 주기 해석과 사용 예시, 문화적 상징을 단순 예언처럼 오해하지 않는 안내 |
| /calendar/guide | 일진/운세 달력 사용법, 좋은 날 선택의 참고 범위, 결혼·계약 결정 대체 금지 안내 |
| /health-report/guide | 명리 헬스 리포트가 의료 진단이 아님을 명확히 하고 병원 진료 우선 원칙 강조 |
| /music/guide | 명상 음악 콘텐츠의 감상 목적, 운세 테마별 활용 예시, 치료 효과 단정 금지 고지 |

## 개인정보/면책/쿠키 고지 반영 여부

| Page | Status | Evidence |
|---|---:|---|
| /privacy | 존재 | Google, 쿠키, IP, 생년월일, 결제, 이메일, 14세, 삭제 안내 marker를 readiness에서 검증 |
| /disclaimer | 존재 | 의료, 법률, 투자, 결제, 불안 조장 관련 고지 marker를 readiness에서 검증 |
| /advertising-policy | 존재 | Google AdSense, 쿠키, 웹 비콘, IP, 광고 식별자, 파트너 사이트 링크 marker를 readiness에서 검증 |
| /editorial-policy | 존재 | AI 활용, 광고, 결제, 문의 관련 marker를 readiness에서 검증 |

## sitemap/robots/metadata 점검 결과

- sitemap 누락 indexable 라우트: 0
- 광고 가능 self-canonical 라우트: 330
- noindex 또는 비색인 라우트: 560
- robots.txt의 Mediapartners-Google 허용, canonical, title/description 고유성은 `verify:adsense-readiness`에서 검증합니다.
- sitemap 내 private/action route, 중복 title/description, 얇은 본문은 readiness 실패 조건입니다.

## 애드센스 재심사 전 체크리스트

- `npm run build` 통과
- `npm run verify:adsense-route-policy` 통과
- `npm run verify:adsense-readiness` 통과
- `npm run adsense:route-audit` 재생성
- 결제/로그인/프로필/관리자/개인 결과/오류/로딩 라우트에 광고 없음 확인
- 공개 정보 페이지가 광고 없이도 독립적인 설명, 예시, 주의사항, FAQ, 내부 링크를 갖는지 확인
- 개인정보처리방침, 면책, 이용약관, 광고정책, 문의 페이지가 header/footer 또는 신뢰 링크에서 접근 가능한지 확인
- 광고 클릭 유도, 승인 보장, 공포 마케팅, 건강/투자/법률 단정 표현이 없는지 확인

## Required Public Information Pages

| Route | Status | AdSense | Content Amount | Note |
|---|---:|---:|---:|---|
| /saju/guide | 존재 | 가능 | 3419자 (충분) | 현재 검증 기준 통과 |
| /saju/ten-gods | 존재 | 가능 | 3285자 (충분) | 현재 검증 기준 통과 |
| /saju/five-elements | 존재 | 가능 | 3276자 (충분) | 현재 검증 기준 통과 |
| /ziwei/guide | 존재 | 가능 | 3410자 (충분) | 현재 검증 기준 통과 |
| /sukuyo/guide | 존재 | 가능 | 3301자 (충분) | 현재 검증 기준 통과 |
| /astrology/guide | 존재 | 가능 | 3310자 (충분) | 현재 검증 기준 통과 |
| /vedic/guide | 존재 | 가능 | 3375자 (충분) | 현재 검증 기준 통과 |
| /tarot/guide | 존재 | 가능 | 3243자 (충분) | 현재 검증 기준 통과 |
| /mayan-calendar/guide | 존재 | 가능 | 3306자 (충분) | 현재 검증 기준 통과 |
| /calendar/guide | 존재 | 가능 | 3321자 (충분) | 현재 검증 기준 통과 |
| /health-report/guide | 존재 | 제외 | 3418자 (충분) | 광고 제외 정책 대상 |
| /music/guide | 존재 | 가능 | 2467자 (충분) | 현재 검증 기준 통과 |
| /about | 존재 | 가능 | 2077자 (충분) | 현재 검증 기준 통과 |
| /editorial-policy | 존재 | 제외 | 2842자 (충분) | 광고 제외 정책 대상 |
| /privacy | 존재 | 제외 | 3778자 (충분) | 광고 제외 정책 대상 |
| /terms | 존재 | 제외 | 5976자 (충분) | 광고 제외 정책 대상 |
| /disclaimer | 존재 | 제외 | 3361자 (충분) | 광고 제외 정책 대상 |
| /contact | 존재 | 제외 | 2535자 (충분) | 광고 제외 정책 대상 |

## High-Risk Or Needs-Review Routes

| Route | Page Type | Content Amount | AdSense | Problem | Direction |
|---|---|---:|---:|---|---|
| / | 기능/도구 소개 | 2411자 (충분) | 제외 | 정적 메인 셸은 광고 직접 삽입 제외 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /404 | 검색 제외 페이지 | 165자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /500 | 검색 제외 페이지 | 109자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /admin | 관리자 | 7자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/cache-status | 관리자 | 1925자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/content | 관리자 | 2008자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights | 관리자 | 2623자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights/edit | 관리자 | 1674자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights/new | 관리자 | 1996자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/login | 관리자 | 1727자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /advertising-policy | 기능/도구 소개 | 3940자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /animal/mbti | 기능/도구 소개 | 3129자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /animal/physio | 검색 제외 페이지 | 3157자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /api-hello-test | 검색 제외 페이지 | 1749자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /astrology | 기능/도구 소개 | 2347자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /astrology/cosmic | 기능/도구 소개 | 3173자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /auth/google/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /auth/kakao/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /auth/naver/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /blog | 검색 제외 페이지 | 1456자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /compatibility | 기능/도구 소개 | 2317자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /contact | 정책/신뢰 고지 | 2535자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /contact-us | 기능/도구 소개 | 2538자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /daily-fortune | 기능/도구 소개 | 2347자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dev-status | 검색 제외 페이지 | 1973자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /disclaimer | 정책/신뢰 고지 | 3361자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream | 기능/도구 소개 | 2324자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream/psycho | 기능/도구 소개 | 3113자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream/tarot | 기능/도구 소개 | 3119자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /editorial-policy | 정책/신뢰 고지 | 2842자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /en | 검색 제외 페이지 | 3237자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en-us | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights | 검색 제외 페이지 | 2084자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights/sukuyo-basics-en | 검색 제외 페이지 | 2376자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights/ziwei-basics-en | 검색 제외 페이지 | 2458자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/sukuyo | 검색 제외 페이지 | 2940자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/today | 검색 제외 페이지 | 2867자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/ziwei | 검색 제외 페이지 | 2938자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /face-reading | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous | 검색 제외 페이지 | 8834자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/공리 | 블로그/매거진형 정보 | 6614자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/공유 | 블로그/매거진형 정보 | 6421자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/공자 | 블로그/매거진형 정보 | 4161자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/孔子 | 블로그/매거진형 정보 | 4161자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/공자-孔子 | 블로그/매거진형 정보 | 4161자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/기타노-다케시 | 블로그/매거진형 정보 | 4146자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김구 | 블로그/매거진형 정보 | 4276자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김남준 | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김대중 | 블로그/매거진형 정보 | 4130자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김수현 | 블로그/매거진형 정보 | 6432자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김연아 | 블로그/매거진형 정보 | 4132자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김태리 | 블로그/매거진형 정보 | 6537자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/나루히토-일왕 | 블로그/매거진형 정보 | 4232자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/나폴레옹 | 블로그/매거진형 정보 | 4124자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/나폴레옹-보나파르트 | 블로그/매거진형 정보 | 4124자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/나폴레옹-비교 | 블로그/매거진형 정보 | 4124자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/뉴진스-다니엘 | 블로그/매거진형 정보 | 6594자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/뉴진스-민지 | 블로그/매거진형 정보 | 6640자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/뉴진스-하니 | 블로그/매거진형 정보 | 4197자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/뉴진스-해린 | 블로그/매거진형 정보 | 6691자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/뉴진스-혜인 | 블로그/매거진형 정보 | 6698자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/데이비드-베컴 | 블로그/매거진형 정보 | 6672자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/데즈카-오사무 | 블로그/매거진형 정보 | 6601자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/도널드-트럼프 | 블로그/매거진형 정보 | 6701자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/도요토미-히데요시 | 블로그/매거진형 정보 | 4263자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/레오나르도-다-빈치 | 블로그/매거진형 정보 | 4178자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/레오나르도-디카프리오 | 블로그/매거진형 정보 | 6862자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/레이디-가가 | 블로그/매거진형 정보 | 6611자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/로버트-다우니-주니어 | 블로그/매거진형 정보 | 6727자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/류현진 | 블로그/매거진형 정보 | 4201자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/르브론-제임스 | 블로그/매거진형 정보 | 6729자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/李小龍 | 블로그/매거진형 정보 | 4138자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/리오넬-메시 | 블로그/매거진형 정보 | 6561자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마돈나 | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마동석 | 블로그/매거진형 정보 | 6600자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마릴린-먼로 | 블로그/매거진형 정보 | 6650자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마오쩌둥 | 블로그/매거진형 정보 | 3840자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마윈 | 블로그/매거진형 정보 | 4220자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마윈-马云 | 블로그/매거진형 정보 | 4220자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마이클-잭슨 | 블로그/매거진형 정보 | 4175자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |

## Full Route Classification

| Route | Page Type | Content Amount | AdSense | Problem | Direction |
|---|---|---:|---:|---|---|
| / | 기능/도구 소개 | 2411자 (충분) | 제외 | 정적 메인 셸은 광고 직접 삽입 제외 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /404 | 검색 제외 페이지 | 165자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /500 | 검색 제외 페이지 | 109자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /about | 공개 정보/가이드 | 2077자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /admin | 관리자 | 7자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/cache-status | 관리자 | 1925자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/content | 관리자 | 2008자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights | 관리자 | 2623자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights/edit | 관리자 | 1674자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/insights/new | 관리자 | 1996자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /admin/login | 관리자 | 1727자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /advertising-policy | 기능/도구 소개 | 3940자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /animal/mbti | 기능/도구 소개 | 3129자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /animal/physio | 검색 제외 페이지 | 3157자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /api-hello-test | 검색 제외 페이지 | 1749자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /astrology | 기능/도구 소개 | 2347자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /astrology/cosmic | 기능/도구 소개 | 3173자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /astrology/guide | 공개 정보/가이드 | 3310자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /auth/google/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /auth/kakao/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /auth/naver/callback | 계정/인증 | 1785자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /blog | 검색 제외 페이지 | 1456자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /calendar/guide | 공개 정보/가이드 | 3321자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /compatibility | 기능/도구 소개 | 2317자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /contact | 정책/신뢰 고지 | 2535자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /contact-us | 기능/도구 소개 | 2538자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /daily-fortune | 기능/도구 소개 | 2347자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dev-status | 검색 제외 페이지 | 1973자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /disclaimer | 정책/신뢰 고지 | 3361자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream | 기능/도구 소개 | 2324자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream/psycho | 기능/도구 소개 | 3113자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /dream/tarot | 기능/도구 소개 | 3119자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /editorial-policy | 정책/신뢰 고지 | 2842자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /en | 검색 제외 페이지 | 3237자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en-us | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights | 검색 제외 페이지 | 2084자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights/sukuyo-basics-en | 검색 제외 페이지 | 2376자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/insights/ziwei-basics-en | 검색 제외 페이지 | 2458자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/sukuyo | 검색 제외 페이지 | 2940자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/today | 검색 제외 페이지 | 2867자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /en/ziwei | 검색 제외 페이지 | 2938자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /face-reading | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous | 검색 제외 페이지 | 8834자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju | 블로그/매거진형 정보 | 15843자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/공리 | 블로그/매거진형 정보 | 6614자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/공유 | 블로그/매거진형 정보 | 6421자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/공자 | 블로그/매거진형 정보 | 4161자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/孔子 | 블로그/매거진형 정보 | 4161자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/공자-孔子 | 블로그/매거진형 정보 | 4161자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/기타노-다케시 | 블로그/매거진형 정보 | 4146자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김구 | 블로그/매거진형 정보 | 4276자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김남준 | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김대중 | 블로그/매거진형 정보 | 4130자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김수현 | 블로그/매거진형 정보 | 6432자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김연아 | 블로그/매거진형 정보 | 4132자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/김태리 | 블로그/매거진형 정보 | 6537자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/나루히토-일왕 | 블로그/매거진형 정보 | 4232자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/나폴레옹 | 블로그/매거진형 정보 | 4124자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/나폴레옹-보나파르트 | 블로그/매거진형 정보 | 4124자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/나폴레옹-비교 | 블로그/매거진형 정보 | 4124자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/뉴진스-다니엘 | 블로그/매거진형 정보 | 6594자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/뉴진스-민지 | 블로그/매거진형 정보 | 6640자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/뉴진스-하니 | 블로그/매거진형 정보 | 4197자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/뉴진스-해린 | 블로그/매거진형 정보 | 6691자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/뉴진스-혜인 | 블로그/매거진형 정보 | 6698자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/데이비드-베컴 | 블로그/매거진형 정보 | 6672자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/데즈카-오사무 | 블로그/매거진형 정보 | 6601자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/도널드-트럼프 | 블로그/매거진형 정보 | 6701자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/도요토미-히데요시 | 블로그/매거진형 정보 | 4263자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/레오나르도-다-빈치 | 블로그/매거진형 정보 | 4178자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/레오나르도-디카프리오 | 블로그/매거진형 정보 | 6862자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/레이디-가가 | 블로그/매거진형 정보 | 6611자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/로버트-다우니-주니어 | 블로그/매거진형 정보 | 6727자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/류현진 | 블로그/매거진형 정보 | 4201자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/르브론-제임스 | 블로그/매거진형 정보 | 6729자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/李小龍 | 블로그/매거진형 정보 | 4138자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/리오넬-메시 | 블로그/매거진형 정보 | 6561자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마돈나 | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마동석 | 블로그/매거진형 정보 | 6600자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마릴린-먼로 | 블로그/매거진형 정보 | 6650자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마오쩌둥 | 블로그/매거진형 정보 | 3840자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마윈 | 블로그/매거진형 정보 | 4220자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마윈-马云 | 블로그/매거진형 정보 | 4220자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마이클-잭슨 | 블로그/매거진형 정보 | 4175자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마이클-조던 | 블로그/매거진형 정보 | 6655자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마크-저커버그 | 블로그/매거진형 정보 | 6618자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마틴-루터-킹 | 블로그/매거진형 정보 | 4209자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마틴-스코세이지 | 블로그/매거진형 정보 | 4196자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/마하트마-간디 | 블로그/매거진형 정보 | 6528자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/메릴-스트립 | 블로그/매거진형 정보 | 6672자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/모차르트 | 블로그/매거진형 정보 | 6580자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/무라카미-하루키 | 블로그/매거진형 정보 | 4246자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/미야자키-하야오 | 블로그/매거진형 정보 | 4311자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/박보검 | 블로그/매거진형 정보 | 6473자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/박세리 | 블로그/매거진형 정보 | 4088자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/박정희 | 블로그/매거진형 정보 | 4212자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/박찬욱 | 블로그/매거진형 정보 | 6543자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/박찬호 | 블로그/매거진형 정보 | 4121자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/버락-오바마 | 블로그/매거진형 정보 | 4112자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/베토벤 | 블로그/매거진형 정보 | 6550자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/봉준호 | 블로그/매거진형 정보 | 4202자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/브래드-피트 | 블로그/매거진형 정보 | 6630자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/블랙핑크-로제 | 블로그/매거진형 정보 | 6682자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/블랙핑크-리사 | 블로그/매거진형 정보 | 6677자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/블랙핑크-제니 | 블로그/매거진형 정보 | 6592자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/블랙핑크-지수 | 블로그/매거진형 정보 | 6663자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/비욘세 | 블로그/매거진형 정보 | 6522자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/빌-게이츠 | 블로그/매거진형 정보 | 4111자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/빌리-아일리시 | 블로그/매거진형 정보 | 6751자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/샤루크-칸 | 블로그/매거진형 정보 | 6602자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/성룡 | 블로그/매거진형 정보 | 4165자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/成龍 | 블로그/매거진형 정보 | 4165자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/성룡-成龍 | 블로그/매거진형 정보 | 4165자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/세리나-윌리엄스 | 블로그/매거진형 정보 | 6618자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/세종대왕 | 블로그/매거진형 정보 | 4292자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/손예진 | 블로그/매거진형 정보 | 6439자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/손흥민 | 블로그/매거진형 정보 | 4190자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/송중기 | 블로그/매거진형 정보 | 6494자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/송혜교 | 블로그/매거진형 정보 | 6522자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/스칼렛-요한슨 | 블로그/매거진형 정보 | 6623자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/스티브-워즈니악 | 블로그/매거진형 정보 | 4125자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/스티브-잡스 | 블로그/매거진형 정보 | 4214자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/스티븐-스필버그 | 블로그/매거진형 정보 | 6643자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/신사임당 | 블로그/매거진형 정보 | 6632자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/아델 | 블로그/매거진형 정보 | 6521자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/아리아나-그란데 | 블로그/매거진형 정보 | 6680자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/아무로-나미에 | 블로그/매거진형 정보 | 4150자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/아미타브-바찬 | 블로그/매거진형 정보 | 6603자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/아이유 | 블로그/매거진형 정보 | 4187자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/아쿠타가와-류노스케 | 블로그/매거진형 정보 | 6716자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/안유진 | 블로그/매거진형 정보 | 6611자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/안젤리나-졸리 | 블로그/매거진형 정보 | 6681자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/안중근 | 블로그/매거진형 정보 | 4279자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/알베르트-아인슈타인 | 블로그/매거진형 정보 | 4218자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/알엠 | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/양조위 | 블로그/매거진형 정보 | 6483자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/에드-시런 | 블로그/매거진형 정보 | 6563자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/에스파-윈터 | 블로그/매거진형 정보 | 6686자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/에스파-카리나 | 블로그/매거진형 정보 | 6755자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/엘비스-프레슬리 | 블로그/매거진형 정보 | 4169자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/엠마-왓슨 | 블로그/매거진형 정보 | 6580자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/오드리-헵번 | 블로그/매거진형 정보 | 6532자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/오타니-쇼헤이 | 블로그/매거진형 정보 | 4239자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/오프라-윈프리 | 블로그/매거진형 정보 | 6412자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/왕페이 | 블로그/매거진형 정보 | 6437자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/워런-버핏 | 블로그/매거진형 정보 | 6586자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/윈스턴-처칠 | 블로그/매거진형 정보 | 6567자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/윌리엄-셰익스피어 | 블로그/매거진형 정보 | 4177자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/유관순 | 블로그/매거진형 정보 | 4187자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/유해진 | 블로그/매거진형 정보 | 4132자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/윤여정 | 블로그/매거진형 정보 | 6483자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/이민호 | 블로그/매거진형 정보 | 6552자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/이소룡 | 블로그/매거진형 정보 | 4138자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/이소룡-李小龍 | 블로그/매거진형 정보 | 4138자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/이순신 | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/이연걸 | 블로그/매거진형 정보 | 6598자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/이이 | 블로그/매거진형 정보 | 6571자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/이지은 | 블로그/매거진형 정보 | 4187자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/이황 | 블로그/매거진형 정보 | 6582자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/일론-머스크 | 블로그/매거진형 정보 | 4201자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/장원영 | 블로그/매거진형 정보 | 6505자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/장이머우 | 블로그/매거진형 정보 | 4155자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/장쯔이 | 블로그/매거진형 정보 | 6550자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/저우제룬 | 블로그/매거진형 정보 | 6526자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/전지현 | 블로그/매거진형 정보 | 6487자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/정약용 | 블로그/매거진형 정보 | 4203자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/제프-베이조스 | 블로그/매거진형 정보 | 6659자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/조-바이든 | 블로그/매거진형 정보 | 6595자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/존-레논 | 블로그/매거진형 정보 | 6460자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/충무공 | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/충무공-이순신 | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/카멀라-해리스 | 블로그/매거진형 정보 | 6541자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/케이트-윈슬렛 | 블로그/매거진형 정보 | 6629자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/쿠로사와-아키라 | 블로그/매거진형 정보 | 4125자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/크리스토퍼-놀란 | 블로그/매거진형 정보 | 6647자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/크리스티아누-호날두 | 블로그/매거진형 정보 | 6677자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/키아누-리브스 | 블로그/매거진형 정보 | 6630자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/킬리안-음바페 | 블로그/매거진형 정보 | 6684자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/타이거-우즈 | 블로그/매거진형 정보 | 6622자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/테일러-스위프트 | 블로그/매거진형 정보 | 4193자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/프리얀카-초프라 | 블로그/매거진형 정보 | 6708자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/하뉴-유즈루 | 블로그/매거진형 정보 | 6732자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/한강 | 블로그/매거진형 정보 | 4160자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/현빈 | 블로그/매거진형 정보 | 6468자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/马云 | 블로그/매거진형 정보 | 4220자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/adele | 블로그/매거진형 정보 | 6521자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/aespa-karina | 블로그/매거진형 정보 | 6755자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/aespa-winter | 블로그/매거진형 정보 | 6686자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/akira-kurosawa | 블로그/매거진형 정보 | 4125자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/akutagawa-ryunosuke | 블로그/매거진형 정보 | 6716자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/albert-einstein | 블로그/매거진형 정보 | 4218자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/amitabh-bachchan | 블로그/매거진형 정보 | 6603자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/an-jung-geun | 블로그/매거진형 정보 | 4279자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/angelina-jolie | 블로그/매거진형 정보 | 6681자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/ariana-grande | 블로그/매거진형 정보 | 6680자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/audrey-hepburn | 블로그/매거진형 정보 | 6532자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/barack-obama | 블로그/매거진형 정보 | 4112자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/beethoven | 블로그/매거진형 정보 | 6550자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/beyonce | 블로그/매거진형 정보 | 6522자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bill-gates | 블로그/매거진형 정보 | 4111자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/billie-eilish | 블로그/매거진형 정보 | 6751자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/blackpink-jennie | 블로그/매거진형 정보 | 6592자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/blackpink-jisoo | 블로그/매거진형 정보 | 6663자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/blackpink-lisa | 블로그/매거진형 정보 | 6677자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/blackpink-rose | 블로그/매거진형 정보 | 6682자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bong-joon-ho | 블로그/매거진형 정보 | 4202자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/brad-pitt | 블로그/매거진형 정보 | 6630자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bruce-lee | 블로그/매거진형 정보 | 4138자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-뷔 | 블로그/매거진형 정보 | 6622자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-슈가 | 블로그/매거진형 정보 | 6604자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-알엠 | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-정국 | 블로그/매거진형 정보 | 6699자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-제이홉 | 블로그/매거진형 정보 | 6704자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-지민 | 블로그/매거진형 정보 | 6667자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-진 | 블로그/매거진형 정보 | 6669자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-j-hope | 블로그/매거진형 정보 | 6704자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-jimin | 블로그/매거진형 정보 | 6667자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-jin | 블로그/매거진형 정보 | 6669자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-jungkook | 블로그/매거진형 정보 | 6699자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-rm | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-rm-김남준 | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-suga | 블로그/매거진형 정보 | 6604자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/bts-v | 블로그/매거진형 정보 | 6622자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/category/actor | 블로그/매거진형 정보 | 3831자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/business | 블로그/매거진형 정보 | 2410자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/cn | 블로그/매거진형 정보 | 2360자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/director-writer | 블로그/매거진형 정보 | 2497자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/history | 블로그/매거진형 정보 | 2070자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/jp | 블로그/매거진형 정보 | 2532자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/k-star | 블로그/매거진형 정보 | 3401자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/politics | 블로그/매거진형 정보 | 2738자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/singer | 블로그/매거진형 정보 | 2792자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/sports | 블로그/매거진형 정보 | 2807자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/thinker-artist | 블로그/매거진형 정보 | 2560자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/category/us | 블로그/매거진형 정보 | 1931자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /famous-saju/christopher-nolan | 블로그/매거진형 정보 | 6647자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/confucius | 블로그/매거진형 정보 | 4161자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/cristiano-ronaldo | 블로그/매거진형 정보 | 6677자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/david-beckham | 블로그/매거진형 정보 | 6672자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/donald-trump | 블로그/매거진형 정보 | 6701자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/ed-sheeran | 블로그/매거진형 정보 | 6563자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/elon-musk | 블로그/매거진형 정보 | 4201자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/elvis-presley | 블로그/매거진형 정보 | 4169자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/emma-watson | 블로그/매거진형 정보 | 6580자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/faye-wong | 블로그/매거진형 정보 | 6437자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/gong-li | 블로그/매거진형 정보 | 6614자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/gong-yoo | 블로그/매거진형 정보 | 6421자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/han-kang | 블로그/매거진형 정보 | 4160자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/hanyu-yuzuru | 블로그/매거진형 정보 | 6732자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/haruki-murakami | 블로그/매거진형 정보 | 4246자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/hayao-miyazaki | 블로그/매거진형 정보 | 4311자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/hyun-bin | 블로그/매거진형 정보 | 6468자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/iu | 블로그/매거진형 정보 | 4187자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/iu-이지은 | 블로그/매거진형 정보 | 4187자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/ive-ahn-yujin | 블로그/매거진형 정보 | 6611자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/ive-jang-wonyoung | 블로그/매거진형 정보 | 6505자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/j-hope | 블로그/매거진형 정보 | 6704자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/j-k-롤링 | 블로그/매거진형 정보 | 6624자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/j-k-rowling | 블로그/매거진형 정보 | 6624자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jack-ma | 블로그/매거진형 정보 | 4220자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jackie-chan | 블로그/매거진형 정보 | 4165자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jay-chou | 블로그/매거진형 정보 | 6526자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jeff-bezos | 블로그/매거진형 정보 | 6659자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jennie | 블로그/매거진형 정보 | 6592자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jeong-yak-yong | 블로그/매거진형 정보 | 4203자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jet-li | 블로그/매거진형 정보 | 6598자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jimin | 블로그/매거진형 정보 | 6667자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jin | 블로그/매거진형 정보 | 6669자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jisoo | 블로그/매거진형 정보 | 6663자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/joe-biden | 블로그/매거진형 정보 | 6595자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/john-lennon | 블로그/매거진형 정보 | 6460자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jun-ji-hyun | 블로그/매거진형 정보 | 6487자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/jungkook | 블로그/매거진형 정보 | 6699자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/kamala-harris | 블로그/매거진형 정보 | 6541자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/kate-winslet | 블로그/매거진형 정보 | 6629자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/keanu-reeves | 블로그/매거진형 정보 | 6630자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/kim-dae-jung | 블로그/매거진형 정보 | 4130자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/kim-gu | 블로그/매거진형 정보 | 4276자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/kim-soo-hyun | 블로그/매거진형 정보 | 6432자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/kim-tae-ri | 블로그/매거진형 정보 | 6537자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/kim-yuna | 블로그/매거진형 정보 | 4132자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/king-sejong | 블로그/매거진형 정보 | 4292자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/kylian-mbappe | 블로그/매거진형 정보 | 6684자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/lady-gaga | 블로그/매거진형 정보 | 6611자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/lebron-james | 블로그/매거진형 정보 | 6729자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/lee-min-ho | 블로그/매거진형 정보 | 6552자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/leonardo-da-vinci | 블로그/매거진형 정보 | 4178자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/leonardo-dicaprio | 블로그/매거진형 정보 | 6862자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/lionel-messi | 블로그/매거진형 정보 | 6561자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/lisa | 블로그/매거진형 정보 | 6677자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/ludwig-van-beethoven | 블로그/매거진형 정보 | 6550자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/ma-dong-seok | 블로그/매거진형 정보 | 6600자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/madonna | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/mahatma-gandhi | 블로그/매거진형 정보 | 6528자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/mao-zedong | 블로그/매거진형 정보 | 3840자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/marilyn-monroe | 블로그/매거진형 정보 | 6650자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/mark-zuckerberg | 블로그/매거진형 정보 | 6618자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/martin-luther-king-jr | 블로그/매거진형 정보 | 4209자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/martin-scorsese | 블로그/매거진형 정보 | 4196자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/meryl-streep | 블로그/매거진형 정보 | 6672자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/michael-jackson | 블로그/매거진형 정보 | 4175자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/michael-jordan | 블로그/매거진형 정보 | 6655자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/miyazaki-hayao | 블로그/매거진형 정보 | 4311자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/mozart | 블로그/매거진형 정보 | 6580자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/murakami-haruki | 블로그/매거진형 정보 | 4246자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/namie-amuro | 블로그/매거진형 정보 | 4150자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/napoleon-bonaparte | 블로그/매거진형 정보 | 4124자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/naruhito | 블로그/매거진형 정보 | 4232자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/newjeans-danielle | 블로그/매거진형 정보 | 6594자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/newjeans-haerin | 블로그/매거진형 정보 | 6691자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/newjeans-hanni | 블로그/매거진형 정보 | 4197자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/newjeans-hyein | 블로그/매거진형 정보 | 6698자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/newjeans-minji | 블로그/매거진형 정보 | 6640자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/oprah-winfrey | 블로그/매거진형 정보 | 6412자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/osamu-tezuka | 블로그/매거진형 정보 | 6601자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/otani-shohei | 블로그/매거진형 정보 | 4239자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/park-bo-gum | 블로그/매거진형 정보 | 6473자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/park-chan-ho | 블로그/매거진형 정보 | 4121자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/park-chan-wook | 블로그/매거진형 정보 | 6543자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/park-chung-hee | 블로그/매거진형 정보 | 4212자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/park-se-ri | 블로그/매거진형 정보 | 4088자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/priyanka-chopra | 블로그/매거진형 정보 | 6708자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/rm | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/robert-downey-jr | 블로그/매거진형 정보 | 6727자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/rose | 블로그/매거진형 정보 | 6682자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/ryu-hyun-jin | 블로그/매거진형 정보 | 4201자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/ryunosuke-akutagawa | 블로그/매거진형 정보 | 6716자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/scarlett-johansson | 블로그/매거진형 정보 | 6623자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/serena-williams | 블로그/매거진형 정보 | 6618자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/shah-rukh-khan | 블로그/매거진형 정보 | 6602자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/shin-saimdang | 블로그/매거진형 정보 | 6632자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/shohei-ohtani | 블로그/매거진형 정보 | 4239자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/son-heung-min | 블로그/매거진형 정보 | 4190자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/son-ye-jin | 블로그/매거진형 정보 | 6439자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/song-hye-kyo | 블로그/매거진형 정보 | 6522자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/song-joong-ki | 블로그/매거진형 정보 | 6494자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/steve-jobs | 블로그/매거진형 정보 | 4214자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/steve-wozniak | 블로그/매거진형 정보 | 4125자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/steven-spielberg | 블로그/매거진형 정보 | 6643자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/suga | 블로그/매거진형 정보 | 6604자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/takeshi-kitano | 블로그/매거진형 정보 | 4146자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/taylor-swift | 블로그/매거진형 정보 | 4193자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/tiger-woods | 블로그/매거진형 정보 | 6622자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/tony-leung | 블로그/매거진형 정보 | 6483자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/toyotomi-hideyoshi | 블로그/매거진형 정보 | 4263자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/v | 블로그/매거진형 정보 | 6622자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/warren-buffett | 블로그/매거진형 정보 | 6586자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/william-shakespeare | 블로그/매거진형 정보 | 4177자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/winston-churchill | 블로그/매거진형 정보 | 6567자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/wolfgang-amadeus-mozart | 블로그/매거진형 정보 | 6580자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/yi-hwang | 블로그/매거진형 정보 | 6582자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/yi-i | 블로그/매거진형 정보 | 6571자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/yi-sun-sin | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/youn-yuh-jung | 블로그/매거진형 정보 | 6483자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/yu-gwan-sun | 블로그/매거진형 정보 | 4187자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/yu-hae-jin | 블로그/매거진형 정보 | 4132자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/yuzuru-hanyu | 블로그/매거진형 정보 | 6732자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/zhang-yimou | 블로그/매거진형 정보 | 4155자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /famous-saju/zhang-ziyi | 블로그/매거진형 정보 | 6550자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /faq | 공개 정보/가이드 | 2571자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /fortune | 검색 제외 페이지 | 531자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /fortune/prompt-hub | 기능/도구 소개 | 8301자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /fortune/sikojen-povailu | 검색 제외 페이지 | 68자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /fpti | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /health-report/guide | 공개 정보/가이드 | 3418자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /high-value | 블로그/매거진형 정보 | 2518자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/category/astrology-ziwei | 블로그/매거진형 정보 | 1939자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/category/compatibility-relationship | 블로그/매거진형 정보 | 1940자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/category/daily-fortune | 블로그/매거진형 정보 | 1953자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/category/methodology | 블로그/매거진형 정보 | 1946자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/category/saju-beginner | 블로그/매거진형 정보 | 1919자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/category/tarot-reading | 블로그/매거진형 정보 | 1931자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/common-user-questions-faq | 블로그/매거진형 정보 | 2628자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/complete-guide-to-saju | 블로그/매거진형 정보 | 2693자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/how-tarot-actually-works | 블로그/매거진형 정보 | 2613자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/top-10-signs-of-compatibility | 블로그/매거진형 정보 | 2541자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/understanding-your-destiny | 블로그/매거진형 정보 | 2601자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /high-value/what-your-birth-date-says-about-you | 블로그/매거진형 정보 | 2543자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights | 블로그/매거진형 정보 | 5455자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/adsense-ready-content-checklist | 블로그/매거진형 정보 | 4549자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/africa-divination-traditions-deep-guide | 블로그/매거진형 정보 | 3521자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/annual-fortune-reading-checklist-no-fear | 블로그/매거진형 정보 | 4453자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/asia-divination-traditions-deep-guide | 블로그/매거진형 정보 | 4346자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/astrology | 블로그/매거진형 정보 | 3485자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/astrology-birth-chart-guide | 블로그/매거진형 정보 | 4412자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/astrology-houses-quick-guide | 블로그/매거진형 정보 | 4348자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/astrology-houses-what-is | 블로그/매거진형 정보 | 4422자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/astrology-mercury-retrograde-practical-guide | 블로그/매거진형 정보 | 4428자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/astrology-synastry-compatibility-fun-guide | 블로그/매거진형 정보 | 4384자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/astrology-vs-saju-differences | 블로그/매거진형 정보 | 4505자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/byeongo-year-love-winning-strategy | 블로그/매거진형 정보 | 4176자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/byeongo-year-reorder-signals | 블로그/매거진형 정보 | 4514자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/byeongo-year-wealth-winning-strategy | 블로그/매거진형 정보 | 4472자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/career-luck-interview-exam-prep-strategy | 블로그/매거진형 정보 | 4481자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/cheongan-jiji-complete-explanation | 블로그/매거진형 정보 | 4459자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/compatibility | 블로그/매거진형 정보 | 3735자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/copyright-safe-writing-for-fortune | 블로그/매거진형 정보 | 4533자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/daewoon-sewoon-reading-complete-guide | 블로그/매거진형 정보 | 4429자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/daewoon-vs-sewoon | 블로그/매거진형 정보 | 4394자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/day-master-personality-guide | 블로그/매거진형 정보 | 4468자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/day-master-survival-winning-strategy | 블로그/매거진형 정보 | 4386자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/dream | 블로그/매거진형 정보 | 4283자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/europe-divination-traditions-deep-guide | 블로그/매거진형 정보 | 4474자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju | 블로그/매거진형 정보 | 17470자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/공리 | 블로그/매거진형 정보 | 6614자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/공유 | 블로그/매거진형 정보 | 6421자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/공자 | 블로그/매거진형 정보 | 4161자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/孔子 | 블로그/매거진형 정보 | 4161자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/공자-孔子 | 블로그/매거진형 정보 | 4161자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/기타노-다케시 | 블로그/매거진형 정보 | 4146자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/김구 | 블로그/매거진형 정보 | 4276자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/김남준 | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/김대중 | 블로그/매거진형 정보 | 4130자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/김수현 | 블로그/매거진형 정보 | 6432자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/김연아 | 블로그/매거진형 정보 | 4132자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/김태리 | 블로그/매거진형 정보 | 6537자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/나루히토-일왕 | 블로그/매거진형 정보 | 4232자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/나폴레옹 | 블로그/매거진형 정보 | 4124자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/나폴레옹-보나파르트 | 블로그/매거진형 정보 | 4124자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/나폴레옹-비교 | 블로그/매거진형 정보 | 4124자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/뉴진스-다니엘 | 블로그/매거진형 정보 | 6594자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/뉴진스-민지 | 블로그/매거진형 정보 | 6640자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/뉴진스-하니 | 블로그/매거진형 정보 | 4197자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/뉴진스-해린 | 블로그/매거진형 정보 | 6691자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/뉴진스-혜인 | 블로그/매거진형 정보 | 6698자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/데이비드-베컴 | 블로그/매거진형 정보 | 6672자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/데즈카-오사무 | 블로그/매거진형 정보 | 6601자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/도널드-트럼프 | 블로그/매거진형 정보 | 6701자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/도요토미-히데요시 | 블로그/매거진형 정보 | 4263자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/레오나르도-다-빈치 | 블로그/매거진형 정보 | 4178자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/레오나르도-디카프리오 | 블로그/매거진형 정보 | 6862자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/레이디-가가 | 블로그/매거진형 정보 | 6611자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/로버트-다우니-주니어 | 블로그/매거진형 정보 | 6727자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/류현진 | 블로그/매거진형 정보 | 4201자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/르브론-제임스 | 블로그/매거진형 정보 | 6729자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/李小龍 | 블로그/매거진형 정보 | 4138자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/리오넬-메시 | 블로그/매거진형 정보 | 6561자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마돈나 | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마동석 | 블로그/매거진형 정보 | 6600자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마릴린-먼로 | 블로그/매거진형 정보 | 6650자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마오쩌둥 | 블로그/매거진형 정보 | 3840자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마윈 | 블로그/매거진형 정보 | 4220자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마윈-马云 | 블로그/매거진형 정보 | 4220자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마이클-잭슨 | 블로그/매거진형 정보 | 4175자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마이클-조던 | 블로그/매거진형 정보 | 6655자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마크-저커버그 | 블로그/매거진형 정보 | 6618자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마틴-루터-킹 | 블로그/매거진형 정보 | 4209자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마틴-스코세이지 | 블로그/매거진형 정보 | 4196자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/마하트마-간디 | 블로그/매거진형 정보 | 6528자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/메릴-스트립 | 블로그/매거진형 정보 | 6672자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/모차르트 | 블로그/매거진형 정보 | 6580자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/무라카미-하루키 | 블로그/매거진형 정보 | 4246자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/미야자키-하야오 | 블로그/매거진형 정보 | 4311자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/박보검 | 블로그/매거진형 정보 | 6473자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/박세리 | 블로그/매거진형 정보 | 4088자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/박정희 | 블로그/매거진형 정보 | 4212자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/박찬욱 | 블로그/매거진형 정보 | 6543자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/박찬호 | 블로그/매거진형 정보 | 4121자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/버락-오바마 | 블로그/매거진형 정보 | 4112자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/베토벤 | 블로그/매거진형 정보 | 6550자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/봉준호 | 블로그/매거진형 정보 | 4202자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/브래드-피트 | 블로그/매거진형 정보 | 6630자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/블랙핑크-로제 | 블로그/매거진형 정보 | 6682자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/블랙핑크-리사 | 블로그/매거진형 정보 | 6677자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/블랙핑크-제니 | 블로그/매거진형 정보 | 6592자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/블랙핑크-지수 | 블로그/매거진형 정보 | 6663자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/비욘세 | 블로그/매거진형 정보 | 6522자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/빌-게이츠 | 블로그/매거진형 정보 | 4111자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/빌리-아일리시 | 블로그/매거진형 정보 | 6751자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/샤루크-칸 | 블로그/매거진형 정보 | 6602자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/성룡 | 블로그/매거진형 정보 | 4165자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/成龍 | 블로그/매거진형 정보 | 4165자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/성룡-成龍 | 블로그/매거진형 정보 | 4165자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/세리나-윌리엄스 | 블로그/매거진형 정보 | 6618자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/세종대왕 | 블로그/매거진형 정보 | 4292자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/손예진 | 블로그/매거진형 정보 | 6439자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/손흥민 | 블로그/매거진형 정보 | 4190자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/송중기 | 블로그/매거진형 정보 | 6494자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/송혜교 | 블로그/매거진형 정보 | 6522자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/스칼렛-요한슨 | 블로그/매거진형 정보 | 6623자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/스티브-워즈니악 | 블로그/매거진형 정보 | 4125자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/스티브-잡스 | 블로그/매거진형 정보 | 4214자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/스티븐-스필버그 | 블로그/매거진형 정보 | 6643자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/신사임당 | 블로그/매거진형 정보 | 6632자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/아델 | 블로그/매거진형 정보 | 6521자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/아리아나-그란데 | 블로그/매거진형 정보 | 6680자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/아무로-나미에 | 블로그/매거진형 정보 | 4150자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/아미타브-바찬 | 블로그/매거진형 정보 | 6603자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/아이유 | 블로그/매거진형 정보 | 4187자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/아쿠타가와-류노스케 | 블로그/매거진형 정보 | 6716자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/안유진 | 블로그/매거진형 정보 | 6611자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/안젤리나-졸리 | 블로그/매거진형 정보 | 6681자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/안중근 | 블로그/매거진형 정보 | 4279자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/알베르트-아인슈타인 | 블로그/매거진형 정보 | 4218자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/알엠 | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/양조위 | 블로그/매거진형 정보 | 6483자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/에드-시런 | 블로그/매거진형 정보 | 6563자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/에스파-윈터 | 블로그/매거진형 정보 | 6686자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/에스파-카리나 | 블로그/매거진형 정보 | 6755자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/엘비스-프레슬리 | 블로그/매거진형 정보 | 4169자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/엠마-왓슨 | 블로그/매거진형 정보 | 6580자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/오드리-헵번 | 블로그/매거진형 정보 | 6532자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/오타니-쇼헤이 | 블로그/매거진형 정보 | 4239자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/오프라-윈프리 | 블로그/매거진형 정보 | 6412자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/왕페이 | 블로그/매거진형 정보 | 6437자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/워런-버핏 | 블로그/매거진형 정보 | 6586자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/윈스턴-처칠 | 블로그/매거진형 정보 | 6567자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/윌리엄-셰익스피어 | 블로그/매거진형 정보 | 4177자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/유관순 | 블로그/매거진형 정보 | 4187자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/유해진 | 블로그/매거진형 정보 | 4132자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/윤여정 | 블로그/매거진형 정보 | 6483자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/이민호 | 블로그/매거진형 정보 | 6552자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/이소룡 | 블로그/매거진형 정보 | 4138자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/이소룡-李小龍 | 블로그/매거진형 정보 | 4138자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/이순신 | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/이연걸 | 블로그/매거진형 정보 | 6598자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/이이 | 블로그/매거진형 정보 | 6571자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/이지은 | 블로그/매거진형 정보 | 4187자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/이황 | 블로그/매거진형 정보 | 6582자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/일론-머스크 | 블로그/매거진형 정보 | 4201자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/장원영 | 블로그/매거진형 정보 | 6505자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/장이머우 | 블로그/매거진형 정보 | 4155자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/장쯔이 | 블로그/매거진형 정보 | 6550자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/저우제룬 | 블로그/매거진형 정보 | 6526자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/전지현 | 블로그/매거진형 정보 | 6487자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/정약용 | 블로그/매거진형 정보 | 4203자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/제프-베이조스 | 블로그/매거진형 정보 | 6659자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/조-바이든 | 블로그/매거진형 정보 | 6595자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/존-레논 | 블로그/매거진형 정보 | 6460자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/충무공 | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/충무공-이순신 | 블로그/매거진형 정보 | 4081자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/카멀라-해리스 | 블로그/매거진형 정보 | 6541자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/케이트-윈슬렛 | 블로그/매거진형 정보 | 6629자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/쿠로사와-아키라 | 블로그/매거진형 정보 | 4125자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/크리스토퍼-놀란 | 블로그/매거진형 정보 | 6647자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/크리스티아누-호날두 | 블로그/매거진형 정보 | 6677자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/키아누-리브스 | 블로그/매거진형 정보 | 6630자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/킬리안-음바페 | 블로그/매거진형 정보 | 6684자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/타이거-우즈 | 블로그/매거진형 정보 | 6622자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/테일러-스위프트 | 블로그/매거진형 정보 | 4193자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/프리얀카-초프라 | 블로그/매거진형 정보 | 6708자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/하뉴-유즈루 | 블로그/매거진형 정보 | 6732자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/한강 | 블로그/매거진형 정보 | 4160자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/현빈 | 블로그/매거진형 정보 | 6468자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/马云 | 블로그/매거진형 정보 | 4220자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/adele | 블로그/매거진형 정보 | 6521자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/aespa-karina | 블로그/매거진형 정보 | 6755자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/aespa-winter | 블로그/매거진형 정보 | 6686자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/akira-kurosawa | 블로그/매거진형 정보 | 4125자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/akutagawa-ryunosuke | 블로그/매거진형 정보 | 6716자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/albert-einstein | 블로그/매거진형 정보 | 4218자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/amitabh-bachchan | 블로그/매거진형 정보 | 6603자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/an-jung-geun | 블로그/매거진형 정보 | 4279자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/angelina-jolie | 블로그/매거진형 정보 | 6681자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/ariana-grande | 블로그/매거진형 정보 | 6680자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/audrey-hepburn | 블로그/매거진형 정보 | 6532자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/barack-obama | 블로그/매거진형 정보 | 4112자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/beethoven | 블로그/매거진형 정보 | 6550자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/beyonce | 블로그/매거진형 정보 | 6522자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/bill-gates | 블로그/매거진형 정보 | 4111자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/billie-eilish | 블로그/매거진형 정보 | 6751자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/blackpink-jennie | 블로그/매거진형 정보 | 6592자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/blackpink-jisoo | 블로그/매거진형 정보 | 6663자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/blackpink-lisa | 블로그/매거진형 정보 | 6677자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/blackpink-rose | 블로그/매거진형 정보 | 6682자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/bong-joon-ho | 블로그/매거진형 정보 | 4202자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/brad-pitt | 블로그/매거진형 정보 | 6630자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/bruce-lee | 블로그/매거진형 정보 | 4138자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/bts-뷔 | 블로그/매거진형 정보 | 6622자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/bts-슈가 | 블로그/매거진형 정보 | 6604자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/bts-알엠 | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/bts-정국 | 블로그/매거진형 정보 | 6699자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/bts-제이홉 | 블로그/매거진형 정보 | 6704자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/bts-지민 | 블로그/매거진형 정보 | 6667자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/bts-진 | 블로그/매거진형 정보 | 6669자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/bts-j-hope | 블로그/매거진형 정보 | 6704자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/bts-jimin | 블로그/매거진형 정보 | 6667자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/bts-jin | 블로그/매거진형 정보 | 6669자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/bts-jungkook | 블로그/매거진형 정보 | 6699자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/bts-rm | 블로그/매거진형 정보 | 3894자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/bts-rm-김남준 | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/bts-suga | 블로그/매거진형 정보 | 6604자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/bts-v | 블로그/매거진형 정보 | 6622자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/christopher-nolan | 블로그/매거진형 정보 | 6647자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/confucius | 블로그/매거진형 정보 | 4161자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/cristiano-ronaldo | 블로그/매거진형 정보 | 6677자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/david-beckham | 블로그/매거진형 정보 | 6672자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/donald-trump | 블로그/매거진형 정보 | 6701자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/ed-sheeran | 블로그/매거진형 정보 | 6563자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/elon-musk | 블로그/매거진형 정보 | 4201자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/elvis-presley | 블로그/매거진형 정보 | 4169자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/emma-watson | 블로그/매거진형 정보 | 6580자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/faye-wong | 블로그/매거진형 정보 | 6437자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/gong-li | 블로그/매거진형 정보 | 6614자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/gong-yoo | 블로그/매거진형 정보 | 6421자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/han-kang | 블로그/매거진형 정보 | 4160자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/hanyu-yuzuru | 블로그/매거진형 정보 | 6732자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/haruki-murakami | 블로그/매거진형 정보 | 4246자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/hayao-miyazaki | 블로그/매거진형 정보 | 4311자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/hyun-bin | 블로그/매거진형 정보 | 6468자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/iu | 블로그/매거진형 정보 | 4187자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/iu-이지은 | 블로그/매거진형 정보 | 4187자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/ive-ahn-yujin | 블로그/매거진형 정보 | 6611자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/ive-jang-wonyoung | 블로그/매거진형 정보 | 6505자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/j-hope | 블로그/매거진형 정보 | 6704자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/j-k-롤링 | 블로그/매거진형 정보 | 6624자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/j-k-rowling | 블로그/매거진형 정보 | 6624자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/jack-ma | 블로그/매거진형 정보 | 4220자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/jackie-chan | 블로그/매거진형 정보 | 4165자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/jay-chou | 블로그/매거진형 정보 | 6526자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/jeff-bezos | 블로그/매거진형 정보 | 6659자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/jennie | 블로그/매거진형 정보 | 6592자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/jeong-yak-yong | 블로그/매거진형 정보 | 4203자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/jet-li | 블로그/매거진형 정보 | 6598자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/jimin | 블로그/매거진형 정보 | 6667자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/jin | 블로그/매거진형 정보 | 6669자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/jisoo | 블로그/매거진형 정보 | 6663자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/joe-biden | 블로그/매거진형 정보 | 6595자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/john-lennon | 블로그/매거진형 정보 | 6460자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/jun-ji-hyun | 블로그/매거진형 정보 | 6487자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/jungkook | 블로그/매거진형 정보 | 6699자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/kamala-harris | 블로그/매거진형 정보 | 6541자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/kate-winslet | 블로그/매거진형 정보 | 6629자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/keanu-reeves | 블로그/매거진형 정보 | 6630자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/kim-dae-jung | 블로그/매거진형 정보 | 4130자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/kim-gu | 블로그/매거진형 정보 | 4276자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/kim-soo-hyun | 블로그/매거진형 정보 | 6432자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/kim-tae-ri | 블로그/매거진형 정보 | 6537자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/kim-yuna | 블로그/매거진형 정보 | 4132자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/king-sejong | 블로그/매거진형 정보 | 4292자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/kylian-mbappe | 블로그/매거진형 정보 | 6684자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/lady-gaga | 블로그/매거진형 정보 | 6611자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/lebron-james | 블로그/매거진형 정보 | 6729자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/lee-min-ho | 블로그/매거진형 정보 | 6552자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/leonardo-da-vinci | 블로그/매거진형 정보 | 4178자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/leonardo-dicaprio | 블로그/매거진형 정보 | 6862자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/lionel-messi | 블로그/매거진형 정보 | 6561자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/lisa | 블로그/매거진형 정보 | 6677자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/ludwig-van-beethoven | 블로그/매거진형 정보 | 6550자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/ma-dong-seok | 블로그/매거진형 정보 | 6600자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/madonna | 블로그/매거진형 정보 | 4081자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/mahatma-gandhi | 블로그/매거진형 정보 | 6528자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/mao-zedong | 블로그/매거진형 정보 | 3840자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/marilyn-monroe | 블로그/매거진형 정보 | 6650자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/mark-zuckerberg | 블로그/매거진형 정보 | 6618자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/martin-luther-king-jr | 블로그/매거진형 정보 | 4209자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/martin-scorsese | 블로그/매거진형 정보 | 4196자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/meryl-streep | 블로그/매거진형 정보 | 6672자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/michael-jackson | 블로그/매거진형 정보 | 4175자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/michael-jordan | 블로그/매거진형 정보 | 6655자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/miyazaki-hayao | 블로그/매거진형 정보 | 4311자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/mozart | 블로그/매거진형 정보 | 6580자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/murakami-haruki | 블로그/매거진형 정보 | 4246자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/namie-amuro | 블로그/매거진형 정보 | 4150자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/napoleon-bonaparte | 블로그/매거진형 정보 | 4124자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/naruhito | 블로그/매거진형 정보 | 4232자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/newjeans-danielle | 블로그/매거진형 정보 | 6594자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/newjeans-haerin | 블로그/매거진형 정보 | 6691자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/newjeans-hanni | 블로그/매거진형 정보 | 4197자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/newjeans-hyein | 블로그/매거진형 정보 | 6698자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/newjeans-minji | 블로그/매거진형 정보 | 6640자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/oprah-winfrey | 블로그/매거진형 정보 | 6412자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/osamu-tezuka | 블로그/매거진형 정보 | 6601자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/otani-shohei | 블로그/매거진형 정보 | 4239자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/park-bo-gum | 블로그/매거진형 정보 | 6473자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/park-chan-ho | 블로그/매거진형 정보 | 4121자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/park-chan-wook | 블로그/매거진형 정보 | 6543자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/park-chung-hee | 블로그/매거진형 정보 | 4212자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/park-se-ri | 블로그/매거진형 정보 | 4088자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/priyanka-chopra | 블로그/매거진형 정보 | 6708자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/rm | 블로그/매거진형 정보 | 3894자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/robert-downey-jr | 블로그/매거진형 정보 | 6727자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/rose | 블로그/매거진형 정보 | 6682자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/ryu-hyun-jin | 블로그/매거진형 정보 | 4201자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/ryunosuke-akutagawa | 블로그/매거진형 정보 | 6716자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/scarlett-johansson | 블로그/매거진형 정보 | 6623자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/serena-williams | 블로그/매거진형 정보 | 6618자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/shah-rukh-khan | 블로그/매거진형 정보 | 6602자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/shin-saimdang | 블로그/매거진형 정보 | 6632자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/shohei-ohtani | 블로그/매거진형 정보 | 4239자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/son-heung-min | 블로그/매거진형 정보 | 4190자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/son-ye-jin | 블로그/매거진형 정보 | 6439자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/song-hye-kyo | 블로그/매거진형 정보 | 6522자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/song-joong-ki | 블로그/매거진형 정보 | 6494자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/steve-jobs | 블로그/매거진형 정보 | 4214자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/steve-wozniak | 블로그/매거진형 정보 | 4125자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/steven-spielberg | 블로그/매거진형 정보 | 6643자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/suga | 블로그/매거진형 정보 | 6604자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/takeshi-kitano | 블로그/매거진형 정보 | 4146자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/taylor-swift | 블로그/매거진형 정보 | 4193자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/tiger-woods | 블로그/매거진형 정보 | 6622자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/tony-leung | 블로그/매거진형 정보 | 6483자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/toyotomi-hideyoshi | 블로그/매거진형 정보 | 4263자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/v | 블로그/매거진형 정보 | 6622자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/warren-buffett | 블로그/매거진형 정보 | 6586자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/william-shakespeare | 블로그/매거진형 정보 | 4177자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/winston-churchill | 블로그/매거진형 정보 | 6567자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/wolfgang-amadeus-mozart | 블로그/매거진형 정보 | 6580자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/yi-hwang | 블로그/매거진형 정보 | 6582자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/yi-i | 블로그/매거진형 정보 | 6571자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/yi-sun-sin | 블로그/매거진형 정보 | 4081자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/youn-yuh-jung | 블로그/매거진형 정보 | 6483자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/yu-gwan-sun | 블로그/매거진형 정보 | 4187자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/yu-hae-jin | 블로그/매거진형 정보 | 4132자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/yuzuru-hanyu | 블로그/매거진형 정보 | 6732자 (충분) | 제외 | noindex 또는 비공개/중복 처리, canonical 또는 도메인 정책상 광고 차단 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /insights/famous-saju/zhang-yimou | 블로그/매거진형 정보 | 4155자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/famous-saju/zhang-ziyi | 블로그/매거진형 정보 | 6550자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/five-elements-balance-guide-for-real-life | 블로그/매거진형 정보 | 4525자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/five-elements-balance-practical | 블로그/매거진형 정보 | 4410자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/five-elements-ohang-complete-guide | 블로그/매거진형 정보 | 4399자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/five-elements-personality-deep-dive | 블로그/매거진형 정보 | 4380자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/fortune-content-for-adsense-what-google-likes | 블로그/매거진형 정보 | 4440자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/goonghap-compatibility-basics-complete | 블로그/매거진형 정보 | 4434자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/how-to-ask-better-fortune-questions | 블로그/매거진형 정보 | 4519자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/how-to-raise-luck-daily-routine-practical-guide | 블로그/매거진형 정보 | 4571자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/iljoo-personality-complete-guide-60-pillars | 블로그/매거진형 정보 | 4416자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/lucky-day-selection-without-superstition | 블로그/매거진형 정보 | 4405자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/manseoryeok-reading-for-beginners-no-jargon | 블로그/매거진형 정보 | 4478자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/manseoryeok-what-is | 블로그/매거진형 정보 | 4490자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/middle-east-divination-traditions-deep-guide | 블로그/매거진형 정보 | 3507자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/money-luck-habits-and-saju-finance-rules | 블로그/매거진형 정보 | 4410자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/monthly-fortune-journal-and-feedback-loop | 블로그/매거진형 정보 | 4412자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/nakshatra-what-is | 블로그/매거진형 정보 | 4380자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/new-moon-full-moon-fortune-routine | 블로그/매거진형 정보 | 4377자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/new-year-fortune-framework | 블로그/매거진형 정보 | 4419자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/relationship-luck-and-communication-rules | 블로그/매거진형 정보 | 4371자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/reset-routine-when-luck-feels-stuck | 블로그/매거진형 정보 | 4433자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju | 블로그/매거진형 정보 | 4167자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju-12-unseong-complete-guide | 블로그/매거진형 정보 | 4461자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju-2026-monthly-planning-framework | 블로그/매거진형 정보 | 4491자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju-and-tarot-combined-reading-framework | 블로그/매거진형 정보 | 4532자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju-compatibility-fun-method | 블로그/매거진형 정보 | 4160자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju-compatibility-how-to | 블로그/매거진형 정보 | 4373자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju-four-pillars-basics | 블로그/매거진형 정보 | 4541자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju-free-guide | 블로그/매거진형 정보 | 4434자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju-how-to-read-step-by-step-beginner-guide | 블로그/매거진형 정보 | 4424자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju-job-change-timing-checklist-2026 | 블로그/매거진형 정보 | 4388자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/saju-pallja-basic-principles-complete-guide | 블로그/매거진형 정보 | 4461자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/singang-sinyak-judgment-complete-guide | 블로그/매거진형 정보 | 4453자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sleep-rhythm-energy-and-luck-connection | 블로그/매거진형 정보 | 4419자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/structured-data-for-fortune-sites | 블로그/매거진형 정보 | 4407자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo | 블로그/매거진형 정보 | 3594자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-27-guardian-animals-origin-guide | 블로그/매거진형 정보 | 4346자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-27-mansions | 블로그/매거진형 정보 | 4402자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-ankai | 블로그/매거진형 정보 | 4411자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-antai | 블로그/매거진형 정보 | 4409자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-basics | 블로그/매거진형 정보 | 2068자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-beginner-terms-easy-dictionary | 블로그/매거진형 정보 | 4360자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-bonmyeongsuk-vs-wolmyeongsuk | 블로그/매거진형 정보 | 4372자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-boundary-setting-practical-guide | 블로그/매거진형 정보 | 4417자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-compatibility-guide | 블로그/매거진형 정보 | 4433자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-compatibility-rhythm-guide | 블로그/매거진형 정보 | 4319자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-compatibility-simple-checklist | 블로그/매거진형 정보 | 4331자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-conflict-repair-dialogue-templates | 블로그/매거진형 정보 | 4393자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-couple-finance-rhythm-guide | 블로그/매거진형 정보 | 4411자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-day-by-day-rhythm-usage | 블로그/매거진형 정보 | 4331자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-eishin | 블로그/매거진형 정보 | 4405자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-friendship-teamwork-guide | 블로그/매거진형 정보 | 4373자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-love | 블로그/매거진형 정보 | 4404자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-love-communication-rules | 블로그/매거진형 정보 | 4355자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-lunar-mansion-primer | 블로그/매거진형 정보 | 4439자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-marriage | 블로그/매거진형 정보 | 4360자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-qa-most-asked-questions | 블로그/매거진형 정보 | 4400자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-three-group-types-guide | 블로그/매거진형 정보 | 4400자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-vs-saju-compatibility | 블로그/매거진형 정보 | 4479자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-what-is | 블로그/매거진형 정보 | 4390자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sukuyo-what-is-27-lunar-mansions | 블로그/매거진형 정보 | 4345자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/sun-moon-rising-difference | 블로그/매거진형 정보 | 4421자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot | 블로그/매거진형 정보 | 4132자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-anxiety-safe-reading-method | 블로그/매거진형 정보 | 4495자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-career-reading-7-question-framework | 블로그/매거진형 정보 | 4389자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-compatibility-reading-game | 블로그/매거진형 정보 | 4358자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-court-cards-personality-and-relationship-guide | 블로그/매거진형 정보 | 4471자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-how-to-read | 블로그/매거진형 정보 | 4517자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-love-question-design | 블로그/매거진형 정보 | 4490자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-major-arcana-0-to-21-with-images | 블로그/매거진형 정보 | 4436자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-major-arcana-22-complete-meanings | 블로그/매거진형 정보 | 4554자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-major-arcana-symbols | 블로그/매거진형 정보 | 4472자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-minor-arcana-four-suits-practical-guide | 블로그/매거진형 정보 | 4477자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-partner-mind-reading | 블로그/매거진형 정보 | 4414자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-practical-reading-casebook-by-question | 블로그/매거진형 정보 | 4434자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-reunion-reading | 블로그/매거진형 정보 | 4388자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-reversed-card-framework | 블로그/매거진형 정보 | 4537자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-spread-design-principles | 블로그/매거진형 정보 | 4514자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/tarot-vs-saju | 블로그/매거진형 정보 | 4510자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ten-gods-beginner-map | 블로그/매거진형 정보 | 4409자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ten-gods-career-aptitude-fun-guide | 블로그/매거진형 정보 | 4371자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ten-gods-career-relationship | 블로그/매거진형 정보 | 4394자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ten-gods-practical-map-love-work-money | 블로그/매거진형 정보 | 4418자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ten-heavenly-stems-practical | 블로그/매거진형 정보 | 4540자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/today-tarot-routine | 블로그/매거진형 정보 | 4400자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/twelve-earthly-branches-and-seasons | 블로그/매거진형 정보 | 4549자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic | 블로그/매거진형 정보 | 3402자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic-astrology-12-rasi-complete-personality-guide | 블로그/매거진형 정보 | 4457자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic-astrology-navamsa-basics | 블로그/매거진형 정보 | 4492자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic-compatibility-synastry-basics | 블로그/매거진형 정보 | 4344자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic-dasha-monthly-action-guide | 블로그/매거진형 정보 | 4373자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic-dasha-transit-remedy-practical-guide | 블로그/매거진형 정보 | 4420자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic-lagna-what-is | 블로그/매거진형 정보 | 4368자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic-moon-sign-emotion-routine-guide | 블로그/매거진형 정보 | 4430자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic-retrograde-planets-practical-decoding | 블로그/매거진형 정보 | 4427자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic-transit-journal-template-90days | 블로그/매거진형 정보 | 4451자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/vedic-what-is | 블로그/매거진형 정보 | 4459자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/world-strange-divination-guide-including-pig-oracle | 블로그/매거진형 정보 | 3592자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/yongshin-finding-method-practical-guide | 블로그/매거진형 정보 | 4418자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/yongshin-how-to-think | 블로그/매거진형 정보 | 4424자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei | 블로그/매거진형 정보 | 3644자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-14-main-stars-complete-guide | 블로그/매거진형 정보 | 4405자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-basics | 블로그/매거진형 정보 | 2122자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-career-palace-action | 블로그/매거진형 정보 | 4382자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-chart-guide | 블로그/매거진형 정보 | 4444자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-compatibility-palace-method | 블로그/매거진형 정보 | 4432자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-decade-and-annual-flow-reading-guide | 블로그/매거진형 정보 | 4408자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-doushu-complete-beginner-guide | 블로그/매거진형 정보 | 4437자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-doushu-stars-intro | 블로그/매거진형 정보 | 4412자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-four-transformations-lu-quan-ke-ji-guide | 블로그/매거진형 정보 | 4354자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-life-palaces | 블로그/매거진형 정보 | 4468자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-love-compatibility | 블로그/매거진형 정보 | 4450자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-lucun-and-huaji-practical | 블로그/매거진형 정보 | 4424자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-minggong | 블로그/매거진형 정보 | 4358자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-minggong-self-analysis-checklist | 블로그/매거진형 정보 | 4350자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-monthly-action-checklist-by-palace | 블로그/매거진형 정보 | 4354자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-palaces-career-finance-love | 블로그/매거진형 정보 | 4402자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-promotion-signals-practical-guide | 블로그/매거진형 정보 | 4411자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-sihua | 블로그/매거진형 정보 | 4431자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-star-brightness | 블로그/매거진형 정보 | 4456자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-star-combinations-for-beginners | 블로그/매거진형 정보 | 4402자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-sun-moon-balance | 블로그/매거진형 정보 | 4390자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-tiandong-meaning-and-palaces | 블로그/매거진형 정보 | 4427자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-tianfu-star-wealth-and-stability | 블로그/매거진형 정보 | 4387자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-vs-saju | 블로그/매거진형 정보 | 4466자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-wealth-career | 블로그/매거진형 정보 | 4443자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-what-is | 블로그/매거진형 정보 | 4407자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-wugok-meaning-and-palaces | 블로그/매거진형 정보 | 4387자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /insights/ziwei-ziwei-star-beginner-guide | 블로그/매거진형 정보 | 4420자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /ja | 검색 제외 페이지 | 2377자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /ja-jp | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /ja/insights | 검색 제외 페이지 | 1853자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /ja/insights/sukuyo-basics-jp | 검색 제외 페이지 | 1967자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /ja/insights/ziwei-basics-jp | 검색 제외 페이지 | 2003자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /ja/sukuyo | 검색 제외 페이지 | 2208자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /ja/today | 검색 제외 페이지 | 2188자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /ja/ziwei | 검색 제외 페이지 | 2248자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /landing | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /login | 계정/인증 | 1915자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /love | 기능/도구 소개 | 2326자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /manse | 기능/도구 소개 | 2491자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /maya | 검색 제외 페이지 | 3319자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /mayan-calendar/guide | 공개 정보/가이드 | 3306자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /me | 프로필/개인 영역 | 1724자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /me/reports | 프로필/개인 영역 | 1719자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /methodology | 공개 정보/가이드 | 2266자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /music | 검색 제외 페이지 | 40자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /music/guide | 공개 정보/가이드 | 2467자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /olympus | 기능/도구 소개 | 1703자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /oracle/hwatu-life | 기능/도구 소개 | 3178자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /oracle/hwatu-life/play | 검색 제외 페이지 | 29자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /oracle/ifa | 검색 제외 페이지 | 23자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /oracle/royal-tea | 검색 제외 페이지 | 1999자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /oracle/rune | 기능/도구 소개 | 2014자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /oracle/sikojen-povailu | 검색 제외 페이지 | 1714자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /oracle/sikojen-povailu/play | 검색 제외 페이지 | 41자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /oracle/sukuyo | 기능/도구 소개 | 3029자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /palm-reading | 검색 제외 페이지 | 1191자 (보강 권장) | 제외 | noindex 또는 비공개/중복 처리, 본문 보강 권장 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /pdf/life-book | 유료/개인 리포트 | 2348자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /pdf/love-report | 유료/개인 리포트 | 2328자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /pdf/new-year | 유료/개인 리포트 | 2339자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /physiognomy | 기능/도구 소개 | 2327자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /points | 유료/개인 리포트 | 1701자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /points/history | 유료/개인 리포트 | 1709자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /premium | 유료/개인 리포트 | 2344자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /premium-reports | 검색 제외 페이지 | 2361자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /premium-unlock | 검색 제외 페이지 | 5071자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /premium/saju-lifebook | 유료/개인 리포트 | 2638자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /premium/saju-love-bible | 유료/개인 리포트 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /privacy | 정책/신뢰 고지 | 3778자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /privacy-policy | 기능/도구 소개 | 3761자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest | 기능/도구 소개 | 3615자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/aura | 기능/도구 소개 | 2126자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/chihuahua | 기능/도구 소개 | 2129자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/empathy | 기능/도구 소개 | 2117자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/hsp | 기능/도구 소개 | 2128자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/mental | 기능/도구 소개 | 2124자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/narcissist | 기능/도구 소개 | 2131자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/office | 기능/도구 소개 | 2137자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/persona | 기능/도구 소개 | 2123자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/psycho | 기능/도구 소개 | 2148자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/romance | 기능/도구 소개 | 2126자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/seven | 기능/도구 소개 | 2128자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/tci | 기능/도구 소개 | 2132자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/thriller | 기능/도구 소개 | 2138자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /psychotest/ttest | 기능/도구 소개 | 2133자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /saju | 기능/도구 소개 | 2518자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /saju-fpti | 검색 제외 페이지 | 877자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju-guardian | 검색 제외 페이지 | 1763자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju-picture | 검색 제외 페이지 | 27자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju/animal-destiny | 검색 제외 페이지 | 480자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju/animal-test | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju/basic | 기능/도구 소개 | 2306자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /saju/basic/play | 검색 제외 페이지 | 41자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju/compatibility | 기능/도구 소개 | 2336자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /saju/destiny-bias | 검색 제외 페이지 | 361자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju/destiny-bias/stage | 검색 제외 페이지 | 252자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju/destiny-meeting-place | 검색 제외 페이지 | 748자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju/five-elements | 기능/도구 소개 | 3276자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /saju/guide | 공개 정보/가이드 | 3419자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /saju/lifebook | 기능/도구 소개 | 2638자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /saju/love-bible | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju/love-simulation | 검색 제외 페이지 | 138자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /saju/sibyl | 기능/도구 소개 | 2045자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /saju/ten-gods | 기능/도구 소개 | 3285자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /signup | 계정/인증 | 7834자 (충분) | 제외 | noindex 또는 비공개/중복 처리, 광고 제외 대상 화면 | 광고 차단 유지, sitemap/noindex 정책 유지 |
| /static | 기능/도구 소개 | 29917자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories | 기능/도구 소개 | 2086자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny | 기능/도구 소개 | 4666자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-1 | 기능/도구 소개 | 8998자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-10 | 기능/도구 소개 | 11847자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-11 | 기능/도구 소개 | 9441자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-12 | 기능/도구 소개 | 12891자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-13 | 기능/도구 소개 | 11680자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-14 | 기능/도구 소개 | 10126자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-15 | 기능/도구 소개 | 8464자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-16 | 기능/도구 소개 | 9935자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-17 | 기능/도구 소개 | 9332자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-18 | 기능/도구 소개 | 10884자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-19 | 기능/도구 소개 | 11413자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-2 | 기능/도구 소개 | 9040자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-20 | 기능/도구 소개 | 9271자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-21 | 기능/도구 소개 | 13266자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-22 | 기능/도구 소개 | 12581자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-23 | 기능/도구 소개 | 11239자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-24 | 기능/도구 소개 | 12520자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-25 | 기능/도구 소개 | 8201자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-26 | 기능/도구 소개 | 11382자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-27 | 기능/도구 소개 | 10549자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-28 | 기능/도구 소개 | 10509자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-29 | 기능/도구 소개 | 12368자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-3 | 기능/도구 소개 | 8757자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-30 | 기능/도구 소개 | 10821자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-31 | 기능/도구 소개 | 13016자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-32 | 기능/도구 소개 | 14028자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-33 | 기능/도구 소개 | 8677자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-34 | 기능/도구 소개 | 9559자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-35 | 기능/도구 소개 | 12254자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-36 | 기능/도구 소개 | 10057자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-37 | 기능/도구 소개 | 10368자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-38 | 기능/도구 소개 | 11479자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-39 | 기능/도구 소개 | 9446자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-4 | 기능/도구 소개 | 9000자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-40 | 기능/도구 소개 | 11174자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-41 | 기능/도구 소개 | 12863자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-42 | 기능/도구 소개 | 11595자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-43 | 기능/도구 소개 | 9851자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-44 | 기능/도구 소개 | 10664자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-5 | 기능/도구 소개 | 8150자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-6 | 기능/도구 소개 | 9891자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-7 | 기능/도구 소개 | 10015자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-8 | 기능/도구 소개 | 10362자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/chapter-9 | 기능/도구 소개 | 8460자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /stories/code-destiny/prologue | 기능/도구 소개 | 5935자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /sukuyo | 기능/도구 소개 | 2324자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /sukuyo/calendar | 검색 제외 페이지 | 1791자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /sukuyo/compatibility | 기능/도구 소개 | 2355자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /sukuyo/guide | 공개 정보/가이드 | 3301자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /sukyo | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /sukyo/relationship-encyclopedia | 검색 제외 페이지 | 45자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /tarot | 기능/도구 소개 | 2335자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /tarot/crystal-soul | 검색 제외 페이지 | 285자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /tarot/guide | 공개 정보/가이드 | 3243자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /tarot/healing | 검색 제외 페이지 | 1055자 (보강 권장) | 제외 | noindex 또는 비공개/중복 처리, 본문 보강 권장 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /tarot/healing/start | 검색 제외 페이지 | 28자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /tarot/love | 기능/도구 소개 | 1917자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /tarot/mindscan | 기능/도구 소개 | 2097자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /tarot/mingri | 기능/도구 소개 | 3165자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /tarot/mingri/play | 검색 제외 페이지 | 9자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /tarot/numerology | 기능/도구 소개 | 2391자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /tarot/prompt-maker | 기능/도구 소개 | 2120자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /tarot/reunion | 기능/도구 소개 | 2342자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /tarot/self-esteem | 기능/도구 소개 | 2424자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /tarot/year | 검색 제외 페이지 | 1926자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /terms | 정책/신뢰 고지 | 5976자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /terms-of-service | 기능/도구 소개 | 5976자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /today | 기능/도구 소개 | 2333자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /vedic | 기능/도구 소개 | 2331자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /vedic/guide | 공개 정보/가이드 | 3375자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
| /vedic/jyotish | 기능/도구 소개 | 3054자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /yeon-star-hug | 기능/도구 소개 | 1870자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /zh | 검색 제외 페이지 | 2239자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /zh-cn | 검색 제외 페이지 | 36자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /zh/insights | 검색 제외 페이지 | 1814자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /zh/insights/sukuyo-basics-zh | 검색 제외 페이지 | 1894자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /zh/insights/ziwei-basics-zh | 검색 제외 페이지 | 1927자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /zh/sukuyo | 검색 제외 페이지 | 2114자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /zh/today | 검색 제외 페이지 | 2090자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /zh/ziwei | 검색 제외 페이지 | 2146자 (충분) | 제외 | noindex 또는 비공개/중복 처리 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /ziwei | 기능/도구 소개 | 2376자 (충분) | 제외 | 광고 제외 정책 대상 | 공개 정보 가치 확인 후 보수적으로 광고 제외 유지 |
| /ziwei/chart | 검색 제외 페이지 | 51자 (부족) | 제외 | noindex 또는 비공개/중복 처리, 본문 부족 | canonical/noindex 의도 유지, 중복 alias는 광고 제외 |
| /ziwei/guide | 공개 정보/가이드 | 3410자 (충분) | 가능 | 현재 검증 기준 통과 | 본문 우선 배치 유지, 정적 광고 슬롯 직접 삽입 금지 |
