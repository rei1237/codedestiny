import type { Metadata } from "next";

import { ROBOTS_META } from "@/lib/seo/index-policy.mjs";
import ProfileDiaryShell from "./_components/ProfileDiaryShell";

export const metadata: Metadata = {
  title: "운기 기록 | 나의 프로필",
  description: "프로필에서 오늘의 흐름과 계획, 기록을 함께 살펴봅니다.",
  robots: ROBOTS_META.NOINDEX,
};

export default function ProfileDiaryLayout({ children }: { children: React.ReactNode }) {
  return <ProfileDiaryShell>{children}</ProfileDiaryShell>;
}
