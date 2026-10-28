import type { ReactNode } from "react";
// PSYCHOTEST_FREE_ENTRY: retained export for existing callers; no payment or entitlement use.
export default function PaidPsychotestLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return <a href={href} className={className}>{children}</a>;
}
