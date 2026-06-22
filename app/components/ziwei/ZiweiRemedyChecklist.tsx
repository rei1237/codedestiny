"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface ZiweiRemedyChecklistProps {
  remedies: string[];
  actionItems: string[];
  routine7Days: string[];
  routine30Days: string[];
}

const ZIWEI_REMEDY_COPY: Record<LoadingLocale, {
  title: string;
  actionItems: string;
  remedies: string;
  routine7Days: string;
  routine30Days: string;
}> = {
  ko: { title: "개운 실천 체크리스트", actionItems: "오늘부터 실천할 3가지", remedies: "핵심 개운법", routine7Days: "7일 루틴", routine30Days: "30일 루틴" },
  en: { title: "Fortune-Opening Action Checklist", actionItems: "3 actions to begin today", remedies: "Core remedy methods", routine7Days: "7-day routine", routine30Days: "30-day routine" },
  ja: { title: "開運実践チェックリスト", actionItems: "今日から実践する3つのこと", remedies: "核心の開運法", routine7Days: "7日ルーティン", routine30Days: "30日ルーティン" },
  "zh-CN": { title: "开运实践清单", actionItems: "今天开始实践的 3 件事", remedies: "核心开运法", routine7Days: "7 天例行", routine30Days: "30 天例行" },
  "zh-TW": { title: "開運實踐清單", actionItems: "今天開始實踐的 3 件事", remedies: "核心開運法", routine7Days: "7 天例行", routine30Days: "30 天例行" },
  vi: { title: "Danh sách thực hành mở vận", actionItems: "3 việc bắt đầu từ hôm nay", remedies: "Phương pháp khai vận cốt lõi", routine7Days: "Lộ trình 7 ngày", routine30Days: "Lộ trình 30 ngày" },
  hi: { title: "भाग्य खोलने की अभ्यास सूची", actionItems: "आज से शुरू करने योग्य 3 कर्म", remedies: "मुख्य उपाय", routine7Days: "7-दिन की दिनचर्या", routine30Days: "30-दिन की दिनचर्या" },
  es: { title: "Lista práctica para abrir la fortuna", actionItems: "3 acciones para empezar hoy", remedies: "Métodos centrales de apertura", routine7Days: "Rutina de 7 días", routine30Days: "Rutina de 30 días" },
  fr: { title: "Checklist pratique d'ouverture de chance", actionItems: "3 actions à commencer aujourd'hui", remedies: "Méthodes clés d'ouverture", routine7Days: "Routine de 7 jours", routine30Days: "Routine de 30 jours" },
  de: { title: "Praxis-Checkliste zur Glücksöffnung", actionItems: "3 Schritte ab heute", remedies: "Zentrale Öffnungsmethoden", routine7Days: "7-Tage-Routine", routine30Days: "30-Tage-Routine" },
  nl: { title: "Praktische checklist voor geluk openen", actionItems: "3 acties om vandaag te starten", remedies: "Kernmethoden", routine7Days: "7-daagse routine", routine30Days: "30-daagse routine" },
  ms: { title: "Senarai amalan pembuka nasib", actionItems: "3 tindakan bermula hari ini", remedies: "Kaedah pembuka nasib utama", routine7Days: "Rutin 7 hari", routine30Days: "Rutin 30 hari" },
};

export default function ZiweiRemedyChecklist({
  remedies,
  actionItems,
  routine7Days,
  routine30Days,
}: ZiweiRemedyChecklistProps) {
  const [locale, setLocale] = useState<LoadingLocale>("ko");

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  const copy = ZIWEI_REMEDY_COPY[locale] || ZIWEI_REMEDY_COPY.ko;

  return (
    <section className="rounded-2xl border border-emerald-200/20 bg-emerald-200/5 p-4">
      <h3 className="text-sm font-black text-emerald-100">{copy.title}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-emerald-200">{copy.actionItems}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {actionItems.slice(0, 3).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-200">{copy.remedies}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {remedies.slice(0, 3).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
          <p className="text-xs font-bold text-slate-300">{copy.routine7Days}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {routine7Days.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
          <p className="text-xs font-bold text-slate-300">{copy.routine30Days}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {routine30Days.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
