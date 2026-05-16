import { useState, useCallback, useMemo } from "react";
import { Persona, SimulationState, DialogueStep, Choice } from "../_types";
import { SCENARIO_DB, Scenario } from "../_data/scenarios";

export function useSimulation() {
  const [state, setState] = useState<SimulationState>({
    currentPersona: null,
    affinity: 50,
    stepIndex: 0,
    isCompleted: false,
    history: [],
  });

  const [activeScenarios, setActiveScenarios] = useState<Scenario[]>([]);

  const startSimulation = useCallback((persona: Persona) => {
    // Randomly pick 3 scenarios for the session
    const shuffled = [...SCENARIO_DB].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    setActiveScenarios(selected);
    setState({
      currentPersona: persona,
      affinity: 50,
      stepIndex: 0,
      isCompleted: false,
      history: [
        {
          speaker: "system",
          text: `${persona.name}님과의 대화가 시작되었습니다.`,
        },
        {
          speaker: "npc",
          text: selected[0].npcDialogue(persona.name),
        },
      ],
    });
  }, []);

  const handleChoice = useCallback((choice: Choice) => {
    setState((prev) => {
      if (!prev.currentPersona) return prev;

      const nextStepIndex = prev.stepIndex + 1;
      const isLastStep = nextStepIndex >= activeScenarios.length;

      const newAffinity = Math.max(0, Math.min(100, prev.affinity + choice.affinityDelta));
      
      const newHistory: DialogueStep[] = [
        ...prev.history,
        {
          speaker: "user",
          text: choice.text,
        },
      ];

      // Add NPC reaction
      const currentScenario = activeScenarios[prev.stepIndex];
      const selectedChoice = currentScenario.choices.find(c => c.text === choice.text);
      if (selectedChoice) {
        newHistory.push({
          speaker: "npc",
          text: selectedChoice.reaction(prev.currentPersona.name),
        });
      }

      // If there's a next scenario, add its intro
      if (!isLastStep) {
        newHistory.push({
          speaker: "npc",
          text: activeScenarios[nextStepIndex].npcDialogue(prev.currentPersona.name),
        });
      }

      return {
        ...prev,
        affinity: newAffinity,
        stepIndex: nextStepIndex,
        isCompleted: isLastStep,
        history: newHistory,
      };
    });
  }, [activeScenarios]);

  const reset = useCallback(() => {
    setState({
      currentPersona: null,
      affinity: 50,
      stepIndex: 0,
      isCompleted: false,
      history: [],
    });
    setActiveScenarios([]);
  }, []);

  return {
    state,
    startSimulation,
    handleChoice,
    reset,
    currentScenario: activeScenarios[state.stepIndex],
  };
}
