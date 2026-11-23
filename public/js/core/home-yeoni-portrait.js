// Select once while parsing the welcome illustration. Only the selected poster is requested.
(function () {
  var stage = document.currentScript && document.currentScript.parentElement;
  if (!stage || !stage.hasAttribute('data-home-yeoni') || stage.dataset.form) return;
  var human = Math.random() < 0.5;
  stage.dataset.form = human ? 'human' : 'pig';
  var image = new Image();
  image.alt = '';
  image.width = human ? 600 : 800;
  image.height = human ? 720 : 800;
  image.decoding = 'async';
  image.fetchPriority = 'high';
  if (!human) {
    image.sizes = '(max-width:600px) 136px, 220px';
    image.srcset = '/images/home/illustrated/yeoni-character-320.webp 320w, /images/home/illustrated/yeoni-character-480.webp 480w';
  }
  image.src = human ? '/images/master-profiles/yeoni-love-portrait.webp' : '/images/home/illustrated/yeoni-character-480.webp';
  stage.appendChild(image);
})();
