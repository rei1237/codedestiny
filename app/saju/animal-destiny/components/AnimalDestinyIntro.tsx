import Image from "next/image";

export default function AnimalDestinyIntro() {
  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-[#ffe9c8] via-[#ffd4cc] to-[#c8f5f0] p-4 shadow-lg">
        <div className="absolute -left-8 -top-8 h-20 w-20 rounded-full bg-[#fff3a6]/70 blur-xl" />
        <div className="absolute -right-10 bottom-2 h-24 w-24 rounded-full bg-[#99f6e4]/70 blur-xl" />
        <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-center">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a4f36]">사주 동물 상담소</p>
            <h1 className="text-2xl font-black leading-tight text-[#2d3e2c]">
              사주 십이운성 동물점
            </h1>
            <p className="text-sm text-[#304533]">
              태어난 순간의 일간·지지 기반으로 찾는 나의 귀여운 동물 타입
            </p>
            <p className="text-xs text-[#5a7060]">
              랜덤 테스트가 아니에요. 기존 명리학 로컬 엔진으로 계산한 십이운성 기반 분석입니다.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/70 px-3 py-1 font-semibold text-[#5f3b2a]">십이운성 기반</span>
              <span className="rounded-full bg-white/70 px-3 py-1 font-semibold text-[#5f3b2a]">동물 상담 카드</span>
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

