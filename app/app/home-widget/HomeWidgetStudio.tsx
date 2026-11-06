"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getTalismanCopy } from "../talismans/copy";
import { AFFIRMATION_IDS, WIDGET_TALISMANS, getHomeWidgetCopy, type AffirmationId, type WidgetTalisman } from "./copy";
import { nextWidgetStatus, type WidgetStatus } from "./widget-state.mjs";

type Kind = "talisman" | "affirmation";
type Handle = { remove: () => unknown };
type WidgetState = { pinSupported: boolean; widgets: { widgetId: number; kind?: string; itemId?: string }[]; addedToken: string };
type HomeWidgetPlugin = {
  getState: () => Promise<WidgetState>;
  requestPin: (input: { kind: Kind; itemId: string; text: string }) => Promise<{ status: string; token?: string }>;
  update: (input: { widgetId: number; kind: Kind; itemId: string; text: string }) => Promise<{ status: string }>;
  addListener: (event: "widgetAdded", listener: (data: { widgetId: number; token: string }) => void) => Promise<Handle> | Handle;
};
// 위젯 안의 작은 글씨는 네이티브 문자열(home_widget_caption)과 같다.
const WIDGET_CAPTION = "꿀꿀운세";

function widgetPlugin(): HomeWidgetPlugin | undefined {
  const capacitor = (window as unknown as { Capacitor?: { getPlatform?: () => string; Plugins?: { CodeDestinyHomeWidget?: HomeWidgetPlugin } } }).Capacitor;
  return capacitor?.getPlatform?.() === "android" ? capacitor.Plugins?.CodeDestinyHomeWidget : undefined;
}

