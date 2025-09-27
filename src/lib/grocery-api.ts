// lib/grocery-api.ts

export interface GroceryProduct {
  id: string
  product_name: string
  display_name: string
  pack_unit: string
  pack_value: number
  price: number
  sku_id: string
  source: string
  category?: string
  image_url?: string
  description?: string
}

export interface GroceryShop {
  id: string
  shopName: string
  location: {
    latitude: number
    longitude: number
  }
  distance: number
  rating?: number
  deliveryTime?: string
  isOpen?: boolean
  address?: string
  phone?: string
  email?: string
  businessHours?: {
    [key: string]: { open: string; close: string }
  }
}

export interface GroceryOrder {
  userId: string
  items: Array<{
    id: string
    product_name: string
    display_name: string
    pack_unit: string
    pack_value: number
    price: number
    sku_id: string
    source: string
    quantity: number
  }>
  selectedShopId: string
  userLocation: {
    latitude: number
    longitude: number
    address: string
  }
  totalAmount: number
  notes?: string
  status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  createdAt?: string
  updatedAt?: string
}

export class GroceryAPI {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_VENDOR_API_URL || ''
  }

  async searchProducts(searchTerm: string, limit: number = 20): Promise<GroceryProduct[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/grocery/products?search=${encodeURIComponent(searchTerm)}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.success ? data.products : []
    } catch (error) {
      console.error('Error searching products:', error)
      return []
    }
  }

  async findNearbyShops(lat: number, lng: number, maxDetour: number = 2): Promise<GroceryShop[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/grocery/shops?lat=${lat}&lng=${lng}&maxDetour=${maxDetour}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.success ? data.shops : []
    } catch (error) {
      console.error('Error finding nearby shops:', error)
      return []
    }
  }

  async placeOrder(orderData: GroceryOrder): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/grocery/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error placing order:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async getUserOrders(userId: string, status?: string): Promise<GroceryOrder[]> {
    try {
      const params = new URLSearchParams({ userId })
      if (status) params.append('status', status)
      
      const response = await fetch(
        `${this.baseUrl}/api/grocery/orders?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.success ? data.orders : []
    } catch (error) {
      console.error('Error fetching user orders:', error)
      return []
    }
  }

  async getOrderById(orderId: string): Promise<GroceryOrder | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/grocery/orders/${orderId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.success ? data.order : null
    } catch (error) {
      console.error('Error fetching order:', error)
      return null
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/grocery/orders/${orderId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating order status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}

// Create a singleton instance
export const groceryAPI = new GroceryAPI()

