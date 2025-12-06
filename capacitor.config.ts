import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thru.userapp',
  appName: 'Thru User App',
  webDir: 'out',
  server: {
    url: 'https://thru-user-app29082025-master-aokcesy05-keval65-modals-projects.vercel.app',
    cleartext: true,
    androidScheme: 'https',
    iosScheme: 'https'
  }
};

export default config;
