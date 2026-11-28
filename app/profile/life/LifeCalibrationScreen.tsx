"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTPick } from "@/lib/i18n/useT";
import { useSavedBirthProfiles } from "@/app/hooks/useSavedBirthProfiles";
import { readDestinyProfileAccountId, resolveDestinyProfileBirthParts, type DestinyProfileCard } from "@/app/_lib/profile-card-storage";
import { lifeCalibrationApi } from "@/app/_lib/life-calibration-client";
import {
  INPUT_DOMAINS, INPUT_OUTCOMES, INPUT_POLICY, canAddEntry, createEntry, fromApiEvents, kstYearNow, legacyOfferDone, legacyToEntries,
  markLegacyOfferDone, noteNeedsCaution, patternSummary, readLegacyCalibration, readSelfHint, removeEntry, sortEntries, toApiEvents,
  upsertEntry, validateEntries, validateEntry, writeSelfHint, yearRange,
} from "@/lib/life-calibration/input-state.mjs";
import { LIFE_CALIBRATION_NS, LIFE_COPY_KO, fill, type LifeCopyKey } from "./life-copy";
import styles from "./life.module.css";

type Entry = {
  id: string; year: number; month: number | null; domain: string | null; outcome: string; intensity: number;
  certainty: string; note: string; channel: string; noteUnavailable?: boolean;
};
type Phase = "loading" | "signin" | "consent" | "self" | "edit" | "error";
type Notice = { tone: "ok" | "warn"; key: LifeCopyKey } | null;

const COL = 48;
const GRAPH_H = 200;
const MID = GRAPH_H / 2;
const STEP = 26;
const MODE_KEY = "codeDestiny:lifeCalibration:mode";
const LOGIN_HREF = "/login/?next=%2Fprofile%2Flife%2F";

const profileIdOf = (p: DestinyProfileCard) => String(p.id || p.profileId || "");
const storage = () => { try { return window.localStorage; } catch { return null; } };

function OutcomeMark({ outcome }: { outcome: string }) {
  // 색만으로 구분하지 않는다: 모양(▲ ▼ ◆)과 글자 라벨을 함께 쓴다.
  const glyph = outcome === "good" ? "▲" : outcome === "bad" ? "▼" : "◆";
  return <span aria-hidden="true" className={styles.mark} data-outcome={outcome}>{glyph}</span>;
}

