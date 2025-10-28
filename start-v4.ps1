# PowerShell script to start Thru App with V4 Configuration
Write-Host "🚀 Starting Thru App with V4 Configuration..." -ForegroundColor Green
Write-Host ""

# Set the V4 vendor API URL as environment variable
$env:NEXT_PUBLIC_VENDOR_API_URL = "https://merchant.kiptech.in/api"

Write-Host "✅ V4 Vendor API URL set: $env:NEXT_PUBLIC_VENDOR_API_URL" -ForegroundColor Green
Write-Host ""

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Start the development server
Write-Host "🌐 Starting development server..." -ForegroundColor Cyan
Write-Host "🔄 This will force the app to use V4 instead of V3" -ForegroundColor Yellow
Write-Host ""
npm run dev
