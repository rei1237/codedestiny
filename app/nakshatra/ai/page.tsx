"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useNakshatraCopy } from "../_lib/copy";

function NakshatraAiFallback() {
  const copy = useNakshatraCopy();
  return (
    <main
      aria-busy="true"
      className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_22%_12%,rgba(179,25,85,0.16),transparent_34%),radial-gradient(circle_at_82%_10%,rgba(212,175,55,0.12),transparent_36%),linear-gradient(150deg,#0a0818_0%,#141031_55%,#070510_100%)] px-4 py-8 text-slate-100"
    >
      <p className="m-0 text-sm font-extrabold text-amber-100">{copy.aiFallbackText}</p>
    </main>
  );
}

export default function NakshatraAiPage() {
  const [Content, setContent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;
    import("./NakshatraAiClient").then((module) => {
      if (isMounted) setContent(() => module.default);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!Content) return <NakshatraAiFallback />;
  return <Content />;
}
