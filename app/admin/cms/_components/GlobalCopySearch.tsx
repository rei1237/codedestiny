"use client";
import { useEffect, useRef, useState } from "react";
import { CMS_NAMESPACES } from "@/lib/cms/registry.mjs";
import { adminFetch } from "../../_lib/admin-api";
import { adminButton } from "../../_components/ui";
import { loadBaseEntries } from "../_lib/base-values";
import { matchesCopy, mergeCopy, visualFields, type Fields } from "../_lib/visual-fields";
import styles from "../cms-workspace.module.css";

type Match = { ns: string; key: string; label: string; group: string; excerpt: string; path: string[] };
export default function GlobalCopySearch({ query, disabled, onSelect }: { query: string; disabled: boolean; onSelect: (ns: string, key: string, path: string[]) => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const generation = useRef(0);
  useEffect(() => { generation.current++; setBusy(false); setSearched(""); setMatches([]); setFailures([]); }, [query]);
  useEffect(() => () => { generation.current++; }, []);
  const search = async () => {
    const run = ++generation.current;
    const needle = query.trim();
    if (!needle) return;
    setBusy(true); setMatches([]); setFailures([]); setSearched(needle);
    const groups = CMS_NAMESPACES.filter((item) => item.editor !== "prompt");
    const found: Match[] = []; const failed: string[] = [];
    for (let start = 0; start < groups.length; start += 3) {
      if (generation.current !== run) return;
      await Promise.all(groups.slice(start, start + 3).map(async (group) => {
        const [defaults, saved] = await Promise.allSettled([
          loadBaseEntries(group.ns),
          adminFetch<{ items?: Array<{ key: string; fields: Fields }> }>("/api/admin/cms/entries?ns=" + encodeURIComponent(group.ns)),
        ]);
        if (defaults.status === "rejected" || saved.status === "rejected") failed.push(group.label);
        const base = defaults.status === "fulfilled" ? defaults.value : [];
        const edits = saved.status === "fulfilled" ? saved.value.items || [] : [];
        const keys = new Set([...base.map((item) => item.key), ...edits.map((item) => item.key)]);
        for (const key of keys) {
          const original = base.find((item) => item.key === key);
          const fields = mergeCopy(original?.fields || {}, edits.find((item) => item.key === key)?.fields);
          const label = original?.label || key;
          if (!matchesCopy(needle, group.label, label, key, original?.fields, fields)) continue;
          const field = visualFields(fields).find((item) => !item.image && matchesCopy(needle, item.value));
          found.push({ ns: group.ns, key, label, group: group.label, excerpt: field?.value || original?.hint || "항목 열기", path: field?.path || [] });
        }
      }));
    }
    if (generation.current !== run) return;
    setMatches(found); setFailures(failed); setBusy(false);
  };
  return <div className="space-y-2">
    <button type="button" disabled={disabled || busy || !query.trim()} className={adminButton()} onClick={() => { void search(); }}>{busy ? "전체 화면에서 찾는 중…" : "전체 화면·결과에서 찾기"}</button>
    {searched ? <div aria-live="polite"><p className={styles.note}>{busy ? "각 화면의 기본 문장과 저장한 수정본을 확인하고 있어요." : matches.length + "개 항목 · AI 프롬프트 제외"}</p>
      {failures.length ? <p role="alert" className={styles.note}>일부 그룹을 불러오지 못했어요: {failures.join(", ")}. 다시 검색해 주세요.</p> : null}
      <div className="max-h-80 overflow-y-auto" aria-label="전체 화면 검색 결과">{matches.map((item) => <button type="button" key={item.ns + ":" + item.key} className={styles.copyRow} disabled={disabled} onClick={() => onSelect(item.ns, item.key, item.path)}><span>{item.group} · {item.label}</span><p className={styles.matchExcerpt}>{item.excerpt}</p></button>)}</div>
    </div> : null}
  </div>;
}
