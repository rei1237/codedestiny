"use client";

// 관리자 공용 셸 — 좌측 네비 + 인증 게이트.
//
// 예전에는 공용 네비가 없어 화면마다 <Link> 를 하드코딩했다. 그 결과 /admin/orders 는 나가는
// 링크가 하나도 없는 막다른 길이었고, /admin/cache-status 는 어디서도 도달할 수 없었으며,
// 프롬프트 랩과 CMS 는 라벨 없는 아이콘 버튼 하나로만 갈 수 있었다.
//
// 메뉴는 이 파일의 ADMIN_NAV 하나가 정본이다. 화면을 추가하면 여기 한 줄만 넣는다.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  FileText,
  Gem,
  LayoutList,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Sparkles,
  X,
} from "lucide-react";

import { normalizeAppPathname } from "@/app/app/_lib/app-route";
import { getFlowerAdminToken, redirectToAdminLogin } from "../_lib/admin-api";
import { adminButton } from "./ui";

interface AdminNavItem {
  href: string;
  label: string;
  Icon: typeof FileText;
  hint: string;
}

/** 좌측 네비의 단일 정본. 순서가 곧 화면 순서다. */
const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin/content", label: "글 편집", Icon: FileText, hint: "블로그·인사이트 작성과 발행" },
  { href: "/admin/prompts", label: "프롬프트 랩", Icon: Sparkles, hint: "운세별 프롬프트를 결제 없이 확인" },
  { href: "/admin/cms", label: "콘텐츠 관리", Icon: LayoutList, hint: "AI 프롬프트·운세 해설·문구 편집" },
  { href: "/admin/orders", label: "주문 · 환불", Icon: Receipt, hint: "결제 조회와 환불" },
  { href: "/admin/reviews", label: "리뷰", Icon: MessageSquare, hint: "리뷰 승인과 관리" },
  { href: "/admin/feedback", label: "버그 제보", Icon: MessageSquare, hint: "제보 확인과 보상 지급" },
  { href: "/admin/monthly-credits", label: "월정석 지급", Icon: Gem, hint: "마케팅 월정석 지급" },
  { href: "/admin/insights", label: "콘텐츠 진단", Icon: Activity, hint: "발행·메타·피드 상태 점검" },
  { href: "/admin/cache-status", label: "배포 · 캐시", Icon: Activity, hint: "배포 버전과 캐시 헤더" },
];

/** 셸을 씌우지 않는 경로. 로그인 화면은 네비가 있으면 안 된다. */
const BARE_ROUTES = new Set(["/admin/login"]);

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  // 🔴 후행 슬래시를 반드시 벗기고 비교한다. trailingSlash:true 라 배포본의 pathname 은
  //    "/admin/login/" 이고, BARE_ROUTES 는 슬래시 없는 형태다. 정규화를 빼면 로그인 화면이
  //    자기 인증 게이트에 걸려 무한 리다이렉트가 된다(2026-08-13 회귀 → 08-30 수정).
  const pathname = normalizeAppPathname(usePathname() || "");
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 토큰이 없으면 화면을 그리기 전에 로그인으로 보낸다. 예전에는 레이아웃이 아무것도 막지 않아
  // 각 페이지가 첫 요청에서 401 을 받을 때까지 빈 관리자 화면이 그대로 노출됐다.
  const [checked, setChecked] = useState(false);

  const bare = BARE_ROUTES.has(pathname);

  useEffect(() => {
    if (bare) {
      setChecked(true);
      return;
    }
    if (!getFlowerAdminToken()) {
      redirectToAdminLogin();
      return;
    }
    setChecked(true);
  }, [bare, pathname]);

  // 경로가 바뀌면 모바일 서랍을 닫는다 — 안 닫으면 이동 후에도 메뉴가 화면을 덮는다.
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const logout = useCallback(() => { redirectToAdminLogin(); }, []);

  if (bare) return <>{children}</>;
  if (!checked) {
    return (
      <div className="cd-admin flex min-h-screen items-center justify-center text-sm text-[var(--cd-adm-ink-quiet)]">
        확인 중...
      </div>
    );
  }

  return (
    <div className="cd-admin min-h-screen">
      {/* 모바일 상단바 */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--cd-adm-line)] bg-[var(--cd-adm-nav)] px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen((prev) => !prev)}
          className={adminButton("neutral", { size: "sm" })}
          aria-label={drawerOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={drawerOpen}
        >
          {drawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          메뉴
        </button>
        <span className="text-sm font-semibold">
          {ADMIN_NAV.find((item) => isActive(pathname, item.href))?.label || "관리자"}
        </span>
      </header>

      <div className="lg:grid lg:grid-cols-[236px_1fr]">
        {/* relative 는 cd-adm-nav::after(금빛 가장자리 실선)의 기준이다. CSS 쪽에서 position 을
            정하면 lg:sticky 와 특이도가 같아 로드 순서에 따라 데스크톱 sticky 가 죽는다. */}
        <nav
          className={`${drawerOpen ? "block" : "hidden"} cd-adm-nav relative border-b lg:sticky lg:top-0 lg:block lg:h-screen lg:border-b-0 lg:border-r`}
          aria-label="관리자 메뉴"
        >
          <div className="hidden items-center gap-2.5 border-b border-[var(--cd-adm-line)] px-4 py-3 lg:flex">
            <span className="cd-adm-brand-disc" aria-hidden="true" />
            <span className="cd-adm-brand">Code Destiny 관리자</span>
          </div>

          <ul className="space-y-0.5 p-3">
            {ADMIN_NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={item.hint}
                    className="cd-adm-nav-item"
                  >
                    <item.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-[var(--cd-adm-line)] p-3">
            <button
              type="button"
              onClick={logout}
              className="cd-adm-nav-item cd-adm-nav-item--quiet w-full"
              aria-label="로그아웃"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              로그아웃
            </button>
          </div>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
