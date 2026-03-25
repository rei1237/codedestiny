@echo off
setlocal
for /f "tokens=1,* delims==" %%A in (.env) do (
  if /I "%%A"=="PAGESPEED_API_KEY" set "PAGESPEED_API_KEY=%%B"
)
if "%PAGESPEED_API_KEY%"=="" (
  echo ERROR: PAGESPEED_API_KEY missing
  exit /b 1
)
echo [psi] home start
node scripts\psi-mobile-audit.mjs --url https://code-destiny.com --label feature-home-redeploy1-20260325 --outDir reports/perf/feature-psi
if errorlevel 1 exit /b 1
echo [psi] olympus start
node scripts\psi-mobile-audit.mjs --url https://code-destiny.com/olympus --label feature-olympus-redeploy1-20260325 --outDir reports/perf/feature-psi
if errorlevel 1 exit /b 1
echo [psi] done
exit /b 0
