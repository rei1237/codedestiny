"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getTalismanCopy } from "../talismans/copy";
import { AFFIRMATION_IDS, WIDGET_TALISMANS, getHomeWidgetCopy, type AffirmationId, type WidgetTalisman } from "./copy";
import { approvedAssets } from "../talismans/catalog";
import { getPublicWidgetFortunes } from "@/lib/lock-screen-daily-fortune";
import { getHomeWidgetPools } from "@/lib/lock-screen-content";
import { lookName } from "./looks";
import { IS_APP_BUILD } from "@/lib/app-build-target";
import { nextWidgetStatus, type WidgetStatus } from "./widget-state.mjs";

type Kind = "talisman" | "affirmation" | "flower" | "fortune";
type Mode = "yeoni" | "yeongnyangi";
type Placement = { kind: Kind; itemId: string; text: string; pool?: readonly string[] };

type Handle = { remove: () => unknown };
type WidgetState = { pinSupported: boolean; widgets: { widgetId: number; kind?: string; itemId?: string }[]; addedToken: string };
type HomeWidgetPlugin = {
  getState: () => Promise<WidgetState>;
  requestPin: (input: Placement) => Promise<{ status: string; token?: string }>;
  update: (input: Placement & { widgetId: number }) => Promise<{ status: string }>;
  addListener: (event: "widgetAdded", listener: (data: { widgetId: number; token: string }) => void) => Promise<Handle> | Handle;
};
// 위젯 안의 작은 글씨는 네이티브 문자열(home_widget_caption)과 같다.
const WIDGET_CAPTION = "꿀꿀운세";

function widgetPlugin(): HomeWidgetPlugin | undefined {
  const capacitor = (window as unknown as { Capacitor?: { getPlatform?: () => string; Plugins?: { CodeDestinyHomeWidget?: HomeWidgetPlugin } } }).Capacitor;
  return capacitor?.getPlatform?.() === "android" ? capacitor.Plugins?.CodeDestinyHomeWidget : undefined;
}

