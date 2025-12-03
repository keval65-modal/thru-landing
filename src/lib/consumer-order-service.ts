import { PlacedOrder } from './orderModels';

class ConsumerOrderService {
  async createOrder(order: PlacedOrder): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...order,
          createdAt: order.createdAt || new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create order');
      }

      return { success: true, orderId: result.orderId };
    } catch (error: any) {
      console.error('Error creating order:', error);
      return {
        success: false,
        error: error?.message ?? 'Failed to create order',
      };
    }
  }
}

export const consumerOrderService = new ConsumerOrderService();
