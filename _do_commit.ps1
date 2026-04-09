Set-Location "C:\Users\Neo\Desktop\Code Destiny Main"
git add app/admin/ app/api/admin/audit/route.js app/api/admin/coin-history/route.js app/api/admin/fortune-stats/route.js app/api/admin/stats/route.js "app/api/tarot/"
git status --short > _git_status.txt
git diff --cached --stat >> _git_status.txt
$msg = "refactor(admin): simplify admin console and fix CF Workers bundle size"
git commit -m $msg >> _git_status.txt 2>&1
git push origin main >> _git_status.txt 2>&1
Write-Output "SCRIPT DONE"
Get-Content _git_status.txt
