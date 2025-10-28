import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package, Star, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AddGroceryItemProps {
  onItemAdded?: () => void;
  prefilledName?: string;
}

export const AddGroceryItem: React.FC<AddGroceryItemProps> = ({ onItemAdded, prefilledName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: prefilledName || '',
    brand: '',
    category: '',
    description: '',
    price: '',
    quantity: '',
    unit: ''
  });

  const categories = [
    'Grains', 'Pulses', 'Vegetables', 'Fruits', 'Dairy', 'Cooking Oil',
    'Spices', 'Instant Food', 'Bakery', 'Snacks', 'Beverages', 'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/grocery-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          item: {
            name: formData.name,
            brand: formData.brand || undefined,
            category: formData.category,
            description: formData.description || undefined,
            availableQuantities: [{
              quantity: parseFloat(formData.quantity) || 1,
              unit: formData.unit || 'piece',
              price: parseFloat(formData.price) || undefined,
              isPopular: true
            }],
            tags: [formData.name.toLowerCase()]
          }
        }),
      });

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Grocery item added successfully. It will be available in search results.",
        });
        
        // Reset form
        setFormData({
          name: '',
          brand: '',
          category: '',
          description: '',
          price: '',
          quantity: '',
          unit: ''
        });
        
        setIsOpen(false);
        onItemAdded?.();
      } else {
        throw new Error('Failed to add item');
      }
    } catch (error) {
      console.error('Error adding grocery item:', error);
      toast({
        title: "Error",
        description: "Failed to add grocery item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Item
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Grocery Item
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Fresh Tomatoes"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="brand">Brand (Optional)</Label>
            <Input
              id="brand"
              placeholder="e.g., Farm Fresh"
              value={formData.brand}
              onChange={(e) => handleInputChange('brand', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              className="w-full p-2 border rounded-md"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              required
            >
              <option value="">Select Category</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Brief description of the item"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <select
                id="unit"
                className="w-full p-2 border rounded-md"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
              >
                <option value="piece">Piece</option>
                <option value="kg">Kilogram</option>
                <option value="gram">Gram</option>
                <option value="liter">Liter</option>
                <option value="ml">Milliliter</option>
                <option value="pack">Pack</option>
                <option value="dozen">Dozen</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="price">Price (₹) - Optional</Label>
            <Input
              id="price"
              type="number"
              placeholder="50"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Star className="h-4 w-4" />
              <span className="font-medium">Community Contribution</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Your contribution helps other users find items more easily. Items are reviewed before being made public.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name || !formData.category}
              className="flex-1"
            >
              {isLoading ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
