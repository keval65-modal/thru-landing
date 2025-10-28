#!/bin/bash

# Deploy Enhanced Grocery System to Production
# This script builds and deploys the enhanced grocery system with all fixes

echo "🚀 Deploying Enhanced Grocery System to Production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "🌐 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo ""
    echo "📋 What's been deployed:"
    echo "✅ Enhanced grocery system with store type detection"
    echo "✅ Route-based shop discovery (fixes location tracking)"
    echo "✅ Real distance calculations (no more hardcoded 2km)"
    echo "✅ Proper store type filtering (grocery vs takeout)"
    echo "✅ Improved shopping flow with item prompts"
    echo "✅ Shopping preference (single vs multiple stores)"
    echo "✅ Quick start categories for common items"
    echo "✅ Price update system integration"
    echo ""
    echo "🧪 Test the following:"
    echo "1. Visit /grocery - Test the enhanced shopping flow"
    echo "2. Visit /grocery/test - Test route-based discovery"
    echo "3. Try different store types (grocery vs restaurant)"
    echo "4. Test with different start/end locations"
    echo "5. Verify shops only show along your route"
    echo ""
    echo "🔗 Your app should be live at the Vercel URL shown above"
else
    echo "❌ Deployment failed. Please check the errors and try again."
    exit 1
fi

