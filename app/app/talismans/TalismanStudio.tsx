"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Moon, Share2, Smartphone } from "lucide-react";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import { approvedAssets, categories, scenes, verifyOriginal, type Category, type Scene } from "./catalog";
import { fittedWallpaper, normalizeScreen, wallpaperFit, type ScreenSize, type WallpaperTarget } from "./wallpaper-fit";

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
  const [ja, setJa] = useState(false);
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
  const t = (ko: string, jp: string) => ja ? jp : ko;
  const sceneName = scenes.find(item => item.id === scene)![ja ? "ja" : "ko"];
  const targetName = target === "both" ? t("홈·잠금화면", "ホーム・ロック画面") : target === "home" ? t("홈 화면", "ホーム画面") : t("잠금화면", "ロック画面");

  useEffect(() => {
    let active = true;
    const sync = () => setJa(getCurrentLoadingLocale() === "ja");
    const syncScreen = async () => {
      const native = nativeExports();
      const fallback = innerWidth >= 740 && platform() === "web" ? { width: 1080, height: 2340 } : { width: window.screen.width * devicePixelRatio, height: window.screen.height * devicePixelRatio };
      const current = native?.getScreenInfo ? await native.getScreenInfo().catch(() => fallback) : fallback;
      if (active) setScreen(normalizeScreen(current.width, current.height));
    };
    sync(); setDevice(platform()); void syncScreen();
    window.addEventListener("cd:locale-ready", sync);
    window.addEventListener("orientationchange", syncScreen);
    return () => { active = false; window.removeEventListener("cd:locale-ready", sync); window.removeEventListener("orientationchange", syncScreen); };
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
        if (!controller.signal.aborted) setMessage(ja ? "画像を読み込めませんでした。接続を確認して選び直してください。" : "이미지를 불러오지 못했어요. 연결을 확인한 뒤 다시 선택해 주세요.");
      }
    })();
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [asset, ja]);

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
        setMessage(t("맞춤 이미지를 저장한 뒤 사진 앱에서 공유해 주세요.", "画面に合わせた画像を保存して、写真アプリで共有してください。")); return;
      }
      setSavedFit(action === "fit" && status === "saved");
      setMessage(status === "applied" ? targetName + t("에 적용했어요. 기기 화면에서 확인해 주세요.", "に適用しました。端末の画面で確認してください。") :
        status === "cancelled" ? t("선택을 취소했어요.", "キャンセルしました。") :
        status === "returned" ? t("설정 화면을 닫았어요. 적용 여부는 기기에서 확인해 주세요.", "設定画面を閉じました。適用されたか端末で確認してください。") :
        status === "saved" ? (action === "original" ? t("원본을 저장했어요.", "原本を保存しました。") : t("맞춤 이미지를 저장했어요. 아래 안내로 배경화면 설정을 마쳐 주세요.", "画面に合わせた画像を保存しました。下の手順で壁紙を設定してください。")) :
        status === "shared" ? t("공유를 마쳤어요.", "共有しました。") :
        status === "download" ? t("다운로드를 요청했어요. 저장 후 기기 설정에서 배경화면을 선택해 주세요.", "ダウンロードを開始しました。保存後、端末の設定で壁紙を選んでください。") :
        t("공유 화면을 열었어요. 공유할 대상을 선택해 주세요.", "共有画面を開きました。共有先を選んでください。"));
    } catch (error) {
      const problem = error as { name?: string; code?: string };
      setMessage(problem.name === "AbortError" ? t("공유를 취소했어요.", "共有をキャンセルしました。") :
        problem.code === "WALLPAPER_UNSUPPORTED" ? t("이 기기는 앱의 직접 설정을 지원하지 않아요. 시스템 설정 화면을 이용해 주세요.", "この端末では直接設定できません。システムの設定画面をお使いください。") :
        problem.code === "WALLPAPER_NOT_ALLOWED" ? t("기기의 관리 설정으로 배경화면 변경이 제한되어 있어요.", "端末の管理設定で壁紙の変更が制限されています。") :
        problem.code === "PHOTO_PERMISSION_DENIED" ? t("사진 추가 권한이 필요해요. 기기 설정에서 이 앱의 사진 추가를 허용한 뒤 다시 저장해 주세요.", "写真の追加権限が必要です。端末の設定でこのアプリの写真追加を許可し、もう一度保存してください。") :
        t("완료하지 못했어요. 저장 공간과 권한을 확인한 뒤 다시 시도하거나 시스템 설정 화면을 이용해 주세요.", "完了できませんでした。空き容量と権限を確認して再試行するか、システム設定をご利用ください。"));
    } finally {
      if (downloadUrl) window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);
      setBusy(false);
    }
  }

  return (
    <main className="cd-talisman" data-yn-night lang={ja ? "ja" : "ko"}>
      <header className="cd-talisman-header"><a href="/" aria-label={t("홈으로 돌아가기", "ホームへ戻る")}><ArrowLeft size={22} aria-hidden /></a><span>{t("달빛 예화", "月明かりの物語")}</span><span className="cd-talisman-caption">{t("나만의 한 장", "私だけの一枚")}</span></header>
      <div className="cd-talisman-intro"><h1>{t("오늘의 바람을, 곁에.", "今日の願いを、そばに。")}</h1><p>{t("곁에 둘 부적을 고르고, 내 화면에 맞춰 보세요.", "そばに置くお守りを選び、画面に合わせてみましょう。")}</p></div>
      <div className="cd-talisman-workspace">
        <section className="cd-talisman-preview-section" aria-label={t("배경화면 미리보기", "壁紙プレビュー")}>
          <div className="cd-talisman-preview" style={{ aspectRatio: `${screen.width} / ${screen.height}` }}>
            {ready && loaded && fit ? <img src={loaded.url} alt={sceneName + " · " + categories.find(item => item.id === category)![ja ? "ja" : "ko"]} style={{ left: `${fit.x / screen.width * 100}%`, top: `${fit.y / screen.height * 100}%`, width: `${fit.width / screen.width * 100}%`, height: `${fit.height / screen.height * 100}%` }} /> : <div className="cd-talisman-empty"><Moon size={36} strokeWidth={1.2} aria-hidden /><strong>{t("그림을 불러오고 있어요", "イラストを読み込んでいます")}</strong></div>}
            {guides ? <div className={"cd-talisman-guides " + preview} aria-hidden><span className="cd-talisman-camera" />{preview === "lock" ? <><span className="cd-talisman-clock">09:41</span><span className="cd-talisman-widgets">{t("위젯 영역", "ウィジェット")}</span></> : <span className="cd-talisman-icons">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</span>}<span className="cd-talisman-homebar" /></div> : null}
          </div>
          {target === "both" ? <div className="cd-talisman-preview-toggle">{(["lock", "home"] as const).map(value => <button key={value} type="button" aria-pressed={preview === value} onClick={() => setPreview(value)}>{value === "lock" ? t("잠금 미리보기", "ロック画面") : t("홈 미리보기", "ホーム画面")}</button>)}</div> : null}
          <label className="cd-talisman-guide-toggle"><input type="checkbox" checked={guides} onChange={event => setGuides(event.target.checked)} />{t("시계·아이콘 위치 가이드", "時計・アイコンの位置ガイド")}</label>
          <p className="cd-talisman-caption">{t("가이드는 예시예요. 내 기기의 아이콘과 시계 배치를 확인해 주세요.", "ガイドは目安です。端末のアイコンや時計の配置を確認してください。")}</p>
        </section>
        <section className="cd-talisman-controls" aria-label={t("부적 선택", "お守りを選ぶ")}>
          <fieldset disabled={busy}><legend>{t("01 · 함께할 장면", "01・そばに置く風景")}</legend><div className="cd-talisman-scenes">{scenes.map(item => <label key={item.id}><input type="radio" name="talisman-scene" checked={scene === item.id} onChange={() => setScene(item.id)} /><span>{item[ja ? "ja" : "ko"]}</span></label>)}</div></fieldset>
          <fieldset disabled={busy}><legend>{t("02 · 마음에 담은 바람", "02・心に込める願い")}</legend><div className="cd-talisman-options">{categories.map(item => <label key={item.id}><input type="radio" name="talisman-category" checked={category === item.id} onChange={() => setCategory(item.id)} /><span>{item[ja ? "ja" : "ko"]}</span></label>)}</div></fieldset>
          <fieldset disabled={busy}><legend>{t("03 · 적용할 화면", "03・設定する画面")}</legend><div className="cd-talisman-options">{(["lock", "home", "both"] as const).map(value => <label key={value}><input type="radio" name="talisman-target" checked={target === value} onChange={() => { setTarget(value); if (value !== "both") setPreview(value); setMessage(""); setSavedFit(false); }} /><span>{value === "lock" ? t("잠금화면", "ロック") : value === "home" ? t("홈 화면", "ホーム") : t("둘 다", "両方")}</span></label>)}</div></fieldset>
          <fieldset disabled={busy}><legend>{t("04 · 잘림 없이 맞추기", "04・切り取らずに合わせる")}</legend><div className="cd-talisman-fit-controls"><label>{t("그림 크기", "イラストの大きさ")}<input aria-label={t("그림 크기", "イラストの大きさ")} type="range" min="60" max="100" value={Math.round(size * 100)} onChange={event => setSize(Number(event.target.value) / 100)} /></label><label>{t("위아래 위치", "上下の位置")}<input aria-label={t("위아래 위치", "上下の位置")} type="range" min="0" max="100" value={Math.round(position * 100)} onChange={event => setPosition(Number(event.target.value) / 100)} /></label></div><p className="cd-talisman-caption">{t("그림 전체를 보존하고 여백을 더해요. 가이드는 저장되지 않아요.", "イラスト全体を保ち、余白を加えます。ガイドは保存されません。")}</p></fieldset>
          {asset ? <p className="cd-talisman-caption">{t("원본", "原本")} {asset.width} × {asset.height}px · {t("화면 맞춤", "画面サイズ")} {screen.width} × {screen.height}px{ja ? " · 画像内の文字は韓国語です。" : ""}</p> : null}
          <div className="cd-talisman-actions" aria-busy={busy}>
            <button type="button" disabled={!ready || busy} onClick={() => void exportImage(device === "android" ? "apply" : "fit")}><Smartphone size={18} aria-hidden />{device === "android" ? targetName + t("에 적용하기", "に適用") : t("맞춤 이미지 저장 후 설정하기", "画像を保存して壁紙を設定")}</button>
            {device === "android" ? <button type="button" disabled={!ready || busy} onClick={() => void exportImage("picker")}>{t("시스템 설정 화면에서 적용", "システムの設定画面で適用")}</button> : null}
            <button type="button" disabled={!ready || busy} onClick={() => void exportImage("original")}><Download size={18} aria-hidden />{t("원본 저장", "原本を保存")}</button>
            <button type="button" disabled={!ready || busy} onClick={() => void exportImage("share")}><Share2 size={18} aria-hidden />{t("맞춤 이미지 공유", "画面に合わせた画像を共有")}</button>
          </div>
          <p className="cd-talisman-status" role="status" aria-live="polite">{message || (ready ? t("미리보기를 확인한 뒤 적용할 화면을 선택해 주세요.", "プレビューを確認し、設定する画面を選んでください。") : t("원본을 확인하고 있어요.", "原本を確認しています。"))}</p>
          {device === "ios" ? <details className="cd-talisman-instructions" open={savedFit || undefined}><summary>{t("iPhone에서 설정 마무리하기", "iPhoneで設定を完了する")}</summary><p>{target === "home" ? t("설정 → 배경화면에서 홈 화면의 ‘사용자화’를 열고, 사진 버튼으로 저장한 그림을 선택한 뒤 완료해 주세요.", "「設定」→「壁紙」でホーム画面の「カスタマイズ」を開き、写真ボタンから保存した画像を選んで完了してください。") : t("설정 → 배경화면 → 새로운 배경화면 추가 → 사진에서 저장한 그림을 선택하고 ‘추가’를 누르세요.", "「設定」→「壁紙」→「新しい壁紙を追加」→「写真」で保存した画像を選び、「追加」を押してください。")}</p>{target !== "home" ? <p>{target === "both" ? t("‘한 쌍의 배경화면으로 설정’을 선택하면 홈·잠금화면에 함께 적용돼요.", "「壁紙を両方に設定」を選ぶとホーム・ロック画面に適用されます。") : t("‘홈 화면 사용자화’에서 홈 화면 배경은 따로 선택할 수 있어요.", "「ホーム画面をカスタマイズ」でホーム画面の背景を別に選べます。")}</p> : null}<p>{t("사진 저장만으로 배경화면이 바뀌지는 않아요. 확대하지 않고 하단 문구까지 보이는지 확인해 주세요.", "写真を保存しただけでは壁紙は変わりません。拡大せず、下の文字まで見えることを確認してください。")}</p></details> : <p className="cd-talisman-caption">{t("시스템 설정에서는 적용 대상을 다시 선택할 수 있어요. 확대하면 문구가 잘릴 수 있으니 전체 그림을 확인해 주세요.", "システム設定では適用先を選び直せます。拡大すると文字が切れる場合があるため、全体を確認してください。")}</p>}
          <p className="cd-talisman-caption">{t("부적은 마음을 다잡는 상징이에요. 특정한 결과를 보장하지 않아요.", "お守りは心を整えるためのシンボルです。特定の結果を保証するものではありません。")}</p>
        </section>
      </div>
    </main>
  );
}
