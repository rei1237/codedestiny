import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "관리자 패널 — Code Destiny",
  robots: "noindex, nofollow",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // 로그인 화면만 유지하고 나머지 관리자 화면은 비활성화한다.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  redirect("/");
}


