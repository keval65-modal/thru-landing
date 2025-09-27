# Deployment Guide for Thru App

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Firebase Project**: Set up Firebase project with Authentication and Firestore
3. **Google Maps API Key**: Get API key from [Google Cloud Console](https://console.cloud.google.com)
4. **Domain**: `app.kiptech.in` should be accessible

## Step 1: Environment Variables Setup

Create a `.env.local` file in the project root with the following variables:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Genkit AI (if using)
GENKIT_GOOGLE_AI_API_KEY=your_genkit_google_ai_api_key_here
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy the project:
```bash
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Push your code to GitHub/GitLab
2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your repository
5. Configure environment variables
6. Deploy

## Step 3: Configure Custom Domain

1. In Vercel Dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add `app.kiptech.in`
4. Vercel will provide DNS records to configure

### DNS Configuration

Add these records to your domain provider:

```
Type: A
Name: app
Value: 76.76.19.76

Type: CNAME
Name: www.app
Value: cname.vercel-dns.com
```

## Step 4: Environment Variables in Vercel

1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.local`
3. Make sure to set them for Production, Preview, and Development

## Step 5: Build and Deploy

1. Vercel will automatically build and deploy on git push
2. Monitor the build logs for any errors
3. Check the deployment URL

## Step 6: Post-Deployment Verification

1. Test the app at your custom domain
2. Verify Firebase authentication works
3. Test Google Maps integration
4. Check all features are working

## Troubleshooting

### Common Issues:

1. **Build Failures**: Check TypeScript and ESLint errors
2. **Environment Variables**: Ensure all required vars are set in Vercel
3. **Domain Issues**: Verify DNS propagation (can take up to 48 hours)
4. **Firebase Errors**: Check Firebase project configuration

### Build Commands:

```bash
# Local build test
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Security Notes

- All environment variables are automatically encrypted by Vercel
- Firebase security rules should be configured properly
- Google Maps API should have proper restrictions
- Enable HTTPS (automatic with Vercel)

## Performance Optimization

- Vercel automatically optimizes images and assets
- Edge functions are available for better performance
- CDN is automatically configured
- Automatic HTTPS and compression enabled

