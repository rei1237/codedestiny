"use client";

// 인터랙티브 BodyGraph — 인라인 SVG.
//
// 🔴 이미지 한 장이 아니다. 9 센터 · 64 게이트 · 36 채널이 각각 DOM 노드라서 눌러서 상세를
//    볼 수 있고, 정의 상태가 데이터에서 그대로 나온다(요구사항 17·20).
//
// 채널은 **반쪽 두 개**로 그린다. 한쪽 게이트만 활성인 상태(미완성)를 그대로 보여줘야
// "게이트가 활성이라고 채널이 완성되는 게 아니다" 라는 계약이 화면에서도 보인다.
//
// Personality(의식) / Design(무의식) 구분은 색으로 한다 — 채널 반쪽마다 어느 계층이
// 그 게이트를 켰는지 칠한다. 양쪽이 다르면 그 채널이 곧 P+D 혼합이다(요구사항 18).

import { useMemo } from "react";
import {
  CENTER_SHAPE_LIST,
  CHANNEL_PATH_LIST,
  GATE_POSITION_LIST,
  VIEWBOX,
} from "@/lib/human-design/bodygraph-geometry";
import { CENTER_COPY, UI_TEXT, pick, type Locale } from "../_copy";
import type { HdChart, HdLayer, HdSelection } from "../_lib/types";
import styles from "./bodygraph.module.css";

type Props = {
  chart: HdChart;
  locale: Locale;
  selection: HdSelection;
  onSelect: (selection: HdSelection) => void;
};

/** 게이트별 활성 계층. 없으면 비활성. */
function buildGateLayers(chart: HdChart): Map<number, HdLayer[]> {
  const map = new Map<number, HdLayer[]>();
  for (const activation of chart.activations) {
    const list = map.get(activation.gate) || [];
    if (!list.includes(activation.layer)) list.push(activation.layer);
    map.set(activation.gate, list);
  }
  return map;
}

function layerClass(layers: HdLayer[] | undefined): string {
  if (!layers || layers.length === 0) return styles.inactive;
  if (layers.length > 1) return styles.mixed;
  return layers[0] === "personality" ? styles.personality : styles.design;
}

export default function BodyGraph({ chart, locale, selection, onSelect }: Props) {
  const gateLayers = useMemo(() => buildGateLayers(chart), [chart]);
  const definedCenters = useMemo(() => new Set(chart.definedCenters), [chart.definedCenters]);
  const completeChannels = useMemo(
    () => new Map(chart.channels.map((channel) => [channel.channelId, channel])),
    [chart.channels],
  );

  const selectedGate = selection?.kind === "gate" ? selection.gate : null;
  const selectedCenter = selection?.kind === "center" ? selection.center : null;
  const selectedChannel = selection?.kind === "channel" ? selection.channelId : null;

  return (
    <figure className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        role="img"
        aria-label={locale === "ko" ? "내 바디그래프" : "My BodyGraph"}
      >
        {/* 채널 — 센터보다 먼저 그려 도형 뒤로 보낸다 */}
        <g className={styles.channels}>
          {CHANNEL_PATH_LIST.map((path) => {
            const complete = completeChannels.get(path.channelId);
            const halves: Array<{ key: string; from: { x: number; y: number }; gate: number }> = [
              { key: `${path.channelId}-a`, from: path.a, gate: path.gateA },
              { key: `${path.channelId}-b`, from: path.b, gate: path.gateB },
            ];
            return (
              <g
                key={path.channelId}
                className={`${styles.channel} ${complete ? styles.channelComplete : ""} ${selectedChannel === path.channelId ? styles.selected : ""}`}
                onClick={() => onSelect({ kind: "channel", channelId: path.channelId })}
                role="button"
                tabIndex={complete ? 0 : -1}
                aria-label={`${pick(UI_TEXT.channel, locale)} ${path.channelId}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect({ kind: "channel", channelId: path.channelId });
                  }
                }}
              >
                {/* 클릭 판정용 넉넉한 투명 선 */}
                <line className={styles.hit} x1={path.a.x} y1={path.a.y} x2={path.b.x} y2={path.b.y} />
                {halves.map((half) => (
                  <line
                    key={half.key}
                    className={`${styles.half} ${layerClass(gateLayers.get(half.gate))}`}
                    x1={half.from.x}
                    y1={half.from.y}
                    x2={path.mid.x}
                    y2={path.mid.y}
                  />
                ))}
              </g>
            );
          })}
        </g>

        {/* 9 센터 */}
        <g className={styles.centers}>
          {CENTER_SHAPE_LIST.map((shape) => {
            const isDefined = definedCenters.has(shape.center);
            const label = pick(CENTER_COPY[shape.center as keyof typeof CENTER_COPY]?.name, locale);
            return (
              <polygon
                key={shape.center}
                className={`${styles.center} ${isDefined ? styles.centerDefined : styles.centerUndefined} ${selectedCenter === shape.center ? styles.selected : ""}`}
                data-center={shape.center}
                points={shape.polygon}
                role="button"
                tabIndex={0}
                aria-label={`${label} · ${isDefined ? pick(UI_TEXT.defined, locale) : pick(UI_TEXT.undefined, locale)}`}
                onClick={() => onSelect({ kind: "center", center: shape.center })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect({ kind: "center", center: shape.center });
                  }
                }}
              />
            );
          })}
        </g>

        {/* 64 게이트 */}
        <g className={styles.gates}>
          {GATE_POSITION_LIST.map((position) => {
            const layers = gateLayers.get(position.gate);
            const active = Boolean(layers && layers.length);
            return (
              <g
                key={position.gate}
                className={`${styles.gate} ${active ? styles.gateActive : styles.gateIdle} ${layerClass(layers)} ${selectedGate === position.gate ? styles.selected : ""}`}
                onClick={() => onSelect({ kind: "gate", gate: position.gate })}
                role="button"
                tabIndex={active ? 0 : -1}
                aria-label={`${pick(UI_TEXT.gate, locale)} ${position.gate}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect({ kind: "gate", gate: position.gate });
                  }
                }}
              >
                <circle className={styles.gateHit} cx={position.x} cy={position.y} r={13} />
                <circle className={styles.gateDot} cx={position.x} cy={position.y} r={9} />
                <text className={styles.gateLabel} x={position.x} y={position.y + 3.2}>
                  {position.gate}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <figcaption className={styles.caption}>{pick(UI_TEXT.tapHint, locale)}</figcaption>
    </figure>
  );
}
