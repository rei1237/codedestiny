'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Shape, drawTinShape } from './data/shapes';

interface SikojenpovailuContextType {
  // Phase 추적
  currentPhase: 'welcome' | 'ritual-prep' | 'casting' | 'reveal' | 'sharing' | 'shadow' | 'complete';
  
  // 선택지
  selectedCategory: '금전운' | '연애운' | '행운' | null;
  selectedShape: Shape | null;
  
  // 게임 상태
  isRitualing: boolean;
  isCasting: boolean;
  shadowShapeVisible: boolean;

  // 액션들
  selectCategory: (category: '금전운' | '연애운' | '행운') => void;
  generateShape: () => void;
  setPhase: (phase: SikojenpovailuContextType['currentPhase']) => void;
  setIsRitualing: (value: boolean) => void;
  setIsCasting: (value: boolean) => void;
  setShadowShapeVisible: (value: boolean) => void;
  resetGame: () => void;
}

const SikojenpovailuContext = createContext<SikojenpovailuContextType | undefined>(undefined);

export function SikojenpovailuProvider({ children }: { children: ReactNode }) {
  // 첫 진입은 웰컴(TERVETULOA) — 무엇을 하는 점인지 먼저 보여준다.
  const [currentPhase, setCurrentPhase] = useState<SikojenpovailuContextType['currentPhase']>('welcome');
  const [selectedCategory, setSelectedCategory] = useState<'금전운' | '연애운' | '행운' | null>(null);
  const [selectedShape, setSelectedShape] = useState<Shape | null>(null);
  const [isRitualing, setIsRitualing] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [shadowShapeVisible, setShadowShapeVisible] = useState(false);

  const selectCategory = (category: '금전운' | '연애운' | '행운') => {
    setSelectedCategory(category);
  };

  const generateShape = () => {
    setSelectedShape(drawTinShape(selectedCategory));
  };

  const resetGame = () => {
    // 의도적으로 'welcome' 이 아니라 주머니 선택으로 되돌린다 —
    // "다시 하기"가 매번 인트로부터 다시 시작하면 반복 이용이 번거롭다.
    setCurrentPhase('ritual-prep');
    setSelectedCategory(null);
    setSelectedShape(null);
    setIsRitualing(false);
    setIsCasting(false);
    setShadowShapeVisible(false);
  };

  const value: SikojenpovailuContextType = {
    currentPhase,
    selectedCategory,
    selectedShape,
    isRitualing,
    isCasting,
    shadowShapeVisible,
    selectCategory,
    generateShape,
    setPhase: setCurrentPhase,
    setIsRitualing,
    setIsCasting,
    setShadowShapeVisible,
    resetGame,
  };

  return (
    <SikojenpovailuContext.Provider value={value}>
      {children}
    </SikojenpovailuContext.Provider>
  );
}

export function useSikojenpovailuContext() {
  const context = useContext(SikojenpovailuContext);
  if (context === undefined) {
    throw new Error('useSikojenpovailuContext must be used within SikojenpovailuProvider');
  }
  return context;
}

