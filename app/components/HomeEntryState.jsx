"use client";
import { useEffect } from "react";

// Native details and links work without this enhancement. Only the entry page
// disclosures are remembered; product/search state belongs to its own controller.
export default function HomeEntryState() {
  useEffect(() => {
    const nodes = [...document.querySelectorAll('[data-home-disclosure]')];
    const key = 'cd:home-disclosures:v2';
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || '{}');
      nodes.forEach(node => { if (saved[node.dataset.homeDisclosure] === true) node.open = true; });
    } catch { /* Storage is optional; default closed remains usable. */ }
    const save = () => {
      try { sessionStorage.setItem(key, JSON.stringify(Object.fromEntries(nodes.map(node => [node.dataset.homeDisclosure, node.open])))); } catch { /* Optional storage. */ }
    };
    const revealHash = () => {
      if (!location.hash) return;
      let target;
      try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
      if (!target) return;
      let ancestor = target.parentElement;
      let opened = false;
      while (ancestor) {
        if (ancestor.tagName === 'DETAILS' && !ancestor.open) { ancestor.open = true; opened = true; }
        ancestor = ancestor.parentElement;
      }
      if (opened) { target.scrollIntoView({ block: 'start', behavior: 'instant' }); save(); }
    };
    nodes.forEach(node => node.addEventListener('toggle', save));
    window.addEventListener('hashchange', revealHash);
    window.addEventListener('pageshow', revealHash);
    window.addEventListener('pagehide', save);
    revealHash();
    return () => {
      save();
      nodes.forEach(node => node.removeEventListener('toggle', save));
      window.removeEventListener('hashchange', revealHash);
      window.removeEventListener('pageshow', revealHash);
      window.removeEventListener('pagehide', save);
    };
  }, []);
  return null;
}
