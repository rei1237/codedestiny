/**
 * Single source of truth for assets that must stay PNG.
 *
 * Three tools have to agree on this list — the R2 converter, the local
 * converter, and the reference codemod. When they drift, an icon gets a .webp
 * sibling in one place and a rewritten reference in another, and the PWA install
 * icon or the Kakao share thumbnail silently breaks.
 *
 * Who cannot read WebP:
 *   - OG / share thumbnails: Kakao and some SNS crawlers
 *   - PWA manifest icons, favicons, apple-touch-icons: the OS and browser slots
 *
 * R2 keeps some of these at the bucket root (`fortune-tama-192.png`,
 * `neo-mode-icon.png`) rather than under `icons/`, so a directory rule alone is
 * not enough — the basename rules below are what actually catch those.
 */
const EXCLUDED_DIRECTORY_PATTERN = /(^|[\\/])(og|icons)([\\/]|$)/i;
const EXCLUDED_BASENAME_PATTERN = /^(favicon|apple-touch-icon|app-logo|android-chrome|mstile|maskable|splash)/i;
/** `neo-mode-icon.png`, `icon-192x192.png`, `fortune-tama-icon.png`. */
const ICON_KEYWORD_PATTERN = /(^|[-_.])icons?([-_.]|$)/i;
/** Icon size conventions: `-96`, `-180`, `-192`, `-512`, `-192x192`. */
const ICON_SIZE_PATTERN = /[-_](?:96|120|128|144|152|167|180|192|256|384|512)(?:x\d+)?$/i;

function basenameOf(pathOrKey) {
  return String(pathOrKey || "").split(/[\\/]/).pop() || "";
}

function stemOf(pathOrKey) {
  const basename = basenameOf(pathOrKey);
  const dot = basename.lastIndexOf(".");
  return dot > 0 ? basename.slice(0, dot) : basename;
}

/** True when the asset must keep its PNG form. */
export function isWebpExcluded(pathOrKey) {
  const value = String(pathOrKey || "");
  if (!value) return false;
  if (EXCLUDED_DIRECTORY_PATTERN.test(value.slice(0, value.length - basenameOf(value).length))) return true;

  const basename = basenameOf(value);
  const stem = stemOf(value);
  return EXCLUDED_BASENAME_PATTERN.test(basename)
    || ICON_KEYWORD_PATTERN.test(stem)
    || ICON_SIZE_PATTERN.test(stem);
}
