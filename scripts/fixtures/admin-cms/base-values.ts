import type { CmsBaseEntry } from "../../../app/admin/cms/_lib/base-values";
export async function loadBaseEntries(ns: string): Promise<CmsBaseEntry[]> {
  const response = await fetch("/__fixture/defaults?ns=" + encodeURIComponent(ns));
  if (!response.ok) throw new Error("Fixture load failure");
  return response.json();
}
