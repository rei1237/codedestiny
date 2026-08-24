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
//
// 🔴 확대·이동은 CSS transform 이 아니라 **viewBox** 로 한다. transform 으로 키우면 선 굵기와
//    글자가 화면 픽셀 기준으로 그대로라 확대해도 안 읽히지만, viewBox 를 좁히면 같은 단위가
//    더 많은 픽셀을 차지해 실제로 커진다.
// 🔴 지속 rAF 루프를 쓰지 않는다. 이동·확대는 포인터 이벤트에만 반응하고 손을 떼면 멈춘다.
// 🔴 게이트 번호는 **활성 게이트에만** 기본 노출한다. 64개를 다 적으면 9px 글자 64개가 되어
//    아무것도 안 읽힌다. 전체 번호가 필요한 사람을 위해 토글을 따로 둔다.
// 🔴 확대·번호 컨트롤은 차트 **밖** 도구 줄에 둔다. 무대 위에 띄우면 폭이 좁을수록 차트 대비
//    비율이 커져(390px 화면에서 컨트롤 폭이 뷰박스 250단위) 뿌리 센터와 그 게이트를 덮는다.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
  /** null 이면 데이터 없는 고스트(결제 전 히어로) 상태로 그린다. */
  chart: HdChart | null;
  locale: Locale;
  selection: HdSelection;
  onSelect: (selection: HdSelection) => void;
  /**
   * false 면 읽기 전용 도표가 된다 — 확대·이동·탭 선택·도구 줄이 전부 빠지고 뷰박스가
   * 전체 고정이다. 리포트 본문에 끼우는 도표와 PDF 캡처용 도표가 이 모드를 쓴다.
   * 🔴 화면의 차트와 **다른 인스턴스**라 사용자가 확대해 둔 상태가 캡처에 따라오지 않는다.
   */
  interactive?: boolean;
  /**
   * 등장 애니메이션 없이 최종 상태로 즉시 앉힌다. 캡처는 애니메이션 도중을 찍을 수 있어서
   * 이 모드가 없으면 반쯤 그려진 채널이 PDF 에 실린다.
   */
  staticRender?: boolean;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.8;
const ZOOM_STEP = 0.6;
/** 드래그로 판정하는 최소 이동량(뷰박스 단위). 이보다 작으면 탭으로 본다. */
const DRAG_SLOP = 6;

