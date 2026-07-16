// 나크샤트라 결정판 — 동양 27宿 ↔ 인도 27 Nakshatra 크로스워크 (IP 핵심)
//
// [저작 근거 — 사용자 검수 대상]
// 이 대응표는 "결정성(determinative star) 기준" 학술 대응이다. 두 체계는 역사적으로
// 동일한 황도 27분할에서 파생했고, 대표 별(결정성)이 정렬된다:
//   - 角(각) = Chitra   : 둘 다 스피카(α Vir)
//   - 亢(항) = Swati    : 아르크투루스 인근
//   - 心(심) = Jyeshtha : 둘 다 안타레스(α Sco)
//   - 昴(묘) = Krittika : 둘 다 플레이아데스
//   - 畢(필) = Rohini   : 둘 다 알데바란/히아데스
//
// [牛/Abhijit 이음새]
// 중국 28宿에는 牛(우)가 있으나, 본 서비스의 숙요점은 27宿 체계로 牛를 제외한다
// (MANSIONS_27/SUKUYO_MANSIONS 모두 27개, 牛 없음). 인도 27 나크샤트라 역시
// "28번째" Abhijit을 제외한다. 양쪽이 같은 여분(牛/Abhijit)을 덜어냈기에 나머지
// 27:27이 **일정 오프셋의 전단사**로 맞아떨어진다:  nakshatraIdx = (sukuyoIdx + 13) mod 27.
// 아래 표는 그 결과를 한 행씩 명시(감사·검수 가능)하며, 오프셋은 CROSSWALK_OFFSET 로도 노출한다.
//
// ⚠ 주의: 이 표는 "체계 간 순서 대응"이지, "한 사람의 음력-룩업 숙(S)이 항상 시데리얼
//   나크샤트라(N)와 (S+13)%27로 일치한다"는 뜻이 아니다. 두 계산은 서로 다른 천문
//   (숙요=음력 룩업, 나크샤트라=시데리얼 황경)이라 경계일에는 갈릴 수 있고, 그 갈림을
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

// 결정성 대응의 구조적 오프셋: nakshatraIdx = (sukuyoIdx + CROSSWALK_OFFSET) % 27.
const CROSSWALK_OFFSET = 13;

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

// 결정성 앵커(검수·검증용) — 이 쌍들은 대표 별이 물리적으로 정렬되므로 표가 틀리면 여기서 깨진다.
const CROSSWALK_ANCHORS = Object.freeze([
  { sukuyoHan: "角", nakshatraEn: "Chitra" },
  { sukuyoHan: "亢", nakshatraEn: "Swati" },
  { sukuyoHan: "心", nakshatraEn: "Jyeshtha" },
  { sukuyoHan: "昴", nakshatraEn: "Krittika" },
  { sukuyoHan: "畢", nakshatraEn: "Rohini" },
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
 * 한 사람의 음력-도출 숙(sukuyoIdx)과 시데리얼-도출 나크샤트라(nakshatraIdx)가
 * 크로스워크 상 일치하는지 판정한다.
 *  - expectedNakshatraIdx: 숙요 기준 기대 나크샤트라((S+13)%27)
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
