"use client";

import dynamic from "next/dynamic";
import type { IStory } from "@/lib/stories/types";

const StoriesIndex = dynamic(() => import("@/components/stories/StoriesIndex"), {
  loading: () => <StoriesIndexShell />,
});

function StoriesIndexShell() {
  return (
    <section
      className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white shadow-2xl shadow-black/20 lg:grid-cols-[minmax(0,1fr)_minmax(240px,360px)]"
      aria-busy="true"
    >
      <div className="flex flex-col justify-center">
        <div className="h-4 w-36 animate-pulse rounded-full bg-white/15" />
        <div className="mt-4 h-10 w-64 max-w-full animate-pulse rounded-full bg-white/15" />
        <div className="mt-4 h-5 w-80 max-w-full animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
        <div className="h-full min-h-[280px] animate-pulse rounded-[inherit] bg-white/10" />
      </div>
    </section>
  );
}

export default function StoriesIndexRouteClient({ stories }: { stories: IStory[] }) {
  return <StoriesIndex stories={stories} />;
}
