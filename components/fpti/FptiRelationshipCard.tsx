"use client";

type Props = {
  keyLabel: "Open" | "Deep" | "Loyal" | "Free";
  description: string;
};

export default function FptiRelationshipCard({ keyLabel, description }: Props) {
  const tone =
    keyLabel === "Open"
      ? "from-rose-50 to-orange-50 border-rose-200"
      : keyLabel === "Deep"
        ? "from-sky-50 to-indigo-50 border-sky-200"
        : keyLabel === "Loyal"
          ? "from-emerald-50 to-teal-50 border-emerald-200"
          : "from-violet-50 to-fuchsia-50 border-violet-200";

  return (
    <section className={`rounded-2xl border bg-gradient-to-br ${tone} p-4`}>
      <h4 className="text-sm font-semibold text-slate-900">관계 스타일: {keyLabel}</h4>
      <p className="mt-2 text-sm text-slate-700">{description}</p>
    </section>
  );
}
