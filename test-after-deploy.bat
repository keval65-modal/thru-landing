@echo off
echo ========================================
echo   TESTING PRODUCTION DEPLOYMENT
echo ========================================
echo.
echo This will test if your cafe is visible
echo in the production user app.
echo.
echo ========================================
echo.

cd thru-user-app29082025-master

echo Testing production order API...
echo.

node test-production-order.js

echo.
echo ========================================
echo WHAT TO LOOK FOR:
echo ========================================
echo.
echo Success indicators:
echo   [x] vendorsFound: 1 or more (not 0!)
echo   [x] dataSource: "Supabase"
echo   [x] Your cafe name in vendors array
echo.
echo If vendorsFound = 0:
echo   - Check your cafe in Supabase
echo   - Verify is_active = true
echo   - Verify grocery_enabled = true
echo   - Verify location has coordinates
echo.
echo ========================================
pause















