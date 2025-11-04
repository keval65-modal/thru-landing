#!/usr/bin/env node
/**
 * Cache Clear Utility for V4 Deployment
 * This script clears all caches to ensure the app loads v4 instead of v3
 */

const https = require('https');

async function clearCache() {
  console.log('🧹 Clearing cache for V4 deployment...');
  
  // Get the base URL from environment or use localhost for development
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // Clear grocery search cache
    const response = await fetch(`${baseUrl}/api/cache/grocery-search`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Cache cleared successfully:', result.message);
      console.log('📅 Cleared at:', new Date(result.clearedAt).toISOString());
      console.log('🔖 Version:', result.version);
    } else {
      console.error('❌ Failed to clear cache:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
    console.log('💡 Make sure your app is running and accessible at:', baseUrl);
  }
}

// Run the cache clear
clearCache().then(() => {
  console.log('🎉 Cache clear process completed!');
  console.log('🔄 Please refresh your browser to see v4 changes.');
}).catch(console.error);






