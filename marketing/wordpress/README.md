# WordPress 운세 신문 운영

WordPress는 서비스 안 인사이트를 복제하는 보조 저장소가 아니라, 한 가지 검색 질문을 더 깊게 풀고 Code Destiny의 관련 기능으로 연결하는 공개 신문이다.

## 발행 후 흐름

1. WordPress 편집기에서 제목, 본문, 출처, 관련 Code Destiny 링크를 확인하고 직접 발행한다.
2. `npm run marketing:wordpress:sync`로 공개 API의 발행물을 로컬 레지스트리에 반영한다.
3. `npm run verify:wordpress-publications`로 공개 글, 날짜 정렬, 서비스 연결을 검증한다.
4. `/insights/`의 최신 글 영역과 `/admin/wordpress/`의 공개 글 목록을 확인한다.
5. Search Console, 네이버 서치어드바이저, WordPress 통계에서 색인과 유입을 관측한다.

공개 글 원문은 WordPress에서만 수정한다. 저장소에는 제목, 요약, 발행일, 공개 URL, 본문 길이와 서비스 연결만 보관하며 전문을 복제하지 않는다.

## 명령

- `npm run marketing:wordpress:sync`: 공개 API를 읽어 `lib/marketing/wordpress-publications.generated.json`을 갱신한다.
- `npm run verify:wordpress-publications`: 네트워크 없이 저장된 레지스트리를 검증한다.
- `npm run verify:wordpress-publications:live`: 공개 API와 저장된 레지스트리의 차이를 확인한다.

초안은 공개 API에 나타나지 않는다. `2026-10-21/draft-status.json`은 해당 날짜에 확인한 편집 대기 목록이며, 현재 상태는 WordPress 편집기에서 다시 확인한다.
