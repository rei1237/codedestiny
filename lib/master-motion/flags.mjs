// 마스터 모션(W4, 2026-11-21 사용자 요청) 롤백 스위치. MOONLIT_LOTUS_ENABLED·guided-flow 플래그와 같은 코드 상수 방식이다.
// false 로 바꾸고 배포하면 MasterMotion 이 감싸던 초상·아바타·전문가 무대가 이전 정적 렌더링(같은 DOM) 그대로 돌아간다.
// 정적 셸 홈(/ggulggul/ 기본 마스터 카드)은 모듈을 공유하지 않으므로 js/core/yehwa-home.mjs 의 같은 이름 상수도 함께 끈다.

/** 대표 상담·전문가 초상의 숨쉬기·흔들림과 꽃잎(꿀꿀)·금빛 별가루(영냥이) 레이어. */
export const MASTER_MOTION_ENABLED = true;
