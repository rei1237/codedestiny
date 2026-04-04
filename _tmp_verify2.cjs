const fs = require('fs');
const c = fs.readFileSync('public/en-us/index.html', 'utf8');
console.log('1) isAdmin param:', c.includes('function __cdRenderAuthSummary(name, points, isAdmin)'));
console.log('2) adminBadgeHtml:', c.includes('adminBadgeHtml'));
console.log('3) _adminTokValid in authState:', c.includes('_adminTokValid'));
console.log('4) sessionStorage.removeItem logout:', c.includes("sessionStorage.removeItem('flower_admin_token')"));
console.log('5) cookie check removed from isAdminUser:',
  !c.slice(c.indexOf('function isAdminUser')).includes('fortune_auth_role'));
console.log('6) isAdminUser has fixed regex:', c.includes('var _tok = sessionStorage.getItem'));
console.log('7) ADMIN badge in CSS:', c.includes('adminBadgePulse'));
