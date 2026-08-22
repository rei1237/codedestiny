"use client";

import { useAppShellCopy } from "@/app/app/_lib/copy";

export default function AppPassStoreHeader() {
  const copy = useAppShellCopy();
  return (
    <header className="cd-app-bar px-4 pb-3">
      <h1 className="cd-app-title pt-3">{copy.passPageTitle}</h1>
      <p className="cd-app-body mt-1">
        {copy.passPageBody}
      </p>
    </header>
  );
}
