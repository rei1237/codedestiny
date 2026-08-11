# URL Architecture — 유지 원칙 + 확인된 예외

> [세트 인덱스](README.md) · 이 문서는 4/10부다. 원 기획안의 "URL 전면 재설계"를 폐기하고, **유지가
> 기본, 예외만 개별 검토**하는 축소된 범위로 다룬다.

## 1. 원칙

기존 URL은 이유 없이 대량 마이그레이션하지 않는다. `/insights/[slug]` 100개+, 6개 토픽 허브,
브랜드 페이지 모두 이미 검색 유입·색인이 걸려 있을 가능성이 높다는 전제 하에 **유지가 기본값**이다.

## 2. 예외 인정 기준 (아래 중 최소 2개 충족 시에만 예외 후보로 승격)

- 완전 중복 데이터 소스(동일 `lib/*-service.ts` 또는 동일 콘텐츠 원천 사용)
- 양쪽 모두 sitemap 색인 대상이며 헤드 키워드가 겹침(카니발라이제이션)
- canonical 태그만으로 해결 불가한 구조적 중복(양쪽 다 고유 크롤링 표면을 갖고 있어 한쪽만 canonical
  지정으로는 부족)
- 실제 검색 순위/유입 데이터로 확인된 상호 잠식(현재는 GSC 미연동으로 이 근거는 사용 불가 —
  §3 예외는 코드 구조 근거만으로 후보 등록됨)

## 3. 확인된 예외 케이스

### `/famous-saju` vs `/insights/famous-saju`

| 항목 | 내용 |
|---|---|
| 중복 근거 | 둘 다 `lib/famous-saju/celebrity-saju-service.ts`의 `publishedCelebritySajuSeeds`를 사용. 둘 다 `scripts/generate-sitemap.mjs`에서 색인 허브로 등록(priority 0.88/0.89). 둘 다 상세는 `/insights/famous-saju/[slug]`를 가리키며 상세 자체는 noindex(정상) |
| 차이점 | `/famous-saju`는 카테고리별 정적 그리드, `/insights/famous-saju`는 검색+태그 필터(클라이언트 사이드). `/famous-saju/category/*`는 `/insights/famous-saju`가 대체 못 하는 고유 크롤링 URL 보유 |
| AdSense 정책 | `app/components/adsense-route-policy.js`가 **둘 다 명시적으로 광고 대상**으로 설계(주석: "`/insights/famous-saju` 허브는 계속 광고·색인 대상") — 우연한 중복이 아니라 의도된 설계일 가능성 |
| 후보 조치 | A. 하나를 canonical + 301 / B. 하나를 noindex + canonical 태그 / C. 차별화 후 유지 |
| 권장안 | **이번 세션 범위에서는 결정하지 않는다.** noindex 전환 시 `verify:adsense-readiness`의 "AdSense 대상은 self-canonical, noindex 금지" 단언과 충돌하므로 `adsense-route-policy.js`+`generate-sitemap.mjs`+canonical 로직을 동시에 조정해야 하는 다중 파일 변경이 필요하다. 실측 GSC 데이터로 어느 쪽이 실제 랭크되는지 확인 후 별도 세션에서 판단 |
| 확정 여부 | **미확정 — GSC 데이터 확보 대기** |
| 임시 완화 조치 | 두 허브 간 상호 링크 추가(별도 PR, 인덱서빌리티·sitemap·AdSense 정책 미변경) |

## 4. 대기 중 예외 후보

[01-audit-framework.md](01-audit-framework.md)의 전수 재검토가 진행되면 이 표에 append한다. 현재는
famous-saju 1건만 확인됨.

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-11 | 최초 작성. famous-saju 예외 케이스 조사·기록, 통합 보류 결정과 근거 명시 |
