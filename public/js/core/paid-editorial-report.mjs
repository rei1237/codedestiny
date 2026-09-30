import {reportGuideCopy,buildExternalImagePrompt} from './fortune-report-content.mjs';
// Presentation only: callers supply an already authorized, completed result.
function node(tag,cls,value){const item=document.createElement(tag);if(cls)item.className=cls;if(value!=null)item.textContent=String(value);return item;}
function mount(options){
 if(!options?.host?.isConnected)return false;
 const host=options.host;
 host.querySelector('[data-paid-editorial-report]')?.remove();
 if(options.completed!==true||options.paid!==true||!String(options.resultText||'').trim())return false;
 const locale=options.locale||'ko',domain=options.domain||'saju',text=reportGuideCopy(locale,domain);
 const groups=(options.analysisBasis?.groups||[]).map(group=>({label:group.title,items:group.items.map(item=>({label:item.label,value:item.value}))}));
 const passages=String(options.resultText).split(/\n\s*\n/).filter(part=>part.trim());
 const mascot='/assets/mascot/yeoni-moonstone-reward-v1.png';
 const root=node('section','cd-editorial-report');root.dataset.paidEditorialReport='';root.lang=text.locale;
 const heading=node('header','cd-editorial-heading');heading.appendChild(node('h3','',text.title));
 const art=node('img','');art.src=mascot;art.alt='꿀꿀 운세';art.width=96;art.height=96;heading.appendChild(art);root.appendChild(heading);
 root.appendChild(node('p','',text.guide));root.appendChild(node('p','',text.source));
 const evidence=node('section','cd-editorial-section');evidence.appendChild(node('h4','',text.evidence));
 if(!groups.length)evidence.appendChild(node('p','',text.missing));
 groups.forEach(group=>{evidence.appendChild(node('h5','',group.label));const list=node('dl','');group.items.forEach(item=>{const pair=node('div','');pair.appendChild(node('dt','',item.label));pair.appendChild(node('dd','',item.value));list.appendChild(pair);});evidence.appendChild(list);});root.appendChild(evidence);
 const reading=node('section','cd-editorial-section');reading.appendChild(node('h4','',text.reading));passages.slice(0,4).forEach(part=>reading.appendChild(node('p','',part)));root.appendChild(reading);
 const prompt=node('section','cd-editorial-section');prompt.appendChild(node('h4','',text.prompt));prompt.appendChild(node('p','',text.privacy));const details=node('details','');details.appendChild(node('summary','',text.prompt));
 const textarea=node('textarea','');textarea.value=buildExternalImagePrompt({brand:'ggulggul',domain,locale,groups,passages});textarea.setAttribute('aria-label',text.prompt);textarea.spellcheck=false;details.appendChild(textarea);
 const actions=node('div','cd-editorial-actions'),copy=node('button','',text.copy),asset=node('a','',text.asset),status=node('p','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');copy.type='button';
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(textarea.value);status.textContent=text.copied;}catch{textarea.focus();textarea.select();status.textContent=text.error;}});
 asset.href=mascot;asset.download='ggulggul-character.png';actions.append(copy,asset);details.appendChild(actions);prompt.append(details,status);root.appendChild(prompt);host.appendChild(root);return true;
}
window.CDPaidEditorialReport={mount};
