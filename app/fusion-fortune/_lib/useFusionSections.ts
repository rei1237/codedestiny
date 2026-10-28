"use client";
import { useCallback, useState } from "react";
import { DOMAIN_SECTION_KEYS, SECTION_KEYS } from "../fusion-thread";
const allKeys = [...SECTION_KEYS, ...DOMAIN_SECTION_KEYS, "timing"];
export function useFusionSections() {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(allKeys));
  const openSection = useCallback((key: string) => setOpenSections(current => new Set([...current, key])), []);
  const toggleSection = useCallback((key: string) => setOpenSections(current => {
    if (key === "all") return new Set(allKeys);
    if (key === "none") return new Set();
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  }), []);
  return { openSections, openSection, toggleSection };
}
