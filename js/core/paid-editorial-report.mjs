import {reportGuideCopy, buildExternalImagePrompt, reportGuideAssets} from './fortune-report-content.mjs';

// Presentation only: callers supply an already authorized, completed result.
function node(tag, cls, value) {
  const item = document.createElement(tag);
  if (cls) item.className = cls;
  if (value != null) item.textContent = String(value);
  return item;
}
function mount(options) {
  if (!options?.host?.isConnected) return false;
  const host = options.host;
  host.querySelector('[data-paid-editorial-report]')?.remove();
  if (options.completed !== true || options.paid !== true || !String(options.resultText || '').trim()) return false;
  const locale = options.locale || 'ko', domain = options.domain || 'saju';
  const text = reportGuideCopy(locale, domain), art = reportGuideAssets.ggulggul;
  const groups = (options.analysisBasis?.groups || []).map(group => ({label:group.title,items:group.items.map(item => ({label:item.label,value:item.value}))}));
  const passages = String(options.resultText).split(/\n\s*\n/).filter(part => part.trim());
  const root = node('section','cd-editorial-report');
  root.dataset.paidEditorialReport = ''; root.dataset.brand = 'ggulggul'; root.lang = text.locale;
  const heading = node('header','cd-editorial-heading'), copy = node('div','cd-editorial-headingCopy');
  copy.append(node('h3','',text.title), node('p','cd-editorial-intro',text.guide));
  const image = node('img','');
  image.src = art.image; image.alt = ''; image.width = 240; image.height = 240; image.loading = 'lazy';
  heading.append(copy,image);
  const ornament = node('div','cd-editorial-ornament'); ornament.setAttribute('aria-hidden','true');
  root.append(heading,node('p','cd-editorial-source',text.source),ornament);
  const evidence = node('section','cd-editorial-evidence'); evidence.appendChild(node('h4','',text.evidence));
  if (!groups.length) evidence.appendChild(node('p','',text.missing));
  groups.forEach(group => {
    const row = node('div','cd-editorial-group'), list = node('dl','');
    row.appendChild(node('h5','',group.label));
    group.items.forEach(item => {const pair=node('div','');pair.append(node('dt','',item.label),node('dd','',item.value));list.appendChild(pair);});
    row.appendChild(list); evidence.appendChild(row);
  });
  const reading = node('section','cd-editorial-reading'); reading.appendChild(node('h4','',text.reading));
  passages.slice(0,4).forEach(part => reading.appendChild(node('p','',part)));
  const prompt = node('section','cd-editorial-prompt');
  prompt.append(node('h4','',text.prompt),node('p','',text.privacy));
  const details = node('details',''); details.appendChild(node('summary','',text.edit));
  const textarea = node('textarea','');
  textarea.value = buildExternalImagePrompt({brand:'ggulggul',domain,locale,groups,passages});
  textarea.setAttribute('aria-label',text.prompt); textarea.spellcheck = false; details.appendChild(textarea);
  const actions = node('div','cd-editorial-actions'), button = node('button','',text.copy), asset = node('a','',text.asset), status = node('p','cd-editorial-status');
  status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); button.type = 'button';
  button.addEventListener('click',async () => {
    try {await navigator.clipboard.writeText(textarea.value);status.textContent=text.copied;}
    catch {details.open=true;textarea.focus();textarea.select();status.textContent=text.error;}
  });
  asset.href = art.download; asset.download = 'ggulggul-character.png';
  actions.append(button,asset); prompt.append(details,actions,status); root.append(evidence,reading,prompt);
  host.appendChild(root); return true;
}
window.CDPaidEditorialReport = {mount};
