import dynamic from "next/dynamic";

const InsightsCosmicClient = dynamic(() => import("./InsightsCosmicClient"), {
  loading: () => (
    <div className="flex min-h-[32vh] items-center justify-center text-sm text-slate-400">
      인사이트 허브를 불러오는 중…
    </div>
  ),
});

export const metadata = {
  title: "운세 인사이트 허브 — 사주·타로·자미두수 지식 아카이브 | Code Destiny",
  description: "사주명리학·타로·자미두수·숙요점·베다점성술의 핵심 원리를 읽는 운세 지식 아카이브.",
  alternates: {
    canonical: "/insights",
  },
};

export default async function InsightsIndexPage({ searchParams }) {
  const sp = await searchParams;
  const requestedTopic = typeof sp?.topic === "string" ? sp.topic : "all";
  return <InsightsCosmicClient initialTopic={requestedTopic} />;
}
