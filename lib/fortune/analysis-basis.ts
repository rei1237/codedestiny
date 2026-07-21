// AI 상담이 실제로 계산한 값(근거)을 프런트에서 다루기 위한 타입과 조회 헬퍼.
// 서버 계약은 worker/lib/analysis-basis-contract.js가 정의한다.

import { authFetch } from "@/app/_lib/auth-client";

export type BasisTone = "positive" | "caution" | "neutral";

export interface BasisItem {
  label: string;
  value: string;
  term?: string;
  termHint?: string;
  termDetail?: string;
  tone?: BasisTone;
}

export interface BasisGroup {
  key: string;
  title: string;
  hint?: string;
  items: BasisItem[];
}

export interface BasisStage {
  key: string;
  label: string;
  detail?: string;
  groupKeys: string[];
}

export interface AnalysisBasis {
  ok?: boolean;
  featureKey?: string;
  computedAt?: string;
  groups: BasisGroup[];
  stages: BasisStage[];
  uncertainty?: Record<string, unknown>;
}

function normalizeBasis(payload: unknown): AnalysisBasis | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Partial<AnalysisBasis>;
  const groups = Array.isArray(raw.groups)
    ? raw.groups.filter((group) => group && group.key && Array.isArray(group.items) && group.items.length)
    : [];
  if (!groups.length) return null;
  const knownKeys = new Set(groups.map((group) => group.key));
  const stages = Array.isArray(raw.stages)
    ? raw.stages
      .filter((stage) => stage && stage.key && stage.label)
      .map((stage) => ({ ...stage, groupKeys: (stage.groupKeys || []).filter((key) => knownKeys.has(key)) }))
    : [];
  return { ...raw, groups, stages };
}

/**
 * 근거를 조회한다. 근거는 본 기능에 곁들이는 정보이므로 어떤 실패도 밖으로 던지지 않는다.
 * (여기서 throw하면 결제까지 끝난 생성 요청이 근거 조회 때문에 막히는 회귀가 생긴다.)
 */
export async function fetchAnalysisBasis(endpoint: string, body: unknown, signal?: AbortSignal): Promise<AnalysisBasis | null> {
  try {
    const response = await authFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal,
    });
    if (!response.ok) return null;
    return normalizeBasis(await response.json().catch(() => null));
  } catch {
    return null;
  }
}

/** 단계가 가리키는 묶음들을 실제 그룹 객체로 편다. */
export function stageGroups(basis: AnalysisBasis | null, stage: BasisStage | undefined): BasisGroup[] {
  if (!basis || !stage) return [];
  return stage.groupKeys.map((key) => basis.groups.find((group) => group.key === key)).filter(Boolean) as BasisGroup[];
}
