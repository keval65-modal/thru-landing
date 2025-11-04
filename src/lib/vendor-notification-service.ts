import { getMessaging } from 'firebase-admin/messaging';
import { getAdminApp } from './firebaseAdmin';
import { VendorRequestPayload, VendorResponsePayload } from '@/types/vendor-requests';

export class VendorNotificationService {
  private getMessagingInstance() {
    const adminApp = getAdminApp();
    if (!adminApp) {
      throw new Error('Firebase Admin not initialized');
    }
    return getMessaging(adminApp);
  }

  /**
   * Send vendor request notification to nearby vendors
   */
  async sendVendorRequest(request: VendorRequestPayload, vendorTokens: string[]) {
    if (vendorTokens.length === 0) {
      console.log('No vendor tokens available for notification');
      return;
    }

    const notification = {
      title: 'New Grocery Request',
      body: `${request.items.length} items requested - ${request.items.map(item => `${item.requested_qty_value} ${item.requested_qty_unit} ${item.product_name}`).join(', ')}`,
      data: {
        type: 'vendor_request',
        request_id: request.request_id,
        user_id: request.user_id,
        location: JSON.stringify(request.location),
        deadline_utc: request.deadline_utc,
        items: JSON.stringify(request.items)
      }
    };

    try {
      const response = await this.getMessagingInstance().sendMulticast({
        tokens: vendorTokens,
        notification,
        data: notification.data,
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#FF6B35',
            sound: 'default',
            priority: 'high' as const,
            channelId: 'vendor_requests'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: notification.title,
                body: notification.body
              }
            }
          }
        }
      });

      console.log(`✅ Vendor request notification sent to ${response.successCount} vendors`);
      console.log(`❌ Failed to send to ${response.failureCount} vendors`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Failed to send to vendor ${idx}:`, resp.error);
          }
        });
      }

      return response;
    } catch (error) {
      console.error('Error sending vendor request notification:', error);
      throw error;
    }
  }

  /**
   * Send order confirmation notification to vendor
   */
  async sendOrderConfirmation(orderId: string, vendorToken: string, orderDetails: any) {
    const notification = {
      title: 'New Order Received!',
      body: `Order ${orderId} - ₹${orderDetails.total_amount} - ${orderDetails.accepted_offers.length} items`,
      data: {
        type: 'order_confirmation',
        order_id: orderId,
        total_amount: orderDetails.total_amount.toString(),
        currency: orderDetails.currency,
        items_count: orderDetails.accepted_offers.length.toString()
      }
    };

    try {
      const response = await this.getMessagingInstance().send({
        token: vendorToken,
        notification,
        data: notification.data,
        android: {
          notification: {
            icon: 'ic_order',
            color: '#4CAF50',
            sound: 'default',
            priority: 'high' as const,
            channelId: 'order_confirmations'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: notification.title,
                body: notification.body
              }
            }
          }
        }
      });

      console.log(`✅ Order confirmation sent to vendor: ${response}`);
      return response;
    } catch (error) {
      console.error('Error sending order confirmation:', error);
      throw error;
    }
  }

  /**
   * Send order status update to user
   */
  async sendOrderStatusUpdate(userToken: string, orderId: string, status: string, vendorName: string) {
    const statusMessages = {
      'vendor_confirmed': 'Vendor confirmed your order',
      'preparing': 'Vendor is preparing your order',
      'ready_for_pickup': 'Your order is ready for pickup',
      'out_for_delivery': 'Your order is out for delivery',
      'delivered': 'Your order has been delivered',
      'cancelled': 'Your order has been cancelled'
    };

    const notification = {
      title: 'Order Update',
      body: `${vendorName}: ${statusMessages[status as keyof typeof statusMessages] || status}`,
      data: {
        type: 'order_status_update',
        order_id: orderId,
        status: status,
        vendor_name: vendorName
      }
    };

    try {
      const response = await this.getMessagingInstance().send({
        token: userToken,
        notification,
        data: notification.data,
        android: {
          notification: {
            icon: 'ic_order_status',
            color: '#2196F3',
            sound: 'default',
            priority: 'default' as const,
            channelId: 'order_updates'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: notification.title,
                body: notification.body
              }
            }
          }
        }
      });

      console.log(`✅ Order status update sent to user: ${response}`);
      return response;
    } catch (error) {
      console.error('Error sending order status update:', error);
      throw error;
    }
  }

  /**
   * Subscribe vendor to topic for location-based notifications
   */
  async subscribeVendorToLocation(vendorToken: string, location: string) {
    try {
      await this.getMessagingInstance().subscribeToTopic([vendorToken], `location_${location}`);
      console.log(`✅ Vendor subscribed to location topic: location_${location}`);
    } catch (error) {
      console.error('Error subscribing vendor to location:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe vendor from location topic
   */
  async unsubscribeVendorFromLocation(vendorToken: string, location: string) {
    try {
      await this.getMessagingInstance().unsubscribeFromTopic([vendorToken], `location_${location}`);
      console.log(`✅ Vendor unsubscribed from location topic: location_${location}`);
    } catch (error) {
      console.error('Error unsubscribing vendor from location:', error);
      throw error;
    }
  }
}

export const vendorNotificationService = new VendorNotificationService();
