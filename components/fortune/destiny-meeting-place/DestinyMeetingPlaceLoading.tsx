const LOADING_LINES = [
  "당신의 사주 에너지와 인연의 방향 벡터를 정밀 분석 중...",
  "별빛 지도에 만남 확률이 높은 장소를 순서대로 매핑하고 있어요.",
  "오행 흐름과 계절 타이밍을 결합해 실제 행동 가능한 추천을 정리하고 있어요.",
];

export default function DestinyMeetingPlaceLoading() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#9ad7ff]/30 bg-[linear-gradient(155deg,rgba(16,20,52,0.7),rgba(31,16,56,0.56))] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_42px_rgba(7,8,28,0.52)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.6)_0.8px,transparent_0.8px)] [background-size:3px_3px]" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-[#ffd36e]/80 border-t-transparent shadow-[0_0_12px_rgba(255,211,110,0.65)] motion-safe:animate-spin motion-reduce:animate-none" />
        <div>
          <h4 className="text-lg font-black text-white [text-shadow:0_0_12px_rgba(145,216,255,0.52)]">인연 좌표 스캔 중</h4>
          <p className="text-xs text-[#d5d9ff]">별빛 네온 엔진이 입력 데이터를 바탕으로 장소, 시기, 스타일 신호를 결합하고 있습니다.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {LOADING_LINES.map((line) => (
          <p key={line} className="rounded-2xl border border-[#c2dcff]/22 bg-[#110d2c]/60 px-3 py-2 text-sm text-[#eef2ff]">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
