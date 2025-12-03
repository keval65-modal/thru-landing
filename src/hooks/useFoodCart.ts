'use client'

import { useState, useCallback, useEffect } from 'react'

export interface FoodItem {
  id: string
  name: string
  price: number
  description?: string
  image_url?: string
  is_veg?: boolean
  category?: string
  preparation_time?: string
  vendor_id: string
}

export interface CartItem {
  item: FoodItem
  quantity: number
  totalPrice: number
}

export interface FoodShop {
  id: string
  name: string
  address?: string
}

export function useFoodCart() {
  const [items, setItems] = useState<Map<string, CartItem>>(new Map())
  const [selectedShop, setSelectedShop] = useState<FoodShop | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setIsClient(true)
    const savedCart = localStorage.getItem('food_cart')
    const savedShop = localStorage.getItem('food_cart_shop')
    
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        setItems(new Map(parsedCart))
      } catch (e) {
        console.error('Failed to parse saved cart', e)
      }
    }
    
    if (savedShop) {
      try {
        setSelectedShop(JSON.parse(savedShop))
      } catch (e) {
        console.error('Failed to parse saved shop', e)
      }
    }
  }, [])

  // Save to localStorage whenever cart changes
  useEffect(() => {
    if (!isClient) return
    
    if (items.size > 0) {
      localStorage.setItem('food_cart', JSON.stringify(Array.from(items.entries())))
    } else {
      localStorage.removeItem('food_cart')
    }
    
    if (selectedShop) {
      localStorage.setItem('food_cart_shop', JSON.stringify(selectedShop))
    } else {
      localStorage.removeItem('food_cart_shop')
    }
  }, [items, selectedShop, isClient])

  const addToCart = useCallback((item: FoodItem, shop: FoodShop) => {
    setItems(prev => {
      // If adding from a different shop, confirm clear cart (logic handled in UI, here we just replace if forced or empty)
      // For now, we'll assume UI handles the "different shop" warning
      
      // If cart has items from another shop, clear it first
      if (selectedShop && selectedShop.id !== shop.id && prev.size > 0) {
        // This should ideally be handled by the UI asking for confirmation
        // But as a safeguard:
        const newMap = new Map()
        newMap.set(item.id, {
          item,
          quantity: 1,
          totalPrice: item.price
        })
        setSelectedShop(shop)
        return newMap
      }

      if (!selectedShop) {
        setSelectedShop(shop)
      }

      const newMap = new Map(prev)
      const existing = newMap.get(item.id)
      
      if (existing) {
        newMap.set(item.id, {
          ...existing,
          quantity: existing.quantity + 1,
          totalPrice: (existing.quantity + 1) * item.price
        })
      } else {
        newMap.set(item.id, {
          item,
          quantity: 1,
          totalPrice: item.price
        })
      }
      return newMap
    })
  }, [selectedShop])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    
    setItems(prev => {
      const newMap = new Map(prev)
      const cartItem = newMap.get(itemId)
      if (cartItem) {
        newMap.set(itemId, {
          ...cartItem,
          quantity,
          totalPrice: quantity * cartItem.item.price
        })
      }
      return newMap
    })
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    setItems(prev => {
      const newMap = new Map(prev)
      newMap.delete(itemId)
      
      // If cart becomes empty, clear selected shop
      if (newMap.size === 0) {
        setSelectedShop(null)
      }
      
      return newMap
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems(new Map())
    setSelectedShop(null)
  }, [])

  const calculateTotal = useCallback(() => {
    let total = 0
    items.forEach(cartItem => {
      total += cartItem.totalPrice
    })
    return total
  }, [items])

  const getItemCount = useCallback(() => {
    let count = 0
    items.forEach(cartItem => {
      count += cartItem.quantity
    })
    return count
  }, [items])

  const getCartItems = useCallback(() => {
    return Array.from(items.values())
  }, [items])

  return {
    items,
    selectedShop,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    calculateTotal,
    getItemCount,
    getCartItems
  }
}
