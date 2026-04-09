@echo off
cd /d "C:\Users\Neo\Desktop\Code Destiny Main"
echo Current dir: %CD%
git add app\admin\ app\api\admin\audit\route.js app\api\admin\coin-history\route.js app\api\admin\fortune-stats\route.js app\api\admin\stats\route.js app\api\tarot\
echo git add exit: %ERRORLEVEL%
git diff --cached --stat
echo ---
git commit -m "refactor(admin): simplify admin console and fix CF Workers bundle size"
echo commit exit: %ERRORLEVEL%
git push origin main
echo push exit: %ERRORLEVEL%
