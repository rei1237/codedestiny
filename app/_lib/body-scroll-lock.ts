"use client";

import { useEffect } from "react";

let bodyScrollLockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";

export function lockBodyScroll() {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;

  if (bodyScrollLockCount === 0) {
    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }

  bodyScrollLockCount += 1;
  body.style.overflow = "hidden";
  body.setAttribute("data-cd-scroll-lock", "true");
}

export function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (!body) return;

  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount !== 0) return;

  body.style.overflow = previousBodyOverflow;
  body.style.paddingRight = previousBodyPaddingRight;
  body.removeAttribute("data-cd-scroll-lock");
}

export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [enabled]);
}
