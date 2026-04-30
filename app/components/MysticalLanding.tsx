"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Playfair_Display, Inter } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '900'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '600'] });

const services = [
  {
    id: 'tarot',
    title: '타로 카드',
    desc: '과거, 현재, 미래를 읽는 신비한 카드',
    icon: '🔮',
    gradient: 'from-purple-600/20 to-indigo-900/40',
    glow: 'rgba(139, 92, 246, 0.3)',
  },
  {
    id: 'astrology',
    title: '점성술',
    desc: '별의 위치로 운명을 읽다',
    icon: '🌌',
    gradient: 'from-blue-600/20 to-indigo-900/40',
    glow: 'rgba(59, 130, 246, 0.3)',
  },
  {
    id: 'aura',
    title: '오라 리딩',
    desc: '당신의 에너지를 시각화하다',
    icon: '✨',
    gradient: 'from-pink-600/20 to-purple-900/40',
    glow: 'rgba(236, 72, 153, 0.3)',
  },
  {
    id: 'rune',
    title: '루룬 스톤',
    desc: '북유럽의 고대 점술',
    icon: '🗿',
    gradient: 'from-amber-600/20 to-orange-900/40',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  {
    id: 'kabbalah',
    title: '카바라',
    desc: '유대 신비주의 운명론',
    icon: '✡️',
    gradient: 'from-indigo-600/20 to-slate-900/40',
    glow: 'rgba(79, 70, 229, 0.3)',
  },
  {
    id: 'iching',
    title: 'I Ching(易經)',
    desc: '동양의 고대 점술 지혜',
    icon: '☯️',
    gradient: 'from-emerald-600/20 to-teal-900/40',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  {
    id: 'numerology',
    title: '숫자 운명학',
    desc: '생년월일로 읽는 당신의 숨겨진 수',
    icon: '🔢',
    gradient: 'from-violet-600/20 to-purple-900/40',
    glow: 'rgba(124, 58, 237, 0.3)',
  },
  {
    id: 'pendulum',
    title: '팬듈럼',
    desc: '무의식의 목소리를 듣다',
    icon: '💎',
    gradient: 'from-cyan-600/20 to-blue-900/40',
    glow: 'rgba(6, 182, 212, 0.3)',
  },
];

export default function MysticalLanding() {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
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
    <div className={`relative min-h-screen bg-[#0f0920] text-[#e0e0e0] selection:bg-purple-500/30 overflow-x-hidden ${inter.className}`}>
      {/* Background Particles (Static Placeholder for performance, can be enhanced) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {[...Array(20)].map((_, i) => (
          <motion.div
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
        <motion.h1 
          className={`${playfair.className} text-4xl md:text-6xl font-black mb-6 tracking-tight`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#c4a6ff] via-[#ffd700] to-[#c4a6ff] bg-[length:200%_auto] animate-gradient-flow">
            사주 팔자 이외의 신비한 운세 서비스
          </span>
        </motion.h1>
        
        <motion.p 
          className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          우주의 에너지는 당신의 탄생 순간에만 머물지 않습니다. <br className="hidden md:block" />
          다양한 신비주의 전통을 통해 당신의 오늘과 내일을 새롭게 탐험해보세요.
        </motion.p>
      </section>

      {/* Service Card Grid */}
      <section className="relative z-20 px-6 pb-32 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <ServiceCard 
              key={service.id} 
              service={service} 
              index={index} 
              isScrolling={isScrolling}
            />
          ))}
        </div>

        {/* CTA Button */}
        <motion.div 
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <button className="group relative px-10 py-4 bg-transparent border border-purple-500/50 rounded-full overflow-hidden transition-all hover:border-purple-400">
            <div className="absolute inset-0 bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors" />
            <span className="relative text-lg font-semibold text-[#c4a6ff] group-hover:text-white transition-colors">
              시작하기 ✦
            </span>
          </button>
        </motion.div>
      </section>

      {/* Scroll Toast Message */}
      <AnimatePresence>
        {isScrolling && (
          <motion.div 
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-6 py-2 bg-slate-900/80 border border-slate-700 backdrop-blur-md rounded-full text-xs text-slate-300 pointer-events-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            스크롤을 마친 후 클릭해주세요
          </motion.div>
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

function ServiceCard({ service, index, isScrolling }: { service: any, index: number, isScrolling: boolean }) {
  return (
    <motion.div
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
    </motion.div>
  );
}
