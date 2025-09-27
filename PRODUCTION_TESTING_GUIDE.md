# Production Testing Guide

## 🚀 **Testing Your Grocery System in Production**

Since you've added the environment variables to Vercel, let's systematically test everything to ensure it's working correctly.

## **Step 1: Environment Variables Check**

1. **Visit the test page**: `https://your-app.vercel.app/grocery/test`
2. **Check the Environment Variables section** - all should show "Configured"
3. **If any show "Missing"**:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Verify the variable names are exactly:
     - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
     - `NEXT_PUBLIC_VENDOR_API_URL`
   - Redeploy if needed

## **Step 2: API Endpoints Testing**

### **Test Product Search**
1. In the test page, try searching for:
   - "onion" (should return onion products)
   - "milk" (should return dairy products)
   - "bread" (should return bakery items)
2. **Expected**: Should return products with names, prices, and details
3. **If fails**: Check vendor API URL and CORS settings

### **Test Shop Discovery**
1. Click "Find Shops (Delhi)" button
2. **Expected**: Should return nearby shops with distances and ratings
3. **If fails**: Check vendor API and ensure shops exist in database

## **Step 3: Complete User Flow Testing**

### **3.1 Location Services**
1. **Visit**: `https://your-app.vercel.app/grocery`
2. **Allow location access** when prompted
3. **Expected**: Should show your current location address
4. **If fails**: Check HTTPS (required for geolocation) and browser permissions

### **3.2 Destination Entry**
1. **Enter a destination** (e.g., "Connaught Place, Delhi")
2. **Click "Find Shops Along Route"**
3. **Expected**: Should geocode the address and show map
4. **If fails**: Check Google Maps API key and Geocoding API

### **3.3 Map and Shop Selection**
1. **Verify map loads** with route visualization
2. **Check shop markers** appear on the map
3. **Click on a shop** to select it
4. **Expected**: Shop should be highlighted and selected
5. **If fails**: Check Google Maps JavaScript API and Places API

### **3.4 Product Shopping**
1. **Search for products** (e.g., "onion", "milk")
2. **Add items to cart** by clicking "Add" buttons
3. **Check cart** appears in bottom right
4. **Expected**: Items should appear in cart with correct quantities and prices
5. **If fails**: Check product search API and cart functionality

### **3.5 Order Placement**
1. **Select a shop** if not already selected
2. **Add items to cart**
3. **Click "Place Order"** in the cart
4. **Expected**: Should show order confirmation with order ID
5. **If fails**: Check order placement API and user authentication

## **Step 4: Mobile Testing**

### **Test on Mobile Device**
1. **Open on mobile browser** or use browser dev tools mobile view
2. **Test touch interactions**:
   - Tap to select shops
   - Tap to add items to cart
   - Swipe to scroll through products
3. **Check responsive design**:
   - Navigation should work on mobile
   - Cart should be accessible
   - Map should be touch-friendly

## **Step 5: Error Handling Testing**

### **Test Error Scenarios**
1. **Invalid destination**: Enter "xyz123" as destination
2. **No products found**: Search for "nonexistentproduct"
3. **Network issues**: Test with slow connection
4. **Expected**: Should show appropriate error messages

## **Common Issues and Solutions**

### **🔧 Maps Not Loading**
- **Check**: Google Maps API key is correct
- **Check**: Maps JavaScript API is enabled
- **Check**: API key restrictions (if any)
- **Solution**: Verify API key in Google Cloud Console

### **🔧 Location Not Working**
- **Check**: Site is served over HTTPS
- **Check**: Browser allows location access
- **Check**: Location services are enabled
- **Solution**: Ensure HTTPS and proper permissions

### **🔧 API Calls Failing**
- **Check**: Vendor API URL is correct
- **Check**: CORS is configured on vendor API
- **Check**: Network connectivity
- **Solution**: Verify API endpoints and CORS settings

### **🔧 Products Not Found**
- **Check**: Search terms are valid
- **Check**: Vendor API is returning data
- **Check**: Database has product data
- **Solution**: Verify API responses and database content

## **Performance Testing**

### **Load Time Testing**
1. **Test initial page load** time
2. **Test product search** response time
3. **Test map loading** time
4. **Expected**: All should load within 3-5 seconds

### **Concurrent User Testing**
1. **Test with multiple browser tabs**
2. **Test with different users**
3. **Expected**: System should handle multiple users

## **Security Testing**

### **Data Validation**
1. **Test with invalid inputs**
2. **Test with special characters**
3. **Expected**: Should handle gracefully without errors

### **Authentication**
1. **Test without login**
2. **Test with expired session**
3. **Expected**: Should redirect to login or show appropriate messages

## **Success Criteria**

✅ **Environment variables** are properly configured  
✅ **Product search** returns relevant results  
✅ **Shop discovery** finds nearby shops  
✅ **Map integration** works correctly  
✅ **Cart functionality** works smoothly  
✅ **Order placement** completes successfully  
✅ **Mobile experience** is responsive  
✅ **Error handling** is graceful  
✅ **Performance** is acceptable  

## **Next Steps After Testing**

1. **If all tests pass**: System is ready for users!
2. **If issues found**: Fix them and redeploy
3. **Monitor**: Set up error tracking and analytics
4. **Optimize**: Based on user feedback and performance data

## **Monitoring and Analytics**

Consider adding:
- **Error tracking** (Sentry, LogRocket)
- **Analytics** (Google Analytics, Mixpanel)
- **Performance monitoring** (Vercel Analytics)
- **User feedback** collection

---

**Ready to test?** Start with the environment check at `/grocery/test` and work through each step systematically!

