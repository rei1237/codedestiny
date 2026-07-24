/**
 * 작은 성좌 마크 — 유니코드 룬(✦◇✧) 대체. 3~4개 별점 + 연결선, 세계관 통일.
 * variant 로 별자리 모양을 바꾸고 tone(색)으로 축/노드에 연동한다. 순수 프레젠테이션.
 */

export type ConstellationVariant = 0 | 1 | 2 | 3 | 4 | 5;

interface ConstellationMarkProps {
  variant?: ConstellationVariant;
  tone?: string;
  size?: number;
  className?: string;
}

// 각 변주의 별점 좌표(16x16 viewBox). 마지막 점은 하이라이트(살짝 큼).
const SHAPES: Array<Array<[number, number, number]>> = [
  [[3, 12, 1.2], [8, 5, 1.5], [13, 10, 1.2], [8, 5, 0]], // 삼각
  [[4, 5, 1.2], [11, 4, 1.3], [8, 12, 1.7]], // 위→아래
  [[3, 8, 1.3], [8, 3, 1.2], [13, 7, 1.3], [9, 13, 1.5]], // 마름모풍
  [[4, 11, 1.4], [7, 6, 1.2], [12, 4, 1.6]], // 상승 사선
  [[3, 4, 1.2], [8, 8, 1.6], [13, 12, 1.2]], // 대각
  [[8, 3, 1.5], [4, 10, 1.2], [12, 10, 1.2], [8, 14, 1.2]], // 십자풍
];

export function ConstellationMark({ variant = 0, tone = "#e8d5a3", size = 16, className }: ConstellationMarkProps) {
  const pts = SHAPES[variant % SHAPES.length];
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ display: "block", overflow: "visible", color: tone }}
    >
      <path d={line} stroke="currentColor" strokeWidth="0.7" strokeLinejoin="round" opacity="0.5" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={p[2] || 1.9} fill="currentColor" opacity={p[2] ? 0.95 : 0.6} />
      ))}
    </svg>
  );
}
