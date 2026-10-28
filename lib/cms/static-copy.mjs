// Only the supplied prose tree is editable. Never pass calculation or policy data.
export function staticCopyRecord(source) {
  const record = {};
  function visit(value, path) {
    if (typeof value === "string") record[path.join("/")] = { text: value };
    else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) visit(child, [...path, key]);
    }
  }
  visit(source, []);
  return record;
}

export function applyStaticCopy(source, record) {
  const allowed = staticCopyRecord(source);
  const next = structuredClone(source);
  for (const [path, row] of Object.entries(record || {})) {
    if (!Object.hasOwn(allowed, path) || typeof row?.text !== "string" || !row.text.trim()) continue;
    const parts = path.split("/");
    const field = parts.pop();
    const target = parts.reduce((node, key) => node[key], next);
    target[field] = row.text;
  }
  return next;
}
