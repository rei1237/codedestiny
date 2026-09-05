// 관리자 화면 공용 UI 부품의 클래스 정본.
//
// 예전에는 같은 버튼을 화면마다 각자 적었다 — 이름만 달랐지 내용이 같은 톤 헬퍼가 5벌
// (cms·orders 의 buttonClass, content·reviews·feedback 의 commandButtonClass)이었고,
// bg-violet-600 리터럴이 8개 파일에 흩어져 있었다. 그 사본들이 조금씩 어긋나면서
// 같은 뜻의 버튼이 화면마다 다르게 보였다(위험 버튼이 어떤 곳은 채워지고 어떤 곳은 테두리만).
//
// 실제 색·상태·포커스 규칙은 styles/admin-yehwa.css 에 있고 여기서는 이름만 조립한다.
// 새 화면을 만들 때 Tailwind 색 유틸리티로 버튼을 새로 발명하지 말고 이 헬퍼를 쓴다.

/** 버튼의 의미. neutral 이 기본이며 화면에서 가장 흔하다. */
export type AdminButtonTone =
  | "neutral"
  | "primary"
  | "success"
  | "warn"
  | "danger"
  /** 보상 지급 전용(버그 제보 화면). 밝은 앰버 + 어두운 글자라 다른 톤과 규칙이 반대다. */
  | "gift";

const TONE_CLASS: Record<AdminButtonTone, string> = {
  neutral: "cd-adm-btn--ghost",
  primary: "cd-adm-btn--primary",
  success: "cd-adm-btn--success",
  warn: "cd-adm-btn--warn",
  danger: "cd-adm-btn--danger",
  gift: "cd-adm-btn--gift",
};

/**
 * 관리자 버튼 클래스.
 * @param tone 버튼의 의미. 생략하면 neutral.
 * @param options.size 표 행 끝처럼 좁은 자리는 "sm", 화면의 주 행동은 "lg".
 */
export function adminButton(
  tone: AdminButtonTone = "neutral",
  options: { size?: "sm" | "lg" } = {},
): string {
  const size = options.size ? ` cd-adm-btn--${options.size}` : "";
  return `cd-adm-btn ${TONE_CLASS[tone]}${size}`;
}

/**
 * 켜고 끄는 필터 칩(리뷰·버그 제보의 상태 탭).
 * 종전에는 꺼진 칩의 테두리가 slate-700 이라 필드 대비 1.87 로 경계가 보이지 않았다.
 */
export function adminChip(active: boolean): string {
  return active
    ? "cd-adm-btn cd-adm-btn--accent cd-adm-btn--sm"
    : "cd-adm-btn cd-adm-btn--ghost cd-adm-btn--sm";
}

/** 입력·선택·텍스트영역 공통. 테두리 대비와 포커스 링이 여기 한 곳에서 정해진다. */
export const ADMIN_INPUT = "cd-adm-input";

/** 왼쪽에 돋보기 아이콘이 얹히는 검색 입력. 아이콘을 피할 만큼만 왼쪽 여백을 넓힌다. */
export const ADMIN_INPUT_ICON = "cd-adm-input cd-adm-input--icon";

/**
 * 카드·패널의 표면과 테두리. 반경·여백은 각 자리의 유틸리티가 그대로 정한다
 * (`${ADMIN_CARD} rounded-lg p-4`).
 */
export const ADMIN_CARD = "cd-adm-card";

/** 카드 상단 달빛 헤어라인. 화면의 주 패널에만 얹는다 — 필터 바·반복 행·안내 문단에는 쓰지 않는다. */
export const ADMIN_CARD_HAIR = "cd-adm-card--hair";

/**
 * 화면 상단에 붙는 스티키 툴바.
 * 🔴 backdrop-blur 를 함께 쓰지 말 것 — containing block 을 만들어 안쪽 position:fixed 를 가둔다.
 */
export const ADMIN_TOOLBAR = "cd-adm-toolbar";
