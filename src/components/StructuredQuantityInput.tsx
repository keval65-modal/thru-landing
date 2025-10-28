import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Package, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { RequestItem, DEFAULT_SUGGESTED_PACKS, FRACTIONAL_CAPABLE_UNITS } from '@/types/vendor-requests';

interface StructuredQuantityInputProps {
  onRequestSubmit: (request: any) => void;
  userLocation?: { lat: number; lng: number };
  className?: string;
}

export const StructuredQuantityInput: React.FC<StructuredQuantityInputProps> = ({
  onRequestSubmit,
  userLocation,
  className
}) => {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<RequestItem>>({
    product_name: '',
    requested_qty_value: 1,
    requested_qty_unit: 'kg',
    allow_fractional_by_user: false,
    notes: ''
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    if (!currentItem.product_name?.trim()) return;
    
    const newItem: RequestItem = {
      request_item_id: `r${items.length + 1}`,
      product_name: currentItem.product_name.trim(),
      normalized_hint: currentItem.product_name.toLowerCase().trim(),
      requested_qty_value: currentItem.requested_qty_value || 1,
      requested_qty_unit: currentItem.requested_qty_unit || 'kg',
      allow_fractional_by_user: currentItem.allow_fractional_by_user || false,
      notes: currentItem.notes?.trim() || '',
      suggested_packs: DEFAULT_SUGGESTED_PACKS[(currentItem.requested_qty_unit || 'kg') as keyof typeof DEFAULT_SUGGESTED_PACKS] || []
    };
    
    setItems([...items, newItem]);
    setCurrentItem({
      product_name: '',
      requested_qty_value: 1,
      requested_qty_unit: 'kg',
      allow_fractional_by_user: false,
      notes: ''
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, value: number) => {
    const updatedItems = [...items];
    updatedItems[index].requested_qty_value = Math.max(0.1, value);
    setItems(updatedItems);
  };

  const updateItemUnit = (index: number, unit: string) => {
    const updatedItems = [...items];
    updatedItems[index].requested_qty_unit = unit as any;
    updatedItems[index].suggested_packs = DEFAULT_SUGGESTED_PACKS[unit as keyof typeof DEFAULT_SUGGESTED_PACKS] || [];
    setItems(updatedItems);
  };

  const toggleFractional = (index: number) => {
    const updatedItems = [...items];
    updatedItems[index].allow_fractional_by_user = !updatedItems[index].allow_fractional_by_user;
    setItems(updatedItems);
  };

  const submitRequest = async () => {
    if (items.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      const requestPayload = {
        request_id: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        user_id: 'user_abc', // This would come from auth context
        location: userLocation || { lat: 12.97, lng: 77.59 },
        items: items,
        deadline_utc: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
      };
      
      await onRequestSubmit(requestPayload);
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQuickChips = (unit: string) => {
    const chips = DEFAULT_SUGGESTED_PACKS[unit as keyof typeof DEFAULT_SUGGESTED_PACKS] || [];
    return chips.map(pack => ({
      label: `${pack.pack_value}${pack.pack_unit}`,
      value: pack.pack_value
    }));
  };

  const isFractionalCapable = (unit: string) => {
    return FRACTIONAL_CAPABLE_UNITS.includes(unit);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Add Item Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Items to Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Name */}
          <div>
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              placeholder="e.g., Tomato, Maggi 2-Min, Onions"
              value={currentItem.product_name || ''}
              onChange={(e) => setCurrentItem({ ...currentItem, product_name: e.target.value })}
            />
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0.1"
                step="0.1"
                value={currentItem.requested_qty_value || 1}
                onChange={(e) => setCurrentItem({ 
                  ...currentItem, 
                  requested_qty_value: parseFloat(e.target.value) || 1 
                })}
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={currentItem.requested_qty_unit || 'kg'}
                onValueChange={(value) => setCurrentItem({ 
                  ...currentItem, 
                  requested_qty_unit: value as any 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="g">Grams (g)</SelectItem>
                  <SelectItem value="l">Liters (l)</SelectItem>
                  <SelectItem value="ml">Milliliters (ml)</SelectItem>
                  <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Quantity Chips */}
          <div>
            <Label className="text-sm text-muted-foreground">Quick Select</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {getQuickChips(currentItem.requested_qty_unit || 'kg').map((chip, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentItem({ 
                    ...currentItem, 
                    requested_qty_value: chip.value 
                  })}
                  className="text-xs"
                >
                  {chip.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="e.g., ripe, red, fresh"
              value={currentItem.notes || ''}
              onChange={(e) => setCurrentItem({ ...currentItem, notes: e.target.value })}
            />
          </div>

          {/* Advanced Options */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>
            
            {showAdvanced && (
              <div className="mt-3 p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="fractional" className="text-sm">
                      Allow Fractional Sales
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      If not enabled, vendors may quote whole-pack prices only
                    </p>
                  </div>
                  <Switch
                    id="fractional"
                    checked={currentItem.allow_fractional_by_user || false}
                    onCheckedChange={(checked) => setCurrentItem({ 
                      ...currentItem, 
                      allow_fractional_by_user: checked 
                    })}
                    disabled={!isFractionalCapable(currentItem.requested_qty_unit || 'kg')}
                  />
                </div>
                
                {!isFractionalCapable(currentItem.requested_qty_unit || 'kg') && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    Fractional sales not applicable for discrete items (pcs)
                  </div>
                )}
              </div>
            )}
          </div>

          <Button onClick={addItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardContent>
      </Card>

      {/* Items List */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div key={item.request_item_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{item.product_name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {item.requested_qty_value} {item.requested_qty_unit}
                    </Badge>
                    {item.allow_fractional_by_user && (
                      <Badge variant="secondary" className="text-xs">
                        Fractional OK
                      </Badge>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground">{item.notes}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateItemQuantity(index, item.requested_qty_value - 0.1)}
                      disabled={item.requested_qty_value <= 0.1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium min-w-[3rem] text-center">
                      {item.requested_qty_value}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateItemQuantity(index, item.requested_qty_value + 0.1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <Select
                    value={item.requested_qty_unit}
                    onValueChange={(value) => updateItemUnit(index, value)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="pcs">pcs</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Submit Request */}
      {items.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Request will be sent to nearby vendors</span>
              </div>
              
              {userLocation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</span>
                </div>
              )}
              
              <Separator />
              
              <Button 
                onClick={submitRequest} 
                className="w-full" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending Request...' : 'Send Request to Vendors'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
