/**
 * 운명 여정 ↔ 리텐션 엔진(worker/routes/rpg.js · window.CDLevel) 브릿지.
 *
 * - 정적셸이 로드된 화면에서는 window.CDLevel을 그대로 쓴다(로컬 낙관 반영 + 로그인 시 /api/rpg/award 서버 싱크).
 * - Next 단독 라우트라 CDLevel이 없으면 로그인 유저에 한해 /api/rpg/award로 직접 폴백한다.
 *   (서버 awardRpgExp는 requireAuth라 비로그인 요청은 서버에서 조용히 무시된다.)
 * - 여기서는 "호출만" 한다 — EXP 액수·하루 한도·멱등·레벨업 정산은 전부 리텐션 엔진(정본)에만 있다.
 * - 모든 호출은 typeof window 가드 + try/catch로 감싸 절대 throw하지 않는다(진행 UI를 막지 않는다).
 */

export type RpgAwardKind = "checkin" | "quest" | "paid";

export interface RpgSnapshot {
  currentLevel: number;
  totalExp: number;
  streakDays: number;
  longestStreakDays: number;
  checkedInToday: boolean;
  loggedIn: boolean;
}

interface CDLevelGlobal {
  award?: (kind: string, key: string) => unknown;
  snapshot?: () => Record<string, unknown> | null;
}

function getCDLevel(): CDLevelGlobal | null {
  if (typeof window === "undefined") return null;
  try {
    const g = (window as unknown as { CDLevel?: CDLevelGlobal }).CDLevel;
    return g && typeof g === "object" ? g : null;
  } catch {
    return null;
  }
}

/**
 * 하나의 성장 이벤트를 리텐션 엔진에 기록한다. 실패해도 조용히 무시한다.
 * key가 비면 서버가 KST 민용일을 스스로 채운다(checkin 폴백).
 */
export async function awardRpg(kind: RpgAwardKind, key: string): Promise<void> {
  const safeKey = String(key || "").slice(0, 80);
  const cd = getCDLevel();
  if (cd?.award) {
    try {
      cd.award(kind, safeKey); // 로컬 낙관 + (로그인 시) 서버 싱크를 CDLevel이 함께 처리
      return;
    } catch {
      /* CDLevel 내부 실패 → 아래 서버 폴백 시도 */
    }
  }
  // 정적셸 미로드(Next 단독) 폴백 — 비로그인은 서버 requireAuth에서 무시된다.
  try {
    await fetch("/api/rpg/award", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, key: safeKey }),
    });
  } catch {
    /* 오프라인 등 — 조용히 무시 */
  }
}

/** 오늘의 출석(멱등: 하루 1회). key는 비워 두어 로컬·서버가 각자 KST 날짜로 판정하게 한다. */
export function checkInToday(): void {
  void awardRpg("checkin", "");
}

/** 운명 도감 아이템 수집(멱등). 서버 유니크 인덱스가 "1회 소유"를 보증. 비로그인/실패는 조용히 무시. */
export async function collectItem(key: string): Promise<void> {
  const safeKey = String(key || "").slice(0, 150);
  if (!safeKey || typeof window === "undefined") return;
  try {
    await fetch("/api/rpg/collect", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: safeKey }),
    });
  } catch {
    /* 오프라인 등 — 조용히 무시 */
  }
}

export interface CollectibleItem {
  key: string;
  at?: string;
}

/** 도감 목록 읽기(로그인 필요). 실패·비로그인 시 빈 배열. */
export async function readCollectibles(): Promise<CollectibleItem[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/rpg/collectibles", { method: "GET", credentials: "include" });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: CollectibleItem[] };
    return Array.isArray(data?.items) ? data.items : [];
  } catch {
    return [];
  }
}

/** 읽기전용 진행 스냅샷(네트워크 미호출). CDLevel이 없으면 null(그레이스풀 폴백). */
export function readRpgSnapshot(): RpgSnapshot | null {
  const cd = getCDLevel();
  if (!cd?.snapshot) return null;
  try {
    const s = cd.snapshot();
    if (!s || typeof s !== "object") return null;
    return {
      currentLevel: Number(s.currentLevel) || 1,
      totalExp: Number(s.totalExp) || 0,
      streakDays: Number(s.streakDays) || 0,
      longestStreakDays: Number(s.longestStreakDays) || 0,
      checkedInToday: !!s.checkedInToday,
      loggedIn: !!s.loggedIn,
    };
  } catch {
    return null;
  }
}
