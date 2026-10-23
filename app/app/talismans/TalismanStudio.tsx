"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Moon, Share2, Smartphone } from "lucide-react";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import { approvedAssets, categories, scenes, verifyOriginal, type Category, type Composition, type Scene } from "./catalog";

type ExportAction = "save" | "share" | "wallpaper";
type NativeExports = { exportImage: (input: { action: ExportAction; base64: string; fileName: string }) => Promise<{ status: "saved" | "shared" | "opened" | "cancelled" }> };

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
  const [category, setCategory] = useState<Category>("peace");
  const [composition, setComposition] = useState<Composition>("lock");
  const [guides, setGuides] = useState(true);
  const [loaded, setLoaded] = useState<{ id: string; file: File; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const assets = useMemo(() => approvedAssets(), []);
  const asset = assets.find((item) => item.scene === scene && item.category === category && item.composition === composition);
  const ready = Boolean(asset && loaded?.id === asset.id);
  const t = (ko: string, jp: string) => ja ? jp : ko;
  const sceneName = scenes.find((item) => item.id === scene)![ja ? "ja" : "ko"];

  useEffect(() => {
    const sync = () => setJa(getCurrentLoadingLocale() === "ja");
    sync(); setDevice(platform());
    window.addEventListener("cd:locale-ready", sync);
    return () => window.removeEventListener("cd:locale-ready", sync);
  }, []);

  useEffect(() => {
    setLoaded(null); setMessage("");
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
    if (!ready || !loaded || busy) return;
    setBusy(true); setMessage("");
    try {
      let status: string;
      const plugin = nativeExports();
      if (plugin) {
        const result = await plugin.exportImage({ action, base64: await base64Of(loaded.file), fileName: loaded.file.name });
        status = result.status;
      } else if (action === "share" && navigator.canShare?.({ files: [loaded.file] })) {
        await navigator.share({ files: [loaded.file], title: sceneName });
        status = "shared";
      } else if (action === "save") {
        const link = document.createElement("a");
        link.href = loaded.url; link.download = loaded.file.name; link.click();
        status = "download";
      } else {
        setMessage(t("먼저 원본을 저장한 뒤 사진 앱에서 공유해 주세요.", "原本を保存してから写真アプリで共有してください。"));
        return;
      }
      setMessage(status === "cancelled" ? t("선택을 취소했어요.", "キャンセルしました。") :
        status === "saved" ? t("원본을 저장했어요.", "原本を保存しました。") :
        status === "shared" ? t("공유를 마쳤어요.", "共有しました。") :
        status === "download" ? t("다운로드를 요청했어요. 저장 위치를 확인해 주세요.", "ダウンロードを開始しました。保存先を確認してください。") :
        action === "wallpaper" ? t("배경화면 선택을 열었어요. 적용할 화면을 직접 선택해 주세요.", "壁紙の選択画面を開きました。適用先を選んでください。") :
        t("공유 화면을 열었어요. 공유할 대상을 선택해 주세요.", "共有画面を開きました。共有先を選んでください。"));
    } catch (error) {
      const cancelled = (error as { name?: string }).name === "AbortError";
      setMessage(cancelled ? t("공유를 취소했어요.", "共有をキャンセルしました。") :
        t("완료하지 못했어요. 저장 공간과 권한을 확인한 뒤 다시 시도해 주세요.", "完了できませんでした。空き容量と権限を確認して、もう一度お試しください。"));
    } finally { setBusy(false); }
  }

  return (
    <main className="cd-talisman" data-yn-night lang={ja ? "ja" : "ko"}>
      <header className="cd-talisman-header">
        <a href="/" aria-label={t("홈으로 돌아가기", "ホームへ戻る")}><ArrowLeft size={22} aria-hidden /></a>
        <span>{t("달빛 예화", "月明かりの物語")}</span>
        <span className="cd-talisman-caption">{t("나만의 한 장", "私だけの一枚")}</span>
      </header>
      <div className="cd-talisman-intro">
        <h1>{t("오늘의 바람을, 곁에.", "今日の願いを、そばに。")}</h1>
        <p>{t("화면을 켤 때마다 떠올리고 싶은 마음을 골라 보세요.", "画面を見るたびに思い出したい気持ちを選んでください。")}</p>
      </div>
      <div className="cd-talisman-workspace">
        <section className="cd-talisman-preview-section" aria-label={t("배경화면 미리보기", "壁紙プレビュー")}>
          <div className="cd-talisman-preview">
            {ready && loaded ? <img src={loaded.url} alt={sceneName + " · " + categories.find((item) => item.id === category)![ja ? "ja" : "ko"]} /> :
              <div className="cd-talisman-empty"><Moon size={36} strokeWidth={1.2} aria-hidden /><strong>{t("그림을 준비하고 있어요", "イラストを準備しています")}</strong><p>{t("선택한 조합의 이미지가 준비되면 이곳에서 미리 볼 수 있어요.", "選んだ組み合わせの画像ができ次第、ここで確認できます。")}</p></div>}
            {guides ? <div className={"cd-talisman-guides " + composition} aria-hidden><span className="cd-talisman-camera" />{composition === "lock" ? <><span className="cd-talisman-clock">09:41</span><span className="cd-talisman-widgets">{t("위젯 영역", "ウィジェット")}</span></> : <span className="cd-talisman-icons">{t("앱 아이콘 영역", "アプリアイコン")}</span>}<span className="cd-talisman-homebar" /></div> : null}
          </div>
          <label className="cd-talisman-guide-toggle"><input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} />{t("시계·아이콘 위치 가이드", "時計・アイコンの位置ガイド")}</label>
          <p className="cd-talisman-caption">{t("기기마다 배치가 달라요. 가이드는 저장 이미지에 포함되지 않아요.", "配置は端末によって異なります。ガイドは保存画像に含まれません。")}</p>
        </section>
        <section className="cd-talisman-controls" aria-label={t("부적 선택", "お守りを選ぶ")}>
          <fieldset><legend>{t("01 · 함께할 장면", "01・そばに置く風景")}</legend><div className="cd-talisman-scenes">
            {scenes.map((item) => <label key={item.id}><input type="radio" name="talisman-scene" value={item.id} checked={scene === item.id} onChange={() => setScene(item.id)} /><span>{item[ja ? "ja" : "ko"]}</span></label>)}
          </div></fieldset>
          <fieldset><legend>{t("02 · 마음에 담은 바람", "02・心に込める願い")}</legend><div className="cd-talisman-options">
            {categories.map((item) => <label key={item.id}><input type="radio" name="talisman-category" checked={category === item.id} onChange={() => setCategory(item.id)} /><span>{item[ja ? "ja" : "ko"]}</span></label>)}
          </div></fieldset>
          <fieldset><legend>{t("03 · 머물 화면", "03・飾る画面")}</legend><div className="cd-talisman-options cd-talisman-composition">
            {(["lock", "home"] as const).map((item) => <label key={item}><input type="radio" name="talisman-composition" checked={composition === item} onChange={() => setComposition(item)} /><span>{item === "lock" ? t("잠금화면", "ロック画面") : t("홈 화면", "ホーム画面")}</span></label>)}
          </div></fieldset>
          <div className="cd-talisman-actions" aria-busy={busy}>
            <button type="button" disabled={!ready || busy} onClick={() => void exportImage("save")}><Download size={18} aria-hidden />{t("고해상도 원본 저장", "高解像度の原本を保存")}</button>
            <button type="button" disabled={!ready || busy} onClick={() => void exportImage("share")}><Share2 size={18} aria-hidden />{t("공유하기", "共有する")}</button>
            {device === "android" ? <button type="button" disabled={!ready || busy} onClick={() => void exportImage("wallpaper")}><Smartphone size={18} aria-hidden />{t("배경화면 선택 열기", "壁紙の選択画面を開く")}</button> : null}
          </div>
          <p className="cd-talisman-status" role="status" aria-live="polite">{message || (ready ? t("고해상도 원본을 저장할 수 있어요.", "高解像度の原本を保存できます。") : asset ? t("원본을 불러오는 중이에요.", "原本を読み込んでいます。") : t("이미지 준비 중 · 저장과 공유는 준비가 끝나면 열려요.", "画像の準備中・完成後に保存と共有ができます。"))}</p>
          <p className="cd-talisman-caption">{device === "ios" ? t("저장 후 iPhone 설정 → 배경화면 → 새로운 배경화면 추가에서 사진을 선택해 주세요.", "保存後、iPhoneの「設定」→「壁紙」→「新しい壁紙を追加」で写真を選んでください。") : t("저장한 이미지는 기기의 배경화면 설정에서도 선택할 수 있어요.", "保存した画像は端末の壁紙設定からも選べます。")}</p>
          <p className="cd-talisman-caption">{t("부적은 마음을 다잡는 상징이에요. 특정한 결과를 보장하지 않아요.", "お守りは心を整えるためのシンボルです。特定の結果を保証するものではありません。")}</p>
        </section>
      </div>
    </main>
  );
}
