// Keep the original five-check scoring, copy text and feedback states with the web renderer.
export function extractVillainBindings(source){
  const start='  function bindVillainResult(resultArea) {',end='  // 에너지 원정 리포트:';
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  if(a<0||b<=a||source.indexOf(start,a+start.length)>=0)throw new Error('Villain card binding boundaries changed');
  return source.slice(a,b)+'\nexport {bindVillainResult};\n';
}
