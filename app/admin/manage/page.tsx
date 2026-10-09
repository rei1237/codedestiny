"use client";

// /admin/manage — 관리 허브. 기존 관리 기능을 그룹별 카드로 연다(레벨과 무관하게 전부 바로 열린다).
// 모바일 하단 "관리" 탭의 목적지이고, 이 브라우저만 예전 화면으로 돌리는 스위치도 여기 있다.

import Link from "next/link";
import { ADMIN_NAV, ADMIN_NAV_GROUPS } from "../_components/AdminShell";
import { adminButton } from "../_components/ui";
import { HqNotice, HqPageHeader, HqPanel } from "../_hq/components";
import { useAdminUiMode } from "../_hq/ui-mode";

export default function AdminManagePage() {
  const { mode, serverDisabled, localClassic, setLocalClassic } = useAdminUiMode();
  const items = ADMIN_NAV.filter((item) => item.href !== "/admin/manage" && (mode === "hq" || !item.hqOnly));

  return (
    <div className="cd-hq-page space-y-4">
      <HqPageHeader game="관리 허브" label="전체 관리 메뉴" description="기존 관리 기능은 모두 예전 주소 그대로 열립니다." />

      {ADMIN_NAV_GROUPS.map((group) => {
        const groupItems = items.filter((item) => item.group === group.id);
        if (!groupItems.length) return null;
        return (
          <HqPanel key={group.id} title={group.label} game={group.game}>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {groupItems.map(({ href, label, game, hint, Icon }) => (
                <li key={href}>
                  <Link href={`${href}/`.replace(/\/+$/, "/")} className="cd-hq-row cd-hq-focus flex min-h-[44px] items-start gap-3 rounded-[var(--cd-adm-radius)] px-3 py-2.5">
                    <Icon aria-hidden="true" size={18} className="mt-0.5 flex-none text-[var(--cd-adm-accent)]" />
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-[var(--cd-adm-ink)]">{game ? `${game} · ${label}` : label}</span>
                      <span className="cd-hq-quiet block text-[12px]">{hint}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </HqPanel>
        );
      })}

      <HqPanel title="화면 방식" game="되돌리기">
        <div className="space-y-2 text-[13px]">
          {serverDisabled ? (
            <HqNotice tone="warn">운영본부 화면이 서버 설정으로 꺼져 있어 모든 관리자에게 예전 화면이 보입니다.</HqNotice>
          ) : (
            <>
              <p className="cd-hq-quiet">이 브라우저에서만 예전 관리자 메뉴로 돌아갑니다. 데이터·주소는 그대로입니다.</p>
              <button type="button" className={adminButton("neutral", { size: "sm" })} onClick={() => setLocalClassic(!localClassic)} aria-pressed={localClassic}>
                {localClassic ? "운영본부 화면으로 돌아가기" : "예전 관리자 화면으로 보기"}
              </button>
            </>
          )}
        </div>
      </HqPanel>
    </div>
  );
}
