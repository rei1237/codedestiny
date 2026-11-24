// 대표 상담 3종(연애 비책·신년운세·인생의 책) 도화서원식 고급화 롤백 스위치(2026-11-24 사용자 요청).
// MASTER_MOTION_ENABLED·guided-flow 플래그와 같은 코드 상수 방식이다(클라이언트 원격 플래그 계층은 레포에 없다).
// false 로 바꾸고 배포하면 그 화면은 이 작업 이전 렌더링(같은 DOM) 그대로 돌아간다. 결제·이용권·저장 형식은 어느 쪽에서도 바뀌지 않는다.

/** 상세 이야기 화면(/consultations/<slug>/) 첫 행동 아래 마스터 모션 띠·달빛 예화 카드·신뢰 한 줄. 아래 슬러그만. */
export const FLAGSHIP_DETAIL_PREMIUM_ENABLED = false;

/** 결과 화면 챕터 리더(표지 띠·고정 목차·모바일 하단 시트·이전/다음 장·글자 크기). 저장된 원본을 표시만 한다. */
export const FLAGSHIP_CHAPTER_READER_ENABLED = false;

/** 고급화 대상 상세 슬러그(lib/records/service-registry.js 의 id). 다른 상담 이야기 화면은 그대로다. */
export const FLAGSHIP_PREMIUM_SLUGS = Object.freeze(["love-secret", "new-year", "life-book"]);
