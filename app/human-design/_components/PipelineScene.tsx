"use client";

// 휴먼 디자인 — "계산 중" 대기 화면.
//
// 🔴 이 화면은 진행 상태를 **주장하지 않는다.** 차트는 /api/human-design/chart 를 한 번 부를
//    뿐이라 클라이언트는 지금 몇 번째 단계인지 알 수 없다. 시간으로 1→8 을 점등하면 그건
//    지어낸 진행률이고, 이 저장소가 세 곳(여기 · worker/routes/human-design.js 의 요구사항 22 ·
//    AnalysisBasisLoading)에 명시로 금지해 둔 것이다. 여기서 움직이는 것은 단계와 무관한
//    순회 펄스뿐이고, 숫자로 보여 주는 것은 **실제로 흐른 시간** 하나다.
// 🔴 그래서 PipelineRail 은 elapsedMs 를 받지 않는다. 200ms 타이머가 SVG 를 다시 그리지 않게
//    하는 동시에, "경과 시간으로 단계를 칠한다"는 코드를 애초에 쓸 수 없게 만든다.
// 🔴 배경 와이어프레임에 결과 화면의 BodyGraph 를 재사용하지 않는다. 그쪽은 줌·팬 상태와
//    1.7초 등장 타임라인을 갖고 있어 장식으로 쓰기엔 무겁다. 좌표만 같은 기하 모듈에서 읽는다.

import { memo } from "react";
import {
  CENTER_SHAPE_LIST,
  CHANNEL_PATH_LIST,
  VIEWBOX,
} from "@/lib/human-design/bodygraph-geometry";
import { UI_TEXT, pick, type Locale } from "../_copy";
import styles from "./pipeline-scene.module.css";

/**
 * 실제 계산 순서. 로딩 화면이 보여 주는 것은 이 순서이고, 진행률 숫자는 만들지 않는다.
 *
 * trigram 은 팔괘의 세 효를 **아래에서 위로** 적은 것이다(1 = 양, 0 = 음). 휴먼 디자인의
 * 64 게이트가 곧 주역 64괘라, 8단계에 선천팔괘(건·태·리·진·손·감·간·곤)를 그대로 얹는다 —
 * 9 센터를 쓰면 8:9 로 하나가 남고, 센터마다 색을 주면 바디그래프의 "색은 두 축만" 계약과
 * 충돌한다(app/human-design/_components/bodygraph.module.css 머리말).
 */
const PIPELINE_STEPS: Array<{
  key: string;
  copyKey: keyof typeof UI_TEXT;
  trigram: readonly [number, number, number];
}> = [
  { key: "BIRTH_DATA", copyKey: "stageBirthData", trigram: [1, 1, 1] },      // 건 ☰
  { key: "TIMEZONE", copyKey: "stageTimezone", trigram: [1, 1, 0] },         // 태 ☱
  { key: "PERSONALITY", copyKey: "stagePersonality", trigram: [1, 0, 1] },   // 리 ☲
  { key: "DESIGN_MOMENT", copyKey: "stageDesignMoment", trigram: [1, 0, 0] },// 진 ☳
  { key: "DESIGN", copyKey: "stageDesign", trigram: [0, 1, 1] },             // 손 ☴
  { key: "GATES", copyKey: "stageGates", trigram: [0, 1, 0] },               // 감 ☵
  { key: "CHANNELS", copyKey: "stageChannels", trigram: [0, 0, 1] },         // 간 ☶
  { key: "CENTERS", copyKey: "stageCenters", trigram: [0, 0, 0] },           // 곤 ☷
];

/** 배경 와이어프레임용 채널 경로. 모듈 로드 때 한 번만 만든다. */
const WIRE_CHANNELS = CHANNEL_PATH_LIST.map((path) => ({
  channelId: path.channelId,
  d: path.control
    ? `M${path.a.x} ${path.a.y}Q${path.control.x} ${path.control.y} ${path.b.x} ${path.b.y}`
    : `M${path.a.x} ${path.a.y}L${path.b.x} ${path.b.y}`,
}));

/** 팔괘 한 벌. 효는 아래에서 위로 쌓이므로 그릴 때는 뒤집어 훑는다. */
function TrigramGlyph({ trigram }: { trigram: readonly number[] }) {
  const rows = [...trigram].reverse();
  return (
    <svg className={styles.glyph} viewBox="0 0 22 16" aria-hidden="true" focusable="false">
      {rows.map((line, row) => {
        const y = 3 + (row * 5);
        if (line === 1) {
          return <line key={row} className={styles.glyphLine} x1="2" y1={y} x2="20" y2={y} />;
        }
        return (
          <g key={row}>
            <line className={styles.glyphLine} x1="2" y1={y} x2="8.5" y2={y} />
            <line className={styles.glyphLine} x1="13.5" y1={y} x2="20" y2={y} />
          </g>
        );
      })}
    </svg>
  );
}

/** 성운 · 별밭 · 바디그래프 실루엣. 전부 장식이라 aria-hidden 이고 props 가 없다. */
const PipelineField = memo(function PipelineField() {
  return (
    <div className={styles.field} aria-hidden="true">
      <div className={styles.nebula} />
      <div className={styles.nebulaB} />
      <div className={styles.stars} />
      <div className={styles.wireframe}>
        <svg
          className={styles.wireframeSvg}
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          role="presentation"
          focusable="false"
        >
          {WIRE_CHANNELS.map((channel) => (
            <path key={channel.channelId} className={styles.wireChannel} d={channel.d} />
          ))}
          {CENTER_SHAPE_LIST.map((shape) => (
            <polygon key={shape.center} className={styles.wireCenter} points={shape.polygon} />
          ))}
        </svg>
      </div>
    </div>
  );
});

/** 8단계 레일. 🔴 여기에 경과 시간을 넘기지 않는다(파일 머리말 참조). */
const PipelineRail = memo(function PipelineRail({ locale }: { locale: Locale }) {
  return (
    <ol className={styles.rail}>
      {PIPELINE_STEPS.map((step, index) => (
        <li className={styles.node} key={step.key} style={{ ["--hd-node-i" as string]: index }}>
          <span className={styles.mark} aria-hidden="true">
            <span className={styles.halo} />
            <span className={styles.vortex} />
            <span className={styles.core} />
            <TrigramGlyph trigram={step.trigram} />
          </span>
          <span className={styles.label}>
            <span className={styles.index} aria-hidden="true">{index + 1}</span>
            {pick(UI_TEXT[step.copyKey], locale)}
          </span>
        </li>
      ))}
    </ol>
  );
});

export default function PipelineScene({ locale, elapsedMs }: { locale: Locale; elapsedMs: number }) {
  return (
    <section className={styles.scene} aria-live="polite">
      <PipelineField />
      <div className={styles.head}>
        <h2 className={styles.heading}>{pick(UI_TEXT.pipelineHeading, locale)}</h2>
        {/* 🔴 진행률을 지어내지 않는다. 여기 보이는 것은 실제로 흐른 시간뿐이다.
            🔴 그리고 그 숫자는 aria-hidden 이다 — aria-live 영역 안에서 200ms 마다 바뀌면
               스크린리더가 초당 5회 숫자를 읽어 화면을 쓸 수 없게 만든다. */}
        <p className={styles.elapsed} aria-hidden="true">{(elapsedMs / 1000).toFixed(1)}s</p>
      </div>
      <PipelineRail locale={locale} />
    </section>
  );
}
