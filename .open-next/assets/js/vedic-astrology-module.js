/* Vedic Astrology Module (service-internal mount)
   - Keeps `public/vedic-astrology.html` as the single source of truth for UI + engine.
   - Provides an internal overlay/iframe mount so the service can "run" Vedic without hard navigation.
   - No dependency on profile card; the vedic page itself handles manual input + optional profile load.
*/
(function(){
  'use strict';

  function _el(tag, attrs){
    var e = document.createElement(tag);
    if(attrs){
      Object.keys(attrs).forEach(function(k){
        if(k === 'style' && attrs.style && typeof attrs.style === 'object'){
          Object.assign(e.style, attrs.style);
        } else if(k === 'className'){
          e.className = attrs[k];
        } else if(k === 'text'){
          e.textContent = attrs[k];
        } else {
          e.setAttribute(k, String(attrs[k]));
        }
      });
    }
    return e;
  }

  function mount(opts){
    opts = opts || {};
    var src = opts.src || '/vedic-astrology.html';

    // avoid duplicates
    if(document.getElementById('vedicOverlay')) return;

    var overlay = _el('div', { id:'vedicOverlay', style:{
      position:'fixed', inset:'0', zIndex:'999999',
      background:'rgba(0,0,0,0.55)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
      display:'flex', flexDirection:'column'
    }});

    var topbar = _el('div', { style:{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'10px 12px', background:'rgba(5,0,16,0.85)', borderBottom:'1px solid rgba(255,255,255,0.08)'
    }});

    var title = _el('div', { text:'🪐 베다 점성술', style:{ color:'#D4AF37', fontWeight:'700', fontFamily:'system-ui, -apple-system, Segoe UI, sans-serif' }});
    var closeBtn = _el('button', { type:'button', text:'닫기', style:{
      background:'rgba(255,255,255,0.08)', color:'#F0E8FF', border:'1px solid rgba(255,255,255,0.14)',
      borderRadius:'10px', padding:'8px 12px', cursor:'pointer'
    }});

    closeBtn.addEventListener('click', function(){
      try { overlay.remove(); } catch(e) { if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }
      try { document.body.style.overflow = ''; } catch(e) {}
    });

    topbar.appendChild(title);
    topbar.appendChild(closeBtn);

    var frame = _el('iframe', { title:'Vedic Astrology', style:{ flex:'1', width:'100%', border:'0', background:'#050010' }});
    // cache-bust optional
    var v = opts.cacheBust ? ('?v=' + encodeURIComponent(String(Date.now()))) : '';
    frame.src = src + v;

    overlay.appendChild(topbar);
    overlay.appendChild(frame);

    // close on backdrop click (only if clicked outside iframe)
    overlay.addEventListener('click', function(ev){
      if(ev.target === overlay) closeBtn.click();
    });

    try { document.body.style.overflow = 'hidden'; } catch(e) {}
    document.body.appendChild(overlay);
  }

  window.VedicAstrology = {
    mount: mount
  };
})();

