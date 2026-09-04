/* 달빛 예화 씬·모티프 렌더러 — 경로는 전부 ./yehwaScene.generated 가 소유한다.
 * 🔴 "use client" 를 붙이지 않는다 — 훅·상태가 없어 서버 섹션과 클라이언트 히어로가 같이 쓴다.
 *    (SukuyoNarrativeSections.tsx 는 서버 컴포넌트다.)
 * 🔴 SVG 안에 title 요소를 만들지 않는다 — __tests__/ui/svg-title-not-document-title.static.test.js.
 *    장식이므로 호출부가 aria-hidden 을 건다.
 */
import type { YehwaFill, YehwaMotif, YehwaScene, YehwaStroke } from "./yehwaScene.generated";
import { YEHWA_KNOCK } from "./yehwaScene.generated";

/** 잉크는 CSS 변수를 먼저 본다 — 색은 소비 측(CSS 모듈)이 소유한다. */
const INK: Record<string, string> = {
  gold: "var(--sk-ink-gold, #e8d5a3)",
  violet: "var(--sk-ink-violet, #c4b5fd)",
  ivory: "var(--sk-ink-ivory, #f4e6c8)",
};
const inkOf = (ink?: string) => INK[ink ?? "gold"] ?? INK.gold;

export type YehwaSceneClasses = {
  root?: string;
  aura?: string;
  moon?: string;
  halo?: string;
  link?: string;
  spark?: string;
};

function strokePath(p: YehwaStroke, i: number, scale: number, className?: string) {
  return (
    <path
      key={i}
      className={className}
      d={p.d}
      fill="none"
      stroke={inkOf(p.ink)}
      strokeOpacity={p.a}
      strokeWidth={p.w * scale}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function fillPath(p: YehwaFill, i: number, className?: string) {
  return <path key={i} className={className} d={p.d} fill={inkOf(p.ink)} fillOpacity={p.a} />;
}

/** 앞선 실루엣을 굵은 검은 획으로 다시 그려 뒤 선을 끊는 오클루전 사본. */
function knockGroup(id: string, paths: YehwaStroke[], scale: number) {
  return (
    <g id={id}>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke="#000"
          strokeWidth={(p.w + YEHWA_KNOCK) * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

export function YehwaSceneArt({
  scene,
  idPrefix,
  classes = {},
}: {
  scene: YehwaScene;
  /** 🔴 useId() 는 콜론을 뱉어 url(#…) 안에서 위험하다 — 고정 접두사를 넘긴다. */
  idPrefix: string;
  classes?: YehwaSceneClasses;
}) {
  const [vx, vy, vw, vh] = scene.viewBox.split(" ").map(Number);
  const s = scene.strokeScale;
  const id = (name: string) => `${idPrefix}-${name}`;
  const frame = <rect x={vx} y={vy} width={vw} height={vh} fill="#fff" />;

  return (
    <svg className={classes.root} viewBox={scene.viewBox} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={id("aura")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f4e6c8" stopOpacity="0.5" />
          <stop offset="46%" stopColor="#e8d5a3" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("moon")} cx="36%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#fffaef" />
          <stop offset="52%" stopColor="#f2e2bc" />
          <stop offset="100%" stopColor="#c9b48a" />
        </radialGradient>
        {knockGroup(id("oF"), scene.flowers, s)}
        {knockGroup(id("oL"), scene.leaves, s)}
        {knockGroup(id("oB"), scene.branches, s)}
        <mask id={id("mL")} maskUnits="userSpaceOnUse" x={vx} y={vy} width={vw} height={vh}>
          {frame}
          <use href={`#${id("oF")}`} />
        </mask>
        <mask id={id("mB")} maskUnits="userSpaceOnUse" x={vx} y={vy} width={vw} height={vh}>
          {frame}
          <use href={`#${id("oF")}`} />
          <use href={`#${id("oL")}`} />
        </mask>
        <mask id={id("mK")} maskUnits="userSpaceOnUse" x={vx} y={vy} width={vw} height={vh}>
          {frame}
          <use href={`#${id("oF")}`} />
          <use href={`#${id("oL")}`} />
          <use href={`#${id("oB")}`} />
        </mask>
      </defs>

      {scene.moon ? (
        <g className={classes.moon}>
          <circle className={classes.aura} cx={scene.moon.cx} cy={scene.moon.cy} r={scene.moon.auraR} fill={`url(#${id("aura")})`} />
          {scene.halos.map((h, i) => (
            <circle
              key={i}
              className={classes.halo}
              cx={scene.moon!.cx}
              cy={scene.moon!.cy}
              r={h.r}
              fill="none"
              stroke={INK.gold}
              strokeOpacity={h.a}
              strokeWidth={1 * s}
            />
          ))}
          <circle cx={scene.moon.cx} cy={scene.moon.cy} r={scene.moon.r} fill={`url(#${id("moon")})`} />
        </g>
      ) : null}

      {scene.link ? (
        <g mask={`url(#${id("mK")})`} className={classes.link}>
          <path d={scene.link.soft} fill="none" stroke={INK.violet} strokeOpacity="0.3" strokeWidth={1 * s} strokeLinecap="round" />
          <path d={scene.link.main} fill="none" stroke={INK.gold} strokeOpacity="0.55" strokeWidth={1.2 * s} strokeLinecap="round" />
        </g>
      ) : null}

      <g mask={`url(#${id("mB")})`}>{scene.branches.map((p, i) => strokePath(p, i, s))}</g>
      <g mask={`url(#${id("mL")})`}>{scene.leaves.map((p, i) => strokePath(p, i, s))}</g>
      <g>{scene.flowers.map((p, i) => strokePath(p, i, s))}</g>
      <g>{scene.drifts.map((p, i) => strokePath(p, i, s))}</g>
      <g>{scene.sparks.map((p, i) => fillPath(p, i, classes.spark))}</g>
    </svg>
  );
}

/** 여러 곳에서 같은 모티프를 쓸 때의 스프라이트 — 경로를 한 번만 싣고 <use> 로 부른다.
 *  🔴 색인 대상 HTML 에 인장·가지 띠를 매번 인라인하면 중복 경로만 15KB 가까이 붙는다. */
export function YehwaMotifSprite({ motifs }: { motifs: { id: string; motif: YehwaMotif }[] }) {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", overflow: "hidden" }}>
      <defs>
        {motifs.map(({ id, motif }) => (
          <symbol key={id} id={id} viewBox={motif.viewBox}>
            {motif.strokes.map((p, i) => strokePath(p, i, 1))}
            {motif.fills.map((p, i) => fillPath(p, i))}
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

export function YehwaMotifUse({
  id,
  className,
  width,
  height,
}: {
  id: string;
  className?: string;
  width: number;
  height: number;
}) {
  return (
    <svg className={className} width={width} height={height} aria-hidden="true" focusable="false">
      <use href={`#${id}`} />
    </svg>
  );
}

/** 인장·가지 띠·다리 같은 단품 모티프. 획 굵기는 생성기 값을 그대로 쓴다. */
export function YehwaMotifArt({
  motif,
  className,
  width,
  height,
  strokeScale = 1,
}: {
  motif: YehwaMotif;
  className?: string;
  width?: number;
  height?: number;
  strokeScale?: number;
}) {
  return (
    <svg
      className={className}
      viewBox={motif.viewBox}
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      {motif.strokes.map((p, i) => strokePath(p, i, strokeScale))}
      {motif.fills.map((p, i) => fillPath(p, i))}
    </svg>
  );
}
