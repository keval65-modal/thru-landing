"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Plus, Minus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFoodCart, FoodItem } from '@/hooks/useFoodCart';
import { Vendor } from '@/lib/supabase/vendor-service';

interface RestaurantMenuProps {
  vendor: Vendor;
  routeData: {
    departureTime: Date;
    destination: string;
    destinationCoords: { lat: number; lng: number };
  };
}

export default function RestaurantMenu({ vendor, routeData }: RestaurantMenuProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { items, addToCart, updateQuantity, removeFromCart, getItemCount, calculateTotal } = useFoodCart();
  
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadMenu();
  }, [vendor.id]);

  async function loadMenu() {
    try {
      setLoading(true);
      // Fetch menu from API
      const response = await fetch(`/api/menu/${vendor.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load menu');
      }

      const data = await response.json();
      setMenu(data.items || []);
    } catch (error) {
      console.error('Error loading menu:', error);
      // Set demo menu for now
      setMenu([
        {
          id: '1',
          name: 'Margherita Pizza',
          description: 'Classic pizza with tomato sauce and mozzarella',
          price: 12.99,
          category: 'Pizza',
          vendor_id: vendor.id
        },
        {
          id: '2',
          name: 'Caesar Salad',
          description: 'Fresh romaine lettuce with Caesar dressing',
          price: 8.99,
          category: 'Salads',
          vendor_id: vendor.id
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  const categories = ['all', ...new Set(menu.map(item => item.category).filter(Boolean))];
  const filteredMenu = selectedCategory === 'all' 
    ? menu 
    : menu.filter(item => item.category === selectedCategory);

  function handleAddToCart(item: FoodItem) {
    addToCart(item, {
      id: vendor.id,
      name: vendor.name,
      address: vendor.address
    });

    toast({
      title: 'Added to cart',
      description: `${item.name} added to your cart`
    });
  }

  function handleRemoveFromCart(itemId: string) {
    const cartItem = items.get(itemId);
    if (cartItem && cartItem.quantity > 1) {
      updateQuantity(itemId, cartItem.quantity - 1);
    } else {
      removeFromCart(itemId);
    }
  }

  function handleCheckout() {
    if (getItemCount() === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart first',
        variant: 'destructive'
      });
      return;
    }

    // Store route data in session storage for checkout
    sessionStorage.setItem('orderRouteData', JSON.stringify(routeData));
    
    // Navigate to cart page
    router.push('/cart');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Menu Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Menu</h2>
        <p className="text-gray-600">
          Pickup at {routeData.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <Button
              key={category || 'uncategorized'}
              variant={selectedCategory === (category || 'all') ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category || 'all')}
              className="whitespace-nowrap"
            >
              {category === 'all' ? 'All Items' : (category || 'Other')}
            </Button>
          ))}
        </div>
      )}

      {/* Menu Items */}
      <div className="space-y-4">
        {filteredMenu.map(item => {
          const cartItem = items.get(item.id);
          const quantity = cartItem?.quantity || 0;
          
          return (
            <Card key={item.id} className="p-4">
              <div className="flex gap-4">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <span className="font-semibold text-primary">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  )}

                  {item.is_veg !== undefined && (
                    <Badge variant={item.is_veg ? 'default' : 'secondary'} className="mb-2 text-xs">
                      {item.is_veg ? '🌱 Veg' : 'Non-Veg'}
                    </Badge>
                  )}

                  <div className="flex items-center gap-2">
                    {quantity === 0 ? (
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(item)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleRemoveFromCart(item.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-medium w-8 text-center">{quantity}</span>
                        <Button
                          size="icon"
                          onClick={() => handleAddToCart(item)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Cart Summary */}
      {getItemCount() > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-semibold">{getItemCount()} items</span>
              </div>
              <span className="text-lg font-bold text-primary">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
            <Button size="lg" onClick={handleCheckout}>
              Proceed to Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
