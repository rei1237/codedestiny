import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

/**
 * 자미두수 12궁 전통 4×4 명반 — 지지를 격자 칸에 놓는 배치만 맡는다. 칸 모양·색·문구는 쓰는 쪽(renderCell)이 정한다.
 * 꿀꿀 심화 명반(AdvancedZiweiSectionV2)과 영냥이·연이/네오 상담 근거(app/yeongnyangi/_components/ZiweiReadingChart)가 같이 쓴다.
 * 🔴 행은 minmax(min-content, 1fr) 다 — 1fr 고정 행은 주성 2줄 궁(염정◎/천상◎)의 둘째 줄을 잘라낸다
 *    (375px 실측 clientHeight 71 vs scrollHeight 77). scripts/verify-ziwei-chart-customer-copy.mjs 검사 4가 이 파일을 잠근다.
 */

// 기본 명반 saju-engine.js zw-cell-N 과 같은 배열. 중앙 2×2(2/2~4/4)는 center 로 채우거나 비워 둔다.
// 지지는 한글 글자(ZHI_LIST · 워커 earthlyBranch) 또는 인덱스(자0 … 해11)로 받는다.
export const ZIWEI_BRANCH_GRID_AREA: Record<string, string> = {
  사: "1 / 1", 오: "1 / 2", 미: "1 / 3", 신: "1 / 4",
  진: "2 / 1", 유: "2 / 4",
  묘: "3 / 1", 술: "3 / 4",
  인: "4 / 1", 축: "4 / 2", 자: "4 / 3", 해: "4 / 4",
};
const BRANCH_BY_INDEX = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
export const ZIWEI_CENTER_GRID_AREA = "2 / 2 / 4 / 4";

export function ziweiGridArea(branch: string | number | null | undefined): string | undefined {
  const key = typeof branch === "number" ? BRANCH_BY_INDEX[branch] : branch;
  return key ? ZIWEI_BRANCH_GRID_AREA[key] : undefined;
}

type Props<T> = Omit<HTMLAttributes<HTMLDivElement>, "children" | "style"> & {
  cells: readonly T[];
  branchOf: (cell: T) => string | number | null | undefined;
  /** 칸 요소는 key 와 style(=area)을 직접 받아야 한다 — 감싸는 요소를 더하지 않아 기존 DOM 이 그대로 남는다. */
  renderCell: (cell: T, area: CSSProperties) => ReactNode;
  center?: (area: CSSProperties) => ReactNode;
};

export default function ZiweiPalaceGrid<T>({ cells, branchOf, renderCell, center, ...rest }: Props<T>) {
  return (
    <div
      {...rest}
      style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gridTemplateRows: "repeat(4, minmax(min-content, 1fr))" }}
    >
      {cells.map((cell) => {
        const area = ziweiGridArea(branchOf(cell));
        return area ? renderCell(cell, { gridArea: area }) : null;
      })}
      {center?.({ gridArea: ZIWEI_CENTER_GRID_AREA })}
    </div>
  );
}
