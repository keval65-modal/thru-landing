// hooks/useGroceryCart.ts
'use client'

import { useState, useCallback } from 'react'
import { GroceryProduct, GroceryShop } from '@/lib/grocery-api'

export interface CartItem {
  product: GroceryProduct
  quantity: number
  totalPrice: number
}

export function useGroceryCart() {
  const [items, setItems] = useState<Map<string, CartItem>>(new Map())
  const [selectedShop, setSelectedShop] = useState<GroceryShop | null>(null)

  const addToCart = useCallback((product: GroceryProduct) => {
    setItems(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(product.id)
      if (existing) {
        newMap.set(product.id, {
          ...existing,
          quantity: existing.quantity + 1,
          totalPrice: (existing.quantity + 1) * product.price
        })
      } else {
        newMap.set(product.id, {
          product,
          quantity: 1,
          totalPrice: product.price
        })
      }
      return newMap
    })
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    
    setItems(prev => {
      const newMap = new Map(prev)
      const item = newMap.get(productId)
      if (item) {
        newMap.set(productId, {
          ...item,
          quantity,
          totalPrice: quantity * item.product.price
        })
      }
      return newMap
    })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => {
      const newMap = new Map(prev)
      newMap.delete(productId)
      return newMap
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems(new Map())
  }, [])

  const calculateTotal = useCallback(() => {
    let total = 0
    items.forEach(item => {
      total += item.totalPrice
    })
    return total
  }, [items])

  const getItemCount = useCallback(() => {
    let count = 0
    items.forEach(item => {
      count += item.quantity
    })
    return count
  }, [items])

  const getCartItems = useCallback(() => {
    return Array.from(items.values())
  }, [items])

  return {
    items,
    selectedShop,
    setSelectedShop,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    calculateTotal,
    getItemCount,
    getCartItems
  }
}

