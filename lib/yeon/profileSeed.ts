import { readSanitizedAuthUser, resolveAuthScopeFromUser } from "@/app/_lib/auth-storage";

type StoredProfile = {
  id?: string;
  name?: string;
  birth?: {
    year?: number;
    month?: number;
    day?: number;
  };
};

type StoredAuthUser = {
  name?: string;
  birthDate?: string;
};

export type YeonProfileSeed = {
  name: string;
  birthDate: string;
  source: "profile-card" | "auth-user" | "none";
  scope: string;
};

const PROFILE_NS = "FORTUNE_APP_USER_PROFILES";

function pad(value: unknown, length: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return String(Math.trunc(parsed)).padStart(length, "0");
}

function normalizeBirthDateText(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const compact = raw.replace(/\D/g, "");
  if (compact.length !== 8) return "";

  const year = compact.slice(0, 4);
  const month = compact.slice(4, 6);
  const day = compact.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function buildBirthDateFromProfileBirth(birth: StoredProfile["birth"]) {
  const year = pad(birth?.year, 4);
  const month = pad(birth?.month, 2);
  const day = pad(birth?.day, 2);
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

export function readYeonProfileSeed(): YeonProfileSeed {
  if (typeof window === "undefined") {
    return { name: "", birthDate: "", source: "none", scope: "guest" };
  }

  try {
    const user = readSanitizedAuthUser() as StoredAuthUser | null;
    const scope = resolveAuthScopeFromUser(user) || "guest";

    const listRaw =
      localStorage.getItem(`${PROFILE_NS}.list::${scope}`) ||
      localStorage.getItem(`${PROFILE_NS}.list`) ||
      "[]";
    const currentId =
      localStorage.getItem(`${PROFILE_NS}.current::${scope}`) ||
      localStorage.getItem(`${PROFILE_NS}.current`) ||
      "";

    const list = JSON.parse(listRaw) as StoredProfile[];
    const profile =
      Array.isArray(list) && list.length > 0
        ? (currentId ? list.find((item) => item?.id === currentId) : undefined) || list[0]
        : null;

    const profileBirthDate = buildBirthDateFromProfileBirth(profile?.birth);
    const authBirthDate = normalizeBirthDateText(user?.birthDate);
    const profileName = String(profile?.name || "").trim();
    const authName = String(user?.name || "").trim();

    if (profileBirthDate) {
      return {
        name: profileName || authName,
        birthDate: profileBirthDate,
        source: "profile-card",
        scope,
      };
    }

    if (authBirthDate) {
      return {
        name: authName || profileName,
        birthDate: authBirthDate,
        source: "auth-user",
        scope,
      };
    }

    return {
      name: profileName || authName,
      birthDate: "",
      source: "none",
      scope,
    };
  } catch (e) {
    return { name: "", birthDate: "", source: "none", scope: "guest" };
  }
}
