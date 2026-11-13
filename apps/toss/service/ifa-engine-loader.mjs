// Compile only the authored Odu table and deterministic reading from the web page.
export function extractIfaEngine(html){
  function between(start,end){
    const from=html.indexOf(start),to=html.indexOf(end,from+start.length);
    if(from<0||from!==html.lastIndexOf(start)||to<0||to!==html.lastIndexOf(end))throw new Error('Canonical Ifa engine boundaries changed: '+start);
    return html.slice(from,to);
  }
  const table=between('const O = [','let busy=false;');
  const interpretation=between('function getInterp(l,r,cat){','async function cast(){');
  const pattern=between('  const L=bits[0]+bits[1]*2','  buildPatternDisplay(bits);');
  const source=table+interpretation+pattern;
  if(/\b(?:window|document|globalThis|fetch|localStorage|sessionStorage|eval|Function)\b/u.test(source))throw new Error('The Ifa reading now requires a runtime dependency');
  // getInterp reads the eight marks from its enclosing cast, just as on the web.
  return table+'\nexport {CATEGORY_META};\nexport function readIfaPattern(bits,category){\n'
    +"if(!Object.hasOwn(CATEGORY_META,category)||!Array.isArray(bits)||bits.length!==8||bits.some(bit=>bit!==0&&bit!==1))throw Error('Invalid Ifa pattern');\n"
    +interpretation+pattern+'return {name,num,bits:[...bits],category,text:getInterp(L,R,category)};\n}\n';
}
