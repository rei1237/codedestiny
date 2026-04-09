const { execSync } = require('child_process');
const cwd = 'C:/Users/Neo/Desktop/Code Destiny Main';

try {
  // Stage admin pages
  execSync('git add app/admin/', { cwd, stdio: 'inherit' });
  execSync('git add app/api/admin/audit/route.js', { cwd, stdio: 'inherit' });
  execSync('git add app/api/admin/coin-history/route.js', { cwd, stdio: 'inherit' });
  execSync('git add app/api/admin/fortune-stats/route.js', { cwd, stdio: 'inherit' });
  execSync('git add app/api/admin/stats/route.js', { cwd, stdio: 'inherit' });
  execSync('git add app/api/tarot/', { cwd, stdio: 'inherit' });
  
  const status = execSync('git diff --cached --stat', { cwd, encoding: 'utf8' });
  console.log('=== STAGED CHANGES ===\n' + status);
  
  const commitResult = execSync('git commit -m "refactor(admin): simplify admin console and fix CF Workers bundle size"', { cwd, encoding: 'utf8' });
  console.log('=== COMMIT ===\n' + commitResult);
  
  const pushResult = execSync('git push origin main', { cwd, encoding: 'utf8' });
  console.log('=== PUSH ===\n' + pushResult);
  
} catch (e) {
  console.error('ERROR:', e.message);
  if (e.stdout) console.log('STDOUT:', e.stdout);
  if (e.stderr) console.error('STDERR:', e.stderr);
  process.exit(1);
}
