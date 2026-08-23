"use client";

// PDF 용 도표 캡처.
//
// 🔴 화면에 보이는 차트를 찍지 않는다. 화면 밖 호스트에 **다른 인스턴스**를 띄워 찍으므로
//    사용자가 확대·이동해 둔 상태가 PDF 로 따라오지 않는다. interactive={false} 가 뷰박스를
//    전체로 고정하고, staticRender 가 등장 애니메이션을 최종 상태로 앉힌다.
//
// 🔴 **순차로** 찍는다. 도표 하나가 SVG 노드 1,100여 개라 6장을 동시에 붙이면 캔버스 6장이
//    한꺼번에 메모리를 점유한다.
//
// 🔴 캡처 직전에 2×rAF + 120ms 를 기다린다. 브라우저가 레이아웃·폰트·그라디언트를 확정하기
//    전에 찍으면 반쯤 그려진 그림이 실린다(CodexReader 가 쓰는 관용구와 같다).

import { createElement } from "react";

import { captureElementAsImage } from "@/lib/pdf/typeset-writer";

import BodyGraph from "../../_components/BodyGraph";
import type { HdChart, HdSelection } from "../../_lib/types";
import type { ReportLocale } from "./types";

/** 캡처 폭. A4 본문에서 도표가 차지하는 폭(96mm)에 약 330dpi 가 되도록 잡았다. */
const HOST_WIDTH_PX = 720;
/**
 * 🔴 초융합의 min(2, dpr) 로 찍으면 약 220dpi 라 9px 게이트 번호가 뭉갠다. 3배로 찍는다.
 *    저사양 기기에서는 **배율만** 낮추고 장수는 줄이지 않는다 — 장을 빼면 웹과 PDF 가 갈린다.
 */
const CAPTURE_SCALE = 3;
const LOW_MEMORY_SCALE = 2;
const CHART_BACKGROUND = "#0b0a18";

export type ChartSlot = { slotId: string; selection: HdSelection; caption: string };
export type CapturedChart = { dataUrl: string; ratio: number };

function pickScale(): number {
  if (typeof navigator === "undefined") return CAPTURE_SCALE;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  return Number.isFinite(memory) && Number(memory) <= 4 ? LOW_MEMORY_SCALE : CAPTURE_SCALE;
}

/** 레이아웃·폰트가 확정될 때까지 기다린다. */
function settle(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => { window.setTimeout(resolve, 120); }));
  });
}

/**
 * 슬롯을 순서대로 캡처한다. 실패한 슬롯은 그냥 빠지고(그 장의 도표 블록이 캡션까지 통째로
 * 사라진다) 나머지는 그대로 만들어진다 — 도표는 본문이 아니다.
 */
export async function captureChartSlots(
  chart: HdChart,
  slots: ChartSlot[],
  locale: ReportLocale,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, CapturedChart>> {
  const images = new Map<string, CapturedChart>();
  if (typeof document === "undefined" || !slots.length) return images;

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${HOST_WIDTH_PX}px;pointer-events:none;z-index:-1;`;
  document.body.appendChild(host);

  const { createRoot } = await import("react-dom/client");
  const root = createRoot(host);
  const scale = pickScale();

  try {
    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      root.render(createElement(BodyGraph, {
        chart,
        locale,
        selection: slot.selection,
        onSelect: () => {},
        interactive: false,
        staticRender: true,
      }));
      await settle();
      const captured = await captureElementAsImage(host, { backgroundColor: CHART_BACKGROUND, scale, quality: 0.9 });
      if (captured?.dataUrl) images.set(slot.slotId, captured);
      onProgress?.(index + 1, slots.length);
    }
  } finally {
    // 🔴 반드시 정리한다. 안 그러면 화면 밖에 SVG 1,100여 개가 남아 다음 캡처까지 살아 있다.
    root.unmount();
    host.remove();
  }

  return images;
}

export const __captureConstants = { HOST_WIDTH_PX, CAPTURE_SCALE, LOW_MEMORY_SCALE };