export default function LifeCalibrationScreen() {
  const pick = useTPick(LIFE_CALIBRATION_NS, "ko");
  const t = useCallback((k: LifeCopyKey, params?: Record<string, string | number>) => {
    const text = pick(`${LIFE_CALIBRATION_NS}.${k}`, LIFE_COPY_KO[k]) || LIFE_COPY_KO[k];
    return params ? fill(text, params) : text;
  }, [pick]);
  const domainLabel = (d: string | null) => (d ? t(`domain_${d}` as LifeCopyKey) : "");
  const outcomeLabel = (o: string) => t(o === "good" ? "outcomeGood" : o === "bad" ? "outcomeBad" : "outcomeMixed");

  const { profiles, loading: profilesLoading, reload: reloadProfiles } = useSavedBirthProfiles();
  const [phase, setPhase] = useState<Phase>("loading");
  const [selfId, setSelfId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [mode, setMode] = useState<"graph" | "list">("graph");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [editor, setEditor] = useState<{ entry: Entry; isNew: boolean; errors: string[] } | null>(null);
  const [caution, setCaution] = useState(false);
  const [legacy, setLegacy] = useState<Entry[] | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [age14, setAge14] = useState(false);
  const [consentError, setConsentError] = useState<LifeCopyKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [addYear, setAddYear] = useState<number>(kstYearNow());
  const graphRef = useRef<HTMLDivElement>(null);

  const selfProfile = useMemo(() => profiles.find((p) => profileIdOf(p) === selfId) || null, [profiles, selfId]);
  const birthYear = useMemo(() => resolveDestinyProfileBirthParts(selfProfile)?.year, [selfProfile]);
  const nowYear = kstYearNow();
  const years = useMemo(() => yearRange(birthYear, nowYear), [birthYear, nowYear]);
  const validation = useMemo(() => validateEntries(entries, { birthYear, nowYear }), [entries, birthYear, nowYear]);
  const pattern = useMemo(() => patternSummary(entries), [entries]);

  useEffect(() => { try { const m = storage()?.getItem(MODE_KEY); if (m === "list" || m === "graph") setMode(m); } catch { /* 기본 그래프 */ } }, []);
  const switchMode = (m: "graph" | "list") => { setMode(m); try { storage()?.setItem(MODE_KEY, m); } catch { /* 저장 불가여도 계속 */ } };

  const enterEdit = useCallback((profileId: string, events: unknown[]) => {
    setSelfId(profileId);
    setEntries(sortEntries(fromApiEvents(events)) as Entry[]);
    setDirty(false);
    setPhase("edit");
    writeSelfHint(storage(), readDestinyProfileAccountId(), profileId);
    // 옛 사주 보정 기록은 서버에 아무것도 없을 때 한 번만 초안으로 제안한다(자동 업로드 없음).
    if (!events.length && !legacyOfferDone(storage(), profileId)) {
      const draft = legacyToEntries(readLegacyCalibration(storage(), profileId), {}) as Entry[];
      setLegacy(draft.length ? draft : null);
    } else setLegacy(null);
  }, []);

  const resolveSelf = useCallback(async (preferred: string) => {
    const account = readDestinyProfileAccountId();
    const candidate = preferred || readSelfHint(storage(), account);
    if (candidate) {
      const res = await lifeCalibrationApi.getEvents(candidate);
      if (res.ok) { enterEdit(candidate, res.data.events || []); return; }
      if (res.status === 401) { setPhase("signin"); return; }
      if (res.code !== "PROFILE_NOT_SELF" && res.code !== "PROFILE_NOT_OWNED") { setPhase("error"); return; }
    }
    setCandidateId(candidate);
    setPhase("self");
  }, [enterEdit]);

  const boot = useCallback(async () => {
    setPhase("loading");
    setNotice(null);
    if (!readDestinyProfileAccountId()) { setPhase("signin"); return; }
    const consent = await lifeCalibrationApi.getConsent();
    if (!consent.ok) { setPhase(consent.status === 401 ? "signin" : "error"); return; }
    if (!consent.data.granted) { setPhase("consent"); return; }
    const preferred = new URLSearchParams(window.location.search).get("profileId") || "";
    await resolveSelf(preferred.slice(0, 80));
  }, [resolveSelf]);

  useEffect(() => { void boot(); }, [boot]);

  // 그래프는 최근 연도가 먼저 보이게 오른쪽 끝으로 둔다.
  useEffect(() => {
    if (phase === "edit" && mode === "graph" && graphRef.current) graphRef.current.scrollLeft = graphRef.current.scrollWidth;
  }, [phase, mode, years.length]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function agree() {
    if (!age14) { setConsentError("consentAgeNeeded"); return; }
    setBusy(true); setConsentError(null);
    const res = await lifeCalibrationApi.setConsent(true, true);
    setBusy(false);
    if (!res.ok) {
      if (res.code === "AGE14_ATTESTATION_REQUIRED") setConsentError("consentAgeNeeded");
      else if (res.status === 401) setPhase("signin");
      else setConsentError("errorBody");
      return;
    }
    setPhase("loading");
    const preferred = new URLSearchParams(window.location.search).get("profileId") || "";
    await resolveSelf(preferred.slice(0, 80));
  }

  function later() {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/ggulggul/");
  }

  async function pickSelf(profileId: string) {
    setBusy(true);
    const res = await lifeCalibrationApi.setSelf(profileId);
    if (!res.ok) { setBusy(false); setPhase(res.status === 401 ? "signin" : "error"); return; }
    const ev = await lifeCalibrationApi.getEvents(profileId);
    setBusy(false);
    if (!ev.ok) { setPhase("error"); return; }
    enterEdit(profileId, ev.data.events || []);
  }

  function openNew(year: number) {
    if (!canAddEntry(entries)) { setNotice({ tone: "warn", key: "limitReached" }); return; }
    setEditor({ entry: createEntry(year) as Entry, isNew: true, errors: [] });
  }
  function openEdit(entry: Entry) { setEditor({ entry: { ...entry }, isNew: false, errors: [] }); }
  function patchEditor(patch: Partial<Entry>) { setEditor((cur) => (cur ? { ...cur, entry: { ...cur.entry, ...patch }, errors: [] } : cur)); }

  function commitEditor(skipCaution = false) {
    if (!editor) return;
    const errors = validateEntry(editor.entry, { birthYear, nowYear, others: entries });
    if (errors.length) { setEditor({ ...editor, errors }); return; }
    if (!skipCaution && noteNeedsCaution(editor.entry.note)) { setCaution(true); return; }
    setEntries((cur) => sortEntries(upsertEntry(cur, editor.entry)) as Entry[]);
    setSelectedYear(editor.entry.year);
    setDirty(true); setNotice(null); setEditor(null); setCaution(false);
  }

  function deleteEntry(id: string) {
    setEntries((cur) => removeEntry(cur, id) as Entry[]);
    setDirty(true); setNotice(null); setEditor(null);
  }

  function acceptLegacy() {
    if (!legacy) return;
    markLegacyOfferDone(storage(), selfId);
    setEntries(legacy); setLegacy(null); setDirty(true);
    setNotice({ tone: "warn", key: "legacyLoaded" });
    switchMode("list");
  }
  function skipLegacy() { markLegacyOfferDone(storage(), selfId); setLegacy(null); }

  async function save() {
    if (!validation.ok) { setNotice({ tone: "warn", key: "fixFirst" }); switchMode("list"); return; }
    setSaving(true); setNotice(null);
    const res = await lifeCalibrationApi.putEvents(selfId, toApiEvents(entries));
    setSaving(false);
    if (res.ok) {
      setEntries(sortEntries(fromApiEvents(res.data.events || [])) as Entry[]);
      setDirty(false);
      setNotice({ tone: "ok", key: "saved" });
      return;
    }
    if (res.status === 401) { setPhase("signin"); return; }
    if (res.code === "INVALID_LIFE_EVENT") setNotice({ tone: "warn", key: "saveInvalid" });
    else if (res.code === "NOTE_ENCRYPTION_UNAVAILABLE") setNotice({ tone: "warn", key: "noteEncryption" });
    else if (res.code === "LIFE_CALIBRATION_CONSENT_REQUIRED") setPhase("consent");
    else if (res.code === "PROFILE_NOT_SELF" || res.code === "PROFILE_NOT_OWNED") setPhase("self");
    else setNotice({ tone: "warn", key: "errorBody" });
  }

  async function withdraw() {
    setBusy(true);
    const res = await lifeCalibrationApi.setConsent(false);
    setBusy(false); setWithdrawOpen(false);
    if (!res.ok) { setNotice({ tone: "warn", key: "errorBody" }); return; }
    setEntries([]); setDirty(false); setSelfId(""); setAge14(false);
    setNotice({ tone: "ok", key: "withdrawDone" });
    setPhase("consent");
  }

  const header = (
    <header className={styles.head}>
      <h1 className={styles.title}>{t("pageTitle")}</h1>
      <p className={styles.lead}>{t("pageLead")}</p>
    </header>
  );

  if (phase === "loading") {
    return <main className={styles.page} aria-busy="true">{header}<p className={styles.status} role="status">{t("loading")}</p></main>;
  }

  if (phase === "signin") {
    return (
      <main className={styles.page}>
        {header}
        <section className={styles.card} data-state="signin">
          <h2 className={styles.cardTitle}>{t("signinTitle")}</h2>
          <p className={styles.body}>{t("signinBody")}</p>
          <a className={styles.primary} href={LOGIN_HREF}>{t("signinCta")}</a>
        </section>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className={styles.page}>
        {header}
        <section className={styles.card} data-state="error" role="alert">
          <h2 className={styles.cardTitle}>{t("errorTitle")}</h2>
          <p className={styles.body}>{t("errorBody")}</p>
          <div className={styles.row}>
            <button type="button" className={styles.primary} onClick={() => void boot()}>{t("retry")}</button>
            <button type="button" className={styles.ghost} onClick={later}>{t("back")}</button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "consent") {
    return (
      <main className={styles.page}>
        {header}
        {notice ? <p className={styles.notice} data-tone={notice.tone} role="status">{t(notice.key)}</p> : null}
        <div className={styles.scrim} />
        <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="lcConsentTitle" data-state="consent">
          <h2 id="lcConsentTitle" className={styles.sheetTitle}>{t("consentTitle")}</h2>
          <ul className={styles.terms}>
            <li>{t("consentItems")}</li>
            <li>{t("consentPurpose")}</li>
            <li>{t("consentRetention")}</li>
            <li>{t("consentTransfer")}</li>
            <li><strong>{t("consentOptional")}</strong></li>
          </ul>
          <label className={styles.check}>
            <input type="checkbox" checked={age14} onChange={(e) => { setAge14(e.target.checked); setConsentError(null); }} />
            <span>{t("consentAge14")}</span>
          </label>
          {consentError ? <p className={styles.fieldError} role="alert">{t(consentError)}</p> : null}
          <div className={styles.sheetActions}>
            <button type="button" className={styles.primary} onClick={() => void agree()} disabled={busy}>{t("consentAgree")}</button>
            <button type="button" className={styles.ghost} onClick={later}>{t("consentLater")}</button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "self") {
    return (
      <main className={styles.page}>
        {header}
        <section className={styles.card} data-state="self">
          <h2 className={styles.cardTitle}>{t("selfTitle")}</h2>
          <p className={styles.body}>{t("selfBody")}</p>
          {profilesLoading ? <p className={styles.status} role="status">{t("loading")}</p> : null}
          {!profilesLoading && !profiles.length ? (
            <div className={styles.empty}>
              <p className={styles.body}>{t("selfEmpty")}</p>
              <div className={styles.row}>
                <a className={styles.primary} href="/ggulggul/">{t("selfMake")}</a>
                <button type="button" className={styles.ghost} onClick={() => void reloadProfiles()}>{t("retry")}</button>
              </div>
            </div>
          ) : null}
          <ul className={styles.cards}>
            {profiles.map((p) => {
              const id = profileIdOf(p);
              const year = resolveDestinyProfileBirthParts(p)?.year;
              return (
                <li key={id}>
                  <button type="button" className={styles.profileButton} data-current={id === candidateId || undefined} disabled={busy} onClick={() => void pickSelf(id)}>
                    <span className={styles.profileName}>{p.name || "—"}</span>
                    {year ? <span className={styles.profileMeta}>{t("selfBirth", { year })}</span> : null}
                    <span className={styles.profileCta}>{t("selfPick")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    );
  }

  // ── 입력(edit) ──
  const byYear = new Map<number, Entry[]>();
  for (const e of entries) byYear.set(e.year, [...(byYear.get(e.year) || []), e]);
  const valueOf = (list: Entry[]) => Math.max(-3, Math.min(3, list.reduce((s, e) => s + (e.outcome === "good" ? e.intensity : e.outcome === "bad" ? -e.intensity : 0), 0)));
  const plotted = years.filter((y) => byYear.has(y)).map((y) => ({ y, x: (years.indexOf(y) + 0.5) * COL, v: valueOf(byYear.get(y) || []) }));
  const dominant = (list: Entry[]) => {
    const v = valueOf(list);
    return v > 0 ? "good" : v < 0 ? "bad" : "mixed";
  };
  const selectedEntries = selectedYear != null ? byYear.get(selectedYear) || [] : [];
  const editorErrors = editor?.errors || [];

  const entryRow = (e: Entry) => {
    const errs = validation.byId[e.id] || [];
    return (
      <li key={e.id} className={styles.entry} data-invalid={errs.length ? "true" : undefined}>
        <div className={styles.entryMain}>
          <OutcomeMark outcome={e.outcome} />
          <div>
            <p className={styles.entryTitle}>
              {e.year}{e.month ? ` · ${t("monthValue", { month: e.month })}` : ""} · {outcomeLabel(e.outcome)}
            </p>
            <p className={styles.entryMeta}>
              {e.domain ? domainLabel(e.domain) : <span className={styles.fieldError}>{t("domainRequired")}</span>}
              {" · "}{t(`intensity${e.intensity}` as LifeCopyKey)}
              {e.certainty === "unsure" ? ` · ${t("unsureLabel")}` : ""}
            </p>
            {e.noteUnavailable ? <p className={styles.entryNote}>{t("noteUnavailable")}</p> : e.note ? <p className={styles.entryNote}>{e.note}</p> : null}
            {errs.includes("duplicate") ? <p className={styles.fieldError}>{t("domainDuplicate")}</p> : null}
          </div>
        </div>
        <div className={styles.entryActions}>
          <button type="button" className={styles.small} onClick={() => openEdit(e)}>{t("edit")}</button>
          <button type="button" className={styles.small} onClick={() => deleteEntry(e.id)}>{t("remove")}</button>
        </div>
      </li>
    );
  };

  return (
    <main className={styles.page} data-state="edit">
      {header}

      {legacy ? (
        <section className={styles.card} data-state="legacy">
          <h2 className={styles.cardTitle}>{t("legacyTitle")}</h2>
          <p className={styles.body}>{t("legacyBody", { count: legacy.length })}</p>
          <div className={styles.row}>
            <button type="button" className={styles.primary} onClick={acceptLegacy}>{t("legacyLoad")}</button>
            <button type="button" className={styles.ghost} onClick={skipLegacy}>{t("legacySkip")}</button>
          </div>
        </section>
      ) : null}

      <div className={styles.toolbar}>
        <div className={styles.segment} role="group" aria-label={`${t("modeGraph")} / ${t("modeList")}`}>
          <button type="button" aria-pressed={mode === "graph"} onClick={() => switchMode("graph")}>{t("modeGraph")}</button>
          <button type="button" aria-pressed={mode === "list"} onClick={() => switchMode("list")}>{t("modeList")}</button>
        </div>
        <span className={styles.counter}>{t("count", { count: entries.length, max: INPUT_POLICY.maxEntries })}</span>
      </div>

      {mode === "graph" ? (
        <section className={styles.card} data-state="graph">
          <p className={styles.hint}>{t("graphHint")}</p>
          <div className={styles.graphScroll} ref={graphRef}>
            <div className={styles.graph} style={{ width: years.length * COL, height: GRAPH_H + 28 }}>
              <svg className={styles.graphSvg} width={years.length * COL} height={GRAPH_H} aria-hidden="true" focusable="false">
                <line x1={0} x2={years.length * COL} y1={MID} y2={MID} className={styles.axis} />
                {plotted.length > 1 ? <polyline className={styles.line} points={plotted.map((p) => `${p.x},${MID - p.v * STEP}`).join(" ")} /> : null}
                {plotted.map((p) => {
                  const kind = dominant(byYear.get(p.y) || []);
                  const cy = MID - p.v * STEP;
                  if (kind === "good") return <polygon key={p.y} className={styles.dotGood} points={`${p.x},${cy - 9} ${p.x - 8},${cy + 6} ${p.x + 8},${cy + 6}`} />;
                  if (kind === "bad") return <polygon key={p.y} className={styles.dotBad} points={`${p.x},${cy + 9} ${p.x - 8},${cy - 6} ${p.x + 8},${cy - 6}`} />;
                  return <polygon key={p.y} className={styles.dotMixed} points={`${p.x},${cy - 8} ${p.x + 8},${cy} ${p.x},${cy + 8} ${p.x - 8},${cy}`} />;
                })}
              </svg>
              {years.map((y) => {
                const count = byYear.get(y)?.length || 0;
                return (
                  <button
                    key={y}
                    type="button"
                    className={styles.yearCol}
                    style={{ left: years.indexOf(y) * COL, width: COL }}
                    aria-label={t("yearAria", { year: y, count })}
                    aria-pressed={selectedYear === y}
                    data-has={count ? "true" : undefined}
                    onClick={() => { setSelectedYear(y); if (!count) openNew(y); }}
                  >
                    <span className={styles.yearLabel}>{y % 5 === 0 || y === nowYear || count ? y : "·"}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <ul className={styles.legend} aria-hidden="true">
            <li><OutcomeMark outcome="good" /> {t("graphGood")}</li>
            <li><OutcomeMark outcome="bad" /> {t("graphBad")}</li>
            <li><OutcomeMark outcome="mixed" /> {t("graphMixed")}</li>
          </ul>
          {!entries.length ? (
            <div className={styles.empty} data-state="empty">
              <p className={styles.cardTitle}>{t("emptyTitle")}</p>
              <p className={styles.body}>{t("emptyBody")}</p>
            </div>
          ) : null}
          {selectedYear != null && selectedEntries.length ? (
            <div className={styles.yearPanel}>
              <ul className={styles.entries}>{selectedEntries.map(entryRow)}</ul>
              <button type="button" className={styles.ghost} onClick={() => openNew(selectedYear)}>{t("editorNew")}</button>
            </div>
          ) : null}
        </section>
      ) : (
        <section className={styles.card} data-state="list">
          {entries.length ? <ul className={styles.entries}>{entries.map(entryRow)}</ul> : (
            <div className={styles.empty} data-state="empty">
              <p className={styles.cardTitle}>{t("emptyTitle")}</p>
              <p className={styles.body}>{t("emptyBody")}</p>
            </div>
          )}
          <div className={styles.addRow}>
            <label className={styles.fieldLabel}>
              <span>{t("yearLabel")}</span>
              <select className={styles.select} value={addYear} onChange={(e) => setAddYear(Number(e.target.value))}>
                {[...years].reverse().map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <button type="button" className={styles.ghost} onClick={() => openNew(addYear)} disabled={!canAddEntry(entries)}>{t("addYear")}</button>
          </div>
          {!canAddEntry(entries) ? <p className={styles.hint}>{t("limitReached", { max: INPUT_POLICY.maxEntries })}</p> : null}
        </section>
      )}

      <section className={styles.pattern} aria-live="polite">
        <h2 className={styles.patternTitle}>{t("patternTitle")}</h2>
        <p className={styles.body}>{t(`pattern_${pattern.kind}` as LifeCopyKey, { domain: domainLabel(pattern.domain || null) })}</p>
      </section>

      <div className={styles.saveBar}>
        <p className={styles.saveStatus} role="status" data-tone={notice?.tone}>
          {notice ? t(notice.key, { max: INPUT_POLICY.maxEntries }) : saving ? t("saving") : dirty ? t("unsaved") : ""}
        </p>
        <button type="button" className={styles.primary} onClick={() => void save()} disabled={!dirty || saving}>{saving ? t("saving") : t("save")}</button>
      </div>

      <footer className={styles.foot}>
        <button type="button" className={styles.link} onClick={() => setPhase("self")}>{t("selfChange")}</button>
        <button type="button" className={styles.link} onClick={() => setWithdrawOpen(true)}>{t("withdrawTitle")}</button>
      </footer>

      {editor ? (
        <>
          <div className={styles.scrim} onClick={() => setEditor(null)} />
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="lcEditorTitle" data-state="editor"
            onKeyDown={(e) => { if (e.key === "Escape") setEditor(null); }}>
            <h2 id="lcEditorTitle" className={styles.sheetTitle}>{t("editorTitle", { year: editor.entry.year })}</h2>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>
                <span>{t("yearLabel")}</span>
                <select className={styles.select} value={editor.entry.year} onChange={(e) => patchEditor({ year: Number(e.target.value) })}>
                  {[...years].reverse().map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label className={styles.fieldLabel}>
                <span>{t("monthLabel")}</span>
                <select className={styles.select} value={editor.entry.month ?? ""} onChange={(e) => patchEditor({ month: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">{t("monthUnknown")}</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{t("monthValue", { month: m })}</option>)}
                </select>
              </label>
            </div>

            <fieldset className={styles.fieldset}>
              <legend>{t("outcomeLabel")}</legend>
              <div className={styles.choices}>
                {INPUT_OUTCOMES.map((o: string) => (
                  <button key={o} type="button" className={styles.choice} aria-pressed={editor.entry.outcome === o} data-outcome={o} onClick={() => patchEditor({ outcome: o })}>
                    <OutcomeMark outcome={o} /> {outcomeLabel(o)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>{t("domainLabel")}</legend>
              <div className={styles.chips}>
                {INPUT_DOMAINS.map((d: string) => (
                  <button key={d} type="button" className={styles.chip} aria-pressed={editor.entry.domain === d} onClick={() => patchEditor({ domain: d })}>{domainLabel(d)}</button>
                ))}
              </div>
              {editorErrors.includes("domain_required") ? <p className={styles.fieldError} role="alert">{t("domainRequired")}</p> : null}
              {editorErrors.includes("duplicate") ? <p className={styles.fieldError} role="alert">{t("domainDuplicate")}</p> : null}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>{t("intensityLabel")}</legend>
              <div className={styles.choices}>
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" className={styles.choice} aria-pressed={editor.entry.intensity === n} onClick={() => patchEditor({ intensity: n })}>
                    <span aria-hidden="true" className={styles.pips}>{"●".repeat(n)}{"○".repeat(3 - n)}</span> {t(`intensity${n}` as LifeCopyKey)}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className={styles.check}>
              <input type="checkbox" checked={editor.entry.certainty === "unsure"} onChange={(e) => patchEditor({ certainty: e.target.checked ? "unsure" : "sure" })} />
              <span>{t("unsureLabel")}</span>
            </label>

            <label className={styles.fieldLabel}>
              <span>{t("noteLabel")}</span>
              <textarea className={styles.textarea} rows={2} maxLength={INPUT_POLICY.noteMax} value={editor.entry.note}
                placeholder={t("notePlaceholder")} onChange={(e) => patchEditor({ note: e.target.value, noteUnavailable: false })} />
            </label>
            <p className={styles.hint}>{t("noteHint")} <span className={styles.counterInline}>{t("noteCount", { count: editor.entry.note.length, max: INPUT_POLICY.noteMax })}</span></p>

            <div className={styles.sheetActions}>
              <button type="button" className={styles.primary} onClick={() => commitEditor()}>{t("done")}</button>
              {!editor.isNew ? <button type="button" className={styles.ghost} onClick={() => deleteEntry(editor.entry.id)}>{t("remove")}</button> : null}
              <button type="button" className={styles.ghost} onClick={() => setEditor(null)}>{t("cancel")}</button>
            </div>
          </section>
        </>
      ) : null}

      {caution ? (
        <>
          <div className={styles.scrim} data-layer="top" />
          <section className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="lcCautionTitle" aria-describedby="lcCautionBody" data-state="caution">
            <h2 id="lcCautionTitle" className={styles.sheetTitle}>{t("cautionTitle")}</h2>
            <p id="lcCautionBody" className={styles.body}>{t("cautionBody")}</p>
            <div className={styles.sheetActions}>
              <button type="button" className={styles.primary} onClick={() => setCaution(false)}>{t("cautionEdit")}</button>
              <button type="button" className={styles.ghost} onClick={() => commitEditor(true)}>{t("cautionKeep")}</button>
            </div>
          </section>
        </>
      ) : null}

      {withdrawOpen ? (
        <>
          <div className={styles.scrim} onClick={() => setWithdrawOpen(false)} />
          <section className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="lcWithdrawTitle" data-state="withdraw">
            <h2 id="lcWithdrawTitle" className={styles.sheetTitle}>{t("withdrawTitle")}</h2>
            <p className={styles.body}>{t("withdrawBody")}</p>
            <div className={styles.sheetActions}>
              <button type="button" className={styles.primary} onClick={() => void withdraw()} disabled={busy}>{t("withdrawConfirm")}</button>
              <button type="button" className={styles.ghost} onClick={() => setWithdrawOpen(false)}>{t("cancel")}</button>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
