// Only functional legacy inputs leave the new home. Campaign attribution stays here.
export function legacyHomeTarget(search = "", hash = "") {
  const params = new URLSearchParams(search);
  const functional = [...params.keys()].some(key => !/^(utm_.+|gclid|fbclid|msclkid|ref)$/.test(key));
  const legacyHash = hash && !["#home", "#readings", "#recommendations", "#room"].includes(hash);
  return functional || legacyHash ? `/ggulggul/${search}${hash}` : null;
}
