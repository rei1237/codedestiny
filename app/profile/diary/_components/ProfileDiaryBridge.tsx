"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export type ProfileDiarySection = "today" | "calendar" | "records" | "stats" | "more";

function sectionFromPath(pathname: string): ProfileDiarySection {
  if (pathname.includes("/calendar")) return "calendar";
  if (pathname.includes("/records")) return "records";
  if (pathname.includes("/stats")) return "stats";
  if (pathname.includes("/more")) return "more";
  return "today";
}

function post(state: "ready" | "route" | "close" | "error", section: ProfileDiarySection) {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage({ type: "cd:profile-diary", state, section }, window.location.origin);
}

/** Same-origin profile sheet bridge. The parent owns the modal and focus return. */
export default function ProfileDiaryBridge() {
  const pathname = usePathname() || "/profile/diary";
  const section = sectionFromPath(pathname);

  useEffect(() => {
    post("ready", section);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    post("route", section);
  }, [section]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      post("close", section);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [section]);

  useEffect(() => {
    const reportError = () => post("error", section);
    window.addEventListener("error", reportError);
    window.addEventListener("unhandledrejection", reportError);
    return () => {
      window.removeEventListener("error", reportError);
      window.removeEventListener("unhandledrejection", reportError);
    };
  }, [section]);

  return null;
}