export default function HomeWidgetStudio({previewOnly=false,assetOrigin=""}:{previewOnly?:boolean;assetOrigin?:string}={}) {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const [kind, setKind] = useState<Kind>("talisman");
  const [mode, setMode] = useState<Mode>("yeoni");
  const [talisman, setTalisman] = useState("yeoni-hanbok");
  const [day, setDay] = useState(0);
  const [fortuneArt, setFortuneArt] = useState<"cat-star-chart" | "pig-moon-tea">("cat-star-chart");
  const [rotating, setRotating] = useState(false);
  const [affirmation, setAffirmation] = useState<AffirmationId>("own-pace");
  const [status, setStatus] = useState<WidgetStatus>("idle");
  const [pinSupported, setPinSupported] = useState(true);
  const [fortuneCount, setFortuneCount] = useState(0);
  const [editId, setEditId] = useState(0);
  const [busy, setBusy] = useState(false);
  const pendingToken = useRef("");
  const copy = getHomeWidgetCopy(locale);
  const talismanCopy = getTalismanCopy(locale);
  const talismanNames: Record<WidgetTalisman, string> = { study: talismanCopy.wishStudy, wealth: talismanCopy.wishWealth, love: talismanCopy.wishLove, contact: talismanCopy.wishContact, success: talismanCopy.wishCareer, peace: talismanCopy.wishPeace };
  const ko = locale === "ko";
  const assets = useMemo(() => approvedAssets(), []);
  const pools = useMemo(() => {
    if (ko) return { ...getHomeWidgetPools(), fortune: getPublicWidgetFortunes() };
    return {
      affirmation: Object.values(copy.affirmations),
      flower: ["Lotus · A fresh start", "Camellia · Tenderness", "Iris · Hope", "Daisy · Sincerity", "Lavender · Calm"],
      fortune: ["Make time to finish one small task today.", "A quiet conversation may bring a fresh perspective.", "Give yourself room to choose your next step.", "Look for something you can simplify today."],
    };
  }, [ko, copy]);
  const dailyKind = kind === "flower" || kind === "fortune" ? kind : kind === "affirmation" && rotating ? "affirmation" : null;
  const offset = dailyKind === "flower" ? 13 : dailyKind === "affirmation" ? 7 : 0;
  const pool = dailyKind ? pools[dailyKind] : undefined;
  const line = pool ? pool[(day + offset) % pool.length] : copy.affirmations[affirmation];
  const choices = mode === "yeoni"
    ? [...assets.filter(a => a.scene === "yeoni-wardrobe"), ...assets.filter(a => a.scene === "yeoni-garden" || a.scene === "yeoni-lotus" || a.scene === "yeoni-teahouse")]
    : assets.filter(a => a.scene === "yeongnyangi");
  const widgetId = (id: string) => id.replace(/-yeongnyangi-v\d+$/, "");
  const selected = choices.find(a => widgetId(a.id) === talisman);
  function name(id: string) {
    const asset = assets.find(a => widgetId(a.id) === id);
    if (asset?.scene === "yeoni-wardrobe" || asset?.scene === "yeoni-garden" || asset?.category === "daily") return lookName(id, locale);
    const category = id.split("-")[0] as WidgetTalisman;
    const scene = asset?.scene === "yeoni-teahouse" ? talismanCopy.sceneTeahouse : asset?.scene === "yeoni-lotus" ? talismanCopy.sceneLotus : "";
    return [scene, talismanNames[category]].filter(Boolean).join(" · ");
  }
  function switchMode(value: Mode) {
    setMode(value); setTalisman(value === "yeoni" ? "yeoni-hanbok" : "wealth");
    if (kind === "flower" || kind === "fortune") setKind(value === "yeoni" ? "flower" : "fortune");
  }
  useEffect(() => {
    const refresh = () => setDay(Math.floor((Date.now() + 9 * 3600000) / 86400000));
    refresh();
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);


  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    sync();
    window.addEventListener("cd:locale-ready", sync);
    window.addEventListener("languagechange", sync);
    return () => { window.removeEventListener("cd:locale-ready", sync); window.removeEventListener("languagechange", sync); };
  }, []);

  useEffect(() => {
    const plugin = previewOnly ? undefined : widgetPlugin();
    if (!plugin) { setStatus("web"); return; }
    let active = true;
    let handle: Handle | undefined;
    const settle = (token?: string) => {
      setStatus(current => nextWidgetStatus(current, { type: "added", token, pendingToken: pendingToken.current }));
      if (token && token === pendingToken.current) void plugin.getState().then(state => {
        if (active) setFortuneCount(state.widgets.filter(widget => widget.kind === "fortune").length);
      }).catch(() => undefined);
    };
    void Promise.resolve(plugin.addListener("widgetAdded", data => settle(data.token)))
      .then(h => { if (active) handle = h; else void h.remove(); })
      .catch(() => undefined);
    const requested = Number(new URLSearchParams(window.location.search).get("widget"));
    plugin.getState().then(state => {
      if (!active) return;
      setPinSupported(state.pinSupported);
      setFortuneCount(state.widgets.filter(widget => widget.kind === "fortune").length);
      const mine = Number.isInteger(requested) && requested > 0 ? state.widgets.find(widget => widget.widgetId === requested) : undefined;
      if (!mine) return;
      setEditId(requested);
      const id = mine.itemId || "";
      const cat = WIDGET_TALISMANS.includes(id as WidgetTalisman);
      const restoredMode = mine.kind === "fortune" || cat || id.startsWith("cat-") ? "yeongnyangi" : "yeoni";
      setMode(restoredMode);
      if (mine.kind === "fortune") setFortuneArt(id === "cat-daily-tea" ? "pig-moon-tea" : "cat-star-chart");
      setTalisman(restoredMode === "yeoni" ? "yeoni-hanbok" : "wealth");
      if (mine.kind === "talisman" && (cat || approvedAssets().some(a => a.id === id))) { setKind("talisman"); setTalisman(id); }
      if (mine.kind === "flower" || mine.kind === "fortune") setKind(mine.kind);
      if (mine.kind === "affirmation") {
        setKind("affirmation"); setRotating(id.endsWith("-daily"));
        const fixed = id.replace(/^(cat|pig)-/, "") as AffirmationId;
        if (AFFIRMATION_IDS.includes(fixed)) setAffirmation(fixed);
      }
    }).catch(() => undefined);
    // 확인창에서 돌아왔는데 이벤트를 못 받은 경우에도, 네이티브가 기록한 성공 토큰으로만 완료를 판정한다.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !pendingToken.current) return;
      plugin.getState().then(state => { if (active) settle(state.addedToken); }).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; void handle?.remove(); document.removeEventListener("visibilitychange", onVisible); };
  }, [previewOnly]);

  function choose(next: () => void) {
    next();
    setStatus(current => nextWidgetStatus(current, { type: "select" }));
  }

  async function place() {
    const plugin = previewOnly ? undefined : widgetPlugin();
    if (!plugin || busy) return;
    const prefix = mode === "yeoni" ? "pig" : "cat";
    const itemId = kind === "fortune" && fortuneArt === "pig-moon-tea" ? "cat-daily-tea" : kind === "talisman" ? talisman : prefix + "-" + (dailyKind ? "daily" : affirmation);
    const text = kind === "talisman" ? "" : line;
    setBusy(true);
    try {
      if (editId) {
        const result = await plugin.update({ widgetId: editId, kind, itemId, text, pool });
        if (result.status !== "updated") setEditId(0);
        setStatus(current => nextWidgetStatus(current, { type: "update", status: result.status }));
      } else {
        const result = await plugin.requestPin({ kind, itemId, text, pool });
        if (result.status === "updated") { setFortuneCount(n => Math.max(1, n)); setStatus("updated"); return; }
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
  const showManual = status !== "web" && (status === "manual" || !pinSupported);

  return (
    <main className="cd-talisman cd-home-widget" data-yn-night data-mode={mode} lang={locale}>
      <header className="cd-talisman-header"><a href="/" aria-label={copy.backHome}><ArrowLeft size={22} aria-hidden /></a><span>{copy.brand}</span><span /></header>
      <div className="cd-talisman-intro"><h1>{copy.headline}</h1><p>{copy.intro}</p></div>
      <div className="cd-talisman-workspace">
        <section className="cd-talisman-preview-section" aria-label={copy.preview}>
          <div className="cd-home-widget-screen" role="img" aria-label={copy.preview + " · " + (kind === "talisman" ? name(talisman) : line)}>
            <div className="cd-home-widget-tile" data-kind={kind}>
              {kind === "talisman"
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={`${assetOrigin}/assets/talismans/widget/${talisman}.webp`} width={304} height={540} alt="" decoding="async" />
                : kind === "fortune" ? <><img className="cd-widget-fortune-art" src={`${assetOrigin}/assets/talismans/widget/${fortuneArt}-fortune.webp`} alt={ko ? "오늘의 운세" : "Today’s fortune"} /><strong>{line}</strong></>
                : <><img className="cd-widget-companion" src={assetOrigin+(kind === "flower" ? "/assets/talismans/widget/pig-moon-tea-face.webp" : mode === "yeoni" ? "/images/home/illustrated/yeoni-hanbok-240.webp" : "/assets/yeongnyangi/original/hero-480.webp")} alt="" /><small>{WIDGET_CAPTION}</small><strong>{line}</strong></>}
            </div>
            {Array.from({ length: 6 }, (_, i) => <i key={i} />)}
          </div>
              {kind === "talisman" && mode === "yeoni" && <fieldset className="cd-widget-wardrobe" disabled={busy}><legend>{ko ? "연이의 달빛 옷장" : "Yeoni’s wardrobe"}</legend>
                <div className="cd-widget-looks">{choices.filter(a => a.scene === "yeoni-wardrobe" && a.id !== "yeoni-pig-moon").map(a =>
                  <label key={a.id}><input type="radio" name="home-widget-talisman" checked={talisman === a.id} onChange={() => choose(() => setTalisman(a.id))} />
                    <span><img src={`${assetOrigin}/assets/talismans/widget/${a.id}.webp`} width="72" height="112" alt="" />{name(a.id)}</span>
                  </label>)}</div>
              </fieldset>}
          {!previewOnly && <p className="cd-talisman-caption">{copy.offline}</p>}
        </section>
        <section className="cd-talisman-controls" aria-label={copy.headline}>
          <fieldset disabled={busy}><legend>{ko ? "함께할 친구" : "Companion"}</legend><div className="cd-talisman-options">
            {(["yeoni", "yeongnyangi"] as const).map(value => <label key={value}><input type="radio" name="companion" checked={mode === value} onChange={() => choose(() => switchMode(value))} /><span>{value === "yeoni" ? (ko ? "연이" : "Yeoni") : (ko ? "영냥이" : "Yeongnyangi")}</span></label>)}
          </div></fieldset>
          <fieldset disabled={busy}><legend>{copy.kindLegend}</legend><div className="cd-talisman-options cd-home-widget-kinds">
            {(["affirmation", mode === "yeoni" ? "flower" : "fortune", "talisman"] as const).map(value => <label key={value}><input type="radio" name="home-widget-kind" checked={kind === value} onChange={() => choose(() => setKind(value))} /><span>{value === "talisman" ? copy.talisman : value === "flower" ? (ko ? "오늘의 꽃말" : "Today’s flower") : value === "fortune" ? (ko ? "오늘의 운세" : "Today’s fortune") : copy.affirmation}</span></label>)}
          </div></fieldset>
          {kind === "fortune" && <fieldset disabled={busy}><legend>{ko ? "오늘의 운세에 담을 친구 한 명" : "Choose one fortune companion"}</legend>
            <div className="cd-talisman-options">{(["cat-star-chart", "pig-moon-tea"] as const).map(id =>
              <label key={id}><input type="radio" name="fortune-art" checked={fortuneArt === id} onChange={() => choose(() => setFortuneArt(id))} />
                <span><img className="cd-widget-swatch" src={`${assetOrigin}/assets/talismans/widget/${id}-face.webp`} width="34" height="34" alt="" />{id === "cat-star-chart" ? (ko ? "영냥이" : "Yeongnyangi") : (ko ? "꽃돼지 연이" : "Yeoni")}</span>
              </label>)}</div>
            <p>{ko ? "한 명을 골라 적용하세요. 다음에 친구를 바꾸면 같은 위젯의 그림이 바뀝니다." : "Choose one companion. Changing it replaces the picture in the same widget."}</p>
            {fortuneCount > 1 && <p>{ko ? "이전 버전에서 두 개를 놓았다면 홈에서 하나를 길게 눌러 삭제하세요." : "If two older widgets are on your home screen, long-press one to remove it."}</p>}
          </fieldset>}
          {kind === "talisman"
            ? <>
              <details open={mode === "yeongnyangi" || selected?.scene !== "yeoni-wardrobe" || selected?.id === "yeoni-pig-moon"}>
                <summary>{copy.talismanLegend}</summary>
                <fieldset disabled={busy}><legend className="sr-only">{copy.talismanLegend}</legend><div className="cd-talisman-options">
                  {choices.filter(a => a.scene !== "yeoni-wardrobe" || a.id === "yeoni-pig-moon").map(a => widgetId(a.id)).map(id =>
                    <label key={id}><input type="radio" name="home-widget-talisman" checked={talisman === id} onChange={() => choose(() => setTalisman(id))} />
                      <span><img className="cd-widget-swatch" src={`${assetOrigin}/assets/talismans/widget/${id}.webp`} width="34" height="54" alt="" />{name(id)}</span>
                    </label>)}
                </div></fieldset>
              </details>
            </>
             : kind === "affirmation" ? <fieldset disabled={busy}><legend>{copy.affirmationLegend}</legend><div className="cd-talisman-scenes">
              <label><input type="radio" name="home-widget-affirmation" checked={rotating} onChange={() => choose(() => setRotating(true))} /><span>{ko ? "매일 바뀌는 확언" : "Daily affirmation"}</span></label>
              {AFFIRMATION_IDS.map(id => <label key={id}><input type="radio" name="home-widget-affirmation" checked={!rotating && affirmation === id} onChange={() => choose(() => { setRotating(false); setAffirmation(id); })} /><span>{copy.affirmations[id]}</span></label>)}
            </div></fieldset> : kind === "fortune" ? <a href="/today/">{ko ? "오늘의 운세 자세히 보기" : "Read today’s fortune"}</a> : null}
          {showManual ? <div className="cd-talisman-instructions"><p><strong>{copy.manualTitle}</strong><br />{copy.manualSteps}</p><p>{copy.manualHint}</p></div> : null}
          {status !== "web" && <p className="cd-talisman-caption">{copy.remove}</p>}
        </section>
      </div>
      {/* 고르는 동안에도 추가 버튼과 진행 상태가 화면 아래에 늘 보이게 둔다. */}
      <div className="cd-home-widget-dock">
        <div className="cd-talisman-actions" aria-busy={busy}>
          {!previewOnly && kind === "talisman" && selected && <a className="cd-widget-wallpaper" href={(IS_APP_BUILD ? "/app/talismans/index.html" : "/app/talismans/") + "?asset=" + encodeURIComponent(selected.id)}>{ko ? "배경화면으로 설정" : "Set wallpaper"}</a>}
          {status !== "web" && <button type="button" disabled={busy} onClick={() => void place()}>{kind === "fortune" && fortuneCount > 0 ? (ko ? "선택한 친구로 변경" : "Change companion") : editId ? copy.change : copy.add}</button>}
        </div>
        <p className="cd-talisman-status" role="status" aria-live="polite">{message}</p>
      </div>
    </main>
  );
}
