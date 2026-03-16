/**
 * Fortune index page — tab click handler to update grid links.
 * Extracted from fortune/index.html inline script.
 */
(function () {
  var ANIMALS = ['rat','ox','tiger','rabbit','dragon','snake','horse','goat','monkey','rooster','dog','pig'];
  var ZODIACS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

  document.querySelectorAll('.fi-tab').forEach(function(tab) {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      var period = this.id.replace('tab-','');
      document.querySelectorAll('.fi-tab').forEach(function(t){ t.classList.remove('active'); });
      this.classList.add('active');

      var ag = document.getElementById('animal-grid');
      var zg = document.getElementById('zodiac-grid');
      if (ag) ag.querySelectorAll('a').forEach(function(a, i) {
        a.href = '/fortune/' + period + '/' + ANIMALS[i] + '.html';
      });
      if (zg) zg.querySelectorAll('a').forEach(function(a, i) {
        a.href = '/fortune/' + period + '/' + ZODIACS[i] + '.html';
      });
    });
  });
})();
