"use client";

import { motion } from "framer-motion";
import CosmicSigil from "./CosmicSigil";

export default function AnimalDestinyHero() {
  return (
    <section className="relative w-full overflow-hidden pt-12 pb-16 px-6">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[100px] rounded-full" />
        
        {/* Animated Stars/Particles (Simplified for CSS) */}
        <div className="stars-container absolute inset-0 opacity-30">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="absolute bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 3}px`,
                height: `${Math.random() * 3}px`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          <div className="inline-block px-4 py-1.5 rounded-full border border-amber-200/30 bg-amber-500/10 backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-200/90">
              Celestial Saju Destiny
            </p>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-[linear-gradient(135deg,#fff_30%,#ffd700_100%)] drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)] leading-tight">
            사주 십이운성<br />동물점 테스트
          </h1>
          
          <p className="text-lg md:text-xl font-medium text-purple-100/80">
            내 사주 속 운명의 동물 캐릭터를 찾아보세요
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="relative mx-auto w-64 h-64 md:w-80 md:h-80"
        >
          {/* Gold Halo / Cosmic Circle */}
          <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border border-amber-400/10 animate-[spin_15s_linear_reverse_infinite]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,215,0,0.15)_0%,transparent_70%)]" />
          
          {/* Mascot Placeholder / Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative group">
              <div className="absolute -inset-4 bg-amber-400/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <CosmicSigil className="w-40 h-40 md:w-52 md:h-52 text-amber-100/90 drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]" />
            </div>
          </div>

          {/* Cloud Decorations (SVG) */}
          <div className="absolute -bottom-4 -left-8 w-32 h-16 opacity-60">
             <svg viewBox="0 0 100 50" className="w-full h-full text-purple-200/40 fill-current">
               <path d="M10,40 Q30,10 50,40 T90,40" />
             </svg>
          </div>
          <div className="absolute -top-4 -right-8 w-32 h-16 opacity-60 scale-x-[-1]">
             <svg viewBox="0 0 100 50" className="w-full h-full text-purple-200/40 fill-current">
               <path d="M10,40 Q30,10 50,40 T90,40" />
             </svg>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="max-w-xl mx-auto"
        >
          <p className="text-sm md:text-base leading-relaxed text-purple-100/70 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
            “태어난 사주팔자와 십이운성의 흐름을 바탕으로 나의 기질, 연애 방식, 재능, 관계 패턴을 귀여운 동물 캐릭터로 해석합니다.”
          </p>
        </motion.div>
      </div>
    </section>
  );
}
