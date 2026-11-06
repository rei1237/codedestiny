// Build-time adapter: emit the canonical, deterministic engine as a module.
// Never execute the original page's DOM bindings or third-party sharing code.
export function extractOmikujiEngine(html) {
 const versions=[...html.matchAll(/const OMIKUJI_ENGINE_VERSION = ('[^']+');/g)];
 const startMarker='    const STOPWORDS =';
 const endMarker='    function formatDateLabel()';
 const start=html.indexOf(startMarker),end=html.indexOf(endMarker,start);
 if(versions.length!==1||start<0||end<=start||html.indexOf(startMarker,start+1)!==-1||html.indexOf(endMarker,end+1)!==-1)throw new Error('Canonical omikuji engine boundaries changed');
 const source=html.slice(start,end);
 if(/\b(?:window|document|localStorage|sessionStorage|fetch)\s*(?:\.|\[|\()/u.test(source))throw new Error('Canonical omikuji engine is no longer isolated');
 return `const OMIKUJI_ENGINE_VERSION = ${versions[0][1]};\n${source}\nexport {generateEmojiOmikujiResult, normalizeOmikujiInput};\n`;
}
