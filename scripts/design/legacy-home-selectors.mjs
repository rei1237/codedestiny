import postcss from 'postcss';

// Removed presentation hosts only. Never match forms, payment widgets or service collections.
const obsolete = /\.(?:moon-hero(?:__[a-z0-9-]+)?|cd-hero-(?:island|fx)(?:__[a-z0-9-]+)?)(?![\w-])/i;
export function pruneLegacyHomeCss(css) {
  const root = postcss.parse(css);
  root.walkComments(comment => {
    if (/moon-hero|cd-hero-(?:firstpaint|layout|form|island|fx)|cdZzzFloat/.test(comment.text)) comment.remove();
  });
  root.walkRules(rule => {
    if (!obsolete.test(rule.selector)) return;
    const keep = rule.selectors.filter(selector => !obsolete.test(selector));
    if (keep.length) rule.selectors = keep;
    else rule.remove();
  });
  root.walkAtRules(rule => {if (rule.nodes && !rule.nodes.length) rule.remove();});
  const animations=[];
  root.walkDecls(/animation/,decl=>animations.push(decl.value));
  root.walkAtRules(/keyframes$/,rule=>{
    if (/^(cdZzzFloat|cdLivingMoonFloat|cdLunarPhase|cdHero\w+|cdMoonFloat|cdMoonHaloBreathe|cdMoonRimShimmer)$/.test(rule.params) && !animations.some(value=>value.includes(rule.params))) rule.remove();
  });
  return (css.charCodeAt(0) === 0xfeff ? '\uFEFF' : '') + root.toString();
}
