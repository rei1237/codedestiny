(function () {
  'use strict';
  var form = document.querySelector('[data-policy-contact]');
  if (!form) return;
  var email = form.getAttribute('data-support-email');
  var copy = document.querySelector('.policy-doc__inline-btn');
  var status = document.createElement('p');
  status.className = 'policy-contact-status';
  status.setAttribute('role', 'status');
  form.insertAdjacentElement('afterend', status);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new FormData(form);
    var name = String(data.get('name') || '').trim();
    var reply = String(data.get('email') || '').trim();
    var message = String(data.get('message') || '').trim();
    var body = '이름: ' + name + '\n회신 이메일: ' + reply + '\n\n' + message + '\n';
    window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('[Code Destiny 문의] ' + name) + '&body=' + encodeURIComponent(body);
    status.textContent = '메일 앱에서 내용을 확인한 뒤 전송해 주세요. 열리지 않으면 이메일 주소로 직접 보내주세요.';
  });
  if (copy) copy.addEventListener('click', async function () {
    try {
      await navigator.clipboard.writeText(email);
      status.textContent = '이메일 주소를 복사했습니다.';
    } catch (error) {
      status.textContent = '복사하지 못했습니다. ' + email + ' 주소로 직접 보내주세요.';
    }
  });
})();
