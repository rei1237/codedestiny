"use client";

import { useEffect } from "react";

export default function BuildInfoLogger() {
  useEffect(() => {
    console.info("[CodeDestiny] build", {
      version: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
      gitSha: process.env.NEXT_PUBLIC_GIT_SHA || "unknown",
      buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || "unknown",
      source: "pages",
    });
  }, []);

  return null;
}
