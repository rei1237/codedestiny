// 액땜 카드 화자 그림의 고정 틀(2026-11-27 R1). React 카드와 정적 렌더러가 함께 쓴다.
// 픽셀은 public/ 원본 실측값이다(sharp). 비율 상자와 width·height 속성으로 그림이 늦게 와도 자리가 밀리지 않는다.
// fit 'cutout' 은 배경이 투명한 그림(아래 맞춤 contain), 'card' 는 배경이 불투명한 그림(cover + 테두리)이다.
// 같은 화자의 두 표정(explain·caution)은 크기가 같다. 그림을 바꾸면 이 표와 __tests__/ui/remedy-case-cards 를 함께 고친다.

export const REMEDY_IMAGE_FRAMES = Object.freeze({
  yeoni: Object.freeze({ width: 384, height: 512, fit: 'cutout' }),
  'yeoni-saju': Object.freeze({ width: 320, height: 320, fit: 'cutout' }),
  yeongnyangi: Object.freeze({ width: 270, height: 360, fit: 'cutout' }),
  neo: Object.freeze({ width: 480, height: 720, fit: 'cutout' }),
  musung: Object.freeze({ width: 480, height: 480, fit: 'card' }),
});

/** 화자 키의 그림 틀. 모르는 키는 연이 틀. */
export function remedyImageFrame(narrator) {
  return Object.prototype.hasOwnProperty.call(REMEDY_IMAGE_FRAMES, narrator) ? REMEDY_IMAGE_FRAMES[narrator] : REMEDY_IMAGE_FRAMES.yeoni;
}
