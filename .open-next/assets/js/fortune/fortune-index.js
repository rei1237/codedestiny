/**
 * fortune-index.js — 운세 홈(index) 페이지 탭 전환
 * inline script를 외부 모듈로 분리
 */
(function() {
  'use strict';
  var ANIMALS = ['rat','ox','tiger','rabbit','dragon','snake','horse','goat','monkey','rooster','dog','pig'];
  var ZODIACS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

  function init() {
    var tabs = document.querySelectorAll('.fi-tab');
    var animalGrid = document.getElementById('animal-grid');
    var zodiacGrid = document.getElementById('zodiac-grid');
    if (!tabs.length) return;

    tabs.forEach(function(tab) {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        var period = this.id.replace('tab-','');
        tabs.forEach(function(t){ t.classList.remove('active'); });
        this.classList.add('active');

        if (animalGrid) {
          animalGrid.querySelectorAll('a').forEach(function(a, i) {
            a.href = '/fortune/' + period + '/' + ANIMALS[i] + '.html';
          });
        }
        if (zodiacGrid) {
          zodiacGrid.querySelectorAll('a').forEach(function(a, i) {
            a.href = '/fortune/' + period + '/' + ZODIACS[i] + '.html';
          });
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
