"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DialogueStep, Choice } from "../_types";

interface DialogueBoxProps {
  step: DialogueStep;
  onChoiceSelect?: (choice: Choice) => void;
  personaName: string;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({ step, onChoiceSelect, personaName }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-2xl mx-auto p-6 bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl"
    >
      {/* Speaker Tag */}
      <div className="absolute -top-4 left-6 px-4 py-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-sm font-bold text-white shadow-lg">
        {step.speaker === "npc" ? personaName : step.speaker === "user" ? "나" : "알림"}
      </div>

      {/* Dialogue Text */}
      <div className="mt-2 text-lg text-white leading-relaxed min-h-[4rem]">
        {step.text}
      </div>

      {/* Choices */}
      {step.choices && step.choices.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {step.choices.map((choice, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChoiceSelect?.(choice)}
              className="w-full p-4 text-left text-white bg-white/10 border border-white/10 rounded-xl transition-colors hover:border-pink-500/50"
            >
              {choice.text}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
};
