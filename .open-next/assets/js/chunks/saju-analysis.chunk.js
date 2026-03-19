let skeletonNode = null;

export function beforeCoreCalculate() {
  const resultPage = document.getElementById('resultPage');
  if (!resultPage || skeletonNode) return;

  skeletonNode = document.createElement('section');
  skeletonNode.id = 'mobileCoreSkeleton';
  skeletonNode.className = 'card';
  skeletonNode.style.marginBottom = '12px';
  skeletonNode.innerHTML = [
    '<div class="skeleton skeleton-card"></div>',
    '<div class="skeleton skeleton-card"></div>',
    '<div class="skeleton skeleton-card"></div>'
  ].join('');

  resultPage.insertAdjacentElement('afterbegin', skeletonNode);
}

export function afterCoreCalculate() {
  if (!skeletonNode) return;
  if (skeletonNode.parentNode) skeletonNode.parentNode.removeChild(skeletonNode);
  skeletonNode = null;
}
