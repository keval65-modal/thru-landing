/**
 * Push Notification Service - Alternative to Firebase Cloud Messaging
 * 
 * Options:
 * 1. OneSignal (Recommended) - Free, easy to use, great features
 * 2. Expo Push Notifications - If using Expo
 * 3. Web Push API - For web browsers only
 * 4. Custom implementation with Supabase Edge Functions
 */

import { createServiceSupabaseClient } from './server'

export interface NotificationPayload {
  title: string
  message: string
  data?: Record<string, any>
  url?: string
}

/**
 * OneSignal Implementation (Recommended)
 * 
 * Setup:
 * 1. Create account at https://onesignal.com
 * 2. Create new app
 * 3. Add OneSignal App ID to .env.local:
 *    NEXT_PUBLIC_ONESIGNAL_APP_ID=your-app-id
 * 4. Install: npm install react-onesignal
 */
export class OneSignalNotificationService {
  /**
   * Initialize OneSignal (call this in your app layout)
   */
  static async initialize() {
    if (typeof window === 'undefined') return

    try {
      // Dynamically import OneSignal (client-side only)
      const OneSignal = (await import('react-onesignal')).default

      await OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
        allowLocalhostAsSecureOrigin: true,
      })

      console.log('✅ OneSignal initialized')
    } catch (error) {
      console.error('❌ Failed to initialize OneSignal:', error)
    }
  }

  /**
   * Send notification to a specific user
   */
  static async sendToUser(
    userId: string,
    notification: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/notifications/send-to-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notification }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error sending notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send',
      }
    }
  }

  /**
   * Send notification to a vendor
   */
  static async sendToVendor(
    vendorId: string,
    notification: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/notifications/send-to-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, notification }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error sending notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send',
      }
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendToMultipleUsers(
    userIds: string[],
    notification: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/notifications/send-to-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds, notification }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error sending notifications:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send',
      }
    }
  }
}

/**
 * Web Push API Implementation (Browser only, no app needed)
 * 
 * For simple web push notifications without third-party service
 */
export class WebPushNotificationService {
  /**
   * Request permission for push notifications
   */
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser')
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  /**
   * Send local notification (appears immediately)
   */
  static async sendLocalNotification(
    notification: NotificationPayload
  ): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return
    }

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192.png', // Add your app icon
        data: notification.data,
      })
    } else {
      console.warn('Notification permission not granted')
    }
  }

  /**
   * Register service worker for push notifications
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('✅ Service worker registered')
      return registration
    } catch (error) {
      console.error('❌ Service worker registration failed:', error)
      return null
    }
  }
}

/**
 * Supabase Edge Function Implementation
 * 
 * For custom notification logic using Supabase Edge Functions
 * This is useful if you want to keep everything in Supabase
 */
export class SupabaseNotificationService {
  /**
   * Send notification via Supabase Edge Function
   */
  static async sendViaEdgeFunction(
    recipient: string,
    notification: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient()

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          recipient,
          notification,
        },
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error sending notification via Edge Function:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send',
      }
    }
  }

  /**
   * Notify vendors about new order
   */
  static async notifyVendorsAboutOrder(
    orderId: string,
    vendorIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient()

      const { data, error } = await supabase.functions.invoke('notify-vendors', {
        body: {
          orderId,
          vendorIds,
        },
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error notifying vendors:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to notify',
      }
    }
  }
}

/**
 * Unified Notification Service
 * Use this as a facade for whichever notification service you choose
 */
export class NotificationService {
  // Choose your preferred implementation
  private static impl = OneSignalNotificationService

  static initialize() {
    return this.impl.initialize()
  }

  static sendToUser(userId: string, notification: NotificationPayload) {
    return this.impl.sendToUser(userId, notification)
  }

  static sendToVendor(vendorId: string, notification: NotificationPayload) {
    return this.impl.sendToVendor(vendorId, notification)
  }

  // Add other methods as needed
}


