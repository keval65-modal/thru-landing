// components/EnhancedGroceryShopping.tsx - Enhanced grocery shopping interface with store type detection

'use client'

import React, { useState, useEffect } from 'react'
import { useEnhancedOrderProcessing } from '@/hooks/useEnhancedOrderProcessing'
import { enhancedOrderService } from '@/lib/enhanced-order-service'
import { StoreType, EnhancedGroceryProduct, UserGeneratedItem, UserRouteData } from '@/types/grocery-advanced'
import { RoutePoint, RouteBasedShop } from '@/lib/route-based-shop-discovery'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ShoppingCart, Search, Plus, Package, Clock, MapPin, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EnhancedGroceryShoppingProps {
  userRoute: UserRouteData | null
  onOrderPlaced?: (orderId: string) => void
}

export default function EnhancedGroceryShopping({ userRoute, onOrderPlaced }: EnhancedGroceryShoppingProps) {
  const { toast } = useToast()
  const {
    products,
    searchProducts,
    isSearching,
    addUserGeneratedItem,
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    calculateTotal,
    currentOrder,
    placeProcessedOrder,
    vendorResponses,
    selectedVendor,
    acceptVendorResponse,
    storeType,
    setStoreType,
    storeCapabilities,
    supportsGroceryProcessing,
    getAvailableStoreTypes,
    getStoreTypeDisplayName,
    loading,
    error,
    setError
  } = useEnhancedOrderProcessing()

  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  const [nearbyShops, setNearbyShops] = useState<RouteBasedShop[]>([])
  const [shopsLoading, setShopsLoading] = useState(false)
  const [shoppingPreference, setShoppingPreference] = useState<'single' | 'multiple'>('single')
  const [newItem, setNewItem] = useState({
    product_name: '',
    display_name: '',
    pack_unit: 'piece',
    pack_value: 1,
    category: '',
    description: ''
  })

  // Load nearby shops when route or store type changes
  useEffect(() => {
    if (userRoute) {
      loadNearbyShops()
    }
  }, [userRoute, storeType])

  // Load nearby shops based on route and store type
  const loadNearbyShops = async () => {
    if (!userRoute) return

    setShopsLoading(true)
    try {
      const startPoint: RoutePoint = {
        latitude: userRoute.start.latitude,
        longitude: userRoute.start.longitude,
        address: userRoute.start.address
      }

      const endPoint: RoutePoint = {
        latitude: userRoute.destination.latitude,
        longitude: userRoute.destination.longitude,
        address: userRoute.destination.address
      }

      const shops = await enhancedOrderService.findShopsForStoreType(
        startPoint,
        endPoint,
        storeType,
        userRoute.detourTolerance,
        userRoute.transportMode
      )

      setNearbyShops(shops)
      console.log(`🏪 Loaded ${shops.length} ${storeType} shops along route`)
    } catch (error) {
      console.error('Error loading nearby shops:', error)
      toast({
        title: "Error",
        description: "Failed to load nearby shops. Please try again.",
        variant: "destructive"
      })
    } finally {
      setShopsLoading(false)
    }
  }

  // Handle store type change
  const handleStoreTypeChange = (newStoreType: StoreType) => {
    setStoreType(newStoreType)
    toast({
      title: "Store Type Changed",
      description: `Now shopping at ${getStoreTypeDisplayName(newStoreType)}`,
    })
  }

  // Handle product search
  const handleSearch = (term: string) => {
    searchProducts(term)
  }

  // Handle add to cart
  const handleAddToCart = (product: EnhancedGroceryProduct) => {
    addToCart(product)
    toast({
      title: "Added to Cart",
      description: `${product.display_name} added to cart`,
    })
  }

  // Handle quantity update
  const handleQuantityUpdate = (productId: string, quantity: number) => {
    updateQuantity(productId, quantity)
  }

  // Handle remove from cart
  const handleRemoveFromCart = (productId: string) => {
    removeFromCart(productId)
    toast({
      title: "Removed from Cart",
      description: "Item removed from cart",
    })
  }

  // Handle add user-generated item
  const handleAddUserItem = async () => {
    try {
      if (!newItem.product_name.trim() || !newItem.display_name.trim()) {
        toast({
          title: "Error",
          description: "Please fill in product name and display name",
          variant: "destructive"
        })
        return
      }

      await addUserGeneratedItem({
        ...newItem,
        userId: 'current-user', // This should come from auth
        verified: false
      })
      setShowAddItemDialog(false)
      setNewItem({
        product_name: '',
        display_name: '',
        pack_unit: 'piece',
        pack_value: 1,
        category: '',
        description: ''
      })
      toast({
        title: "Item Added",
        description: "Your item has been added to the database",
      })
    } catch (err) {
      console.error('Error adding user item:', err)
    }
  }

  // Handle place order
  const handlePlaceOrder = async () => {
    try {
      if (cart.length === 0) {
        toast({
          title: "Empty Cart",
          description: "Please add items to your cart before placing an order",
          variant: "destructive"
        })
        return
      }

      if (!userRoute) {
        toast({
          title: "No Route",
          description: "Please set your route before placing an order",
          variant: "destructive"
        })
        return
      }

      const orderData = {
        userId: 'current-user', // This should come from auth
        userInfo: {
          name: 'User Name', // This should come from auth
          phone: '1234567890', // This should come from auth
          email: 'user@example.com' // This should come from auth
        },
        originalItems: cart,
        processedItems: [],
        userRoute: userRoute || {
          start: { latitude: 0, longitude: 0, address: '', timestamp: Date.now() },
          destination: { latitude: 0, longitude: 0, address: '', estimatedArrival: Date.now() },
          detourTolerance: 2,
          routePolyline: '',
          totalDistance: 0,
          estimatedDuration: 0,
          transportMode: 'driving' as const
        } as UserRouteData,
        totalAmount: calculateTotal(),
        storeType: storeType
      }

      const result = await placeProcessedOrder(orderData)
      
      if (result.orderId) {
        toast({
          title: "Order Placed!",
          description: "Your order has been sent to vendors for processing",
        })
        onOrderPlaced?.(result.orderId)
      }
    } catch (err) {
      console.error('Error placing order:', err)
    }
  }

  // Handle accept vendor response
  const handleAcceptVendor = async (vendorResponse: any) => {
    try {
      await acceptVendorResponse(vendorResponse)
      toast({
        title: "Vendor Selected",
        description: `Order accepted by Shop ${vendorResponse.shopId}`,
      })
    } catch (err) {
      console.error('Error accepting vendor:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Grocery Shopping</h1>
          <p className="text-gray-600">Shop with intelligent store type detection and vendor processing</p>
        </div>

        {/* Store Type Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Store Type Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="store-type">Select Store Type:</Label>
              <Select value={storeType} onValueChange={handleStoreTypeChange}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select store type" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableStoreTypes().map((type) => (
                    <SelectItem key={type} value={type}>
                      {getStoreTypeDisplayName(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant={supportsGroceryProcessing ? "default" : "secondary"}>
                {supportsGroceryProcessing ? "Grocery Processing" : "Traditional Menu"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Shopping Preference */}
        {supportsGroceryProcessing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Shopping Preference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  How would you like to shop? Would you prefer to pick up everything from a single store, or are you okay with visiting multiple stores if certain items aren't available at one store?
                </p>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        shoppingPreference === 'single' 
                          ? 'border-blue-600 bg-blue-600' 
                          : 'border-gray-300'
                      }`}>
                        {shoppingPreference === 'single' && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">Single Store</h4>
                        <p className="text-sm text-gray-600">Pick up everything from one store (faster, but some items might not be available)</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        shoppingPreference === 'multiple' 
                          ? 'border-blue-600 bg-blue-600' 
                          : 'border-gray-300'
                      }`}>
                        {shoppingPreference === 'multiple' && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">Multiple Stores</h4>
                        <p className="text-sm text-gray-600">Visit multiple stores to get all items (takes longer, but better availability)</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={shoppingPreference === 'single' ? 'default' : 'outline'}
                    onClick={() => setShoppingPreference('single')}
                    className="flex-1"
                  >
                    Single Store
                  </Button>
                  <Button
                    variant={shoppingPreference === 'multiple' ? 'default' : 'outline'}
                    onClick={() => setShoppingPreference('multiple')}
                    className="flex-1"
                  >
                    Multiple Stores
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nearby Shops - ONLY FOR FOOD/RESTAURANT ORDERING, NOT GROCERY! */}
        {userRoute && !supportsGroceryProcessing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Nearby Restaurants Along Your Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shopsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Finding restaurants along your route...</p>
                </div>
              ) : nearbyShops.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No {getStoreTypeDisplayName(storeType).toLowerCase()} shops found along your route</p>
                  <p className="text-sm">Try increasing your detour tolerance or selecting a different store type</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    Found {nearbyShops.length} {getStoreTypeDisplayName(storeType).toLowerCase()} shops along your route
                  </p>
                  {nearbyShops.map((shop) => (
                    <div key={shop.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex-1">
                        <h4 className="font-medium">{shop.name}</h4>
                        <p className="text-sm text-gray-600">{shop.address}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {shop.distanceFromRoute.toFixed(1)} km from route
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {shop.estimatedTime} min
                          </span>
                          {shop.isOnRoute && (
                            <Badge variant="outline" className="text-xs">On Route</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {shop.type}
                        </Badge>
                        <p className="text-sm text-gray-600">
                          Detour: {shop.detourDistance.toFixed(1)} km
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Grocery Shopping Explanation - SHOW FOR GROCERY ONLY */}
        {userRoute && supportsGroceryProcessing && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <ShoppingCart className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">How Grocery Shopping Works</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Add items you need to your cart below</li>
                    <li>Click "Place Order" to send your list to nearby shops</li>
                    <li>Shops along your route will respond with prices and availability</li>
                    <li>Choose which shop you want to buy from</li>
                    <li>Complete payment and pick up your items on your way!</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search and Products */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Search for products..."
                    onChange={(e) => handleSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Item</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="product_name">Product Name</Label>
                          <Input
                            id="product_name"
                            value={newItem.product_name}
                            onChange={(e) => setNewItem(prev => ({ ...prev, product_name: e.target.value }))}
                            placeholder="e.g., Organic Apples"
                          />
                        </div>
                        <div>
                          <Label htmlFor="display_name">Display Name</Label>
                          <Input
                            id="display_name"
                            value={newItem.display_name}
                            onChange={(e) => setNewItem(prev => ({ ...prev, display_name: e.target.value }))}
                            placeholder="e.g., Fresh Organic Apples - 1kg"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="pack_unit">Pack Unit</Label>
                            <Select value={newItem.pack_unit} onValueChange={(value) => setNewItem(prev => ({ ...prev, pack_unit: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="piece">Piece</SelectItem>
                                <SelectItem value="kg">Kilogram</SelectItem>
                                <SelectItem value="g">Gram</SelectItem>
                                <SelectItem value="liter">Liter</SelectItem>
                                <SelectItem value="ml">Milliliter</SelectItem>
                                <SelectItem value="pack">Pack</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="pack_value">Pack Value</Label>
                            <Input
                              id="pack_value"
                              type="number"
                              value={newItem.pack_value}
                              onChange={(e) => setNewItem(prev => ({ ...prev, pack_value: Number(e.target.value) }))}
                              placeholder="1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Input
                            id="category"
                            value={newItem.category}
                            onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                            placeholder="e.g., Fruits, Vegetables, Dairy"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Textarea
                            id="description"
                            value={newItem.description}
                            onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Additional details about the product"
                          />
                        </div>
                        <Button onClick={handleAddUserItem} className="w-full">
                          Add Item to Database
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Products List */}
                <div className="space-y-2">
                  {isSearching && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Searching products...</p>
                    </div>
                  )}
                  
                  {!isSearching && products.length === 0 && (
                    <div className="space-y-6">
                      <div className="text-center py-8">
                        <div className="bg-blue-50 rounded-lg p-6 mb-4">
                          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
                            <Plus className="h-8 w-8 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Add Your Required Items</h3>
                          <p className="text-gray-600 mb-4">
                            Start by adding the items you need to your shopping list. You can search for products or add custom items.
                          </p>
                          <div className="flex gap-3 justify-center">
                            <Button
                              onClick={() => setShowAddItemDialog(true)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Custom Item
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const searchInput = document.querySelector('input[placeholder="Search for products..."]') as HTMLInputElement
                                searchInput?.focus()
                              }}
                            >
                              <Search className="h-4 w-4 mr-2" />
                              Search Products
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Quick Start Categories */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Quick Start - Common Categories</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { name: 'Fruits', search: 'apple banana orange' },
                            { name: 'Vegetables', search: 'tomato onion potato' },
                            { name: 'Dairy', search: 'milk cheese yogurt' },
                            { name: 'Bakery', search: 'bread cake cookies' },
                            { name: 'Meat', search: 'chicken fish beef' },
                            { name: 'Snacks', search: 'chips nuts biscuits' },
                            { name: 'Beverages', search: 'juice soda water' },
                            { name: 'Household', search: 'soap detergent tissue' }
                          ].map((category) => (
                            <Button
                              key={category.name}
                              variant="outline"
                              size="sm"
                              onClick={() => handleSearch(category.search)}
                              className="text-xs justify-start"
                            >
                              {category.name}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          Click any category to search for common items in that category
                        </p>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        <p>💡 <strong>Tip:</strong> You can add items by:</p>
                        <ul className="mt-2 space-y-1">
                          <li>• Searching for existing products in the database</li>
                          <li>• Adding custom items if they're not available</li>
                          <li>• Browsing by category using the quick start buttons above</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {products.map((product) => (
                    <Card key={product.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{product.display_name}</h3>
                            {product.user_generated && (
                              <Badge variant="outline" className="text-xs">User Added</Badge>
                            )}
                            {!product.verified && (
                              <Badge variant="secondary" className="text-xs">Unverified</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{product.product_name}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm font-medium">
                              {product.pack_value} {product.pack_unit}
                            </span>
                            {product.price > 0 && (
                              <span className="text-sm font-bold text-green-600">
                                ₹{product.price}
                              </span>
                            )}
                            {product.category && (
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAddToCart(product)}
                          size="sm"
                          disabled={product.price === 0}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart and Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Shopping Cart
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="font-medium text-gray-900 mb-2">Your Shopping List is Empty</h3>
                      <p className="text-gray-600 text-sm mb-4">
                        Add items to your list to see them here and proceed with your order
                      </p>
                      <div className="text-xs text-gray-500">
                        <p>Items will appear here once you add them</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.product.display_name}</h4>
                          <p className="text-xs text-gray-600">{item.product.pack_value} {item.product.pack_unit}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityUpdate(item.product.id, item.quantity - 1)}
                              className="h-6 w-6 p-0"
                            >
                              -
                            </Button>
                            <span className="text-sm font-medium">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuantityUpdate(item.product.id, item.quantity + 1)}
                              className="h-6 w-6 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{item.totalPrice}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold text-lg">₹{calculateTotal()}</span>
                      </div>
                      
                      <Button
                        onClick={handlePlaceOrder}
                        className="w-full"
                        disabled={loading || !supportsGroceryProcessing}
                      >
                        {loading ? 'Placing Order...' : 'Place Order'}
                      </Button>
                      
                      {supportsGroceryProcessing && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-blue-800">
                            <ShoppingCart className="h-4 w-4" />
                            <span className="font-medium">Shopping Preference:</span>
                            <span className="capitalize">{shoppingPreference} store</span>
                          </div>
                          <p className="text-xs text-blue-600 mt-1">
                            {shoppingPreference === 'single' 
                              ? 'We\'ll try to find one store with all your items'
                              : 'We\'ll find the best combination of stores for your items'
                            }
                          </p>
                        </div>
                      )}
                      
                      {!supportsGroceryProcessing && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          This store type uses traditional menu ordering
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Vendor Responses */}
        {vendorResponses.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Vendor Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorResponses.map((response, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">Shop {response.shopId}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {response.estimatedPreparationTime} min
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{response.notes}</p>
                      </div>
                      <Button
                        onClick={() => handleAcceptVendor(response)}
                        disabled={selectedVendor?.shopId === response.shopId}
                      >
                        {selectedVendor?.shopId === response.shopId ? 'Selected' : 'Accept'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mt-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
              <Button
                onClick={() => setError(null)}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
