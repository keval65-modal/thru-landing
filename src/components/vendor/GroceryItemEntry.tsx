"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Vendor } from '@/lib/supabase/vendor-service';

interface GroceryItemEntryProps {
  vendor: Vendor;
  routeData: {
    departureTime: Date;
    destination: string;
    destinationCoords: { lat: number; lng: number };
  };
}

interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function GroceryItemEntry({ vendor, routeData }: GroceryItemEntryProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function handleAddItem() {
    if (!itemName.trim()) {
      toast({
        title: 'Item name required',
        description: 'Please enter an item name',
        variant: 'destructive'
      });
      return;
    }

    const newItem: GroceryItem = {
      id: Date.now().toString(),
      name: itemName.trim(),
      quantity: parseFloat(quantity) || 1,
      unit: unit.trim() || 'unit'
    };

    setItems([...items, newItem]);
    setItemName('');
    setQuantity('1');
    setUnit('');

    toast({
      title: 'Item added',
      description: `${newItem.name} added to your list`
    });
  }

  function handleRemoveItem(id: string) {
    setItems(items.filter(item => item.id !== id));
  }

  async function handleSubmitOrder() {
    if (items.length === 0) {
      toast({
        title: 'No items',
        description: 'Please add items to your grocery list',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);

      // Store order data in session storage
      const orderData = {
        vendor,
        routeData,
        items,
        orderType: 'grocery'
      };

      sessionStorage.setItem('pendingGroceryOrder', JSON.stringify(orderData));

      // Navigate to grocery order processing page
      router.push('/grocery');
      
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit order. Please try again.',
        variant: 'destructive'
      });
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Add Grocery Items</h2>
        <p className="text-gray-600">
          Enter what you want to buy - we'll bring you best prices from vendors on the way
        </p>
      </div>

      {/* Item Entry Form */}
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="item-name">Item (e.g., Cheese Slice, Tomato...)</Label>
            <Input
              id="item-name"
              type="text"
              placeholder="Enter item name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                type="text"
                placeholder="kg, pcs, etc."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleAddItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          💡 AI learns from your choices and suggests your preferred units automatically
        </p>
      </Card>

      {/* Items List */}
      {items.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Your Shopping List ({items.length} items)</h3>
          
          <div className="space-y-2">
            {items.map(item => (
              <Card key={item.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Get Quotes from Vendors
              </>
            )}
          </Button>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No items added yet</p>
          <p className="text-sm">Search for items or add custom items to get started</p>
        </div>
      )}
    </div>
  );
}
