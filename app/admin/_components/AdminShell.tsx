"use client";

// 관리자 공용 셸 — 좌측 네비 + 인증 게이트.
//
// 예전에는 공용 네비가 없어 화면마다 <Link> 를 하드코딩했다. 그 결과 /admin/orders 는 나가는
// 링크가 하나도 없는 막다른 길이었고, /admin/cache-status 는 어디서도 도달할 수 없었으며,
// 프롬프트 랩과 CMS 는 라벨 없는 아이콘 버튼 하나로만 갈 수 있었다.
//
// 메뉴는 이 파일의 ADMIN_NAV 하나가 정본이다. 화면을 추가하면 여기 한 줄만 넣는다.
// 2026-10 별빛 운영본부: 항목에 group 을 붙여 묶어 보여 줄 뿐, 기존 주소는 하나도 바뀌지 않는다.
// 롤백(ui-mode.tsx)이 켜지면 hqOnly 항목을 빼고 예전 순서의 평면 메뉴로 돌아간다.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Compass,
  FileText,
  Gem,
  LayoutGrid,
  LayoutList,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Receipt,
  ScrollText,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

import { normalizeAppPathname } from "@/app/app/_lib/app-route";
import { getFlowerAdminToken, redirectToAdminLogin } from "../_lib/admin-api";
import { AdminUiModeProvider, useAdminUiMode } from "../_hq/ui-mode";
import { adminButton } from "./ui";

export type AdminNavGroup = "hq" | "vault" | "library" | "parlor" | "workshop" | "control";

export interface AdminNavItem {
  href: string;
  /** 실제 기능명. 게임식 이름이 있어도 항상 이 이름이 함께 보인다. */
  label: string;
  Icon: typeof FileText;
  hint: string;
  group: AdminNavGroup;
  /** 게임식 이름(별빛 운영본부 전용 화면만). */
  game?: string;
  /** 롤백(classic) 모드에서는 숨기는 새 화면. */
  hqOnly?: boolean;
  /** 사이드바에는 그리지 않는다(모바일 하단 탭·제목 조회 전용). */
  navHidden?: boolean;
}

/** 그룹 머리말 — 게임식 이름 · 실제 기능 묶음. 순서가 곧 사이드바의 그룹 순서다. */
export const ADMIN_NAV_GROUPS: { id: AdminNavGroup; game: string; label: string; keeper: string }[] = [
  { id: "hq", game: "별빛 운영본부", label: "운영 현황", keeper: "영냥이" },
  { id: "vault", game: "별빛 금고", label: "주문과 결제", keeper: "네오" },
  { id: "library", game: "연이의 서재", label: "콘텐츠 관리", keeper: "연이" },
  { id: "parlor", game: "연이의 응접실", label: "고객 경험", keeper: "연이" },
  { id: "workshop", game: "성장 공방", label: "마케팅 운영", keeper: "영냥이" },
  { id: "control", game: "네오의 관제실", label: "안정성", keeper: "네오" },
];

/** 좌측 네비의 단일 정본. 기존 11개 항목은 예전 순서 그대로 두어 롤백 시 그 순서가 돌아온다. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "운영 홈", game: "별빛 운영본부", Icon: Compass, hint: "오늘의 퀘스트·알림·지표", group: "hq", hqOnly: true },
  { href: "/admin/quests", label: "마케팅 일정", game: "별빛 퀘스트", Icon: ScrollText, hint: "캠페인 작업·증빙·발행 확인", group: "hq", hqOnly: true },
  { href: "/admin/growth", label: "성과와 XP", game: "성장 기록", Icon: TrendingUp, hint: "운영 XP·레벨·업적·지표", group: "hq", hqOnly: true },
  { href: "/admin/manage", label: "전체 관리 메뉴", game: "관리 허브", Icon: LayoutGrid, hint: "기존 관리 기능 모음", group: "hq", hqOnly: true, navHidden: true },
  { href: "/admin/recommendations", label: "생활 추천", Icon: LayoutList, hint: "승인 전 상품·공식 링크 검수", group: "workshop" },
  { href: "/admin/kakao-crm", label: "카카오 CRM", Icon: MessageSquare, hint: "소재·발송 검토·비용 정산", group: "workshop" },
  { href: "/admin/content", label: "글 편집", Icon: FileText, hint: "블로그·인사이트 작성과 발행", group: "library" },
  { href: "/admin/prompts", label: "프롬프트 랩", Icon: Sparkles, hint: "운세별 프롬프트를 결제 없이 확인", group: "library" },
  { href: "/admin/cms", label: "콘텐츠 관리", Icon: LayoutList, hint: "AI 프롬프트·운세 해설·문구 편집", group: "library" },
  { href: "/admin/orders", label: "주문 · 환불", Icon: Receipt, hint: "결제 조회와 환불", group: "vault" },
  { href: "/admin/reviews", label: "리뷰", Icon: MessageSquare, hint: "리뷰 승인과 관리", group: "parlor" },
  { href: "/admin/feedback", label: "버그 제보", Icon: MessageSquare, hint: "제보 확인과 보상 지급", group: "parlor" },
  { href: "/admin/monthly-credits", label: "월정석 지급", Icon: Gem, hint: "마케팅 월정석 지급", group: "workshop" },
  { href: "/admin/insights", label: "콘텐츠 진단", Icon: Activity, hint: "발행·메타·피드 상태 점검", group: "library" },
  { href: "/admin/connections", label: "연결 상태", game: "관측소 연결", Icon: Radar, hint: "결제·발행·분석 원천 동기화", group: "control", hqOnly: true },
  { href: "/admin/cache-status", label: "배포 · 캐시", Icon: Activity, hint: "배포 버전과 캐시 헤더", group: "control" },
];

/** 모바일 하단 탭 4개. 나머지 기능은 "관리" 탭(/admin/manage)에서 그룹별로 연다. */
const MOBILE_TABS: { href: string; label: string; Icon: typeof FileText; match: string[] }[] = [
  { href: "/admin", label: "본부", Icon: Compass, match: ["/admin"] },
  { href: "/admin/quests", label: "퀘스트", Icon: ScrollText, match: ["/admin/quests"] },
  { href: "/admin/growth", label: "성과", Icon: TrendingUp, match: ["/admin/growth"] },
  { href: "/admin/manage", label: "관리", Icon: LayoutGrid, match: [] },
];

