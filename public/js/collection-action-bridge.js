(function () {
  'use strict';

  var ATTR = 'data-collection-open';

  function getCollectionById(id) {
    if (!id) return null;
    return document.getElementById(id);
  }

  function normalizeGridVisibility(collection, isOpen) {
    if (!collection) return;
    var grid = collection.querySelector('.feat-collection__grid');
    if (!grid) return;

    // Inline display:none can override state-based CSS and make toggles look broken.
    if (isOpen) {
      if (grid.style && grid.style.display === 'none') {
        grid.style.removeProperty('display');
      }
      return;
    }

    // Keep collapsed state CSS-driven unless a stale inline display value exists.
    if (grid.style && grid.style.display && grid.style.display !== 'none') {
      grid.style.removeProperty('display');
    }
  }

  function syncCollectionState(targetId, open) {
    var collection = getCollectionById(targetId);
    if (!collection) return;

    collection.setAttribute(ATTR, open ? 'true' : 'false');
    normalizeGridVisibility(collection, open);

    var btn = document.querySelector('.fc-toggle-btn[data-target="' + targetId + '"]');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  document.addEventListener('cd:collection-toggle', function (event) {
    var detail = event && event.detail ? event.detail : {};
    var targetId = detail.targetId || detail.target;
    var open = !!detail.open;
    syncCollectionState(targetId, open);
  });

  // Touch fallback: if some environments swallow delegated click timing,
  // re-sync state right after touchend based on current attribute value.
  document.addEventListener('touchend', function (event) {
    var node = event && event.target ? event.target : null;
    if (!node || !node.closest) return;

    var btn = node.closest('.fc-toggle-btn[data-action="toggleCollection"]');
    if (!btn) return;

    var targetId = btn.getAttribute('data-target');
    if (!targetId) return;

    setTimeout(function () {
      var collection = getCollectionById(targetId);
      if (!collection) return;
      var open = collection.getAttribute(ATTR) === 'true';
      syncCollectionState(targetId, open);
    }, 0);
  }, { passive: true });
})();
