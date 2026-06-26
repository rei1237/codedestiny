"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CreditCard, RefreshCw, ShieldCheck, UserRound, X } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type DevTesterUser = {
  userId: string;
  email?: string;
  name?: string;
  paidFeatures?: string[];
  licenses?: {
    standard?: number;
    premium?: number;
    vvip?: number;
    status?: string;
    expiresAt?: string | null;
  } | null;
  profileSubscription?: {
    tier?: string;
    passTier?: string;
    passRemainingUses?: number;
    profileLimit?: number;
    maxCoveredCoin?: number;
    expiresAt?: string | null;
  } | null;
  monthlySubscription?: {
    active?: boolean;
    status?: string;
    tier?: string;
    expiresAt?: string | null;
  } | null;
};

const DEFAULT_FEATURE_KEY = "saju_ai_question";

const DEV_PAYMENT_TESTER_COPY: Record<LoadingLocale, {
  noCurrentUser: string;
  license: string;
  monthly: string;
  paid: string;
  active: string;
  none: string;
  unlimited: string;
  allAccess: string;
  free: string;
  standard: string;
  premium: string;
  vvip: string;
  family: string;
  monthlyActivate: string;
  reset: string;
  paidFeature: string;
  processing: string;
  refresh: string;
  ready: string;
  close: string;
  loadFailed: string;
  updateFailed: string;
  testerTitle: string;
}> = {
  ko: { noCurrentUser: "현재 사용자 없음", license: "이용권", monthly: "월정석", paid: "단건", active: "활성", none: "없음", unlimited: "무제한", allAccess: "전체 이용", free: "무료 계정으로 전환", standard: "스탠다드 3개 지급", premium: "프리미엄 7개 지급", vvip: "VVIP 15개 지급", family: "패밀리 전체 이용", monthlyActivate: "월정석 활성화", reset: "권한 초기화", paidFeature: "단건 완료", processing: "처리 중", refresh: "새로고침", ready: "대기", close: "닫기", loadFailed: "불러오기에 실패했습니다.", updateFailed: "업데이트에 실패했습니다.", testerTitle: "개발 결제 테스터" },
  en: { noCurrentUser: "No current user", license: "license", monthly: "monthly", paid: "paid", active: "active", none: "none", unlimited: "unlimited", allAccess: "all access", free: "Switch to free", standard: "Grant 3 standard", premium: "Grant 7 premium", vvip: "Grant 15 VVIP", family: "Family all access", monthlyActivate: "Activate monthly", reset: "Reset access", paidFeature: "Complete single", processing: "processing", refresh: "refresh", ready: "ready", close: "Close", loadFailed: "Load failed.", updateFailed: "Update failed.", testerTitle: "Dev payment tester" },
  ja: { noCurrentUser: "現在のユーザーなし", license: "利用権", monthly: "月額", paid: "単発", active: "有効", none: "なし", unlimited: "無制限", allAccess: "全機能利用", free: "無料アカウントへ切替", standard: "スタンダード3件付与", premium: "プレミアム7件付与", vvip: "VVIP 15件付与", family: "ファミリー全機能利用", monthlyActivate: "月額を有効化", reset: "権限を初期化", paidFeature: "単発完了", processing: "処理中", refresh: "再読み込み", ready: "待機", close: "閉じる", loadFailed: "読み込みに失敗しました。", updateFailed: "更新に失敗しました。", testerTitle: "開発用決済テスター" },
  "zh-CN": { noCurrentUser: "当前无用户", license: "通行证", monthly: "月订阅", paid: "单次", active: "已启用", none: "无", unlimited: "无限", allAccess: "全部可用", free: "切换为免费", standard: "发放3个标准", premium: "发放7个高级", vvip: "发放15个VVIP", family: "家庭全部可用", monthlyActivate: "启用月订阅", reset: "重置权限", paidFeature: "完成单次", processing: "处理中", refresh: "刷新", ready: "待命", close: "关闭", loadFailed: "加载失败。", updateFailed: "更新失败。", testerTitle: "开发支付测试器" },
  "zh-TW": { noCurrentUser: "目前無使用者", license: "通行證", monthly: "月訂閱", paid: "單次", active: "已啟用", none: "無", unlimited: "無限", allAccess: "全部可用", free: "切換為免費", standard: "發放3個標準", premium: "發放7個進階", vvip: "發放15個VVIP", family: "家庭全部可用", monthlyActivate: "啟用月訂閱", reset: "重置權限", paidFeature: "完成單次", processing: "處理中", refresh: "重新整理", ready: "待命", close: "關閉", loadFailed: "載入失敗。", updateFailed: "更新失敗。", testerTitle: "開發付款測試器" },
  vi: { noCurrentUser: "Chưa có người dùng", license: "quyền dùng", monthly: "gói tháng", paid: "đơn lẻ", active: "đang hoạt động", none: "không có", unlimited: "không giới hạn", allAccess: "toàn quyền", free: "Chuyển sang miễn phí", standard: "Cấp 3 standard", premium: "Cấp 7 premium", vvip: "Cấp 15 VVIP", family: "Family toàn quyền", monthlyActivate: "Bật gói tháng", reset: "Đặt lại quyền", paidFeature: "Hoàn tất đơn lẻ", processing: "đang xử lý", refresh: "làm mới", ready: "sẵn sàng", close: "Đóng", loadFailed: "Tải thất bại.", updateFailed: "Cập nhật thất bại.", testerTitle: "Trình thử thanh toán dev" },
  hi: { noCurrentUser: "कोई वर्तमान उपयोगकर्ता नहीं", license: "लाइसेंस", monthly: "मासिक", paid: "भुगतान", active: "सक्रिय", none: "नहीं", unlimited: "असीमित", allAccess: "सभी एक्सेस", free: "फ्री में बदलें", standard: "3 स्टैंडर्ड दें", premium: "7 प्रीमियम दें", vvip: "15 VVIP दें", family: "फैमिली सभी एक्सेस", monthlyActivate: "मासिक सक्रिय करें", reset: "एक्सेस रीसेट", paidFeature: "एकल पूरा", processing: "प्रोसेस हो रहा है", refresh: "रीफ्रेश", ready: "तैयार", close: "बंद करें", loadFailed: "लोड नहीं हुआ.", updateFailed: "अपडेट नहीं हुआ.", testerTitle: "Dev payment tester" },
  es: { noCurrentUser: "Sin usuario actual", license: "licencia", monthly: "mensual", paid: "pago", active: "activo", none: "ninguno", unlimited: "ilimitado", allAccess: "acceso total", free: "Cambiar a gratis", standard: "Dar 3 standard", premium: "Dar 7 premium", vvip: "Dar 15 VVIP", family: "Family acceso total", monthlyActivate: "Activar mensual", reset: "Restablecer acceso", paidFeature: "Completar individual", processing: "procesando", refresh: "actualizar", ready: "listo", close: "Cerrar", loadFailed: "No se pudo cargar.", updateFailed: "No se pudo actualizar.", testerTitle: "Probador de pagos dev" },
  fr: { noCurrentUser: "Aucun utilisateur actuel", license: "licence", monthly: "mensuel", paid: "payé", active: "actif", none: "aucun", unlimited: "illimité", allAccess: "accès total", free: "Passer en gratuit", standard: "Accorder 3 standard", premium: "Accorder 7 premium", vvip: "Accorder 15 VVIP", family: "Family accès total", monthlyActivate: "Activer mensuel", reset: "Réinitialiser l'accès", paidFeature: "Terminer l'unité", processing: "traitement", refresh: "actualiser", ready: "prêt", close: "Fermer", loadFailed: "Échec du chargement.", updateFailed: "Échec de la mise à jour.", testerTitle: "Testeur de paiement dev" },
  de: { noCurrentUser: "Kein aktueller Nutzer", license: "Lizenz", monthly: "monatlich", paid: "bezahlt", active: "aktiv", none: "keine", unlimited: "unbegrenzt", allAccess: "voller Zugriff", free: "Auf kostenlos setzen", standard: "3 Standard geben", premium: "7 Premium geben", vvip: "15 VVIP geben", family: "Family Vollzugriff", monthlyActivate: "Monatsabo aktivieren", reset: "Zugriff zurücksetzen", paidFeature: "Einzelkauf erledigen", processing: "verarbeitet", refresh: "aktualisieren", ready: "bereit", close: "Schließen", loadFailed: "Laden fehlgeschlagen.", updateFailed: "Aktualisierung fehlgeschlagen.", testerTitle: "Dev-Zahlungstester" },
  nl: { noCurrentUser: "Geen huidige gebruiker", license: "licentie", monthly: "maandelijks", paid: "betaald", active: "actief", none: "geen", unlimited: "onbeperkt", allAccess: "volledige toegang", free: "Naar gratis zetten", standard: "3 standard geven", premium: "7 premium geven", vvip: "15 VVIP geven", family: "Family volledige toegang", monthlyActivate: "Maandabonnement activeren", reset: "Toegang resetten", paidFeature: "Los voltooid", processing: "bezig", refresh: "verversen", ready: "gereed", close: "Sluiten", loadFailed: "Laden mislukt.", updateFailed: "Bijwerken mislukt.", testerTitle: "Dev betalingstester" },
  ms: { noCurrentUser: "Tiada pengguna semasa", license: "lesen", monthly: "bulanan", paid: "berbayar", active: "aktif", none: "tiada", unlimited: "tanpa had", allAccess: "akses penuh", free: "Tukar ke percuma", standard: "Beri 3 standard", premium: "Beri 7 premium", vvip: "Beri 15 VVIP", family: "Family akses penuh", monthlyActivate: "Aktifkan bulanan", reset: "Tetapkan semula akses", paidFeature: "Lengkapkan sekali", processing: "memproses", refresh: "segar semula", ready: "sedia", close: "Tutup", loadFailed: "Gagal dimuatkan.", updateFailed: "Gagal dikemas kini.", testerTitle: "Penguji bayaran dev" },
};

