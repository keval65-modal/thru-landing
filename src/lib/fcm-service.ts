// lib/fcm-service.ts - Firebase Cloud Messaging service for vendor notifications

import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)

export interface FCMNotification {
  title: string
  body: string
  data?: { [key: string]: string }
  icon?: string
  badge?: string
  clickAction?: string
}

export class FCMService {
  private messaging: any = null
  private vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY

  constructor() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      this.initializeMessaging()
    }
  }

  private async initializeMessaging() {
    try {
      this.messaging = getMessaging(app)
    } catch (error) {
      console.error('Error initializing FCM:', error)
    }
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    try {
      if (!this.messaging) {
        await this.initializeMessaging()
      }

      if (!this.messaging) {
        console.warn('FCM not available')
        return false
      }

      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  // Get FCM token
  async getToken(): Promise<string | null> {
    try {
      if (!this.messaging) {
        await this.initializeMessaging()
      }

      if (!this.messaging) {
        console.warn('FCM not available')
        return null
      }

      const token = await getToken(this.messaging, {
        vapidKey: this.vapidKey
      })

      return token
    } catch (error) {
      console.error('Error getting FCM token:', error)
      return null
    }
  }

  // Subscribe to order notifications
  subscribeToOrderNotifications(callback: (notification: FCMNotification) => void): () => void {
    if (!this.messaging) {
      console.warn('FCM not available')
      return () => {}
    }

    const unsubscribe = onMessage(this.messaging, (payload: any) => {
      const notification: FCMNotification = {
        title: payload.notification?.title || payload.data?.title || 'New Notification',
        body: payload.notification?.body || payload.data?.body || '',
        data: payload.data || {},
        icon: payload.notification?.icon || '/icon-192x192.png',
        badge: payload.notification?.badge || '/badge-72x72.png',
        clickAction: payload.data?.clickAction
      }

      callback(notification)
    })

    return unsubscribe
  }

  // Handle notification clicks
  handleNotificationClick(notification: FCMNotification): void {
    if (notification.clickAction) {
      // Navigate to specific page based on click action
      window.location.href = notification.clickAction
    } else if (notification.data?.orderId) {
      // Navigate to order tracking page
      window.location.href = `/orders/track/${notification.data.orderId}`
    } else {
      // Navigate to orders page
      window.location.href = '/orders'
    }
  }

  // Send notification to specific vendor
  async sendVendorNotification(
    vendorId: string,
    orderId: string,
    orderData: any
  ): Promise<boolean> {
    try {
      // This would typically be done server-side
      // For now, we'll just log the notification
      console.log('Sending notification to vendor:', {
        vendorId,
        orderId,
        orderData
      })

      // In a real implementation, you would:
      // 1. Get vendor's FCM token from database
      // 2. Send notification via Firebase Admin SDK
      // 3. Handle delivery status

      return true
    } catch (error) {
      console.error('Error sending vendor notification:', error)
      return false
    }
  }

  // Send notification to user
  async sendUserNotification(
    userId: string,
    notification: FCMNotification
  ): Promise<boolean> {
    try {
      // This would typically be done server-side
      // For now, we'll just log the notification
      console.log('Sending notification to user:', {
        userId,
        notification
      })

      return true
    } catch (error) {
      console.error('Error sending user notification:', error)
      return false
    }
  }

  // Register service worker for background notifications
  async registerServiceWorker(): Promise<boolean> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service Worker registered:', registration)
        return true
      }
      return false
    } catch (error) {
      console.error('Error registering service worker:', error)
      return false
    }
  }

  // Show local notification
  showLocalNotification(notification: FCMNotification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notificationOptions: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || '/icon-192x192.png',
        badge: notification.badge || '/badge-72x72.png',
        data: notification.data,
        tag: notification.data?.orderId || 'grocery-order'
      }

      const notif = new Notification(notification.title, notificationOptions)
      
      notif.onclick = () => {
        this.handleNotificationClick(notification)
        notif.close()
      }

      // Auto-close after 10 seconds
      setTimeout(() => {
        notif.close()
      }, 10000)
    }
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator
  }

  // Check current permission status
  getPermissionStatus(): NotificationPermission {
    if ('Notification' in window) {
      return Notification.permission
    }
    return 'denied'
  }
}

// Create a singleton instance
export const fcmService = new FCMService()
