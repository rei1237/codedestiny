const MANSIONS_27 = [
  { ko: "각", han: "角" }, { ko: "항", han: "亢" }, { ko: "저", han: "氐" }, { ko: "방", han: "房" },
  { ko: "심", han: "心" }, { ko: "미", han: "尾" }, { ko: "기", han: "箕" }, { ko: "두", han: "斗" },
  { ko: "여", han: "女" }, { ko: "허", han: "虛" }, { ko: "위", han: "危" }, { ko: "실", han: "室" },
  { ko: "벽", han: "壁" }, { ko: "규", han: "奎" }, { ko: "루", han: "婁" }, { ko: "위", han: "胃" },
  { ko: "묘", han: "昴" }, { ko: "필", han: "畢" }, { ko: "자", han: "觜" }, { ko: "삼", han: "參" },
  { ko: "정", han: "井" }, { ko: "귀", han: "鬼" }, { ko: "류", han: "柳" }, { ko: "성", han: "星" },
  { ko: "장", han: "張" }, { ko: "익", han: "翼" }, { ko: "진", han: "軫" },
];

const SEGMENT_ANGLE = 360 / 27;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner = polarToCartesian(cx, cy, innerR, endAngle);
  const sweep = ((endAngle - startAngle + 360) % 360);
  const largeArcFlag = sweep > 180 ? 1 : 0;
  return `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)} L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)} Z`;
}

function segmentAngles(index: number) {
  const idx = ((index % 27) + 27) % 27;
  return { startAngle: idx * SEGMENT_ANGLE, endAngle: (idx + 1) * SEGMENT_ANGLE, midAngle: idx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 };
}

function relationFromDistance(distance: number): { short: string; color: string } {
  const d = ((distance % 27) + 27) % 27;
  if (d === 0) return { short: "명", color: "rgba(250,204,21,0.45)" };
  if (d === 9) return { short: "업", color: "rgba(248,113,113,0.45)" };
  if (d === 18) return { short: "태", color: "rgba(251,146,60,0.45)" };
  if ([1, 10, 19].includes(d)) return { short: "영", color: "rgba(16,185,129,0.42)" };
  if ([8, 17, 26].includes(d)) return { short: "친", color: "rgba(34,197,94,0.42)" };
  if ([2, 11, 20].includes(d)) return { short: "우", color: "rgba(56,189,248,0.42)" };
  if ([7, 16, 25].includes(d)) return { short: "쇠", color: "rgba(96,165,250,0.42)" };
  if ([3, 12, 21].includes(d)) return { short: "안", color: "rgba(244,114,182,0.42)" };
  if ([6, 15, 24].includes(d)) return { short: "괴", color: "rgba(239,68,68,0.42)" };
  if ([4, 13, 22].includes(d)) return { short: "성", color: "rgba(167,139,250,0.42)" };
  if ([5, 14, 23].includes(d)) return { short: "위", color: "rgba(129,140,248,0.42)" };
  return { short: "우", color: "rgba(56,189,248,0.4)" };
}

function indexOfHanja(hanja: string): number | null {
  const idx = MANSIONS_27.findIndex((m) => m.han === hanja);
  return idx >= 0 ? idx : null;
}

