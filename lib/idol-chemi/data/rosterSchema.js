// 로스터 스키마 검증 — fail-closed. 생시(birthTime) 키가 하나라도 있으면 실패.
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const HTTP_URL = /^https?:[/][/]/;
const STATUS = new Set(["active", "inactive"]);
const FORBIDDEN_MEMBER_KEYS = ["birthTime", "birthTimeInput", "mbti", "bloodType", "realName", "legalName"];

function isRealDate(iso) {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function validateRoster(groups, options) {
  const checkedOnMax = options && options.checkedOnMax;
  const errors = [];
  const groupIds = new Set();
  const memberIds = new Set();
  if (!Array.isArray(groups) || groups.length === 0) return { ok: false, errors: ["ROSTER_GROUPS must be a non-empty array"] };

  for (const g of groups) {
    const gp = "group " + String(g && g.id);
    if (!g || typeof g !== "object") { errors.push("group is not an object"); continue; }
    if (!ID_PATTERN.test(String(g.id))) errors.push(gp + ": invalid id");
    if (groupIds.has(g.id)) errors.push(gp + ": duplicate group id");
    groupIds.add(g.id);
    if (!g.nameKo || !g.nameEn) errors.push(gp + ": nameKo/nameEn required");
    if (!Array.isArray(g.aliases)) errors.push(gp + ": aliases must be array");
    if (!Array.isArray(g.members) || g.members.length === 0) { errors.push(gp + ": members required"); continue; }

    for (const m of g.members) {
      const mp = gp + " member " + String(m && m.id);
      if (!m || typeof m !== "object") { errors.push(mp + ": not an object"); continue; }
      if (!ID_PATTERN.test(String(m.id))) errors.push(mp + ": invalid id");
      if (!String(m.id).startsWith(g.id + "-")) errors.push(mp + ": id must be prefixed with group id");
      if (memberIds.has(m.id)) errors.push(mp + ": duplicate member id");
      memberIds.add(m.id);
      if (!m.stageNameKo || !m.stageNameEn) errors.push(mp + ": stageNameKo/stageNameEn required");
      if (!isRealDate(String(m.birthDate))) errors.push(mp + ": birthDate must be a real ISO date");
      if (m.birthTimeKnown !== false) errors.push(mp + ": birthTimeKnown must be false");
      for (const key of FORBIDDEN_MEMBER_KEYS) if (key in m) errors.push(mp + ": forbidden key " + key);
      if (!STATUS.has(m.status)) errors.push(mp + ": invalid status");
      if (!Array.isArray(m.aliases)) errors.push(mp + ": aliases must be array");
      if (!Array.isArray(m.missing)) errors.push(mp + ": missing must be array");
      if (!Array.isArray(m.sources) || m.sources.length < 1) errors.push(mp + ": sources required (>=1)");
      else {
        for (const s of m.sources) {
          if (!s || !HTTP_URL.test(String(s.url))) errors.push(mp + ": source url must be http(s)");
          if (!s || !s.label) errors.push(mp + ": source label required");
          if (!s || !isRealDate(String(s.checkedOn))) errors.push(mp + ": source checkedOn must be ISO date");
          else if (checkedOnMax && String(s.checkedOn) > checkedOnMax) errors.push(mp + ": checkedOn is in the future");
        }
      }
      if (m.missing && m.missing.length > 0 && m.status === "active") errors.push(mp + ": active member must have empty missing");
    }
  }
  return { ok: errors.length === 0, errors };
}
