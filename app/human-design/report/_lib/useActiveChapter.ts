"use client";

// 지금 읽고 있는 장 판정 + 읽기 진행률.
//
// 🔴 지속 rAF 루프를 만들지 않는다. 스크롤 이벤트({passive:true})가 올 때만 rAF 를 한 틱
//    예약하고, 그 틱에서 **CSS 변수만** 갱신한다 — setState 를 부르면 25,000자 문서가 스크롤
//    한 번에 통째로 리렌더된다.
// 🔴 현재 장 판정은 스크롤 계산이 아니라 IntersectionObserver 다. rootMargin 은 CodexReader 의
//    실측값을 그대로 쓴다(위 12% · 아래 70% 를 잘라 화면 상단 근처의 장을 고른다).

import { useEffect, useRef, useState } from "react";

const ROOT_MARGIN = "-12% 0px -70% 0px";

export function useActiveChapter(chapterKeys: string[], enabled: boolean): string {
  const [activeKey, setActiveKey] = useState("");
  // 생성 중에는 장이 하나씩 늘어나므로 옵저버를 다시 붙여야 한다. 배열 정체성이 아니라
  // **내용**이 바뀔 때만 붙도록 문자열 하나로 접는다.
  const keySignature = chapterKeys.join("|");

  useEffect(() => {
    const keys = keySignature ? keySignature.split("|") : [];
    if (!enabled || keys.length === 0) return undefined;
    if (typeof IntersectionObserver !== "function") return undefined;

    const nodes = keys
      .map((key) => document.getElementById(`hd-ch-${key}`))
      .filter((node): node is HTMLElement => node !== null);
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (!visible.length) return;
      // 화면 위쪽에 가장 가까운 것을 고른다 — 여러 장이 동시에 걸릴 때 흔들리지 않게.
      const top = visible.reduce((best, entry) => (
        entry.boundingClientRect.top < best.boundingClientRect.top ? entry : best
      ));
      const key = (top.target as HTMLElement).dataset.chapter || "";
      if (key) setActiveKey(key);
    }, { rootMargin: ROOT_MARGIN, threshold: 0 });

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [keySignature, enabled]);

  return activeKey;
}

/** 문서 스크롤 진행률을 CSS 변수 하나로만 흘린다. 리렌더 0. */
export function useReadingProgress(targetRef: { current: HTMLElement | null }, enabled: boolean): void {
  const frameRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const node = targetRef.current;
    if (!node) return undefined;

    const update = () => {
      frameRef.current = 0;
      const total = node.scrollHeight - window.innerHeight;
      const ratio = total > 0 ? Math.max(0, Math.min(1, (window.scrollY - node.offsetTop) / total)) : 0;
      node.style.setProperty("--hd-read-progress", `${(ratio * 100).toFixed(2)}%`);
    };

    const onScroll = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [enabled, targetRef]);
}