/** 셸을 씌우지 않는 경로. 로그인 화면은 네비가 있으면 안 된다. */
const BARE_ROUTES = new Set(["/admin/login"]);

const COLLAPSE_KEY = "cd_admin_nav_collapsed";

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // "/admin" 은 모든 관리자 경로의 접두어라 정확히 일치할 때만 활성이다.
  if (href === "/admin") return false;
  return pathname.startsWith(`${href}/`);
}

function isMobileTabActive(pathname: string, tab: (typeof MOBILE_TABS)[number]): boolean {
  if (tab.match.some((href) => isActive(pathname, href))) return true;
  if (tab.href !== "/admin/manage") return false;
  // 본부·퀘스트·성과가 아닌 모든 관리 화면에서는 "관리" 탭이 켜진다.
  return !MOBILE_TABS.slice(0, 3).some((other) => other.match.some((href) => isActive(pathname, href)));
}

function NavLink({ item, active, collapsed }: { item: AdminNavItem; active: boolean; collapsed: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? `${item.game ? `${item.game} · ` : ""}${item.label} — ${item.hint}` : item.hint}
      aria-label={collapsed ? item.label : undefined}
      className={`cd-adm-nav-item${collapsed ? " cd-adm-nav-item--icon" : ""}`}
    >
      <item.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {collapsed ? null : (
        <span className="min-w-0">
          <span className="block truncate">{item.label}</span>
          {item.game ? <span className="cd-adm-nav-game">{item.game}</span> : null}
        </span>
      )}
    </Link>
  );
}

// 운영본부 신규 화면만 셸이 여백을 준다. 기존 관리 화면은 각자 여백·전폭 레이아웃을 가지므로 건드리지 않는다.
const HQ_PADDED_ROUTES = new Set(["/admin", "/admin/quests", "/admin/growth", "/admin/connections", "/admin/manage", "/admin/hq-demo"]);

