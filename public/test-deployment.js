// Test script to verify deployment
console.log('🚀🚀🚀 DEPLOYMENT TEST V4 - FORCE DEPLOY - 2024-10-21')
console.log('This message confirms the latest deployment is working!')
console.log('Timestamp:', new Date().toISOString())
console.log('Version: V4-FORCE-DEPLOY-2024-10-21')

// Test the vendor API URL
const vendorApiUrl = 'https://merchant.kiptech.in/api'
console.log('Vendor API URL:', vendorApiUrl)

// Test the API endpoint
fetch(`${vendorApiUrl}/test`)
  .then(response => response.json())
  .then(data => {
    console.log('✅ Vendor API test successful:', data)
  })
  .catch(error => {
    console.error('❌ Vendor API test failed:', error)
  })


