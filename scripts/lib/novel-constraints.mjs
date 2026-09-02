// VN 정본과 CMS 오버라이드가 함께 지켜야 하는 대본 제약. 정본은 이 파일 하나다.
//
// 왜 한 곳인가: 같은 값이 build-novel-runtime(정본 빌드) · apply-vn-overrides(CMS 적용) ·
// verify-vn-override-safety(CMS 검사) · verify-cms-registry(관리자 안내) 네 곳에 손으로 복사돼
// 있었고 빌드만 260, 나머지 셋은 250 이었다. 그래서 정본에 255자를 써 넣으면 **빌드는 통과하는데
// 같은 문장을 관리자 화면에서는 영영 못 고치는** 상태가 됐다(2026-09-02 실측).
// 250 으로 맞춘 근거: 정본 8,844비트 중 최장이 238자이고 240자 초과가 0건이라 여유가 12자 남는다.
export const BEAT_MAX_LENGTH = 250;
export const FORBIDDEN_IN_BEAT = ["\"", "\\", "</script"];
export const MIN_KOREAN_PER_EPISODE = 1800;

// 플레이어가 실제로 그리는 값만 허용한다. public/codedestiny-novel.html 의 톤 처리는 "dark"·"desat"
// 두 가지만 클래스로 바꾸고 나머지는 조용히 무시하므로, 오타 난 tone 은 화면이 멀쩡한 채 연출만
// 사라진다. form 은 셸의 FORM_MARKS 표(연이의 모습)가 쓰는 값 집합이다.
export const BEAT_FORMS = new Set(["human", "pig"]);
export const BEAT_TONES = new Set(["dark", "desat"]);
