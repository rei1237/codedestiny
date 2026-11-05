"use client";

import { useEffect, useRef } from "react";
import { attachHomeCardMotion } from "../../lib/navigation/home-card-motion.mjs";

export default function HomeCardDeck({ children, className, labelledBy, interactive = false }) {
  const deck = useRef(null);
  useEffect(() => {
    if (interactive) return attachHomeCardMotion(deck.current);
  }, [interactive]);
  return <ul ref={deck} className={className} aria-labelledby={labelledBy}>{children}</ul>;
}
