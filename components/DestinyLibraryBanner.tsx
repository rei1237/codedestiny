import Image from "next/image";

/**
 * 운명의 서재 — 웹소설(비주얼 노벨) 진입점 배너.
 *
 * 디자인 3축: 밝음(웜 라이트 그라데이션) · 고급스러움(딥 플럼 + 절제된 샴페인 골드)
 * · 기대감(펼쳐지기 직전의 책 · 빛가루 · 느린 shimmer).
 *
 * - 밝은 연이 단독 테마(네오 다크 변형 없음).
 * - 연이 에셋은 배경 제거(투명) PNG 전제 — 박스/보더/그림자박스 없이 실루엣만 노출.
 * - 애니메이션은 `prefers-reduced-motion: reduce` 시 전부 정지(motion-reduce).
 *
 * 에셋 경로는 placeholder이며 실제 경로로 교체해 사용:
 *   /assets/characters/yeonyi-transparent.png
 *   (실재 후보: https://assets.code-destiny.com/DestinyCafe/nobackground/yeoni-sprite7-cutout.webp)
 */
export default function DestinyLibraryBanner() {
  return (
    <section
      aria-label="운명의 서재"
      className="group relative isolate mx-auto flex w-full max-w-[960px] flex-col items-center gap-4 overflow-hidden rounded-[22px] border border-dlb-gold/60 bg-[linear-gradient(135deg,#FDF8F3_0%,#F4EAE0_52%,#EDE0F0_100%)] px-6 py-6 text-center shadow-[0_18px_44px_-20px_rgba(61,43,69,0.30)] sm:px-7 md:grid md:grid-cols-[auto_1fr] md:items-center md:gap-5 md:text-left lg:grid-cols-[auto_1fr_auto] lg:min-h-[224px] lg:gap-6"
    >
      {/* shimmer sweep — 아주 느리고 은은하게(opacity ≤ 0.06) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[22px]"
      >
        <span className="absolute inset-y-0 -left-1/4 w-1/3 animate-dlb-sweep bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)] opacity-[0.06] motion-reduce:hidden" />
      </span>

      {/* 책 페이지 엣지 모티프(우측 세로 결) — 방사형 그래픽 대체, hover 시 최상단 페이지 살짝 들림 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-8 right-0 z-0 hidden items-end gap-[3px] lg:flex"
      >
        <span className="block h-16 w-px rounded-full bg-gradient-to-b from-transparent via-dlb-gold/50 to-transparent" />
        <span className="block h-14 w-px rounded-full bg-gradient-to-b from-transparent via-dlb-gold/40 to-transparent" />
        <span className="block h-16 w-px rounded-full bg-gradient-to-b from-transparent via-dlb-gold/50 to-transparent" />
        <span className="block h-14 w-px rounded-full bg-gradient-to-b from-transparent via-dlb-gold/40 to-transparent" />
        {/* 들리는 페이지 */}
        <span className="block h-16 w-px origin-bottom rounded-full bg-gradient-to-b from-transparent via-dlb-gold-deep to-transparent transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:-rotate-6 motion-reduce:transform-none" />
      </span>

      {/* 연이 존 — 후광 + 빛가루 + 말풍선 + 캐릭터 */}
      <div className="relative z-10 flex h-[152px] w-[150px] shrink-0 items-end justify-center md:h-[150px] md:w-[108px] lg:-mb-6 lg:h-auto lg:w-[140px] lg:self-stretch">
        {/* 후광 — 캐릭터가 빛 속에서 걸어나오는 느낌 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-1/2 z-0 h-[130%] w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,250,244,0.95)_0%,rgba(255,250,244,0.45)_40%,transparent_70%)] blur-2xl"
        />

        {/* 빛가루 — 위로 천천히 떠오름 */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 motion-reduce:hidden">
          <span className="absolute bottom-6 left-2 h-1 w-1 animate-dlb-rise rounded-full bg-dlb-gold/70 [animation-delay:0s]" />
          <span className="absolute bottom-10 left-8 h-1.5 w-1.5 animate-dlb-rise rounded-full bg-dlb-gold/50 [animation-delay:0.9s]" />
          <span className="absolute bottom-4 right-3 h-1 w-1 animate-dlb-rise rounded-full bg-dlb-gold/60 [animation-delay:1.8s]" />
          <span className="absolute bottom-14 right-6 h-1 w-1 animate-dlb-rise rounded-full bg-dlb-gold-hi/70 [animation-delay:2.6s]" />
          <span className="absolute bottom-8 left-1/2 h-1 w-1 animate-dlb-rise rounded-full bg-dlb-gold/50 [animation-delay:3.4s]" />
          <span className="absolute bottom-2 right-1/3 h-1.5 w-1.5 animate-dlb-rise rounded-full bg-dlb-gold/40 [animation-delay:4.2s]" />
        </span>

        {/* 말풍선 — 연이 머리 위 오른쪽, 꼬리가 연이를 향함 */}
        <span className="absolute -top-1 right-0 z-20 max-w-[150px] animate-dlb-bubble rounded-[14px_14px_14px_5px] border border-dlb-gold bg-[#FFFDFB] px-3 py-1.5 text-[11px] font-bold leading-snug text-dlb-plum shadow-[0_8px_20px_-8px_rgba(61,43,69,0.30)] motion-reduce:animate-none">
          오늘의 운명, 이야기로 만나볼래요?
          {/* 꼬리 */}
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-4 h-2.5 w-2.5 rotate-45 border-b border-r border-dlb-gold bg-[#FFFDFB]"
          />
        </span>

        {/* 연이 캐릭터 — 배경 제거 투명 PNG, 카드 하단 기준선에 정렬(박스 없음) */}
        <Image
          src="/assets/characters/yeonyi-transparent.png"
          alt="연이"
          fill
          priority
          unoptimized
          sizes="(max-width: 768px) 150px, (max-width: 1024px) 108px, 140px"
          className="z-10 object-contain object-bottom drop-shadow-[0_10px_18px_rgba(61,43,69,0.18)]"
        />
      </div>

      {/* 텍스트 블록 */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 md:items-start md:gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dlb-gold-ink">
          DESTINY STORIES
        </span>
        <h2 className="font-serif-ko text-[28px] leading-tight text-dlb-plum lg:text-[32px]">
          운명의 서재
        </h2>
        <p className="text-sm text-dlb-plum/70">연이와 네오가 이끄는 운명의 이야기</p>
      </div>

      {/* CTA — 골드 그라데 필 + 딥 플럼 텍스트, 배경에 묻히지 않게 */}
      <a
        href="/codedestiny-novel.html"
        aria-label="운명의 서재 비주얼 노벨 시작하기"
        className="group/cta relative z-10 inline-flex w-full items-center justify-center gap-2 rounded-full border border-dlb-gold-deep/50 bg-[linear-gradient(135deg,#F0DCA8_0%,#D4B483_50%,#C9A66B_100%)] px-6 py-3 text-sm font-bold text-dlb-plum shadow-[0_12px_26px_-12px_rgba(201,166,107,0.75)] transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dlb-gold focus-visible:ring-offset-2 focus-visible:ring-offset-dlb-cream motion-reduce:transform-none md:col-span-2 md:justify-self-stretch lg:col-span-1 lg:w-auto lg:justify-self-end"
      >
        이야기 시작하기
        <span
          aria-hidden="true"
          className="transition-transform duration-200 ease-out group-hover/cta:translate-x-1 motion-reduce:transform-none"
        >
          →
        </span>
      </a>
    </section>
  );
}
