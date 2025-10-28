@echo off
REM Deploy Enhanced Grocery System to Production
REM This script builds and deploys the enhanced grocery system with all fixes

echo 🚀 Deploying Enhanced Grocery System to Production...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
npm install

echo 🔧 Building the application...
npm run build

if errorlevel 1 (
    echo ❌ Build failed. Please fix the errors and try again.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Vercel CLI not found. Installing...
    npm install -g vercel
)

echo 🌐 Deploying to Vercel...
vercel --prod

if errorlevel 1 (
    echo ❌ Deployment failed. Please check the errors and try again.
    pause
    exit /b 1
)

echo 🎉 Deployment successful!
echo.
echo 📋 What's been deployed:
echo ✅ Enhanced grocery system with store type detection
echo ✅ Route-based shop discovery (fixes location tracking)
echo ✅ Real distance calculations (no more hardcoded 2km)
echo ✅ Proper store type filtering (grocery vs takeout)
echo ✅ Improved shopping flow with item prompts
echo ✅ Shopping preference (single vs multiple stores)
echo ✅ Quick start categories for common items
echo ✅ Price update system integration
echo.
echo 🧪 Test the following:
echo 1. Visit /grocery - Test the enhanced shopping flow
echo 2. Visit /grocery/test - Test route-based discovery
echo 3. Try different store types (grocery vs restaurant)
echo 4. Test with different start/end locations
echo 5. Verify shops only show along your route
echo.
echo 🔗 Your app should be live at the Vercel URL shown above
pause

