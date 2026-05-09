type FaqItem = {
  question: string;
  answer: string;
};

export default function FaqBlock({ items }: { items: FaqItem[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-semibold text-amber-100">자주 묻는 질문</h2>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <article key={item.question} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <h3 className="text-sm font-semibold text-slate-100">{item.question}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
