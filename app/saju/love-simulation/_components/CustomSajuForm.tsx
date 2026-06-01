"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Persona } from "../_types";
import { fetchSajuPillar } from "../_services/sajuApi";
import { derivePersonaFromSaju } from "../_utils/personaLogic";
import { X, Loader2, Sparkles, Heart } from "lucide-react";

interface CustomSajuFormProps {
  onClose: () => void;
  onPersonaCreated: (persona: Persona) => void;
}

export const CustomSajuForm: React.FC<CustomSajuFormProps> = ({ onClose, onPersonaCreated }) => {
  const [formData, setFormData] = useState({
    name: "",
    gender: "남",
    year: "1995",
    month: "1",
    day: "1",
    hour: "12",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const sajuAnalysis = await fetchSajuPillar({
        name: formData.name,
        gender: formData.gender as "남" | "여",
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        day: parseInt(formData.day),
        hour: parseInt(formData.hour),
      });

      const traits = derivePersonaFromSaju(sajuAnalysis);
      const dm = sajuAnalysis.dayMasterElement;
      
      let emoji = "👤";
      if (dm === "목") emoji = "🌲";
      if (dm === "화") emoji = "☀️";
      if (dm === "토") emoji = "⛰️";
      if (dm === "금") emoji = "💎";
      if (dm === "수") emoji = "🌊";

      const newPersona: Persona = {
        name: formData.name,
        emoji,
        gender: formData.gender as "남" | "여",
        birth: {
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
        },
        desc: `${sajuAnalysis.dayMasterName} 일간`,
        tags: traits.attractionPoints.slice(0, 3),
        mbti: "?",
        traits: traits,
      };

      onPersonaCreated(newPersona);
    } catch (err) {
      console.error(err);
      setError("사주 정보를 분석하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#1a1525]/95 backdrop-blur-xl border border-pink-500/30 p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_rgba(219,39,119,0.15)] relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-rose-500" />
      
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-center justify-center gap-2 mb-6">
        <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-300">
          운명의 상대 찾기
        </h2>
      </div>
      
      <p className="text-center text-gray-400 text-sm mb-8">
        상대방의 생년월일시를 입력하면 사주 기반<br/>페르소나가 생성되어 시뮬레이션이 시작됩니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-pink-300 uppercase tracking-wider mb-2">이름 (또는 애칭)</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
            placeholder="예: 지민, 선배, 그 사람"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-pink-300 uppercase tracking-wider mb-2">성별</label>
          <div className="grid grid-cols-2 gap-3">
            {(["남", "여"] as const).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                className={`py-3 rounded-xl font-bold transition-all ${
                  formData.gender === g 
                    ? "bg-pink-500/20 border-2 border-pink-500 text-pink-300" 
                    : "bg-black/40 border border-white/10 text-gray-400 hover:border-white/30"
                }`}
              >
                {g}성
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-pink-300 uppercase tracking-wider mb-2">생년월일시</label>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={formData.year}
              onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-pink-500"
            >
              {Array.from({ length: 70 }, (_, i) => 2024 - i).map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <select
              value={formData.month}
              onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-pink-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
            <select
              value={formData.day}
              onChange={(e) => setFormData(prev => ({ ...prev, day: e.target.value }))}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-pink-500"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>
            <select
              value={formData.hour}
              onChange={(e) => setFormData(prev => ({ ...prev, hour: e.target.value }))}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-pink-500"
            >
              <option value="-1">모름</option>
              {Array.from({ length: 24 }, (_, i) => i).map(h => (
                <option key={h} value={h}>{h}시 ({h}:30~{(h+1)%24}:29)</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-rose-400 text-sm font-semibold text-center mt-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl font-bold shadow-lg shadow-pink-500/20 hover:brightness-110 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? "사주 분석 중..." : "운명의 페르소나 생성"}
        </button>
      </form>
    </motion.div>
  );
};
