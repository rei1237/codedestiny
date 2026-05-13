import Image from "next/image";

export default function AnimalDestinyIntro() {
  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-[#ffe9c8] via-[#ffd4cc] to-[#c8f5f0] p-4 shadow-lg">
        <div className="absolute -left-8 -top-8 h-20 w-20 rounded-full bg-[#fff3a6]/70 blur-xl" />
        <div className="absolute -right-10 bottom-2 h-24 w-24 rounded-full bg-[#99f6e4]/70 blur-xl" />
        <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-center">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a4f36]">Animal Destiny Lab</p>
            <h1 className="text-3xl font-black leading-tight text-[#2d3e2c]">나의 수호 동물 소환하기</h1>
            <p className="text-sm text-[#304533]">사주 속 십이운성으로 깨어나는 나만의 동물 캐릭터</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/70 px-3 py-1 font-semibold text-[#5f3b2a]">다마고치 프레임</span>
              <span className="rounded-full bg-white/70 px-3 py-1 font-semibold text-[#5f3b2a]">수집형 카드</span>
              <span className="rounded-full bg-white/70 px-3 py-1 font-semibold text-[#5f3b2a]">궁합 모드</span>
            </div>
          </div>
          <div className="relative mx-auto h-44 w-44 overflow-hidden rounded-2xl border-2 border-white/70 shadow-md">
            <Image
              src="/fuctionassets/%EB%8F%99%EB%AC%BC%EC%A0%90%ED%85%8C%EC%8A%A4%ED%8A%B8.webp"
              alt="십이운성 동물점"
              fill
              priority
              className="object-cover"
              sizes="176px"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
