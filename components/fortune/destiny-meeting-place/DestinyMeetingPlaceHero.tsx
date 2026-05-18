type Props = {
  onStart: () => void;
  disabled?: boolean;
};

const HERO_IMAGE = "/fuctionassets/%EC%82%AC%EC%A3%BC%EB%A1%9C%EB%B3%B4%EB%8A%94%20%EC%9D%B8%EC%97%B0%EC%9D%98%20%EC%9E%A5%EC%86%8C.webp";

export default function DestinyMeetingPlaceHero({ onStart, disabled }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-[linear-gradient(150deg,rgba(11,15,42,0.82),rgba(39,12,72,0.76),rgba(9,16,44,0.84))] p-5 shadow-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,211,110,0.35),transparent_35%),radial-gradient(circle_at_88%_12%,rgba(255,139,216,0.26),transparent_32%),radial-gradient(circle_at_50%_92%,rgba(96,165,250,0.28),transparent_36%)]" />
      <div className="relative grid gap-4 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.26em] text-[#ffd36e]">Destiny Meeting Place</p>
          <h3 className="mt-2 text-3xl font-black leading-tight text-white md:text-4xl">사주로 보는 인연의 장소</h3>
          <p className="mt-2 text-sm text-[#f5d8ff]">나의 사주가 알려주는, 운명의 만남이 시작될 곳</p>
          <p className="mt-3 text-sm text-[#d7e4ff]">
            사주 에너지로 인연이 열리는 장소, 국가, 시기, 아이템을 감성 리포트로 제안합니다.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onStart}
            className="mt-4 inline-flex items-center rounded-2xl bg-[linear-gradient(90deg,#ff8bd8,#8b5cf6,#60a5fa)] px-5 py-3 text-sm font-black text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            내 인연의 장소 찾기
          </button>
        </div>
        <div className="relative">
          <div className="absolute -inset-2 rounded-3xl bg-[radial-gradient(circle,rgba(255,211,110,0.33),transparent_60%)] blur-xl" />
          <img
            src={HERO_IMAGE}
            alt="사주로 보는 인연의 장소 배너"
            loading="lazy"
            decoding="async"
            className="relative h-[190px] w-full rounded-3xl border border-white/20 object-cover shadow-2xl sm:h-[240px]"
          />
        </div>
      </div>
    </section>
  );
}