function ShellFrame({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const { mode, localClassic, serverDisabled, setLocalClassic } = useAdminUiMode();
  const hq = mode === "hq";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1"); } catch { /* 저장 불가 */ }
  }, []);

  // 경로가 바뀌면 모바일 서랍을 닫는다 — 안 닫으면 이동 후에도 메뉴가 화면을 덮는다.
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* 저장 불가 */ }
      return next;
    });
  }, []);

  const logout = useCallback(() => { redirectToAdminLogin(); }, []);

  const items = ADMIN_NAV.filter((item) => hq || !item.hqOnly);
  const current = items.find((item) => isActive(pathname, item.href));
  // 서랍(모바일)에서는 접힘 상태를 무시한다 — 아이콘만 남은 서랍은 쓸 수 없다.
  const railCollapsed = hq && collapsed;

  const renderList = (asRail: boolean) => {
    if (!hq) {
      return (
        <ul className="space-y-0.5 p-3">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(pathname, item.href)} collapsed={false} />
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-3 p-3">
        {ADMIN_NAV_GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.group === group.id && !item.navHidden);
          if (groupItems.length === 0) return null;
          return (
            <section key={group.id} aria-label={`${group.game} · ${group.label}`}>
              {asRail ? (
                <div className="mx-2 mb-1 border-t border-[var(--cd-adm-line)]" aria-hidden="true" />
              ) : (
                <p className="cd-adm-nav-group">
                  <span>{group.game}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="cd-adm-nav-group-label">{group.label}</span>
                </p>
              )}
              <ul className="space-y-0.5">
                {groupItems.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={isActive(pathname, item.href)} collapsed={asRail} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`cd-admin min-h-screen${hq ? " cd-admin--hq" : ""}`}>
      {/* 모바일 상단바 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--cd-adm-line)] bg-[var(--cd-adm-nav)] px-4 py-2.5 lg:hidden">
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
        <span className="min-w-0 truncate text-right text-sm font-semibold">
          {current?.game ? <span className="mr-1.5 font-normal text-[var(--cd-adm-ink-quiet)]">{current.game}</span> : null}
          {current?.label || "관리자"}
        </span>
      </header>

      <div className={railCollapsed ? "lg:grid lg:grid-cols-[72px_1fr]" : "lg:grid lg:grid-cols-[248px_1fr]"}>
        {/* relative 는 cd-adm-nav::after(금빛 가장자리 실선)의 기준이다. CSS 쪽에서 position 을
            정하면 lg:sticky 와 특이도가 같아 로드 순서에 따라 데스크톱 sticky 가 죽는다. */}
        <nav
          className={`${drawerOpen ? "block" : "hidden"} cd-adm-nav relative border-b lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r`}
          aria-label="관리자 메뉴"
        >
          <div className="hidden items-center gap-2.5 border-b border-[var(--cd-adm-line)] px-4 py-3 lg:flex">
            <span className="cd-adm-brand-disc" aria-hidden="true" />
            {railCollapsed ? null : (
              hq ? (
                <span className="min-w-0 flex-1">
                  <span className="cd-adm-brand block truncate">CODE DESTINY</span>
                  <span className="cd-adm-nav-game block truncate">별빛 운영본부</span>
                </span>
              ) : (
                <span className="cd-adm-brand min-w-0 flex-1 truncate">Code Destiny 관리자</span>
              )
            )}
            {hq ? (
              <button
                type="button"
                onClick={toggleCollapsed}
                className="cd-adm-nav-item cd-adm-nav-item--icon cd-adm-nav-item--quiet ml-auto"
                aria-label={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
                aria-expanded={!collapsed}
                title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
              </button>
            ) : null}
          </div>

          {/* 모바일 서랍은 항상 펼친 목록, 데스크톱 레일은 접힘 상태를 따른다. */}
          <div className="lg:hidden">{renderList(false)}</div>
          <div className="hidden lg:block">{renderList(railCollapsed)}</div>

          <div className="border-t border-[var(--cd-adm-line)] p-3">
            {/* 이 브라우저만 예전 화면으로 돌린 경우의 복귀 버튼 — 관리 허브가 숨겨져 있어 여기 둔다. */}
            {localClassic && !serverDisabled ? (
              <button type="button" onClick={() => setLocalClassic(false)} className="cd-adm-nav-item cd-adm-nav-item--quiet mb-1 w-full">
                운영본부 화면으로 돌아가기
              </button>
            ) : null}
            <button
              type="button"
              onClick={logout}
              className={`cd-adm-nav-item cd-adm-nav-item--quiet w-full${railCollapsed ? " lg:justify-center" : ""}`}
              aria-label="로그아웃"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className={railCollapsed ? "lg:sr-only" : ""}>로그아웃</span>
            </button>
          </div>
        </nav>

        <div className={`min-w-0${HQ_PADDED_ROUTES.has(pathname) ? " px-4 pt-4 lg:px-6 lg:pt-6" : ""}${hq ? " pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0" : ""}`}>{children}</div>
      </div>

      {hq ? (
        <nav className="cd-adm-tabbar lg:hidden" aria-label="운영본부 하단 탭">
          {MOBILE_TABS.map((tab) => {
            const active = isMobileTabActive(pathname, tab);
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className="cd-adm-tab">
                <tab.Icon className="h-5 w-5" aria-hidden="true" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  // 🔴 후행 슬래시를 반드시 벗기고 비교한다. trailingSlash:true 라 배포본의 pathname 은
  //    "/admin/login/" 이고, BARE_ROUTES 는 슬래시 없는 형태다. 정규화를 빼면 로그인 화면이
  //    자기 인증 게이트에 걸려 무한 리다이렉트가 된다(2026-08-13 회귀 → 08-30 수정).
  const pathname = normalizeAppPathname(usePathname() || "");
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

  if (bare) return <>{children}</>;
  if (!checked) {
    return (
      <div className="cd-admin flex min-h-screen items-center justify-center text-sm text-[var(--cd-adm-ink-quiet)]">
        확인 중...
      </div>
    );
  }

  return (
    <AdminUiModeProvider active={checked}>
      <ShellFrame pathname={pathname}>{children}</ShellFrame>
    </AdminUiModeProvider>
  );
}
