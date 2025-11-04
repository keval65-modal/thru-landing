@echo off
echo ========================================
echo   DEPLOYING VENDOR FIX TO PRODUCTION
echo ========================================
echo.
echo What this deployment includes:
echo   - Fixed vendor query from Supabase
echo   - Your cafe will now be visible!
echo   - Version: V5-SUPABASE-VENDORS
echo.
echo ========================================
echo.

cd thru-user-app29082025-master

echo Checking git status...
git status

echo.
echo ========================================
echo Adding changes...
git add src/app/api/grocery/order/route.ts
git add *.md
git add *.js
git add *.bat

echo.
echo Committing changes...
git commit -m "Fix: Query vendors from Supabase - Makes cafes visible in user app"

echo.
echo ========================================
echo Pushing to GitHub (triggers Vercel deploy)...
git push origin main

echo.
echo ========================================
echo DEPLOYMENT INITIATED!
echo ========================================
echo.
echo Vercel will automatically deploy in ~2-3 minutes
echo.
echo Next steps:
echo 1. Check Vercel dashboard for deployment status
echo 2. Wait for deployment to complete
echo 3. Test at: https://app.kiptech.in/api/grocery/order
echo.
echo ========================================
pause


