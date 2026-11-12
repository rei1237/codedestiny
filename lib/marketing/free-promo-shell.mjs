// 정적 셸(/ggulggul/) 홈 상단 무료 홍보 배너. scripts/design/build-home-funnel.mjs 가 index.html 에 굽는다.
// 표시 전용: 마감이 지나면 배너만 숨기고 접근·가격은 건드리지 않는다.
import { FREE_PROMO, FREE_PROMO_COPY_KO as KO, freePromoDaysLeft, freePromoDayLabel } from './free-promo.mjs';

const esc = (value) => String(value).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

function bannerScript() {
  return `(function(){
var root=document.getElementById('cdhFreePromo');if(!root)return;
var daysLeft=${freePromoDaysLeft.toString()};
var dayLabel=${freePromoDayLabel.toString()};
var days=daysLeft(root.getAttribute('data-ends'));
if(days===null){root.hidden=true;return;}
var dd=root.querySelector('[data-cd-free-promo-dday]');if(dd){dd.textContent=dayLabel(days);dd.hidden=false;}
function tr(key,fallback){try{if(typeof window.cdTranslate==='function'){var v=window.cdTranslate(key,null,fallback);if(v&&v!==key)return v;}}catch(e){}return fallback;}
var status=root.querySelector('[data-cd-free-promo-status]');
function say(msg){if(status)status.textContent=msg;if(typeof window.showToast==='function'){try{window.showToast(msg);}catch(e){}}}
var cta=root.querySelector('[data-cd-free-promo-cta]');
if(cta)cta.addEventListener('click',function(ev){var target=document.getElementById('cdQuickServices')||document.getElementById('cdhFreeTitle');if(!target)return;ev.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});});
var btn=root.querySelector('[data-cd-free-promo-share]');
if(btn)btn.addEventListener('click',function(){
var url=location.origin+root.getAttribute('data-share-path');
var text=tr('freePromo.shareText',${JSON.stringify(KO.shareText)});
function copy(){
if(navigator.clipboard&&navigator.clipboard.writeText){return navigator.clipboard.writeText(text+'\\n'+url).then(function(){say(tr('freePromo.copied',${JSON.stringify(KO.copied)}));},function(){say(tr('freePromo.copyFailed',${JSON.stringify(KO.copyFailed)}));});}
say(tr('freePromo.copyFailed',${JSON.stringify(KO.copyFailed)}));
}
if(navigator.share){navigator.share({title:document.title,text:text,url:url}).catch(function(err){if(!err||err.name!=='AbortError')copy();});return;}
copy();
});
})();`;
}

export function renderFreePromoShellBanner() {
  return `<section class="cdh-promo" id="cdhFreePromo" data-cd-free-promo="${esc(FREE_PROMO.id)}" data-ends="${esc(FREE_PROMO.endsAt)}" data-share-path="${esc(FREE_PROMO.sharePath)}" aria-labelledby="cdhFreePromoTitle">`
    + `<p class="cdh-promo__badge" data-cd-trans="freePromo.badge">${esc(KO.badge)}</p>`
    + `<p class="cdh-promo__title" id="cdhFreePromoTitle"><strong data-cd-trans="freePromo.title">${esc(KO.title)}</strong></p>`
    + `<p class="cdh-promo__until"><span data-cd-trans="freePromo.until">${esc(KO.until)}</span> <span class="cdh-promo__dday" data-cd-free-promo-dday hidden></span></p>`
    + `<p class="cdh-promo__note" data-cd-trans="freePromo.note">${esc(KO.note)}</p>`
    + `<div class="cdh-promo__actions"><a class="cdh-promo__cta" href="${esc(FREE_PROMO.ctaHref)}" data-cd-free-promo-cta data-cd-trans="freePromo.cta">${esc(KO.cta)}</a>`
    + `<button type="button" class="cdh-promo__share" data-cd-free-promo-share data-cd-trans="freePromo.share">${esc(KO.share)}</button></div>`
    + `<p class="cdh-promo__status" role="status" aria-live="polite" data-cd-free-promo-status></p>`
    + `<script>${bannerScript()}</script></section>`;
}