function formatPassLabel(user: DevTesterUser | null, copy: (typeof DEV_PAYMENT_TESTER_COPY)[LoadingLocale]) {
  const licenses = user?.licenses || null;
  const sub = user?.profileSubscription || null;
  const tier = String(sub?.passTier || sub?.tier || "free");
  const remaining = Number(sub?.passRemainingUses || 0);
  const limit = Number(sub?.maxCoveredCoin || 0);
  const licenseCounts = licenses
    ? `S${Number(licenses.standard || 0)} P${Number(licenses.premium || 0)} V${Number(licenses.vvip || 0)}`
    : "";
  const remainingLabel = tier === "family" ? copy.unlimited : (remaining ? String(remaining) : "");
  const limitLabel = tier === "family" ? copy.allAccess : (limit ? `${limit}c` : "");
  return `${tier}${remainingLabel ? ` / ${remainingLabel}` : ""}${limitLabel ? ` / ${limitLabel}` : ""}${licenseCounts ? ` / ${licenseCounts}` : ""}`;
}

export default function DevPaymentTester() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [featureKey, setFeatureKey] = useState(DEFAULT_FEATURE_KEY);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<DevTesterUser | null>(null);
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = DEV_PAYMENT_TESTER_COPY[locale] || DEV_PAYMENT_TESTER_COPY.ko;

  const hidden = process.env.NODE_ENV === "production";

  const loadState = useCallback(async () => {
    if (hidden) return;
    setBusy(true);
    try {
      const response = await authFetch("/api/billing/dev-payment-tester", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "DEV_PAYMENT_TESTER_LOAD_FAILED");
      setUser(payload?.data?.user || null);
      setMessage("loaded");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.loadFailed);
    } finally {
      setBusy(false);
    }
  }, [copy.loadFailed, hidden]);

  const applyState = useCallback(async (action: string) => {
    if (hidden || busy) return;
    setBusy(true);
    try {
      const body = action === "paid-feature"
        ? { action, featureKey: featureKey.trim() || DEFAULT_FEATURE_KEY }
        : { action };
      const response = await authFetch("/api/billing/dev-payment-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || payload?.code || "DEV_PAYMENT_TESTER_UPDATE_FAILED");
      setUser(payload?.data?.user || null);
      setMessage(action);
      window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: { source: "dev-payment-tester", event: "login", at: Date.now() } }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.updateFailed);
    } finally {
      setBusy(false);
    }
  }, [busy, copy.updateFailed, featureKey, hidden]);

  useEffect(() => {
    if (!hidden && open && !user) void loadState();
  }, [hidden, loadState, open, user]);

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  const passLabel = useMemo(() => {
    return formatPassLabel(user, copy);
  }, [copy, user]);

  if (hidden) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[2147482000] inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-amber-200/40 bg-slate-950/90 text-amber-100 shadow-xl backdrop-blur"
        aria-label={copy.testerTitle}
        title={copy.testerTitle}
      >
        <CreditCard size={18} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[2147482000] w-[min(380px,calc(100vw-32px))] rounded-[8px] border border-slate-200/20 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black">
          <ShieldCheck size={16} />
          Dev Payment Tester
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/10 bg-white/5 text-white/80"
          aria-label={copy.close}
          title={copy.close}
        >
          <X size={16} />
        </button>
      </div>

      <div className="mb-3 grid gap-1 rounded-[8px] border border-white/10 bg-white/[.04] p-2 text-xs text-slate-200">
        <span className="inline-flex items-center gap-1 font-semibold text-white">
          <UserRound size={13} />
          {user?.email || user?.userId || copy.noCurrentUser}
        </span>
        <span>{copy.license}: {passLabel}</span>
        <span>{copy.monthly}: {user?.monthlySubscription?.active ? copy.active : copy.none}</span>
        <span>{copy.paid}: {(user?.paidFeatures || []).slice(0, 3).join(", ") || copy.none}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => applyState("free")} className="min-h-10 rounded-[8px] bg-white/10 px-2 text-[11px] font-bold leading-tight disabled:opacity-50">{copy.free}</button>
        <button type="button" disabled={busy} onClick={() => applyState("standard")} className="min-h-10 rounded-[8px] bg-amber-200 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">{copy.standard}</button>
        <button type="button" disabled={busy} onClick={() => applyState("premium")} className="min-h-10 rounded-[8px] bg-cyan-200 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">{copy.premium}</button>
        <button type="button" disabled={busy} onClick={() => applyState("vvip")} className="min-h-10 rounded-[8px] bg-fuchsia-200 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">{copy.vvip}</button>
        <button type="button" disabled={busy} onClick={() => applyState("family")} className="min-h-10 rounded-[8px] bg-yellow-100 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">{copy.family}</button>
        <button type="button" disabled={busy} onClick={() => applyState("monthly")} className="min-h-10 rounded-[8px] bg-emerald-200 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">{copy.monthlyActivate}</button>
        <button type="button" disabled={busy} onClick={() => applyState("reset")} className="min-h-10 rounded-[8px] bg-rose-200 px-2 text-[11px] font-black leading-tight text-slate-950 disabled:opacity-50">{copy.reset}</button>
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={featureKey}
          onChange={(event) => setFeatureKey(event.target.value)}
          className="min-h-9 flex-1 rounded-[8px] border border-white/10 bg-black/30 px-2 text-xs text-white outline-none"
          placeholder="featureKey"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => applyState("paid-feature")}
          className="inline-flex min-h-9 items-center gap-1 rounded-[8px] bg-lime-200 px-3 text-xs font-black text-slate-950 disabled:opacity-50"
        >
          <BadgeCheck size={14} />
          {copy.paidFeature}
        </button>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={loadState}
        className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-[8px] border border-white/10 bg-white/5 text-xs font-bold text-slate-200 disabled:opacity-50"
      >
        <RefreshCw size={13} />
        {busy ? copy.processing : copy.refresh} / {message || copy.ready}
      </button>
    </div>
  );
}
