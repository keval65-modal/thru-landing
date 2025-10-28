@echo off
echo 🚀 Starting Thru App with V4 Configuration...
echo.

REM Set the V4 vendor API URL as environment variable
set NEXT_PUBLIC_VENDOR_API_URL=https://merchant.kiptech.in/api

echo ✅ V4 Vendor API URL set: %NEXT_PUBLIC_VENDOR_API_URL%
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    echo.
)

REM Start the development server
echo 🌐 Starting development server...
echo 🔄 This will force the app to use V4 instead of V3
echo.
npm run dev
