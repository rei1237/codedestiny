'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Shape, getRandomShape } from './data/shapes';

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
  
  // 통계
  visitCount: number;
  lastVisit: string | null;
  
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
  const [currentPhase, setCurrentPhase] = useState<SikojenpovailuContextType['currentPhase']>('welcome');
  const [selectedCategory, setSelectedCategory] = useState<'금전운' | '연애운' | '행운' | null>(null);
  const [selectedShape, setSelectedShape] = useState<Shape | null>(null);
  const [isRitualing, setIsRitualing] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [shadowShapeVisible, setShadowShapeVisible] = useState(false);
  const [visitCount, setVisitCount] = useState(0);
  const [lastVisit, setLastVisit] = useState<string | null>(null);

  const selectCategory = (category: '금전운' | '연애운' | '행운') => {
    setSelectedCategory(category);
  };

  const generateShape = () => {
    const newShape = getRandomShape();
    setSelectedShape(newShape);
  };

  const resetGame = () => {
    setCurrentPhase('welcome');
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
    visitCount,
    lastVisit,
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

