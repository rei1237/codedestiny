"use client";

import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type MysticalService = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  gradient: string;
  glow: string;
};

type MysticalServiceBase = Omit<MysticalService, "title" | "desc">;

const services: MysticalServiceBase[] = [
  {
    id: 'tarot',
    icon: '🔮',
    gradient: 'from-purple-600/20 to-indigo-900/40',
    glow: 'rgba(139, 92, 246, 0.3)',
  },
  {
    id: 'astrology',
    icon: '🌌',
    gradient: 'from-blue-600/20 to-indigo-900/40',
    glow: 'rgba(59, 130, 246, 0.3)',
  },
  {
    id: 'aura',
    icon: '✨',
    gradient: 'from-pink-600/20 to-purple-900/40',
    glow: 'rgba(236, 72, 153, 0.3)',
  },
  {
    id: 'rune',
    icon: '🗿',
    gradient: 'from-amber-600/20 to-orange-900/40',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  {
    id: 'kabbalah',
    icon: '✡️',
    gradient: 'from-indigo-600/20 to-slate-900/40',
    glow: 'rgba(79, 70, 229, 0.3)',
  },
  {
    id: 'iching',
    icon: '☯️',
    gradient: 'from-emerald-600/20 to-teal-900/40',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  {
    id: 'numerology',
    icon: '🔢',
    gradient: 'from-violet-600/20 to-purple-900/40',
    glow: 'rgba(124, 58, 237, 0.3)',
  },
  {
    id: 'pendulum',
    icon: '💎',
    gradient: 'from-cyan-600/20 to-blue-900/40',
    glow: 'rgba(6, 182, 212, 0.3)',
  },
];

const MYSTICAL_LANDING_COPY: Record<LoadingLocale, {
  heroTitle: string;
  heroDescription: string;
  cta: string;
  scrollHint: string;
  services: Record<string, {
    title: string;
    desc: string;
  }>;
}> = {
  ko: {
    heroTitle: "사주 팔자 이외의 신비한 운세 서비스",
    heroDescription: "우주의 에너지는 당신의 탄생 순간에만 머물지 않습니다. 다양한 신비주의 전통을 통해 당신의 오늘과 내일을 새롭게 탐험해보세요.",
    cta: "시작하기 ✦",
    scrollHint: "스크롤을 마친 후 클릭해주세요",
    services: {
      tarot: { title: "타로 카드", desc: "과거, 현재, 미래를 읽는 신비한 카드" },
      astrology: { title: "점성술", desc: "별의 위치로 운명을 읽다" },
      aura: { title: "오라 리딩", desc: "당신의 에너지를 시각화하다" },
      rune: { title: "룬 스톤", desc: "북유럽의 고대 점술" },
      kabbalah: { title: "카바라", desc: "유대 신비주의 운명론" },
      iching: { title: "I Ching(주역)", desc: "동양의 고대 점술 지혜" },
      numerology: { title: "숫자 운명학", desc: "생년월일로 읽는 당신의 숨겨진 수" },
      pendulum: { title: "팬듈럼", desc: "무의식의 목소리를 듣다" },
    },
  },
  en: {
    heroTitle: "Mystical readings beyond Four Pillars",
    heroDescription: "Cosmic energy does not remain only at the moment of birth. Explore today and tomorrow through many mystical traditions.",
    cta: "Begin ✦",
    scrollHint: "Tap after scrolling ends",
    services: {
      tarot: { title: "Tarot Cards", desc: "Mystic cards that read past, present, and future" },
      astrology: { title: "Astrology", desc: "Read destiny through the placement of the stars" },
      aura: { title: "Aura Reading", desc: "Visualize the energy moving around you" },
      rune: { title: "Rune Stones", desc: "Ancient divination from Northern Europe" },
      kabbalah: { title: "Kabbalah", desc: "Mystical destiny through sacred symbolism" },
      iching: { title: "I Ching", desc: "Ancient Eastern wisdom of change" },
      numerology: { title: "Numerology", desc: "Hidden numbers read from your birth date" },
      pendulum: { title: "Pendulum", desc: "Hear the quiet voice of the unconscious" },
    },
  },
  ja: {
    heroTitle: "四柱推命だけではない神秘の占い",
    heroDescription: "宇宙のエネルギーは、誕生の瞬間だけに留まりません。多様な神秘伝統を通して、今日と明日を新しく探ってみましょう。",
    cta: "始める ✦",
    scrollHint: "スクロールが終わってからタップしてください",
    services: {
      tarot: { title: "タロットカード", desc: "過去・現在・未来を読む神秘のカード" },
      astrology: { title: "占星術", desc: "星の配置から運命を読み解く" },
      aura: { title: "オーラリーディング", desc: "あなたのエネルギーを可視化する" },
      rune: { title: "ルーンストーン", desc: "北欧に伝わる古代の占術" },
      kabbalah: { title: "カバラ", desc: "神聖な象徴で運命を読む神秘思想" },
      iching: { title: "易経", desc: "変化を読む東洋古代の知恵" },
      numerology: { title: "数秘術", desc: "生年月日に隠れた数を読む" },
      pendulum: { title: "ペンデュラム", desc: "無意識の静かな声に耳を澄ます" },
    },
  },
  "zh-CN": {
    heroTitle: "四柱之外的神秘占卜服务",
    heroDescription: "宇宙能量并不只停留在出生瞬间。通过多种神秘传统，重新探索你的今天与明天。",
    cta: "开始 ✦",
    scrollHint: "请在滚动结束后点击",
    services: {
      tarot: { title: "塔罗牌", desc: "读取过去、现在与未来的神秘卡牌" },
      astrology: { title: "占星术", desc: "从星体位置读取命运" },
      aura: { title: "灵气解读", desc: "可视化你周围流动的能量" },
      rune: { title: "卢恩石", desc: "来自北欧的古老占卜" },
      kabbalah: { title: "卡巴拉", desc: "以神圣象征解读命运的神秘思想" },
      iching: { title: "易经", desc: "读取变化的东方古老智慧" },
      numerology: { title: "数字命理", desc: "从出生日期读取隐藏数字" },
      pendulum: { title: "灵摆", desc: "聆听潜意识的微弱声音" },
    },
  },
  "zh-TW": {
    heroTitle: "四柱之外的神秘占卜服務",
    heroDescription: "宇宙能量並不只停留在出生瞬間。透過多種神秘傳統，重新探索你的今天與明天。",
    cta: "開始 ✦",
    scrollHint: "請在捲動結束後點擊",
    services: {
      tarot: { title: "塔羅牌", desc: "讀取過去、現在與未來的神秘卡牌" },
      astrology: { title: "占星術", desc: "從星體位置讀取命運" },
      aura: { title: "靈氣解讀", desc: "可視化你周圍流動的能量" },
      rune: { title: "盧恩石", desc: "來自北歐的古老占卜" },
      kabbalah: { title: "卡巴拉", desc: "以神聖象徵解讀命運的神秘思想" },
      iching: { title: "易經", desc: "讀取變化的東方古老智慧" },
      numerology: { title: "數字命理", desc: "從出生日期讀取隱藏數字" },
      pendulum: { title: "靈擺", desc: "聆聽潛意識的微弱聲音" },
    },
  },
  vi: {
    heroTitle: "Những dịch vụ huyền học ngoài Tứ Trụ",
    heroDescription: "Năng lượng vũ trụ không chỉ dừng lại ở khoảnh khắc bạn sinh ra. Hãy khám phá hôm nay và ngày mai qua nhiều truyền thống huyền học.",
    cta: "Bắt đầu ✦",
    scrollHint: "Hãy chạm sau khi cuộn xong",
    services: {
      tarot: { title: "Bài Tarot", desc: "Những lá bài huyền bí đọc quá khứ, hiện tại và tương lai" },
      astrology: { title: "Chiêm tinh", desc: "Đọc vận mệnh qua vị trí các vì sao" },
      aura: { title: "Đọc hào quang", desc: "Hiển thị dòng năng lượng quanh bạn" },
      rune: { title: "Đá Rune", desc: "Bói toán cổ xưa từ Bắc Âu" },
      kabbalah: { title: "Kabbalah", desc: "Vận mệnh huyền nhiệm qua biểu tượng thiêng" },
      iching: { title: "Kinh Dịch", desc: "Trí tuệ phương Đông cổ xưa về sự biến đổi" },
      numerology: { title: "Thần số học", desc: "Những con số ẩn trong ngày sinh của bạn" },
      pendulum: { title: "Con lắc", desc: "Lắng nghe tiếng nói thầm lặng của vô thức" },
    },
  },
  hi: {
    heroTitle: "चार स्तंभों से आगे की रहस्यमयी रीडिंग",
    heroDescription: "ब्रह्मांडीय ऊर्जा केवल जन्म क्षण में नहीं ठहरती. अनेक रहस्य परंपराओं से अपने आज और कल को नए ढंग से खोजें.",
    cta: "शुरू करें ✦",
    scrollHint: "स्क्रोल रुकने के बाद टैप करें",
    services: {
      tarot: { title: "टैरो कार्ड", desc: "भूत, वर्तमान और भविष्य पढ़ने वाले रहस्यमयी कार्ड" },
      astrology: { title: "ज्योतिष", desc: "सितारों की स्थिति से भाग्य पढ़ें" },
      aura: { title: "आभा रीडिंग", desc: "अपने चारों ओर बहती ऊर्जा को देखें" },
      rune: { title: "रून स्टोन", desc: "उत्तरी यूरोप की प्राचीन दिव्यविद्या" },
      kabbalah: { title: "कब्बाला", desc: "पवित्र प्रतीकों से भाग्य का रहस्य" },
      iching: { title: "I Ching", desc: "परिवर्तन की प्राचीन पूर्वी बुद्धि" },
      numerology: { title: "अंक ज्योतिष", desc: "जन्म तारीख में छिपे अंकों को पढ़ें" },
      pendulum: { title: "पेंडुलम", desc: "अवचेतन की शांत आवाज सुनें" },
    },
  },
  es: {
    heroTitle: "Lecturas místicas más allá de los Cuatro Pilares",
    heroDescription: "La energía del universo no se detiene en tu nacimiento. Explora tu hoy y tu mañana a través de distintas tradiciones místicas.",
    cta: "Comenzar ✦",
    scrollHint: "Haz clic cuando termine el desplazamiento",
    services: {
      tarot: { title: "Cartas del tarot", desc: "Cartas místicas que leen pasado, presente y futuro" },
      astrology: { title: "Astrología", desc: "Lee el destino por la posición de los astros" },
      aura: { title: "Lectura de aura", desc: "Visualiza la energía que te rodea" },
      rune: { title: "Runas", desc: "Adivinación antigua del norte de Europa" },
      kabbalah: { title: "Kabbalah", desc: "Destino místico a través de símbolos sagrados" },
      iching: { title: "I Ching", desc: "Sabiduría oriental antigua del cambio" },
      numerology: { title: "Numerología", desc: "Números ocultos leídos desde tu fecha de nacimiento" },
      pendulum: { title: "Péndulo", desc: "Escucha la voz silenciosa del inconsciente" },
    },
  },
  fr: {
    heroTitle: "Lectures mystiques au-delà des Quatre Piliers",
    heroDescription: "L'énergie cosmique ne reste pas seulement dans l'instant de naissance. Explorez votre aujourd'hui et votre demain à travers plusieurs traditions mystiques.",
    cta: "Commencer ✦",
    scrollHint: "Cliquez après la fin du défilement",
    services: {
      tarot: { title: "Cartes de tarot", desc: "Cartes mystiques pour lire passé, présent et futur" },
      astrology: { title: "Astrologie", desc: "Lire le destin par la position des étoiles" },
      aura: { title: "Lecture d'aura", desc: "Visualiser l'énergie qui vous entoure" },
      rune: { title: "Pierres runiques", desc: "Divination ancienne du nord de l'Europe" },
      kabbalah: { title: "Kabbale", desc: "Destin mystique par les symboles sacrés" },
      iching: { title: "Yi Jing", desc: "Ancienne sagesse orientale du changement" },
      numerology: { title: "Numérologie", desc: "Les nombres cachés lus depuis votre date de naissance" },
      pendulum: { title: "Pendule", desc: "Écouter la voix silencieuse de l'inconscient" },
    },
  },
  de: {
    heroTitle: "Mystische Deutungen jenseits der Vier Säulen",
    heroDescription: "Kosmische Energie bleibt nicht nur im Moment deiner Geburt. Erkunde heute und morgen durch verschiedene mystische Traditionen.",
    cta: "Beginnen ✦",
    scrollHint: "Nach dem Scrollen tippen",
    services: {
      tarot: { title: "Tarotkarten", desc: "Mystische Karten für Vergangenheit, Gegenwart und Zukunft" },
      astrology: { title: "Astrologie", desc: "Schicksal durch die Stellung der Sterne lesen" },
      aura: { title: "Aura-Lesung", desc: "Die Energie um dich herum sichtbar machen" },
      rune: { title: "Runensteine", desc: "Alte Weissagung aus Nordeuropa" },
      kabbalah: { title: "Kabbala", desc: "Mystisches Schicksal durch heilige Symbole" },
      iching: { title: "I Ging", desc: "Alte östliche Weisheit des Wandels" },
      numerology: { title: "Numerologie", desc: "Verborgene Zahlen aus deinem Geburtsdatum" },
      pendulum: { title: "Pendel", desc: "Die leise Stimme des Unbewussten hören" },
    },
  },
  nl: {
    heroTitle: "Mystieke lezingen voorbij de Vier Pilaren",
    heroDescription: "Kosmische energie blijft niet alleen bij je geboorte. Verken vandaag en morgen via verschillende mystieke tradities.",
    cta: "Beginnen ✦",
    scrollHint: "Tik nadat het scrollen stopt",
    services: {
      tarot: { title: "Tarotkaarten", desc: "Mystieke kaarten voor verleden, heden en toekomst" },
      astrology: { title: "Astrologie", desc: "Lees het lot via de stand van de sterren" },
      aura: { title: "Aura reading", desc: "Maak de energie om je heen zichtbaar" },
      rune: { title: "Runestenen", desc: "Oude divinatie uit Noord-Europa" },
      kabbalah: { title: "Kabbalah", desc: "Mystiek lot via heilige symbolen" },
      iching: { title: "I Ching", desc: "Oude oosterse wijsheid van verandering" },
      numerology: { title: "Numerologie", desc: "Verborgen getallen uit je geboortedatum" },
      pendulum: { title: "Pendulum", desc: "Luister naar de stille stem van het onderbewuste" },
    },
  },
  ms: {
    heroTitle: "Bacaan mistik selain Empat Tiang",
    heroDescription: "Tenaga kosmik tidak hanya berhenti pada saat kelahiran. Terokai hari ini dan esok melalui pelbagai tradisi mistik.",
    cta: "Mula ✦",
    scrollHint: "Ketik selepas skrol selesai",
    services: {
      tarot: { title: "Kad Tarot", desc: "Kad mistik yang membaca masa lalu, kini dan masa depan" },
      astrology: { title: "Astrologi", desc: "Baca takdir melalui kedudukan bintang" },
      aura: { title: "Bacaan aura", desc: "Gambarkan tenaga yang mengelilingi anda" },
      rune: { title: "Batu Rune", desc: "Ramalan kuno dari Eropah Utara" },
      kabbalah: { title: "Kabbalah", desc: "Takdir mistik melalui simbol suci" },
      iching: { title: "I Ching", desc: "Kebijaksanaan Timur purba tentang perubahan" },
      numerology: { title: "Numerologi", desc: "Nombor tersembunyi daripada tarikh lahir anda" },
      pendulum: { title: "Pendulum", desc: "Dengar suara halus bawah sedar" },
    },
  },
};

export default function MysticalLanding() {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = MYSTICAL_LANDING_COPY[locale] || MYSTICAL_LANDING_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 500);
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#0f0920] font-body text-[#e0e0e0] selection:bg-purple-500/30">
      {/* Background Particles (Static Placeholder for performance, can be enhanced) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {[...Array(20)].map((_, i) => (
          <m.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20"
            initial={{ 
              x: Math.random() * 2000 - 1000, 
              y: Math.random() * 2000 - 1000 
            }}
            animate={{ 
              y: [0, -100, 0],
              opacity: [0.1, 0.4, 0.1]
            }}
            transition={{ 
              duration: 10 + Math.random() * 20, 
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ 
              left: `${Math.random() * 100}%`, 
              top: `${Math.random() * 100}%` 
            }}
          />
        ))}
      </div>

      {/* Mouse Follow Light */}
      <div 
        className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 400px at ${mousePos.x}px ${mousePos.y}px, rgba(196, 166, 255, 0.08), transparent 80%)`,
          opacity: isScrolling ? 0 : 1
        }}
      />

      {/* Hero Section */}
      <section className="relative z-20 pt-32 pb-20 px-6 max-w-6xl mx-auto text-center">
        <m.h1 
          className="mb-6 font-display text-4xl font-black tracking-tight md:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#c4a6ff] via-[#ffd700] to-[#c4a6ff] bg-[length:200%_auto] animate-gradient-flow">
            {copy.heroTitle}
          </span>
        </m.h1>
        
        <m.p 
          className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {copy.heroDescription}
        </m.p>
      </section>

      {/* Service Card Grid */}
      <section className="relative z-20 px-6 pb-32 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const serviceCopy = copy.services[service.id] || MYSTICAL_LANDING_COPY.ko.services[service.id];
            return (
              <ServiceCard
                key={service.id}
                service={{ ...service, title: serviceCopy.title, desc: serviceCopy.desc }}
                index={index}
                isScrolling={isScrolling}
              />
            );
          })}
        </div>

        {/* CTA Button */}
        <m.div 
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <button className="group relative px-10 py-4 bg-transparent border border-purple-500/50 rounded-full overflow-hidden transition-all hover:border-purple-400">
            <div className="absolute inset-0 bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors" />
            <span className="relative text-lg font-semibold text-[#c4a6ff] group-hover:text-white transition-colors">
              {copy.cta}
            </span>
          </button>
        </m.div>
      </section>

      {/* Scroll Toast Message */}
      <AnimatePresence>
        {isScrolling && (
          <m.div 
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-2 bg-slate-900/80 border border-slate-700 backdrop-blur-md rounded-full text-xs text-slate-300 pointer-events-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {copy.scrollHint}
          </m.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-flow {
          animation: gradient-flow 6s ease infinite;
        }
      `}</style>
    </div>
  );
}

function ServiceCard({ service, index, isScrolling }: { service: MysticalService, index: number, isScrolling: boolean }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className={`group relative h-64 rounded-3xl p-8 border border-white/5 bg-gradient-to-br ${service.gradient} backdrop-blur-sm transition-all duration-500 ${isScrolling ? 'opacity-60 pointer-events-none cursor-not-allowed grayscale-[0.5]' : 'hover:scale-[1.02] hover:shadow-2xl hover:border-white/10'}`}
      style={{
        boxShadow: !isScrolling ? `0 0 20px -10px ${service.glow}` : 'none'
      }}
    >
      {/* Icon */}
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
        {service.icon}
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
        {service.title}
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed">
        {service.desc}
      </p>

      {/* Decorative Glow */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
        style={{
          boxShadow: `inset 0 0 40px ${service.glow}`
        }}
      />
      
      {/* Clickability Hint */}
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-60 transition-opacity text-purple-400">
        ✦
      </div>
    </m.div>
  );
}
