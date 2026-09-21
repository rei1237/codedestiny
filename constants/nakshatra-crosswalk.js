// 나크샤트라 결정판 — 동양 27宿 ↔ 인도 27 Nakshatra 크로스워크 (IP 핵심)
//
// [저작 근거 — 사용자 검수 대상]
// 이 대응표는 런타임의 공통 달 황경 좌표를 동양 27숙과 인도 27 나크샤트라로
// 읽을 때 사용하는 순서 대응이다. 본명숙은 Swiss 항성 달 황경의 27등분에서
// 계산되므로, 두 체계의 인덱스 관계도 동일한 황경 좌표에서 파생되어야 한다.
//
// [27개 배열의 서비스 정렬]
// 본 서비스의 숙요 배열은 牛(우)가 없는 27개이고, 베다 계산은 Abhijit을 제외한
// 27개 균등 구간을 쓴다. 두 목록이 모두 27개라는 사실만으로 항목별 역사적 동일성이
// 성립하지는 않는다. 아래 전단사는 같은 런타임 황경에서 나온 두 서비스 인덱스를 비교하기
// 위한 제품 규칙이다: nakshatraIdx = (sukuyoIdx + 11) mod 27.
// 역사 문헌의 대표 별 대응표와 구분하며, 오프셋은 CROSSWALK_OFFSET 로 노출한다.
//
// ⚠ 주의: 이 표는 공통 황경 좌표의 "체계 간 순서 대응"이다. 런타임 본명숙은 음력 일자
//   룩업이 아니라 입력 시각의 Swiss 항성 달 황경에서 계산하며, 나크샤트라의 실제
//   황경 인덱스와 이 좌표 대응을 혼동하지 않는다. 경계·불일치는
//   judgeCrosswalkMatch()가 divergence(병기) 신호로 판정한다.

import { NAKSHATRA_ATTRIBUTES } from "./nakshatra-attributes.js";

// 숙요 27수(角~軫) 한글/한자 — lib/sukuyo-engine-server.ts MANSIONS_27 와 동일 순서.
// index 10 위(危)와 15 위(胃)는 한글이 같으므로 한자로 구별한다.
const SUKUYO_27 = [
  { ko: "각", han: "角" }, { ko: "항", han: "亢" }, { ko: "저", han: "氐" },
  { ko: "방", han: "房" }, { ko: "심", han: "心" }, { ko: "미", han: "尾" },
  { ko: "기", han: "箕" }, { ko: "두", han: "斗" }, { ko: "여", han: "女" },
  { ko: "허", han: "虛" }, { ko: "위", han: "危" }, { ko: "실", han: "室" },
  { ko: "벽", han: "壁" }, { ko: "규", han: "奎" }, { ko: "루", han: "婁" },
  { ko: "위", han: "胃" }, { ko: "묘", han: "昴" }, { ko: "필", han: "畢" },
  { ko: "자", han: "觜" }, { ko: "삼", han: "參" }, { ko: "정", han: "井" },
  { ko: "귀", han: "鬼" }, { ko: "류", han: "柳" }, { ko: "성", han: "星" },
  { ko: "장", han: "張" }, { ko: "익", han: "翼" }, { ko: "진", han: "軫" },
];

// 공통 달 황경 매퍼의 원점(숙요 +16)에 대응하는 역방향 오프셋: 16 + 11 = 27.
const CROSSWALK_OFFSET = 11;

// 27 크로스워크 엔트리(명시). nakshatraIdx는 오프셋으로 도출하되 표로 고정해 감사 가능하게 둔다.
const NAKSHATRA_CROSSWALK = SUKUYO_27.map((suk, sukuyoIdx) => {
  const nakshatraIdx = (sukuyoIdx + CROSSWALK_OFFSET) % 27;
  const nak = NAKSHATRA_ATTRIBUTES[nakshatraIdx];
  return {
    sukuyoIdx,
    sukuyoKo: suk.ko,
    sukuyoHan: suk.han,
    nakshatraIdx,
    nakshatraEn: nak.nameEn,
    nakshatraKo: nak.nameKo,
  };
});

// 공통 황경 좌표 앵커(검수·검증용) — 실제 계산 매퍼와 표의 전단사 관계를 고정한다.
const CROSSWALK_ANCHORS = Object.freeze([
  { sukuyoHan: "角", nakshatraEn: "Uttara Phalguni" },
  { sukuyoHan: "亢", nakshatraEn: "Hasta" },
  { sukuyoHan: "心", nakshatraEn: "Vishakha" },
  { sukuyoHan: "昴", nakshatraEn: "Ashwini" },
  { sukuyoHan: "畢", nakshatraEn: "Bharani" },
]);

function clampIdx27(index) {
  const n = Number(index);
  if (!Number.isFinite(n)) return null;
  return ((Math.floor(n) % 27) + 27) % 27;
}

// 숙요 인덱스 → 대응 나크샤트라 크로스워크 엔트리.
function crosswalkFromSukuyo(sukuyoIdx) {
  const idx = clampIdx27(sukuyoIdx);
  return idx == null ? null : NAKSHATRA_CROSSWALK[idx];
}

// 나크샤트라 인덱스 → 대응 숙요 크로스워크 엔트리(역방향).
function crosswalkFromNakshatra(nakshatraIdx) {
  const idx = clampIdx27(nakshatraIdx);
  if (idx == null) return null;
  return NAKSHATRA_CROSSWALK.find((e) => e.nakshatraIdx === idx) || null;
}

// 최소 순환 거리(0~13). 경계일 갈림 폭 판정에 사용.
function circularDistance27(a, b) {
  const forward = ((b - a) % 27 + 27) % 27;
  return Math.min(forward, 27 - forward);
}

/**
 * 한 사람의 공통 항성 달 황경에서 도출한 숙요(sukuyoIdx)와
 * 나크샤트라(nakshatraIdx)가 크로스워크 상 일치하는지 판정한다.
 *  - expectedNakshatraIdx: 숙요 기준 기대 나크샤트라((S+11)%27)
 *  - match: 기대 == 실제
 *  - deltaSteps: 두 체계가 갈린 최소 스텝(0=일치, 1=경계일 인접 등)
 *  - boundary: 불일치(=경계일 병기 필요) 여부
 */
function judgeCrosswalkMatch(sukuyoIdx, nakshatraIdx) {
  const s = clampIdx27(sukuyoIdx);
  const n = clampIdx27(nakshatraIdx);
  if (s == null || n == null) return null;
  const expectedNakshatraIdx = (s + CROSSWALK_OFFSET) % 27;
  const match = expectedNakshatraIdx === n;
  const deltaSteps = circularDistance27(expectedNakshatraIdx, n);
  return {
    sukuyoIdx: s,
    nakshatraIdx: n,
    expectedNakshatraIdx,
    match,
    deltaSteps,
    boundary: !match,
  };
}

export {
  NAKSHATRA_CROSSWALK,
  CROSSWALK_OFFSET,
  CROSSWALK_ANCHORS,
  SUKUYO_27,
  clampIdx27,
  crosswalkFromSukuyo,
  crosswalkFromNakshatra,
  judgeCrosswalkMatch,
};
