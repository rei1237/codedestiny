# 0단계 추가 발견: 58~61화 orphan 배열 버그

`lib/stories/data.ts`의 `mockStories` 배열은 `Array<IStory | IChapter>` 타입으로, `Code Destiny` 스토리 메타 객체 뒤에 58~61화(`code-destiny-chapter-58`~`61`) 완성 원고 4개가 잘못 들어가 있었다.

그러나 실제 서빙 함수 `getChaptersByStoryId()`(`lib/stories/data.ts`)는 `mockChapters` 배열만 조회하며, `mockStories`에 섞여 있던 이 4개 회차는 `mockChapters`에 없어 `getChapter()`가 찾지 못하고 `notFound()`가 호출됨 — 즉 58~61화(완결부 4개 회차, 원고 자체는 완성되어 있었음)가 사이트에서 404로 표시되고 있었다.

**조치**: 이 4개 챕터 객체를 `mockStories`에서 제거하고 `mockChapters` 배열의 57화 뒤(정렬 순서상 올바른 위치)로 이동. 스텁 복구(14~44화)와 성격이 같은 기계적 데이터 무결성 수정이라 별도 승인 없이 0단계에 포함해 처리함.

**검증**: `npm run typecheck` 통과, 로컬 dev 서버에서 `/stories/code-destiny/chapter-58`~`chapter-61` 4개 모두 200 응답 및 정상 제목 렌더링 확인 (수정 전에는 4개 전부 not-found 페이지가 렌더링되고 있었음).