/** 게이트별 활성 계층. 없으면 비활성. */
function buildGateLayers(chart: HdChart | null): Map<number, HdLayer[]> {
  const map = new Map<number, HdLayer[]>();
  if (!chart) return map;
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

type ChannelPath = (typeof CHANNEL_PATH_LIST)[number];

/** 채널 반쪽의 SVG path. 곡선 채널은 de Casteljau 로 쪼갠 부분 곡선을 그대로 쓴다. */
function halfPath(path: ChannelPath, half: "a" | "b"): string {
  const from = half === "a" ? path.a : path.b;
  const control = half === "a" ? path.controlA : path.controlB;
  if (!control) return `M${from.x} ${from.y}L${path.mid.x} ${path.mid.y}`;
  return `M${from.x} ${from.y}Q${control.x} ${control.y} ${path.mid.x} ${path.mid.y}`;
}

export default function BodyGraph({ chart, locale, selection, onSelect, interactive = true, staticRender = false }: Props) {
  const ghost = chart === null;
  /** 탭·확대·도구 줄이 붙는 조건. 고스트는 원래 상호작용이 없었으므로 함께 묶는다. */
  const live = interactive && !ghost;
  const gateLayers = useMemo(() => buildGateLayers(chart), [chart]);
  const definedCenters = useMemo(
    () => new Set(chart ? chart.definedCenters : []),
    [chart],
  );
  const completeChannels = useMemo(
    () => new Map((chart ? chart.channels : []).map((channel) => [channel.channelId, channel])),
    [chart],
  );

  // 🔴 SVG id 는 문서 전역이다. 고스트와 실제 차트가 같은 페이지에 함께 있으면
  //    같은 id 의 gradient 두 개가 서로를 덮어쓴다.
  const uid = useId().replace(/:/g, "");
  const definedFillId = `hdDefinedFill-${uid}`;
  const undefinedFillId = `hdUndefinedFill-${uid}`;
  const grainId = `hdGrain-${uid}`;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showAllGateNumbers, setShowAllGateNumbers] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // 진행 중인 포인터. 1개면 이동, 2개면 핀치.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{ startPan: { x: number; y: number }; startX: number; startY: number; moved: boolean } | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const selectedGate = selection?.kind === "gate" ? selection.gate : null;
  const selectedCenter = selection?.kind === "center" ? selection.center : null;
  const selectedChannel = selection?.kind === "channel" ? selection.channelId : null;

  // 선택된 요소와 이어진 것만 남기고 나머지는 흐린다 — "전체 설명" 대신 탐험이 되게 하는 장치.
  const focus = useMemo(() => {
    if (!selection || ghost) return null;
    const gates = new Set<number>();
    const centers = new Set<string>();
    const channels = new Set<string>();
    if (selection.kind === "center") {
      centers.add(selection.center);
      for (const shape of CENTER_SHAPE_LIST) {
        if (shape.center !== selection.center) continue;
        for (const gate of shape.gates) gates.add(gate);
      }
      for (const path of CHANNEL_PATH_LIST) {
        if (path.centerA === selection.center || path.centerB === selection.center) channels.add(path.channelId);
      }
    }
    if (selection.kind === "gate" || selection.kind === "planet") {
      const gate = selection.kind === "gate"
        ? selection.gate
        : chart?.layers[selection.layer]?.find((a) => a.planet === selection.planet)?.gate;
      if (typeof gate !== "number") return null;
      gates.add(gate);
      for (const path of CHANNEL_PATH_LIST) {
        if (path.gateA !== gate && path.gateB !== gate) continue;
        channels.add(path.channelId);
        gates.add(path.gateA);
        gates.add(path.gateB);
        centers.add(path.centerA);
        centers.add(path.centerB);
      }
      for (const shape of CENTER_SHAPE_LIST) {
        if (shape.gates.includes(gate)) centers.add(shape.center);
      }
    }
    if (selection.kind === "channel") {
      const path = CHANNEL_PATH_LIST.find((item) => item.channelId === selection.channelId);
      if (!path) return null;
      channels.add(path.channelId);
      gates.add(path.gateA);
      gates.add(path.gateB);
      centers.add(path.centerA);
      centers.add(path.centerB);
    }
    return { gates, centers, channels };
  }, [chart, ghost, selection]);

  const clampPan = useCallback((next: { x: number; y: number }, nextZoom: number) => {
    // 확대분만큼만 움직일 수 있다 — 배율 1 이면 이동 없음.
    const rangeX = (VIEWBOX.width * (1 - 1 / nextZoom)) / 2;
    const rangeY = (VIEWBOX.height * (1 - 1 / nextZoom)) / 2;
    return {
      x: Math.max(-rangeX, Math.min(rangeX, next.x)),
      y: Math.max(-rangeY, Math.min(rangeY, next.y)),
    };
  }, []);

  const applyZoom = useCallback((nextZoom: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    setZoom(clamped);
    setPan((current) => clampPan(current, clamped));
    return clamped;
  }, [clampPan]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const viewBox = useMemo(() => {
    // 🔴 읽기 전용 도표는 확대 상태를 아예 갖지 않는다. 화면 차트와 뷰박스를 공유하면
    //    사용자가 확대해 둔 채로 PDF 를 만들었을 때 잘린 그림이 실린다.
    if (!interactive) return `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`;
    const width = VIEWBOX.width / zoom;
    const height = VIEWBOX.height / zoom;
    const x = ((VIEWBOX.width - width) / 2) + pan.x;
    const y = ((VIEWBOX.height - height) / 2) + pan.y;
    return `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`;
  }, [interactive, pan.x, pan.y, zoom]);

  /** 화면 픽셀 이동량을 뷰박스 단위로 바꾼다. */
  const toViewUnits = useCallback((pixels: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return (pixels * (VIEWBOX.width / zoom)) / rect.width;
  }, [zoom]);

  const onPointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchRef.current = { distance: Math.hypot(first.x - second.x, first.y - second.y), zoom };
      dragRef.current = null;
      return;
    }
    if (zoom > 1) {
      dragRef.current = { startPan: pan, startX: event.clientX, startY: event.clientY, moved: false };
      svgRef.current?.setPointerCapture(event.pointerId);
    }
  }, [pan, zoom]);

  const onPointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (pinchRef.current.distance > 0) {
        applyZoom(pinchRef.current.zoom * (distance / pinchRef.current.distance));
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
    drag.moved = true;
    setPan(clampPan({
      x: drag.startPan.x - toViewUnits(dx),
      y: drag.startPan.y - toViewUnits(dy),
    }, zoom));
  }, [applyZoom, clampPan, toViewUnits, zoom]);

  const endPointer = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      // 드래그였으면 이 포인터가 지나간 요소의 클릭을 삼킨다.
      window.setTimeout(() => { dragRef.current = null; }, 0);
    }
  }, []);

  /** 드래그 끝에 붙은 클릭은 선택으로 치지 않는다. */
  const select = useCallback((next: HdSelection) => {
    if (!live) return;
    if (dragRef.current?.moved) return;
    onSelect(next);
  }, [live, onSelect]);

  // 확대 상태에서 브라우저 기본 스크롤/제스처가 먹지 않게 한다.
  useEffect(() => {
    const node = svgRef.current;
    if (!node || !interactive) return undefined;
    const block = (event: TouchEvent) => {
      if (zoom > 1 || event.touches.length > 1) event.preventDefault();
    };
    node.addEventListener("touchmove", block, { passive: false });
    return () => node.removeEventListener("touchmove", block);
  }, [interactive, zoom]);

  const activateKey = (next: HdSelection) => (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    select(next);
  };

  const dimClass = (dim: boolean) => (dim ? styles.dimmed : "");

  return (
    <figure
      className={styles.wrap}
      data-ghost={ghost ? "true" : undefined}
      data-static={staticRender ? "true" : undefined}
    >
      <div className={styles.stage}>
        <svg
          ref={svgRef}
          className={styles.svg}
          viewBox={viewBox}
          role="img"
          aria-label={pick(UI_TEXT.bodyGraphAria, locale)}
          data-zoomed={interactive && zoom > 1 ? "true" : undefined}
          onPointerDown={interactive ? onPointerDown : undefined}
          onPointerMove={interactive ? onPointerMove : undefined}
          onPointerUp={interactive ? endPointer : undefined}
          onPointerCancel={interactive ? endPointer : undefined}
        >
          <defs>
            {/* 정의된 센터의 안쪽 발광 — 정적 그라디언트라 매 프레임 비용이 없다. */}
            <radialGradient id={definedFillId} cx="50%" cy="38%" r="72%">
              <stop offset="0%" stopColor="var(--hd-defined-core)" />
              <stop offset="100%" stopColor="var(--hd-defined-edge)" />
            </radialGradient>
            <radialGradient id={undefinedFillId} cx="50%" cy="38%" r="72%">
              <stop offset="0%" stopColor="var(--hd-undefined-core)" />
              <stop offset="100%" stopColor="var(--hd-undefined-edge)" />
            </radialGradient>
            {/* 🔴 발광은 SVG <filter> 가 아니라 CSS drop-shadow 로 준다(bodygraph.module.css).
                필터 노드를 도형마다 참조시키면 등장 애니메이션 동안 매 프레임 다시 구워진다. */}
            <pattern id={grainId} width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="1.4" cy="1.4" r="0.7" className={styles.grainDot} />
              <circle cx="14.2" cy="17.6" r="0.5" className={styles.grainDot} />
            </pattern>
          </defs>

          {/* 배경 입자 — 깊이감만 담당하고 클릭을 받지 않는다. */}
          <rect className={styles.grain} x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height} fill={`url(#${grainId})`} />

          {/* 채널 — 센터보다 먼저 그려 도형 뒤로 보낸다 */}
          <g className={styles.channels}>
            {CHANNEL_PATH_LIST.map((path, index) => {
              const complete = completeChannels.get(path.channelId);
              const dim = Boolean(focus && !focus.channels.has(path.channelId));
              const halves: Array<{ key: string; half: "a" | "b"; gate: number }> = [
                { key: `${path.channelId}-a`, half: "a", gate: path.gateA },
                { key: `${path.channelId}-b`, half: "b", gate: path.gateB },
              ];
              return (
                <g
                  key={path.channelId}
                  className={`${styles.channel} ${complete ? styles.channelComplete : ""} ${selectedChannel === path.channelId ? styles.selected : ""} ${dimClass(dim)}`}
                  style={{ ["--hd-order" as string]: index }}
                  onClick={() => select({ kind: "channel", channelId: path.channelId })}
                  role={ghost ? undefined : "button"}
                  tabIndex={!ghost && complete ? 0 : -1}
                  aria-label={ghost ? undefined : `${pick(UI_TEXT.channel, locale)} ${path.channelId}`}
                  onKeyDown={activateKey({ kind: "channel", channelId: path.channelId })}
                >
                  {/* 클릭 판정용 넉넉한 투명 선 */}
                  <path className={styles.hit} d={`${halfPath(path, "a")} ${halfPath(path, "b")}`} />
                  {halves.map((item) => (
                    <path
                      key={item.key}
                      className={`${styles.half} ${layerClass(gateLayers.get(item.gate))}`}
                      d={halfPath(path, item.half)}
                      pathLength={1}
                    />
                  ))}
                </g>
              );
            })}
          </g>

          {/* 9 센터 */}
          <g className={styles.centers}>
            {CENTER_SHAPE_LIST.map((shape, index) => {
              const isDefined = definedCenters.has(shape.center);
              const dim = Boolean(focus && !focus.centers.has(shape.center));
              const label = pick(CENTER_COPY[shape.center as keyof typeof CENTER_COPY]?.name, locale);
              return (
                <polygon
                  key={shape.center}
                  className={`${styles.center} ${isDefined ? styles.centerDefined : styles.centerUndefined} ${selectedCenter === shape.center ? styles.selected : ""} ${dimClass(dim)}`}
                  style={{ ["--hd-order" as string]: index }}
                  data-center={shape.center}
                  points={shape.polygon}
                  fill={`url(#${isDefined ? definedFillId : undefinedFillId})`}
                  role={ghost ? undefined : "button"}
                  tabIndex={ghost ? -1 : 0}
                  aria-label={ghost ? undefined : `${label} · ${isDefined ? pick(UI_TEXT.defined, locale) : pick(UI_TEXT.undefined, locale)}`}
                  onClick={() => select({ kind: "center", center: shape.center })}
                  onKeyDown={activateKey({ kind: "center", center: shape.center })}
                />
              );
            })}
          </g>

          {/* 64 게이트 */}
          <g className={styles.gates}>
            {GATE_POSITION_LIST.map((position, index) => {
              const layers = gateLayers.get(position.gate);
              const active = Boolean(layers && layers.length);
              const dim = Boolean(focus && !focus.gates.has(position.gate));
              const labelled = active || showAllGateNumbers;
              return (
                <g
                  key={position.gate}
                  className={`${styles.gate} ${active ? styles.gateActive : styles.gateIdle} ${layerClass(layers)} ${selectedGate === position.gate ? styles.selected : ""} ${dimClass(dim)}`}
                  style={{ ["--hd-order" as string]: index }}
                  onClick={() => select({ kind: "gate", gate: position.gate })}
                  role={ghost ? undefined : "button"}
                  tabIndex={!ghost && active ? 0 : -1}
                  aria-label={ghost ? undefined : `${pick(UI_TEXT.gate, locale)} ${position.gate}`}
                  onKeyDown={activateKey({ kind: "gate", gate: position.gate })}
                >
                  <circle className={styles.gateHit} cx={position.x} cy={position.y} r={14} />
                  <circle className={styles.gateDot} cx={position.x} cy={position.y} r={active ? 9.5 : 5} />
                  {labelled && (
                    <text className={styles.gateLabel} x={position.x} y={position.y + 3.9}>
                      {position.gate}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

      </div>

      {live && (
        <div className={styles.toolbar}>
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => applyZoom(zoom - ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              aria-label={pick(UI_TEXT.zoomOut, locale)}
            >
              −
            </button>
            <button
              type="button"
              className={styles.controlReset}
              onClick={resetView}
              disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
            >
              {zoom === 1 ? "100%" : `${Math.round(zoom * 100)}%`}
            </button>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => applyZoom(zoom + ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              aria-label={pick(UI_TEXT.zoomIn, locale)}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className={styles.numbersToggle}
            aria-pressed={showAllGateNumbers}
            onClick={() => setShowAllGateNumbers((current) => !current)}
          >
            {pick(showAllGateNumbers ? UI_TEXT.gateNumbersActiveOnly : UI_TEXT.gateNumbersAll, locale)}
          </button>
        </div>
      )}

      {live && (
        <figcaption className={styles.caption}>{pick(UI_TEXT.tapHint, locale)}</figcaption>
      )}
    </figure>
  );
}
