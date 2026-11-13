"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Moon, Share2, Smartphone } from "lucide-react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { IS_APP_BUILD } from "@/lib/app-build-target";
import { approvedAssets, categories, scenes, verifyOriginal, type Category, type Scene } from "./catalog";
import { fittedWallpaper, normalizeScreen, wallpaperFit, type ScreenSize, type WallpaperTarget } from "./wallpaper-fit";
import { TarotTalismanControls, TarotTalismanMeaning } from "./TarotTalismanPanel";
import {
  findTarotTalismanCard,
  tarotTalismanCards,
  tarotTalismanImageCandidates,
  type TarotOrientation,
  type TarotTalismanDeck,
  type TarotTalismanGroup,
} from "./tarot-talisman-data";

import { lookName } from "../home-widget/looks";
import { getTalismanCopy } from "./copy";

const TALISMAN_REMOTE_ORIGIN = "https://code-destiny.com";

type ExportAction = "original" | "fit" | "share" | "apply" | "picker";
type StudioMode = "illustration" | "tarot";
type NativeExports = {
  getScreenInfo?: () => Promise<ScreenSize>;
  exportImage: (input: { action: string; base64: string; fileName: string; target: WallpaperTarget }) => Promise<{ status: string }>;
};
function nativeExports(): NativeExports | undefined {
  return (window as unknown as { Capacitor?: { Plugins?: { CodeDestinyWallpaper?: NativeExports } } }).Capacitor?.Plugins?.CodeDestinyWallpaper;
}
function platform(): string {
  return (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.() || "web";
}
function base64Of(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("IMAGE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function widgetAssetId(id: string): string {
  return id.replace(/-yeongnyangi-v\d+$/, "");
}

export default function TalismanStudio() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const [device, setDevice] = useState("web");
  const [scene, setScene] = useState<Scene>("yeongnyangi");
  const [category, setCategory] = useState<Category>("study");
  const [mode, setMode] = useState<StudioMode>("illustration");
  const [tarotDeck, setTarotDeck] = useState<TarotTalismanDeck>("yeongnyangi");
  const [tarotGroup, setTarotGroup] = useState<TarotTalismanGroup>("major");
  const [tarotCard, setTarotCard] = useState(tarotTalismanCards[0]);
  const [tarotOrientation, setTarotOrientation] = useState<TarotOrientation>("upright");
  const [target, setTarget] = useState<WallpaperTarget>("lock");
  const [preview, setPreview] = useState<"lock" | "home">("lock");
  const [screen, setScreen] = useState<ScreenSize>({ width: 1080, height: 2340 });
  const [size, setSize] = useState(1);
  const [position, setPosition] = useState(0.5);
  const [guides, setGuides] = useState(true);
  const [loaded, setLoaded] = useState<{ id: string; file: File; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [savedFit, setSavedFit] = useState(false);
  const assets = useMemo(() => approvedAssets(), []);
  const [selectionReady, setSelectionReady] = useState(false);
  const [lookId, setLookId] = useState("yeoni-hanbok");
  const illustrationAsset = scene === "yeoni-wardrobe" ? assets.find(item => item.id === lookId) : assets.find(item => item.scene === scene && item.category === category);
  const tarotSources = tarotTalismanImageCandidates(tarotCard, tarotDeck, locale);
  const tarotSourceKey = tarotSources.join("|");
  const asset = mode === "tarot" ? { id: `tarot-${tarotDeck}-${tarotCard.code}`, width: 600, height: 900, src: tarotSources[0] || "" } : illustrationAsset;
  const ready = Boolean(asset && loaded?.id === asset.id);
  const fit = asset ? wallpaperFit(asset, screen, size, position) : null;
  const copy = getTalismanCopy(locale);
  const sceneNames = { "yeoni-garden": locale === "ko" ? "꽃돼지 연이 · 소원의 뜰" : "Yeoni’s wish garden", yeongnyangi: copy.sceneStarlight, "yeoni-lotus": copy.sceneLotus, "yeoni-teahouse": copy.sceneTeahouse, "yeoni-wardrobe": locale === "ko" ? "연이 · 달빛 옷장" : "Yeoni’s wardrobe" };
  const categoryNames = { reunion: locale === "ko" ? "재회" : "Reunion", daily: locale === "ko" ? "오늘의 그림" : "Daily illustration", study: copy.wishStudy, wealth: copy.wishWealth, love: copy.wishLove, contact: copy.wishContact, career: copy.wishCareer, peace: copy.wishPeace };
  const sceneName = mode === "tarot" ? `${tarotCard.nameKo} · ${tarotDeck === "yeongnyangi" ? "영냥이 달빛 덱" : "연이의 운명 찻집"}` : scene === "yeoni-wardrobe" ? lookName(lookId, locale) : sceneNames[scene];
  const targetName = target === "both" ? copy.targetBoth : target === "home" ? copy.targetHome : copy.targetLock;

  useEffect(() => {
    let active = true;
    const sync = () => setLocale(getCurrentLoadingLocale());
    const syncScreen = async () => {
      const native = nativeExports();
      const fallback = innerWidth >= 740 && platform() === "web" ? { width: 1080, height: 2340 } : { width: window.screen.width * devicePixelRatio, height: window.screen.height * devicePixelRatio };
      const current = native?.getScreenInfo ? await native.getScreenInfo().catch(() => fallback) : fallback;
      if (active) setScreen(normalizeScreen(current.width, current.height));
    };
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("asset");
    const selected = approvedAssets().find(item => item.id === requested);
    if (selected) {
      setMode("illustration");
      setScene(selected.scene); setCategory(selected.category); setLookId(selected.id);
      setPreview("home"); setTarget("home");
    }
    const requestedTarot = findTarotTalismanCard(params.get("card"));
    const requestedDeck = params.get("deck");
    if (requestedTarot && (requestedDeck === "yeongnyangi" || requestedDeck === "teahouse")) {
      setMode("tarot");
      setTarotDeck(requestedDeck);
      setTarotCard(requestedTarot);
      setTarotGroup(requestedTarot.group);
      setTarotOrientation(params.get("orientation") === "reversed" ? "reversed" : "upright");
      setPreview("lock"); setTarget("lock");
    }
    setSelectionReady(true);
    sync(); setDevice(platform()); void syncScreen();
    window.addEventListener("cd:locale-ready", sync);
    window.addEventListener("languagechange", sync);
    window.addEventListener("orientationchange", syncScreen);
    return () => { active = false; window.removeEventListener("cd:locale-ready", sync); window.removeEventListener("languagechange", sync); window.removeEventListener("orientationchange", syncScreen); };
  }, []);

  useEffect(() => {
    setLoaded(null); setMessage(""); setSavedFit(false);
    if (!selectionReady || !asset) return;
    const controller = new AbortController();
    let url = "";
    void (async () => {
      try {
        const candidates = mode === "tarot" ? tarotSources : [(IS_APP_BUILD ? TALISMAN_REMOTE_ORIGIN : "") + asset.src];
        let response: Response | null = null;
        for (const source of candidates) {
          response = await fetch(source, { signal: controller.signal, cache: "force-cache" }).catch(() => null);
          if (response?.ok) break;
        }
        if (!response?.ok) throw new Error("IMAGE_UNAVAILABLE");
        const bytes = await response.arrayBuffer();
        if (mode === "illustration" && illustrationAsset) await verifyOriginal(bytes, illustrationAsset);
        if (controller.signal.aborted) return;
        const contentType = response.headers?.get?.("content-type") || (mode === "tarot" ? "image/webp" : "image/png");
        const extension = contentType.includes("png") ? "png" : contentType.includes("avif") ? "avif" : "webp";
        const file = new File([bytes], asset.id + "." + extension, { type: contentType });
        url = URL.createObjectURL(file);
        setLoaded({ id: asset.id, file, url });
      } catch {
        if (!controller.signal.aborted) setMessage(copy.imageFailed);
      }
    })();
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [asset?.id, asset?.src, copy.imageFailed, illustrationAsset, mode, selectionReady, tarotSourceKey]);

  function chooseDailyTalisman() {
    const pool = assets.filter(item => ["yeongnyangi", "yeoni-lotus", "yeoni-teahouse"].includes(item.scene) && item.category !== "daily");
    if (!pool.length) return;
    const seoulDay = Math.floor((Date.now() + 9 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000));
    const selected = pool[seoulDay % pool.length];
    setMode("illustration");
    setScene(selected.scene);
    setCategory(selected.category);
    setLookId(selected.id);
    setMessage("");
    setSavedFit(false);
  }

  async function exportImage(action: ExportAction) {
    if (!ready || !loaded || !asset || busy) return;
    setBusy(true); setMessage(""); setSavedFit(false);
    let downloadUrl = "";
    try {
      const plugin = nativeExports();
      if ((action === "apply" || action === "picker") && !plugin) throw new Error("NATIVE_UNAVAILABLE");
      const color = getComputedStyle(document.querySelector(".cd-talisman")!).getPropertyValue("--yn-deep").trim();
      const file = action === "original" ? loaded.file : await fittedWallpaper(loaded.url, asset, screen, size, position, color, asset.id + "-fit-" + target + ".png");
      let status: string;
      if (plugin) {
        const nativeAction = action === "apply" ? "wallpaper" : action === "picker" ? "wallpaperPicker" : action === "share" ? "share" : "save";
        const result = await plugin.exportImage({ action: nativeAction, base64: await base64Of(file), fileName: file.name, target });
        status = result.status;
      } else if (action === "share" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: sceneName }); status = "shared";
      } else if (action === "original" || action === "fit") {
        downloadUrl = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = downloadUrl; link.download = file.name; link.click(); status = "download";
      } else {
        setMessage(copy.shareManually); return;
      }
      setSavedFit(action === "fit" && status === "saved");
      setMessage(status === "applied" ? copy.applied.replace("{target}", targetName) :
        status === "cancelled" ? copy.cancelled :
        status === "returned" ? copy.pickerReturned :
        status === "saved" ? (action === "original" ? copy.originalSaved : copy.fitSaved) :
        status === "shared" ? copy.shared :
        status === "download" ? copy.downloaded :
        copy.shareOpened);
    } catch (error) {
      const problem = error as { name?: string; code?: string };
      setMessage(problem.name === "AbortError" ? copy.shareCancelled :
        problem.code === "WALLPAPER_UNSUPPORTED" ? copy.unsupported :
        problem.code === "WALLPAPER_NOT_ALLOWED" ? copy.restricted :
        problem.code === "PHOTO_PERMISSION_DENIED" ? copy.permissionDenied :
        copy.exportFailed);
    } finally {
      if (downloadUrl) window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);
      setBusy(false);
    }
  }

  return (
    <main className="cd-talisman" data-yn-night lang={locale}>
      <header className="cd-talisman-header"><a href="/" aria-label={copy.backHome}><ArrowLeft size={22} aria-hidden /></a><span>{copy.brand}</span><span className="cd-talisman-caption">{copy.personalArt}</span></header>
      <div className="cd-talisman-intro"><h1>{copy.headline}</h1><p>{copy.intro}</p><button className="cd-talisman-daily-pick" type="button" disabled={busy} onClick={chooseDailyTalisman}><Moon size={17} strokeWidth={1.5} aria-hidden />{copy.dailyPick}</button></div>
      <div className="cd-talisman-workspace">
        <section className="cd-talisman-preview-section" aria-label={copy.preview}>
          <div className="cd-talisman-preview" data-tarot={mode === "tarot" || undefined} style={{ aspectRatio: `${screen.width} / ${screen.height}` }}>
            {ready && loaded && fit ? <img src={loaded.url} alt={mode === "tarot" ? sceneName : scene === "yeoni-wardrobe" ? sceneName : sceneName + " · " + categoryNames[category]} style={{ left: `${fit.x / screen.width * 100}%`, top: `${fit.y / screen.height * 100}%`, width: `${fit.width / screen.width * 100}%`, height: `${fit.height / screen.height * 100}%` }} /> : <div className="cd-talisman-empty"><Moon size={36} strokeWidth={1.2} aria-hidden /><strong>{copy.loading}</strong></div>}
            {guides ? <div className={"cd-talisman-guides " + preview} aria-hidden><span className="cd-talisman-camera" />{preview === "lock" ? <><span className="cd-talisman-clock">09:41</span><span className="cd-talisman-widgets">{copy.widgets}</span></> : <span className="cd-talisman-icons">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</span>}<span className="cd-talisman-homebar" /></div> : null}
          </div>
          {target === "both" ? <div className="cd-talisman-preview-toggle">{(["lock", "home"] as const).map(value => <button key={value} type="button" aria-pressed={preview === value} onClick={() => setPreview(value)}>{value === "lock" ? copy.previewLock : copy.previewHome}</button>)}</div> : null}
          <label className="cd-talisman-guide-toggle"><input type="checkbox" checked={guides} onChange={event => setGuides(event.target.checked)} />{copy.guides}</label>
          <p className="cd-talisman-caption">{copy.guideHint}</p>
        </section>
        <section className="cd-talisman-controls" aria-label={copy.choose}>
          <div className="cd-talisman-mode" role="group" aria-label={locale === "ko" ? "부적 종류" : "Talisman type"}>
            <button type="button" aria-pressed={mode === "illustration"} onClick={() => setMode("illustration")}>{locale === "ko" ? "세계관 부적" : "Illustrated talisman"}</button>
            <button type="button" aria-pressed={mode === "tarot"} onClick={() => setMode("tarot")}>{locale === "ko" ? "타로 카드 부적" : "Tarot card talisman"}</button>
          </div>
          {mode === "illustration" ? <>
            <fieldset disabled={busy}><legend>{copy.sceneLegend}</legend><div className="cd-talisman-scenes">{scenes.map(item => { const thumbnail = assets.find(assetItem => assetItem.scene === item.id); return <label key={item.id}><input type="radio" name="talisman-scene" checked={scene === item.id} onChange={() => { setScene(item.id); const available = assets.filter(a => a.scene === item.id); if (!available.some(a => a.category === category) && available[0]) setCategory(available[0].category); }} /><span>{thumbnail ? <i className="cd-talisman-thumb" style={{ backgroundImage: `url(/assets/talismans/widget/${widgetAssetId(thumbnail.id)}.webp)` }} aria-hidden /> : null}<b>{sceneNames[item.id]}</b></span></label>; })}</div></fieldset>
            {scene === "yeoni-wardrobe" ? <fieldset disabled={busy}><legend>{sceneName}</legend><div className="cd-talisman-options cd-talisman-visual-options">{assets.filter(item => item.scene === scene).map(item => <label key={item.id}><input type="radio" name="outfit" checked={lookId === item.id} onChange={() => setLookId(item.id)} /><span><i className="cd-talisman-thumb" style={{ backgroundImage: `url(/assets/talismans/widget/${widgetAssetId(item.id)}.webp)` }} aria-hidden /><b>{lookName(item.id, locale)}</b></span></label>)}</div></fieldset> : <fieldset disabled={busy}><legend>{copy.wishLegend}</legend><div className="cd-talisman-options cd-talisman-visual-options">{categories.filter(item => assets.some(a => a.scene === scene && a.category === item.id)).map(item => { const thumbnail = assets.find(assetItem => assetItem.scene === scene && assetItem.category === item.id); return <label key={item.id}><input type="radio" name="talisman-category" checked={category === item.id} onChange={() => setCategory(item.id)} /><span>{thumbnail ? <i className="cd-talisman-thumb" style={{ backgroundImage: `url(/assets/talismans/widget/${widgetAssetId(thumbnail.id)}.webp)` }} aria-hidden /> : null}<b>{categoryNames[item.id]}</b></span></label>; })}</div></fieldset>}
          </> : <TarotTalismanControls locale={locale} deck={tarotDeck} group={tarotGroup} card={tarotCard} orientation={tarotOrientation} onDeck={setTarotDeck} onGroup={(nextGroup) => { setTarotGroup(nextGroup); const first = tarotTalismanCards.find(item => item.group === nextGroup); if (first) setTarotCard(first); }} onCard={setTarotCard} onOrientation={setTarotOrientation} />}
          <fieldset disabled={busy}><legend>{copy.targetLegend}</legend><div className="cd-talisman-options">{(["lock", "home", "both"] as const).map(value => <label key={value}><input type="radio" name="talisman-target" checked={target === value} onChange={() => { setTarget(value); if (value !== "both") setPreview(value); setMessage(""); setSavedFit(false); }} /><span>{value === "lock" ? copy.targetLock : value === "home" ? copy.targetHome : copy.both}</span></label>)}</div></fieldset>
          <fieldset disabled={busy}><legend>{copy.fitLegend}</legend><div className="cd-talisman-fit-controls"><label>{copy.size}<input aria-label={copy.size} type="range" min="60" max="100" value={Math.round(size * 100)} onChange={event => setSize(Number(event.target.value) / 100)} /></label><label>{copy.position}<input aria-label={copy.position} type="range" min="0" max="100" value={Math.round(position * 100)} onChange={event => setPosition(Number(event.target.value) / 100)} /></label></div><p className="cd-talisman-caption">{copy.fitHint}</p></fieldset>
          {asset ? <p className="cd-talisman-caption">{copy.original} {asset.width} × {asset.height}px · {copy.fitted} {screen.width} × {screen.height}px{locale !== "ko" ? " · " + copy.imageLanguage : ""}</p> : null}
          <div className="cd-talisman-actions" aria-busy={busy}>
            <button type="button" disabled={!ready || busy} onClick={() => void exportImage(device === "android" ? "apply" : "fit")}><Smartphone size={18} aria-hidden />{device === "android" ? copy.apply.replace("{target}", targetName) : copy.saveAndSet}</button>
            {device === "android" ? <button type="button" disabled={!ready || busy} onClick={() => void exportImage("picker")}>{copy.systemPicker}</button> : null}
            <button type="button" disabled={!ready || busy} onClick={() => void exportImage("original")}><Download size={18} aria-hidden />{copy.saveOriginal}</button>
            <button type="button" disabled={!ready || busy} onClick={() => void exportImage("share")}><Share2 size={18} aria-hidden />{copy.shareFit}</button>
          </div>
          <p className="cd-talisman-status" role="status" aria-live="polite">{message || (ready ? copy.ready : copy.verifying)}</p>
          {device === "web" && <p className="cd-talisman-caption">{copy.androidWebGuide}</p>}
          {device !== "android" ? <details className="cd-talisman-instructions" open={savedFit || undefined}><summary>{copy.iosTitle}</summary><p>{target === "home" ? copy.iosHome : copy.iosLock}</p>{target !== "home" ? <p>{target === "both" ? copy.iosBoth : copy.iosSeparate}</p> : null}<p>{copy.iosHint}</p></details> : <p className="cd-talisman-caption">{copy.systemHint}</p>}
          <p className="cd-talisman-caption">{mode === "tarot" && locale === "ko" ? "카드 해설은 가능성과 선택을 비추는 상징으로 읽으며, 미래나 상대의 마음을 단정하지 않습니다." : copy.symbolic}</p>
        </section>
      </div>
      {mode === "tarot" ? <TarotTalismanMeaning locale={locale} deck={tarotDeck} card={tarotCard} orientation={tarotOrientation} /> : null}
    </main>
  );
}
