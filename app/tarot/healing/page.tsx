import TarotHealingClient from "./TarotHealingClient";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import Link from "next/link";

const META = {
  path: "/tarot/healing",
  title: "무료 힐링 타로 4카드 — 오늘의 회복 에너지 리딩",
  description:
    "힐링 타로 4카드는 지친 마음을 차분히 바라보고 회복 방향을 정리하는 무료 타로 리딩입니다. 과거의 상처, 현재 에너지, 회복 방향, 오늘의 선물을 카드 흐름으로 확인하세요.",
  keywords: ["힐링 타로", "4카드 타로", "Sun and Light", "회복 타로", "무료 타로", "타로 리딩", "healing tarot spread"],
  image: "https://code-destiny.com/fuctionassets/healing.webp",
  featureList: ["4카드 힐링 스프레드", "오늘의 회복 에너지 리딩", "과거·현재·방향·선물 카드 해석"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function SunHealingTarotPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-stone-50 text-stone-950">
      <section className="mx-auto max-w-5xl px-5 py-10 md:py-14">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-amber-700">Healing Tarot</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight md:text-5xl">
          무료 힐링 타로 4카드 리딩
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-stone-700 md:text-lg">
          힐링 타로는 마음이 지쳤을 때 지금의 감정 흐름을 부드럽게 정리하는 리딩입니다.
          과거의 상처, 현재 에너지, 회복 방향, 오늘의 선물을 네 장의 카드로 나누어 살피며
          오늘 바로 실천할 수 있는 작은 회복 문장을 함께 제공합니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#healing-tarot-reading" className="rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-200 transition hover:bg-amber-600">
            힐링 타로 시작하기
          </a>
          <Link href="/tarot" className="rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-bold text-amber-900 transition hover:bg-amber-50">
            무료 타로 리딩 모아보기
          </Link>
        </div>
      </section>

      <section className="border-y border-amber-200/70 bg-white/70">
        <div className="mx-auto grid max-w-5xl gap-6 px-5 py-10 md:grid-cols-3">
          {[
            ["1", "질문을 고르기", "지금 마음을 가장 무겁게 하는 감정이나 회복하고 싶은 관계 흐름을 떠올립니다."],
            ["2", "네 장의 카드 확인", "과거의 상처, 현재 에너지, 회복 방향, 오늘의 선물을 순서대로 읽습니다."],
            ["3", "작은 행동 정하기", "리딩 문장을 확정된 예언이 아니라 하루를 정돈하는 자기성찰 힌트로 사용합니다."],
          ].map(([step, title, body]) => (
            <article key={step} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-amber-600">STEP {step}</p>
              <h2 className="mt-2 text-xl font-black text-stone-950">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-700">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-10 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-2xl font-black">힐링 타로에서 확인하는 것</h2>
          <div className="mt-5 grid gap-4">
            {[
              ["과거의 상처", "반복해서 마음을 붙잡는 기억이나 감정의 흔적을 부드럽게 바라봅니다."],
              ["현재 에너지", "지금 마음이 어디에 힘을 쓰고 있는지, 쉬어야 할 지점을 확인합니다."],
              ["회복 방향", "무리한 결론보다 오늘 선택할 수 있는 현실적인 회복 방향을 정리합니다."],
              ["오늘의 선물", "작은 위로, 관계의 힌트, 나를 돌보는 문장을 카드 흐름으로 받습니다."],
            ].map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-stone-200 bg-white p-5">
                <h3 className="text-lg font-black text-stone-950">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-stone-700">{body}</p>
              </article>
            ))}
          </div>
        </div>
        <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl font-black text-stone-950">주의와 면책</h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            타로 리딩은 오락과 자기성찰을 위한 콘텐츠입니다. 건강, 법률, 투자, 치료, 안전과 관련된 결정은
            반드시 전문 기관이나 전문가의 도움을 우선해 주세요.
          </p>
          <div className="mt-5 flex flex-col gap-2 text-sm font-bold text-amber-900">
            <Link href="/tarot/reunion">재회 타로 보기</Link>
            <Link href="/tarot/mindscan">상대 마음 타로 보기</Link>
            <Link href="/today">오늘의 운세 보기</Link>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-10">
        <h2 className="text-2xl font-black">자주 묻는 질문</h2>
        <div className="mt-5 grid gap-4">
          {[
            ["힐링 타로는 어떤 상황에 좋나요?", "마음이 지치거나 관계, 일, 자기확신에서 잠시 쉬어가고 싶을 때 가볍게 참고하기 좋습니다."],
            ["결과가 나쁘게 나오면 어떻게 해야 하나요?", "카드는 확정된 운명을 말하지 않습니다. 불안한 표현보다 조정할 지점과 오늘 가능한 행동을 중심으로 읽어 주세요."],
            ["같은 질문을 여러 번 봐도 되나요?", "짧은 시간에 반복해서 뽑기보다 하루나 상황이 바뀐 뒤 다시 보는 편이 더 안정적입니다."],
            ["무료로 사용할 수 있나요?", "기본 힐링 타로 리딩은 무료로 사용할 수 있으며, 더 깊은 해석이 필요한 경우 관련 타로 기능을 함께 살펴볼 수 있습니다."],
          ].map(([question, answer]) => (
            <article key={question} className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="text-base font-black text-stone-950">{question}</h3>
              <p className="mt-2 text-sm leading-7 text-stone-700">{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="healing-tarot-reading" aria-label="힐링 타로 리딩 실행">
        <TarotHealingClient />
      </section>
    </main>
  );
}
