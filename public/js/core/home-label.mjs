// Keep the Korean source when a live label changes after the first translation pass.
export function setHomeLabel(element, key, source, vars = {}) {
  const fallback = source.replace(/\{(\w+)\}/g, (token, name) => vars[name] ?? token);
  element.dataset.cdTrans = key;
  element.dataset.cdVars = JSON.stringify(vars);
  element.dataset.cdOriginText = fallback;
  element.textContent = element.ownerDocument.defaultView.cdTranslate?.(key, vars, fallback) || fallback;
}
