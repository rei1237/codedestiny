"use client";

import React from "react";
import { m } from "framer-motion";
import { Heart } from "lucide-react";

interface AffinityMeterProps {
  value: number; // 0 to 100
}

export const AffinityMeter: React.FC<AffinityMeterProps> = ({ value }) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
      <m.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
      </m.div>
      
      <div className="relative w-48 h-3 bg-white/20 rounded-full overflow-hidden">
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 50 }}
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-500 to-pink-400"
        />
      </div>
      
      <span className="text-sm font-bold text-white min-w-[2.5rem]">
        {Math.round(value)}%
      </span>
    </div>
  );
};
