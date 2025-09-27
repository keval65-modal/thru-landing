// public/sw.js - Service Worker for FCM notifications

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

firebase.initializeApp(firebaseConfig)

// Initialize Firebase Messaging
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification'
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: payload.notification?.badge || '/badge-72x72.png',
    data: payload.data || {},
    tag: payload.data?.orderId || 'grocery-order',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Order',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-192x192.png'
      }
    ]
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()
  
  const action = event.action
  const data = event.notification.data
  
  if (action === 'view' || !action) {
    // Open the app to the order tracking page
    const url = data?.orderId ? `/orders/track/${data.orderId}` : '/orders'
    event.waitUntil(
      clients.openWindow(url)
    )
  } else if (action === 'dismiss') {
    // Just close the notification
    event.notification.close()
  }
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event)
})

// Handle push events
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)
  
  if (event.data) {
    const payload = event.data.json()
    console.log('Push payload:', payload)
    
    // Show notification
    const notificationTitle = payload.notification?.title || 'New Notification'
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: payload.notification?.icon || '/icon-192x192.png',
      badge: payload.notification?.badge || '/badge-72x72.png',
      data: payload.data || {},
      tag: payload.data?.orderId || 'grocery-order',
      requireInteraction: true
    }
    
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    )
  }
})
