"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulation } from "../_hooks/useSimulation";
import { DialogueBox } from "./DialogueBox";
import { AffinityMeter } from "./AffinityMeter";
import { MALE_PRESETS } from "../_data/presets";
import { Persona } from "../_types";
import { ArrowLeft, Sparkles, RefreshCw, PlusCircle } from "lucide-react";
import { CustomSajuForm } from "./CustomSajuForm";

export const LoveSimulationEngine: React.FC = () => {
  const { state, startSimulation, handleChoice, reset, resolveChoicesForCurrentScenario } = useSimulation();
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);

  if (!state.currentPersona) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] text-white p-6 pt-24 pb-32 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-8 h-8 text-pink-500" />
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-400">
              Love Code: 운명의 상대와 대화하기
            </h1>
          </div>

          <p className="text-gray-400 mb-12 text-lg">
            사주 분석을 통해 당신과 가장 잘 어울리는 상대를 선택하거나, 직접 정보를 입력하여 가상 연애를 시작해보세요.
          </p>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCustomFormOpen(true)}
            className="mb-10 p-6 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-3xl cursor-pointer hover:border-pink-500/60 hover:shadow-[0_0_30px_rgba(219,39,119,0.2)] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">상대방 사주 직접 입력하기</h3>
                <p className="text-pink-300/80 text-sm">생년월일시를 입력하면 맞춤형 페르소나가 생성됩니다.</p>
              </div>
            </div>
            <div className="hidden sm:block px-4 py-2 bg-pink-500/20 text-pink-300 rounded-full text-sm font-bold border border-pink-500/20">
              시작하기 →
            </div>
          </motion.div>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-gray-500 text-sm font-bold tracking-widest uppercase">또는 프리셋 선택</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MALE_PRESETS.map((p, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group relative p-6 bg-white/5 border border-white/10 rounded-3xl cursor-pointer hover:border-pink-500/50 transition-all overflow-hidden"
                onClick={() => setSelectedPersona(p)}
              >
                <div className="absolute top-0 right-0 p-8 text-6xl opacity-20 group-hover:opacity-40 transition-opacity">
                  {p.emoji}
                </div>
                <div className="relative z-10">
                  <div className="text-4xl mb-4">{p.emoji}</div>
                  <h3 className="text-2xl font-bold mb-2">{p.name}</h3>
                  <p className="text-pink-400 font-medium mb-4">{p.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {p.tags.map((t, i) => (
                      <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </motion.div>

        <AnimatePresence>
          {isCustomFormOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <CustomSajuForm
                onClose={() => setIsCustomFormOpen(false)}
                onPersonaCreated={(persona) => {
                  setIsCustomFormOpen(false);
                  startSimulation(persona);
                }}
              />
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedPersona && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl"
              >
                <h2 className="text-2xl font-bold mb-4">{selectedPersona.name}님과 시작할까요?</h2>
                <p className="text-gray-400 mb-8">사주 기질과 취향 기반으로 대화 선택지가 개인화됩니다.</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedPersona(null)}
                    className="flex-1 py-4 bg-white/5 rounded-2xl font-bold hover:bg-white/10 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => startSimulation(selectedPersona)}
                    className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl font-bold shadow-lg shadow-pink-500/20 hover:brightness-110 transition-all"
                  >
                    대화 시작
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (state.isCompleted) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full text-center p-12 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-xl"
        >
          <div className="w-24 h-24 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <Heart className="w-12 h-12 text-pink-500 fill-pink-500" />
          </div>
          <h2 className="text-4xl font-bold mb-4">시뮬레이션 종료</h2>
          <p className="text-xl text-gray-400 mb-8">
            최종 호감도: <span className="text-pink-500 font-bold">{state.affinity}%</span>
          </p>
          <div className="p-6 bg-white/5 rounded-2xl mb-12 text-left">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">분석 결과</h4>
            <p className="text-gray-300 leading-relaxed">
              {state.affinity >= 80 ? (
                "축하합니다! 당신의 사주 기질과 대화 방식이 상대방에게 깊은 인상을 남겼습니다. 실제 인연으로 발전할 가능성이 매우 높습니다."
              ) : state.affinity >= 50 ? (
                "좋은 대화였습니다. 서로의 다름을 인정하며 맞춰가는 과정이 인상적이네요. 조금 더 솔직한 표현이 호감도를 높이는 열쇠가 될 것입니다."
              ) : (
                "아쉬운 결과입니다. 서로의 오행 기질이 충돌하는 부분이 있었네요. 하지만 운명은 개척하는 것! 다른 대화 전략을 시도해보세요."
              )}
            </p>
          </div>
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full py-5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl font-bold shadow-lg shadow-pink-500/20 hover:brightness-110 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            다시 시작하기
          </button>
        </motion.div>
      </div>
    );
  }

  const currentStep = state.history[state.history.length - 1];
  const personalizedChoices = currentStep.speaker === "npc" ? resolveChoicesForCurrentScenario() : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0c] overflow-hidden flex flex-col">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(219,39,119,0.1),transparent)]" />
      
      {/* Top Header */}
      <div className="relative z-10 p-6 flex items-center justify-between">
        <button
          onClick={reset}
          className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <AffinityMeter value={state.affinity} />
      </div>

      {/* Main Game Area */}
      <div className="relative flex-1 flex flex-col items-center justify-end pb-12 px-6">
        {/* Character Visual */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentPersona.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-12"
          >
            <div className="relative">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="text-[12rem] filter drop-shadow-[0_0_30px_rgba(219,39,119,0.3)]"
              >
                {state.currentPersona.emoji}
              </motion.div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-6 bg-black/40 blur-xl rounded-full" />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dialogue UI */}
        <DialogueBox
          personaName={state.currentPersona.name}
          step={{
            ...currentStep,
            choices: personalizedChoices
          }}
          onChoiceSelect={handleChoice}
        />
      </div>
    </div>
  );
};

// Internal Heart Component for simulation end screen
const Heart: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
  </svg>
);
