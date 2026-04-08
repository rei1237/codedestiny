"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드", icon: "📊", exact: true },
  { href: "/admin/users", label: "유저 관리", icon: "👥" },
  { href: "/admin/content", label: "콘텐츠 관리", icon: "📝" },
  { href: "/admin/coins", label: "코인 이력", icon: "🪙" },
  { href: "/admin/audit", label: "감사 로그", icon: "📋" },
  { href: "/admin/settings", label: "시스템 설정", icon: "⚙️" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {}
    router.push("/admin/login");
  }

  function isActive(item: { href: string; exact?: boolean }) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[#13131f] border-r border-[#2a2a3e] min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2a2a3e]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌸</span>
          <span className="text-sm font-bold text-white">CODE DESTINY</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">관리자 패널</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              isActive(item)
                ? "bg-violet-600/30 text-violet-300 font-medium"
                : "text-slate-400 hover:text-white hover:bg-[#1e1e2e]"
            }`}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-[#2a2a3e]">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <span className="text-base leading-none">🚪</span>
          {loggingOut ? "로그아웃 중..." : "로그아웃"}
        </button>
      </div>
    </aside>
  );
}
