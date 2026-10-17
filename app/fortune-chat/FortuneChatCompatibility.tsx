"use client";

import FortuneTeaHouseClient from "@/app/fortune-tea-house/FortuneTeaHouseClient";

/** Render the same surface without interrupting old checkout return handlers. */
export default function FortuneChatCompatibility() {
  return <FortuneTeaHouseClient legacyChat />;
}
