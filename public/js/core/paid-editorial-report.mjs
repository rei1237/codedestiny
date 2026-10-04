import {reportGuideCopy, buildExternalImagePrompt, reportGuideAssets, chatgptUrl} from './fortune-report-content.mjs?v=build-b1e6cac7c3d1';
import {mountPaidReviewInvite} from '../review-reward-invite.mjs';

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
  mountPaidReviewInvite({host, completed:options.completed, paid:options.paid, locale:options.locale});
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
  const copyPrompt = async done => {
    try {await navigator.clipboard.writeText(textarea.value);status.textContent=done;}
    catch {details.open=true;textarea.focus();textarea.select();status.textContent=text.error;}
  };
  button.addEventListener('click',() => {void copyPrompt(text.copied);});
  // Copy inside the same click; the link opens ChatGPT without putting private text in a URL.
  const card = node('div','cd-editorial-recommend'), head = node('p','cd-editorial-recommend-head'), steps = node('ol','cd-editorial-steps'), open = node('a','cd-editorial-open');
  head.append(node('span','cd-editorial-chip',text.chip),node('strong','',text.recommend));
  text.steps.forEach(step => steps.appendChild(node('li','',step)));
  open.href = chatgptUrl; open.target = '_blank'; open.rel = 'noopener noreferrer'; open.appendChild(node('span','',text.open));
  open.insertAdjacentHTML('beforeend','<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M8 4h8v8M16 4 5 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  open.addEventListener('click',() => {void copyPrompt(text.copiedOpen);});
  card.append(head,node('p','cd-editorial-why',text.why),steps,open);
  asset.href = art.download; asset.download = 'ggulggul-character.png';
  actions.append(button,asset); prompt.append(card,details,actions,status); root.append(evidence,reading,prompt);
  host.appendChild(root); return true;
}
window.CDPaidEditorialReport = {mount};
