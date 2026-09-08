import type { Metadata } from "next";
import catalog from "@/lib/marketing/feature-visual-details.generated.json";
export const metadata: Metadata = { title: "기능 소개 | CODE DESTINY", description: "실제 결과 예시와 이용 방법을 살펴보고, 내 고민에 맞는 운세를 골라 보세요.", alternates: { canonical: "https://code-destiny.com/features/" } };
export default function FeatureIntroductions() {
  return <main className="min-h-svh bg-[#110b19] px-4 py-8 text-[#fff6ea]">
    <div className="mx-auto max-w-[960px]">
      <a href="/" className="mb-8 inline-flex min-h-11 items-center rounded-xl border border-white/30 px-4">홈으로</a>
      <h1 className="text-3xl font-bold">내 고민에 맞는 이야기</h1>
      <p className="my-4 text-[#d5c8da]">결과 예시와 이용 방법을 먼저 살펴보세요.</p>
      <ul className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2">
        {catalog.index.filter(item => item.verification === "verified").map(item => <li key={item.slug}>
          <a href={`/features/${item.slug}/`} className="block rounded-3xl border border-[#665273] bg-[#20142d] p-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 className="text-xl font-bold">{item.title}</h2><span className="mt-4 block text-[#f6dfb7]">어떤 결과를 볼 수 있나요? →</span>
          </a>
        </li>)}
      </ul>
    </div>
  </main>;
}
