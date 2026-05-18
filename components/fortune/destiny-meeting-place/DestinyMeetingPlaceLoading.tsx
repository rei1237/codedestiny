const LOADING_LINES = [
  "당신의 사주 에너지와 인연의 방향을 읽는 중...",
  "별빛 지도 위에 운명의 장소를 표시하고 있어요",
  "오행의 흐름으로 만남의 문이 열리는 곳을 찾고 있어요",
];

export default function DestinyMeetingPlaceLoading() {
  return (
    <section className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-[#ffd36e]/70 border-t-transparent motion-safe:animate-spin motion-reduce:animate-none" />
        <div>
          <h4 className="text-lg font-black text-white">인연 좌표 스캔 중</h4>
          <p className="text-xs text-[#d5d9ff]">모바일에서도 가볍게 동작하도록 최적화된 분석 애니메이션입니다.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {LOADING_LINES.map((line) => (
          <p key={line} className="rounded-2xl border border-white/15 bg-[#140d2f]/60 px-3 py-2 text-sm text-[#e9ecff]">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
