"use client";

import { useEffect, useRef } from "react";
import { attachHomeCardMotion } from "../../lib/navigation/home-card-motion.mjs";

// Children remain server-rendered links, including without JavaScript.
export default function HomeCardDeck({ children, className }) {
  const deck = useRef(null);
  useEffect(() => attachHomeCardMotion(deck.current), [children]);
  return <ul ref={deck} className={className} aria-labelledby="homeCardTitle">{children}</ul>;
}
