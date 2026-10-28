"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Moon, Share2, Smartphone } from "lucide-react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { approvedAssets, categories, scenes, verifyOriginal, type Category, type Scene } from "./catalog";
import { fittedWallpaper, normalizeScreen, wallpaperFit, type ScreenSize, type WallpaperTarget } from "./wallpaper-fit";

import { getTalismanCopy } from "./copy";

type ExportAction = "original" | "fit" | "share" | "apply" | "picker";
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

export default function TalismanStudio() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const [device, setDevice] = useState("web");
  const [scene, setScene] = useState<Scene>("yeongnyangi");
  const [category, setCategory] = useState<Category>("study");
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
  const asset = assets.find(item => item.scene === scene && item.category === category);
  const ready = Boolean(asset && loaded?.id === asset.id);
  const fit = asset ? wallpaperFit(asset, screen, size, position) : null;
  const copy = getTalismanCopy(locale);
  const sceneNames = { yeongnyangi: copy.sceneStarlight, "yeoni-lotus": copy.sceneLotus, "yeoni-teahouse": copy.sceneTeahouse };
  const categoryNames = { study: copy.wishStudy, wealth: copy.wishWealth, love: copy.wishLove, contact: copy.wishContact, career: copy.wishCareer };
  const sceneName = sceneNames[scene];
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
    sync(); setDevice(platform()); void syncScreen();
    window.addEventListener("cd:locale-ready", sync);
    window.addEventListener("languagechange", sync);
    window.addEventListener("orientationchange", syncScreen);
    return () => { active = false; window.removeEventListener("cd:locale-ready", sync); window.removeEventListener("languagechange", sync); window.removeEventListener("orientationchange", syncScreen); };
  }, []);

  useEffect(() => {
    setLoaded(null); setMessage(""); setSavedFit(false);
    if (!asset) return;
    const controller = new AbortController();
    let url = "";
    void (async () => {
      try {
        const response = await fetch(asset.src, { signal: controller.signal, cache: "force-cache" });
        if (!response.ok) throw new Error("IMAGE_UNAVAILABLE");
        const bytes = await response.arrayBuffer();
        await verifyOriginal(bytes, asset);
        if (controller.signal.aborted) return;
        const file = new File([bytes], asset.id + ".png", { type: "image/png" });
        url = URL.createObjectURL(file);
        setLoaded({ id: asset.id, file, url });
      } catch {
        if (!controller.signal.aborted) setMessage(copy.imageFailed);
      }
    })();
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [asset, copy.imageFailed]);

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
      <div className="cd-talisman-intro"><h1>{copy.headline}</h1><p>{copy.intro}</p></div>
      <div className="cd-talisman-workspace">
        <section className="cd-talisman-preview-section" aria-label={copy.preview}>
          <div className="cd-talisman-preview" style={{ aspectRatio: `${screen.width} / ${screen.height}` }}>
            {ready && loaded && fit ? <img src={loaded.url} alt={sceneName + " · " + categoryNames[category]} style={{ left: `${fit.x / screen.width * 100}%`, top: `${fit.y / screen.height * 100}%`, width: `${fit.width / screen.width * 100}%`, height: `${fit.height / screen.height * 100}%` }} /> : <div className="cd-talisman-empty"><Moon size={36} strokeWidth={1.2} aria-hidden /><strong>{copy.loading}</strong></div>}
            {guides ? <div className={"cd-talisman-guides " + preview} aria-hidden><span className="cd-talisman-camera" />{preview === "lock" ? <><span className="cd-talisman-clock">09:41</span><span className="cd-talisman-widgets">{copy.widgets}</span></> : <span className="cd-talisman-icons">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</span>}<span className="cd-talisman-homebar" /></div> : null}
          </div>
          {target === "both" ? <div className="cd-talisman-preview-toggle">{(["lock", "home"] as const).map(value => <button key={value} type="button" aria-pressed={preview === value} onClick={() => setPreview(value)}>{value === "lock" ? copy.previewLock : copy.previewHome}</button>)}</div> : null}
          <label className="cd-talisman-guide-toggle"><input type="checkbox" checked={guides} onChange={event => setGuides(event.target.checked)} />{copy.guides}</label>
          <p className="cd-talisman-caption">{copy.guideHint}</p>
        </section>
        <section className="cd-talisman-controls" aria-label={copy.choose}>
          <fieldset disabled={busy}><legend>{copy.sceneLegend}</legend><div className="cd-talisman-scenes">{scenes.map(item => <label key={item.id}><input type="radio" name="talisman-scene" checked={scene === item.id} onChange={() => setScene(item.id)} /><span>{sceneNames[item.id]}</span></label>)}</div></fieldset>
          <fieldset disabled={busy}><legend>{copy.wishLegend}</legend><div className="cd-talisman-options">{categories.map(item => <label key={item.id}><input type="radio" name="talisman-category" checked={category === item.id} onChange={() => setCategory(item.id)} /><span>{categoryNames[item.id]}</span></label>)}</div></fieldset>
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
          {device === "ios" ? <details className="cd-talisman-instructions" open={savedFit || undefined}><summary>{copy.iosTitle}</summary><p>{target === "home" ? copy.iosHome : copy.iosLock}</p>{target !== "home" ? <p>{target === "both" ? copy.iosBoth : copy.iosSeparate}</p> : null}<p>{copy.iosHint}</p></details> : <p className="cd-talisman-caption">{copy.systemHint}</p>}
          <p className="cd-talisman-caption">{copy.symbolic}</p>
        </section>
      </div>
    </main>
  );
}
