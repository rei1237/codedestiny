type ManualContent = {title:string; nickname:string; type:string; profile:string; decision:string; question:string};
export async function createManualImage(content: ManualContent, format: "feed" | "story") {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = format === "feed" ? 1350 : 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  const shell = document.getElementById("hd-manual-title")?.closest("main") || document.querySelector('[class*="shell"]');
  if (!shell) throw new Error("theme unavailable");
  const css = getComputedStyle(shell);
  const token = (name:string) => {const v = css.getPropertyValue(name).trim(); if (!v) throw new Error("missing theme"); return v;};
  ctx.fillStyle = token("--hd-bg"); ctx.fillRect(0,0,1080,canvas.height);
  ctx.fillStyle = token("--hd-panel-raised"); ctx.fillRect(52,52,976,canvas.height-104);
  ctx.strokeStyle = token("--hd-border-strong"); ctx.lineWidth=2; ctx.strokeRect(52,52,976,canvas.height-104);
  const font = css.fontFamily || "sans-serif";
  ctx.textAlign = "left";
  const line = (text:string, y:number, size:number, color:string, maxLines=3) => {
    ctx.font = `600 ${size}px ${font}`; ctx.fillStyle = color;
    const lines:string[]=[]; let row="";
    for (const token of text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*|[ \t]+|./gu) || []) {
      if (ctx.measureText(row+token).width>840 && row) {lines.push(row.trimEnd());row="";}
      row += row ? token : token.trimStart();
    }
    if (row) lines.push(row);
    if(lines.length>maxLines) throw new Error("share copy exceeds layout");
    lines.forEach((v,i)=>ctx.fillText(v,120,y+i*size*1.4));
    return y+lines.length*size*1.4;
  };
  const accent=token("--hd-accent"), ink=token("--hd-ink"), muted=token("--hd-ink-dim");
  line(content.title,170,34,accent);
  let y=line(content.nickname,330,76,ink);
  y=line([content.type,content.profile].filter(Boolean).join(" · "),y+62,36,accent);
  ctx.fillStyle=token("--hd-border");ctx.fillRect(120,y+50,840,2);
  line(content.decision,y+160,48,ink);
  line(content.question,canvas.height-250,38,ink,2);
  line("code-destiny.com/human-design/guide",canvas.height-120,28,muted,1);
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("image unavailable")),"image/png"));
}
export async function deliverManualImage(blob: Blob, share:boolean, title:string, format:string) {
  const name=`human-design-manual-${format}.png`;
  const file=new File([blob],name,{type:"image/png"});
  if(share && navigator.share && navigator.canShare?.({files:[file]})) {
    try {await navigator.share({files:[file],title,url:`${location.origin}/human-design/guide`});return "shared";}
    catch(error) {if(error instanceof Error && error.name === "AbortError") return "cancelled";}
  }
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
  return "saved";
}