export default function HomeWidgetStudio() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const [kind, setKind] = useState<Kind>("talisman");
  const [talisman, setTalisman] = useState<WidgetTalisman>("wealth");
  const [affirmation, setAffirmation] = useState<AffirmationId>("own-pace");
  const [status, setStatus] = useState<WidgetStatus>("idle");
  const [pinSupported, setPinSupported] = useState(true);
  const [editId, setEditId] = useState(0);
  const [busy, setBusy] = useState(false);
  const pendingToken = useRef("");
  const copy = getHomeWidgetCopy(locale);
  const talismanCopy = getTalismanCopy(locale);
  const talismanNames: Record<WidgetTalisman, string> = { study: talismanCopy.wishStudy, wealth: talismanCopy.wishWealth, love: talismanCopy.wishLove, contact: talismanCopy.wishContact, success: talismanCopy.wishCareer };
  const line = copy.affirmations[affirmation];

  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    sync();
    window.addEventListener("cd:locale-ready", sync);
    window.addEventListener("languagechange", sync);
    return () => { window.removeEventListener("cd:locale-ready", sync); window.removeEventListener("languagechange", sync); };
  }, []);

  useEffect(() => {
    const plugin = widgetPlugin();
    if (!plugin) { setStatus("web"); return; }
    let active = true;
    let handle: Handle | undefined;
    const settle = (token?: string) => setStatus(current => nextWidgetStatus(current, { type: "added", token, pendingToken: pendingToken.current }));
    void Promise.resolve(plugin.addListener("widgetAdded", data => settle(data.token)))
      .then(h => { if (active) handle = h; else void h.remove(); })
      .catch(() => undefined);
    const requested = Number(new URLSearchParams(window.location.search).get("widget"));
    plugin.getState().then(state => {
      if (!active) return;
      setPinSupported(state.pinSupported);
      const mine = Number.isInteger(requested) && requested > 0 ? state.widgets.find(widget => widget.widgetId === requested) : undefined;
      if (!mine) return;
      setEditId(requested);
      if (mine.kind === "talisman" && WIDGET_TALISMANS.includes(mine.itemId as WidgetTalisman)) { setKind("talisman"); setTalisman(mine.itemId as WidgetTalisman); }
      if (mine.kind === "affirmation" && AFFIRMATION_IDS.includes(mine.itemId as AffirmationId)) { setKind("affirmation"); setAffirmation(mine.itemId as AffirmationId); }
    }).catch(() => undefined);
    // 확인창에서 돌아왔는데 이벤트를 못 받은 경우에도, 네이티브가 기록한 성공 토큰으로만 완료를 판정한다.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !pendingToken.current) return;
      plugin.getState().then(state => { if (active) settle(state.addedToken); }).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; void handle?.remove(); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  function choose(next: () => void) {
    next();
    setStatus(current => nextWidgetStatus(current, { type: "select" }));
  }

  async function place() {
    const plugin = widgetPlugin();
    if (!plugin || busy) return;
    const itemId = kind === "talisman" ? talisman : affirmation;
    const text = kind === "talisman" ? "" : line;
    setBusy(true);
    try {
      if (editId) {
        const result = await plugin.update({ widgetId: editId, kind, itemId, text });
        if (result.status !== "updated") setEditId(0);
        setStatus(current => nextWidgetStatus(current, { type: "update", status: result.status }));
      } else {
        const result = await plugin.requestPin({ kind, itemId, text });
        pendingToken.current = result.token || "";
        setStatus(current => nextWidgetStatus(current, { type: "pin", status: result.status }));
      }
    } catch {
      setStatus(current => nextWidgetStatus(current, { type: "error" }));
    } finally {
      setBusy(false);
    }
  }

  const message = status === "web" ? copy.webOnly : status === "requested" ? copy.requested : status === "added" ? copy.added :
    status === "updated" ? copy.updated : status === "missing" ? copy.missing : status === "failed" ? copy.failed :
    busy ? copy.busy : editId ? copy.editing : "";
  const showManual = status === "manual" || status === "web" || !pinSupported;

  return (
    <main className="cd-talisman cd-home-widget" data-yn-night lang={locale}>
      <header className="cd-talisman-header"><a href="/" aria-label={copy.backHome}><ArrowLeft size={22} aria-hidden /></a><span>{copy.brand}</span><span /></header>
      <div className="cd-talisman-intro"><h1>{copy.headline}</h1><p>{copy.intro}</p></div>
      <div className="cd-talisman-workspace">
        <section className="cd-talisman-preview-section" aria-label={copy.preview}>
          <div className="cd-home-widget-screen" role="img" aria-label={copy.preview + " · " + (kind === "talisman" ? talismanNames[talisman] : line)}>
            <div className="cd-home-widget-tile" data-kind={kind}>
              {kind === "talisman"
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={`/assets/talismans/widget/${talisman}.webp`} width={304} height={540} alt="" decoding="async" />
                : <><small>{WIDGET_CAPTION}</small><strong>{line}</strong></>}
            </div>
            {Array.from({ length: 6 }, (_, i) => <i key={i} />)}
          </div>
          <p className="cd-talisman-caption">{copy.offline}</p>
        </section>
        <section className="cd-talisman-controls" aria-label={copy.headline}>
          <fieldset disabled={busy}><legend>{copy.kindLegend}</legend><div className="cd-talisman-options cd-home-widget-kinds">
            {(["talisman", "affirmation"] as const).map(value => <label key={value}><input type="radio" name="home-widget-kind" checked={kind === value} onChange={() => choose(() => setKind(value))} /><span>{value === "talisman" ? copy.talisman : copy.affirmation}</span></label>)}
          </div></fieldset>
          {kind === "talisman"
            ? <fieldset disabled={busy}><legend>{copy.talismanLegend}</legend><div className="cd-talisman-options">
              {WIDGET_TALISMANS.map(id => <label key={id}><input type="radio" name="home-widget-talisman" checked={talisman === id} onChange={() => choose(() => setTalisman(id))} /><span>{talismanNames[id]}</span></label>)}
            </div></fieldset>
            : <fieldset disabled={busy}><legend>{copy.affirmationLegend}</legend><div className="cd-talisman-scenes">
              {AFFIRMATION_IDS.map(id => <label key={id}><input type="radio" name="home-widget-affirmation" checked={affirmation === id} onChange={() => choose(() => setAffirmation(id))} /><span>{copy.affirmations[id]}</span></label>)}
            </div></fieldset>}
          <div className="cd-talisman-actions" aria-busy={busy}>
            <button type="button" disabled={busy || status === "web"} onClick={() => void place()}>{editId ? copy.change : copy.add}</button>
          </div>
          <p className="cd-talisman-status" role="status" aria-live="polite">{message}</p>
          {showManual ? <div className="cd-talisman-instructions"><p><strong>{copy.manualTitle}</strong><br />{copy.manualSteps}</p><p>{copy.manualHint}</p></div> : null}
          <p className="cd-talisman-caption">{copy.remove}</p>
        </section>
      </div>
    </main>
  );
}
