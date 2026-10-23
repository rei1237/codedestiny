import type { Metadata } from "next";
import TalismanStudio from "./TalismanStudio";
import "@/app/yeongnyangi/night-tokens.css";
import "./talismans.css";

export const metadata: Metadata = {
  title: "달빛 부적 | Code Destiny",
  description: "마음에 담은 바람을 배경화면으로 간직하세요.",
  robots: { index: false, follow: true },
};

export default function TalismanPage() {
  return <TalismanStudio />;
}
