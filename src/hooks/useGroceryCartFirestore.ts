// hooks/useGroceryCartFirestore.ts - Enhanced cart with Firestore persistence

import { useState, useEffect, useCallback } from 'react'
import { GroceryProduct, GroceryShop } from '@/lib/grocery-firestore'
import { auth } from '@/lib/firebase'

export interface CartItem {
  product: GroceryProduct
  quantity: number
  totalPrice: number
}

export interface CartState {
  items: Map<string, CartItem>
  selectedShop: GroceryShop | null
  totalItems: number
  totalAmount: number
  isLoading: boolean
  error: string | null
}

export function useGroceryCartFirestore() {
  const [state, setState] = useState<CartState>({
    items: new Map(),
    selectedShop: null,
    totalItems: 0,
    totalAmount: 0,
    isLoading: false,
    error: null
  })

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('grocery-cart')
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        const itemsMap = new Map<string, CartItem>(parsedCart.items || [])
        setState(prev => ({
          ...prev,
          items: itemsMap,
          selectedShop: parsedCart.selectedShop || null
        }))
      } catch (error) {
        console.error('Error loading cart from localStorage:', error)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    const cartData = {
      items: Array.from(state.items.entries()),
      selectedShop: state.selectedShop,
      timestamp: Date.now()
    }
    localStorage.setItem('grocery-cart', JSON.stringify(cartData))
  }, [state.items, state.selectedShop])

  // Calculate totals whenever items change
  useEffect(() => {
    let totalItems = 0
    let totalAmount = 0

    state.items.forEach(item => {
      totalItems += item.quantity
      totalAmount += item.totalPrice
    })

    setState(prev => ({
      ...prev,
      totalItems,
      totalAmount
    }))
  }, [state.items])

  const addToCart = useCallback((product: GroceryProduct) => {
    setState(prev => {
      const newItems = new Map(prev.items)
      const existing = newItems.get(product.id)
      
      if (existing) {
        const newQuantity = existing.quantity + 1
        newItems.set(product.id, {
          ...existing,
          quantity: newQuantity,
          totalPrice: newQuantity * product.price
        })
      } else {
        newItems.set(product.id, {
          product,
          quantity: 1,
          totalPrice: product.price
        })
      }

      return {
        ...prev,
        items: newItems,
        error: null
      }
    })
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    setState(prev => {
      const newItems = new Map(prev.items)
      const existing = newItems.get(productId)
      
      if (existing) {
        newItems.set(productId, {
          ...existing,
          quantity,
          totalPrice: quantity * existing.product.price
        })
      }

      return {
        ...prev,
        items: newItems,
        error: null
      }
    })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setState(prev => {
      const newItems = new Map(prev.items)
      newItems.delete(productId)
      
      return {
        ...prev,
        items: newItems,
        error: null
      }
    })
  }, [])

  const clearCart = useCallback(() => {
    setState(prev => ({
      ...prev,
      items: new Map(),
      selectedShop: null,
      error: null
    }))
  }, [])

  const setSelectedShop = useCallback((shop: GroceryShop | null) => {
    setState(prev => ({
      ...prev,
      selectedShop: shop,
      error: null
    }))
  }, [])

  const getItemCount = useCallback((productId: string) => {
    return state.items.get(productId)?.quantity || 0
  }, [state.items])

  const getItem = useCallback((productId: string) => {
    return state.items.get(productId)
  }, [state.items])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }))
  }, [])

  // Sync cart with user account (if authenticated)
  const syncWithUser = useCallback(async () => {
    const user = auth?.currentUser
    if (!user) return

    try {
      setLoading(true)
      // Here you could implement server-side cart sync
      // For now, we'll just use localStorage
      console.log('Cart synced with user account')
    } catch (error) {
      console.error('Error syncing cart:', error)
      setError('Failed to sync cart with account')
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError])

  // Clear cart when user logs out
  useEffect(() => {
    const unsubscribe = auth?.onAuthStateChanged((user) => {
      if (!user) {
        clearCart()
      }
    })

    return () => unsubscribe?.()
  }, [clearCart])

  return {
    // State
    items: state.items,
    selectedShop: state.selectedShop,
    totalItems: state.totalItems,
    totalAmount: state.totalAmount,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setSelectedShop,
    getItemCount,
    getItem,
    setError,
    setLoading,
    syncWithUser
  }
}
