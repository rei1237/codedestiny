import type { Metadata } from "next";

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
