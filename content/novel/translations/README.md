# 라이트 노벨 직접 번역판

2026-11-09 개고 원문에 맞춰 영어·일본어·중국어 간체·번체 73화, 언어당 7,928비트를 오프라인 조립했다. 자동 번역 API는 사용하지 않는다.

- 원문과 번역의 ID·순서·부가 문구·sourceHash가 모두 맞을 때만 빌드가 게시한다.
- 직접 저작 원본은 authored/ 아래 언어별 파일이다. 언어별 프롤로그 파일을 사용하고 옛 공용 prologue-*.json은 같은 조립에 넣지 않는다.
- 용어집·재조립 규칙·검수 수치는 docs/webnovel_review/vn-translation-finish-2026-11-09.md에 있다.
- 검증: node scripts/verify-novel-locale-completeness.mjs, npm run novel:build, npm run verify:story-sync.
- 언어 정책 정본은 lib/stories/vn/locales.mjs. 상담 언어와 소설 언어는 분리한다.
