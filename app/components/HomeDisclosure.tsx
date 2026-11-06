"use client";
import {useEffect, useRef, type ReactNode} from "react";

/** Secondary home content stays expanded on desktop and opens on request on phones. */
export default function HomeDisclosure({label, className, children}: {label: string; className: string; children: ReactNode}) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const wide = matchMedia('(min-width:700px)');
    function sync() { if (details.current) details.current.open = wide.matches; }
    function revealHash() {
      const target = document.getElementById(location.hash.slice(1));
      if (target && details.current?.contains(target) && !details.current.open) {
        details.current.open = true;
        target.scrollIntoView({block:'start'});
      }
    }
    sync();
    revealHash();
    window.addEventListener('hashchange', revealHash);
    wide.addEventListener('change', sync);
    return () => {
      wide.removeEventListener('change', sync);
      window.removeEventListener('hashchange', revealHash);
    };
  }, []);
  return <details ref={details} className={className}><summary>{label}</summary>{children}</details>;
}
