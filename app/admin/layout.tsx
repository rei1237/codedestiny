import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyFlowerAdminToken } from "../_lib/flowerAdminToken.js";
import { AdminSidebar } from "./components/AdminSidebar";
import { ToastProvider } from "./components/ToastProvider";

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

  // 로그인 페이지는 인증 체크 없이 그대로 렌더링
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("flower_admin_token")?.value ?? "";

  const valid = token ? await verifyFlowerAdminToken(token) : false;
  if (!valid) {
    redirect("/admin/login");
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#0d0d1a] text-white">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}


