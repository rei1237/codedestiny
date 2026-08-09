/**
 * 연출 레이어 — 대화 비트 스키마. VN(public/codedestiny-novel.html) 비트 형태를
 * 미러(재사용). 타입 선언만(STEP 5-1). 렌더/파서 가드는 DialoguePlayer(5-4).
 */
export type Speaker =
  | "n"    // 내레이터(연이 보이스오프)
  | "yeon" // 연이(수달)
  | "pig"  // 꽃돼지(연이 변신형)
  | "neo"  // 네오(사자)
  | "duo"; // 두 캐릭터 합창

export interface Beat {
  /** 화자 */
  s: Speaker;
  /** 대사(빈 값이면 연출 전용 비트) */
  t?: string;
  /** 표정 키(§4 매핑) */
  x?: string;
  /** 배경 키 */
  bg?: string;
  /** BGM 키 */
  bgm?: string;
  /** 이펙트(compassGlow/transform/compassSpin/compassLock 등) */
  fx?: string;
  /** 다음 화면 CTA(마지막 비트) */
  goto?: string;
}
