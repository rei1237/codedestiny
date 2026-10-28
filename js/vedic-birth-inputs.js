/* Birth presentation adapter. Canonical field IDs and the calculation/payment contracts stay unchanged. */
(function () {
  'use strict';
  var sequences = {v:0,c:0};
  function field(prefix,key) { return document.getElementById(prefix === 'v' ? 'v_' + (key === 'min' ? 'minute' : key) : 'c-' + key); }
  function value(prefix,key,next) { var el=field(prefix,key); if(el)el.value=next == null ? '' : String(next); }
  function notice(prefix,text) { var el=document.getElementById(prefix+'-birth-status'); if(el)el.textContent=text || ''; }
  function placeInput(prefix) { return document.getElementById(prefix === 'v' ? 'v_placeText' : 'c-place'); }
  function invalidate(prefix) {
    sequences[prefix]++; ['lat','lon','tz'].forEach(function(key){value(prefix,key,'');});
    var input=placeInput(prefix); if(input)delete input.dataset.ianaTimezone;
    if(prefix==='v'){var select=field('v','place');if(select)select.selectedIndex=-1;}
    notice(prefix,'도시와 국가를 입력한 뒤 출생지를 확인해 주세요.');
  }
  function offset(prefix,timezone) {
    var manager=window.DestinyProfileManager;
    if(!manager || !timezone)return NaN;
    try { new Intl.DateTimeFormat('en',{timeZone:timezone}); } catch(_){return NaN;}
    return manager.getTimeZoneOffsetHoursForDate(Number(field(prefix,'year').value),Number(field(prefix,'month').value),Number(field(prefix,'day').value),Number(field(prefix,'hour').value),Number(field(prefix,'min').value),timezone,0);
  }
  function applyPlace(prefix,place) {
    var input=placeInput(prefix); if(!input)return;
    input.value=place.name || input.value; input.dataset.ianaTimezone=place.timezone || '';
    value(prefix,'lat',place.lat);value(prefix,'lon',place.lng);value(prefix,'tz',offset(prefix,place.timezone));
    if(prefix==='v') {
      var select=field('v','place');
      if(select){var option=Array.from(select.options).find(function(item){return item.dataset.birthLookup==='true';});
        if(!option){option=document.createElement('option');option.dataset.birthLookup='true';select.appendChild(option);}
        option.textContent=input.value;option.value=place.timezone;option.setAttribute('data-lat',String(place.lat));option.setAttribute('data-long',String(place.lng));option.setAttribute('data-tz',String(offset(prefix,place.timezone)));select.selectedIndex=option.index;
      }
    }
    notice(prefix,'출생지의 위치와 시간대를 적용했어요.');
  }
  async function lookup(prefix) {
    var input=placeInput(prefix);if(!input || !input.value.trim())return;
    var query=input.value.trim(),request=++sequences[prefix];notice(prefix,'출생지를 확인하고 있어요.');
    try {
      var response=await fetch('/api/geocode?place='+encodeURIComponent(query),{cache:'no-store',signal:AbortSignal.timeout(10000)});
      var data=await response.json();
      if(request!==sequences[prefix])return;
      if(!response.ok || data.fallback || !Number.isFinite(data.lat) || !Number.isFinite(data.lng) || !data.timezone)throw new Error('place');
      applyPlace(prefix,data);
    }catch(_){if(request!==sequences[prefix])return;invalidate(prefix);notice(prefix,'출생지를 찾지 못했어요. 도시와 국가를 함께 적어 다시 확인해 주세요.');}
  }
  function install(prefix) {
    var hour=field(prefix,'hour');if(!hour)return;
    hour.type='text';hour.inputMode='numeric';hour.maxLength=2;hour.placeholder='0~23';
    var minute=field(prefix,'min');if(minute){minute.type='text';minute.inputMode='numeric';minute.maxLength=2;}
    ['lat','lon','tz'].forEach(function(key){var el=field(prefix,key);if(el){el.type='hidden';var label=document.querySelector('label[for="'+el.id+'"]');if(label)label.hidden=true;if(el.parentElement.children.length<=2)el.parentElement.hidden=true;}});
    var input=placeInput(prefix);
    if(input&&!input.dataset.birthBound){input.dataset.birthBound='true';input.addEventListener('input',function(){invalidate(prefix);});}
    var container=hour.closest(prefix==='v'?'#page-input':'.card');if(container)container.setAttribute('data-moonlit-form','');
    if(window.__cdRefreshBirthProfileChoices)window.__cdRefreshBirthProfileChoices();
  }
  window.cdRefreshVedicBirthInputs=function(){install('v');install('c');};
  window.cdValidateVedicBirth=function(prefix){
    var input=placeInput(prefix),hour=field(prefix,'hour'),minute=field(prefix,'min');
    var date=[Number(field(prefix,'year').value),Number(field(prefix,'month').value),Number(field(prefix,'day').value)];
    var probe=new Date(Date.UTC(date[0],date[1]-1,date[2]));
    if(date[0]<1||probe.getUTCFullYear()!==date[0]||probe.getUTCMonth()!==date[1]-1||probe.getUTCDate()!==date[2])return '생년월일을 확인해 주세요.';
    if(!hour.value || !minute.value || !Number.isInteger(Number(hour.value)) || !Number.isInteger(Number(minute.value)) || Number(hour.value)>23 || Number(minute.value)>59 || Number(hour.value)<0 || Number(minute.value)<0)return '정확한 출생시간이 필요해요. 시(0~23)와 분을 입력해 주세요.';
    if(input&&input.dataset.ianaTimezone)value(prefix,'tz',offset(prefix,input.dataset.ianaTimezone));
    if(!input||!input.value.trim()||!field(prefix,'lat').value||!field(prefix,'lon').value||!field(prefix,'tz').value)return '태어난 도시와 국가를 입력한 뒤 출생지를 확인해 주세요.';
    if(['lat','lon','tz'].some(function(key){return !Number.isFinite(Number(field(prefix,key).value));}) || Math.abs(Number(field(prefix,'lat').value))>90 || Math.abs(Number(field(prefix,'lon').value))>180)return '출생지를 다시 확인해 주세요.';
    return '';
  };
  document.addEventListener('click',function(event){var button=event.target.closest('[data-vedic-place-check]');if(button){event.preventDefault();void lookup(button.dataset.vedicPlaceCheck);}});
  document.addEventListener('cd:birth-profile-selected',function(event){
    var detail=event.detail||{},prefix=detail.target==='vedic-self'?'v':detail.target==='vedic-partner'?'c':'';if(!prefix)return;
    var profile=detail.profile,birth=profile.birth||{},location=profile.location||{};
    var year=Number(birth.year),month=Number(birth.month),day=Number(birth.day),calendar=birth.calType||profile.calType||profile.calendarType||'solar';
    if(String(calendar).indexOf('lunar')===0){var solar=window.KoreanCalendar&&window.KoreanCalendar.lunarToSolar(year,month,day,String(calendar).indexOf('leap')>=0||profile.isLeapMonth===true);if(!solar){notice(prefix,'음력 날짜를 확인해 주세요. 출생정보를 직접 입력할 수 있어요.');return;}year=solar.year;month=solar.month;day=solar.day;}
    invalidate(prefix);value(prefix,'name',profile.name||'');value(prefix,'year',year);value(prefix,'month',month);value(prefix,'day',day);
    value(prefix,'hour',birth.timeUnknown?'':birth.hour);value(prefix,'min',birth.timeUnknown?'':birth.minute);value(prefix,'gender',profile.gender||'');
    var input=placeInput(prefix);if(input)input.value=location.label||profile.birthRegion||'';
    if(location.lat!=null&&location.lng!=null&&location.tz)applyPlace(prefix,{name:input.value,lat:Number(location.lat),lng:Number(location.lng),timezone:location.tz});
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',window.cdRefreshVedicBirthInputs,{once:true});else window.cdRefreshVedicBirthInputs();
})();
