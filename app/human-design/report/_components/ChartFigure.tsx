"use client";

// 리포트 본문에 끼우는 도표.
//
// 🔴 새 차트 컴포넌트를 만들지 않는다. BodyGraph 의 focus·dimmed 장치가 이미 "이 장이 말하는
//    요소만 밝히고 나머지는 흐린다" 를 하고 있으므로, 필요한 것은 selection 을 넘기는 것뿐이다.
//    사본을 만들면 지오메트리 수정이 두 곳으로 갈린다.
//
// 🔴 뷰포트 근처에 올 때만 마운트한다. 도표 6장이 각각 SVG 노드 1,100여 개라 한 번에 붙이면
//    25,000자 문서의 첫 페인트가 그만큼 밀린다. 자리는 aspect-ratio 로 미리 잡아 두므로
//    나중에 붙어도 레이아웃이 밀리지 않는다(CLS 0).

import { useEffect, useRef, useState } from "react";

import { VIEWBOX } from "@/lib/human-design/bodygraph-geometry";

import BodyGraph from "../../_components/BodyGraph";
import type { HdChart, HdSelection } from "../../_lib/types";
import type { ReportLocale } from "../_lib/types";
import styles from "../report.module.css";

type Props = {
  slotId: string;
  chapterKey: string;
  chart: HdChart;
  selection: HdSelection;
  caption: string;
  locale: ReportLocale;
};

const NOOP = () => {};

export default function ChartFigure({ slotId, chapterKey, chart, selection, caption, locale }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const node = hostRef.current;
    if (!node || mounted) return undefined;
    if (typeof IntersectionObserver !== "function") {
      setMounted(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setMounted(true);
    }, { rootMargin: "400px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted]);

  return (
    <figure className={styles.chartFigure} data-slot={slotId} data-chapter={chapterKey}>
      {/* 🔴 예약 비율을 CSS 에 숫자로 적지 않는다. 지오메트리의 VIEWBOX 가 바뀌면 그 숫자만
          남아 자리가 어긋나고, 도표가 붙는 순간 본문이 밀린다(CLS). 값은 한 곳에서만 온다. */}
      <div
        className={styles.chartHost}
        ref={hostRef}
        style={{ aspectRatio: `${VIEWBOX.width} / ${VIEWBOX.height}` }}
      >
        {mounted ? (
          <BodyGraph
            chart={chart}
            locale={locale}
            selection={selection}
            onSelect={NOOP}
            interactive={false}
            staticRender
          />
        ) : null}
      </div>
      <figcaption className={styles.chartCaption}>{caption}</figcaption>
    </figure>
  );
}
