import dynamic from "next/dynamic";

const InsightsCosmicClient = dynamic(() => import("./InsightsCosmicClient"), {
  loading: () => (
    <div className="flex min-h-[32vh] items-center justify-center text-sm text-slate-400">
      인사이트 허브를 불러오는 중…
    </div>
  ),
});

export const metadata = {
  title: "운세 인사이트 허브 | CODE DESTINY",
  description:
    "사주, 타로, 숙요점, 베다점, 점성술, 자미두수 카테고리별로 양질의 정보성 콘텐츠를 열람할 수 있는 인사이트 허브입니다.",
  alternates: {
    canonical: "/insights",
  },
};

export default async function InsightsIndexPage({ searchParams }) {
  const sp = await searchParams;
  const requestedTopic = typeof sp?.topic === "string" ? sp.topic : "all";
  return <InsightsCosmicClient initialTopic={requestedTopic} />;
}
