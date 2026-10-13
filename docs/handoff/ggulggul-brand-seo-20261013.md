---
status: blocked
updated: 2026-10-13
next: 기존 main GA4 CI 실패가 해결됐는지 확인한 뒤 격리 SEO 커밋 검증과 main 통합을 재개한다.
---

# 꿀꿀운세 브랜드 검색 정비

## 요청
카카오 채널명과 맞춰 서비스명을 꿀꿀운세로 복원하고, 첨부 seo-audit·programmatic-seo·content-strategy로 Google·Naver 검색을 개선한다.

## 상태
- 작업 디렉터리: D:/Development/codedestiny-worktrees/ggulggul-brand-seo-20261013-095636
- 변경 커밋: f39680144 (fix(seo): restore Ggulggul Fortune brand signals).
- 브랜치: wt/ggulggul-brand-seo-20261013-095636. main 통합·push·운영 승격 없음.
- 차단: 기준 c96764241 PR CI https://github.com/rei1237/codedestiny/actions/runs/38329231428 의 GA4 static guard 실패. PaymentLoading.tsx의 cross_sell_click 분류 누락. Main drift watchdog·Secret Scan도 실패했으므로 전달 전 별도 확인한다.

## 완료한 변경
웹 제목·메타·WebSite·공통 화면·manifest·공유 이미지·정적 미러를 꿀꿀운세로 통일. 옛 개명 안내를 공식 주소/카카오/이용 FAQ로 교체. URL 955개 집합과 결제·인증·DB·API 정책 유지. 상세와 파일 목록: docs/seo/2026-10-13-ggulggul-brand-search.md.

## 검증
브랜드/공통 화면/후기/보관함 node 검사 19/19, payment-freeze, i18n-public-parity 통과. 로컬 390/1280px 가로 넘침 없음, 이름·구조화 데이터 일치. check:fast는 전체 mock 검사로 승격됐고 다른 세션 검사와 겹쳐 본 Jest RSS 약 4GB에서 중단: 전체 통과 아님. 실 LLM·결제 호출 없음.

추가 확인: 수정한 브랜드 SEO 파일 5개 ESLint 통과. 커밋 f39680144에서 check:pre-push 전체 통과(홈 레지스트리·미러 신선도·사이트맵 955 URL).

## 남은 일
1. 다른 세션 검사 종료와 main CI 복구 확인. 필요 시 최신 main을 이 워크트리에 통합해 이름 충돌 검토.
2. check:fast 및 check:pre-push 결과 확인. 실패는 원인별 구분하며 전체 재검사는 중복 실행하지 않는다.
3. main에 직접 통합→push→최종 CI 1회 확인. 완료 뒤 이 문서 done, 자기 워크트리 배수.
4. 운영 승격은 별도 승인. 반영 이후 GSC/Naver 대표 URL 재수집과 브랜드 질의 지표 확인. 검색 즉시 노출 보장 없음.

## 유지한 이력
카카오 채널/동의 버전, 과거 발행물·검수 해시 원고·스토어 원본은 소급 변경하지 않았다. 브랜드가 남아 있는 이력/별칭은 삭제 대상 아님.