export default function SukuyoWheel({
  myHanja,
  partnerHanja,
  relationLabel,
  className = "",
}: {
  myHanja: string;
  partnerHanja?: string;
  relationLabel?: string;
  className?: string;
}) {
  const myIdx = indexOfHanja(myHanja);
  if (myIdx == null) return null;
  const partnerIdx = partnerHanja ? indexOfHanja(partnerHanja) : null;
  const hasPartner = partnerIdx != null;

  const cx = 210;
  const cy = 210;
  const outerOuterR = 198;
  const outerInnerR = 154;
  const relOuterR = 152;
  const relInnerR = 112;
  const centerR = 80;

  const myMid = segmentAngles(myIdx).midAngle;
  const myIn = polarToCartesian(cx, cy, centerR + 6, myMid);
  const myOut = polarToCartesian(cx, cy, outerOuterR - 3, myMid);
  const partnerMid = hasPartner ? segmentAngles(partnerIdx).midAngle : null;

  return (
    <svg viewBox="0 0 420 420" className={className} role="img" aria-label="27수 궁합 명반">
      <defs>
        <radialGradient id="syWheelBg" cx="50%" cy="46%" r="72%">
          <stop offset="0%" stopColor="rgba(30,41,59,0.94)" />
          <stop offset="100%" stopColor="rgba(2,6,23,0.98)" />
        </radialGradient>
        <radialGradient id="syWheelCenter" cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="rgba(79,70,229,0.24)" />
          <stop offset="100%" stopColor="rgba(15,23,42,0.95)" />
        </radialGradient>
        <filter id="syWheelGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx={cx} cy={cy} r={outerOuterR} fill="url(#syWheelBg)" stroke="rgba(196,181,253,0.22)" strokeWidth="1" />

      {MANSIONS_27.map((mansion, i) => {
        const rel = relationFromDistance(hasPartner ? i - myIdx : 0);
        const ang = segmentAngles(i);
        let outerFill = "rgba(15,23,42,0.64)";
        let outerStroke = "rgba(148,163,184,0.24)";
        let outerStrokeWidth = 0.9;
        if (i === myIdx) {
          outerFill = "rgba(250,204,21,0.25)";
          outerStroke = "rgba(250,204,21,0.92)";
          outerStrokeWidth = 2;
        } else if (hasPartner && i === partnerIdx) {
          outerFill = "rgba(226,232,240,0.2)";
          outerStroke = "rgba(226,232,240,0.84)";
          outerStrokeWidth = 1.8;
        }
        const outerPath = describeArc(cx, cy, outerInnerR, outerOuterR, ang.startAngle, ang.endAngle);
        const relPath = describeArc(cx, cy, relInnerR, relOuterR, ang.startAngle, ang.endAngle);
        const txtPos = polarToCartesian(cx, cy, (outerOuterR + outerInnerR) / 2, ang.midAngle);
        const relPos = polarToCartesian(cx, cy, (relOuterR + relInnerR) / 2, ang.midAngle);
        return (
          <g key={mansion.han}>
            <path d={outerPath} fill={outerFill} stroke={outerStroke} strokeWidth={outerStrokeWidth}>
              <title>{`${i + 1}수 ${mansion.ko}(${mansion.han})`}</title>
            </path>
            {hasPartner && <path d={relPath} fill={rel.color} stroke="rgba(148,163,184,0.18)" strokeWidth="0.8" />}
            <text x={txtPos.x} y={txtPos.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(248,250,252,0.92)" fontSize="12" fontWeight="700">
              {mansion.han}
            </text>
            {hasPartner && (
              <text x={relPos.x} y={relPos.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(226,232,240,0.92)" fontSize="8.6" fontWeight="700">
                {rel.short}
              </text>
            )}
          </g>
        );
      })}

      {Array.from({ length: 27 }, (_, b) => {
        const ba = segmentAngles(b).startAngle;
        const p1 = polarToCartesian(cx, cy, relInnerR, ba);
        const p2 = polarToCartesian(cx, cy, outerOuterR, ba);
        return <line key={b} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(148,163,184,0.2)" strokeWidth="0.6" />;
      })}

      <line x1={myIn.x} y1={myIn.y} x2={myOut.x} y2={myOut.y} stroke="rgba(250,204,21,0.95)" strokeWidth="1.8" />

      {hasPartner && partnerMid != null && (
        <>
          {(() => {
            const pIn = polarToCartesian(cx, cy, centerR + 6, partnerMid);
            const pOut = polarToCartesian(cx, cy, outerOuterR - 3, partnerMid);
            return <line x1={pIn.x} y1={pIn.y} x2={pOut.x} y2={pOut.y} stroke="rgba(226,232,240,0.92)" strokeWidth="1.5" />;
          })()}
          {partnerIdx !== myIdx && (() => {
            const linkA = polarToCartesian(cx, cy, centerR - 10, myMid);
            const linkB = polarToCartesian(cx, cy, centerR - 10, partnerMid);
            return (
              <path
                d={`M ${linkA.x.toFixed(2)} ${linkA.y.toFixed(2)} Q ${cx} ${cy} ${linkB.x.toFixed(2)} ${linkB.y.toFixed(2)}`}
                stroke="rgba(167,139,250,0.9)" strokeWidth="1.8" fill="none" strokeLinecap="round" filter="url(#syWheelGlow)"
              />
            );
          })()}
        </>
      )}

      <circle cx={cx} cy={cy} r={centerR} fill="url(#syWheelCenter)" stroke="rgba(196,181,253,0.36)" strokeWidth="1.1" />
      <text x={cx} y={cy - 28} textAnchor="middle" fill="rgba(196,181,253,0.92)" fontSize="10" fontWeight="800">27숙 원형 차트</text>
      <text x={cx} y={cy - 7} textAnchor="middle" fill="rgba(250,204,21,0.96)" fontSize="13" fontWeight="900">
        본명숙 {MANSIONS_27[myIdx].ko}({MANSIONS_27[myIdx].han})
      </text>
      {hasPartner && partnerIdx != null ? (
        <>
          <text x={cx} y={cy + 13} textAnchor="middle" fill="rgba(226,232,240,0.96)" fontSize="11" fontWeight="800">
            상대숙 {MANSIONS_27[partnerIdx].ko}({MANSIONS_27[partnerIdx].han})
          </text>
          <text x={cx} y={cy + 32} textAnchor="middle" fill="rgba(216,180,254,0.95)" fontSize="10" fontWeight="700">
            관계: {relationLabel || ""}
          </text>
        </>
      ) : (
        <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(226,232,240,0.88)" fontSize="10">
          상대 정보 입력 시 궁합선이 표시됩니다
        </text>
      )}
    </svg>
  );
}
