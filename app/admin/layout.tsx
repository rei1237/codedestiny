import type { Metadata } from "next";
// 관리자 전용 토큰·공용 부품. app/insights/layout.js 가 insights-hub.css 를 싣는 것과 같은 자리다.
// 🔴 styles/ 에 두지 않는다 — sync:public 이 public/styles/ 로 미러하면서 정적 셸의
//    build-<hash> 캐시 키를 통째로 갱신한다(실측 19개 파일). Next 가 번들하므로 미러는 불필요하다.
import "./admin-yehwa.css";

import AdminShell from "./_components/AdminShell";

const ADMIN_LAYOUT_TITLE = "Code Destiny Admin";
const ADMIN_LAYOUT_DESCRIPTION = "Private Code Destiny operations dashboard.";

const ADMIN_LAYOUT_METADATA: Metadata = {
  title: ADMIN_LAYOUT_TITLE,
  description: ADMIN_LAYOUT_DESCRIPTION,
  alternates: {
    canonical: "/admin/",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const metadata = ADMIN_LAYOUT_METADATA;

// 공용 셸이 네비게이션과 인증 게이트를 한곳에서 맡는다. 각 페이지의 401 처리는 그대로 두었다 —
// 셸은 토큰 유무만 보고, 토큰이 만료·위조된 경우는 adminFetch 의 기존 401 경로가 잡는다.
// (원칙 6: 같은 장치를 이중으로 걸지 않는다. 새 리다이렉트 계층을 만들지 않고 기존 것을 쓴다.)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
