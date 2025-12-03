'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useFoodCart } from "@/hooks/useFoodCart"
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface FoodCartProps {
  onClose?: () => void
}

export function FoodCart({ onClose }: FoodCartProps) {
  const { items, updateQuantity, selectedShop } = useFoodCart()
  const router = useRouter()
  const cartItems = Array.from(items.values())
  
  const calculateTotal = () => {
    let total = 0
    items.forEach(cartItem => {
      total += cartItem.totalPrice
    })
    return total
  }
  
  const total = calculateTotal()

  const handleViewCart = () => {
    // Navigate to the cart page
    // We don't need to pass params as CartPage will read from localStorage
    router.push('/cart')
    onClose?.()
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Your cart is empty</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Add delicious items from the menu to get started!
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {selectedShop && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm text-muted-foreground">Ordering from</h3>
                <p className="font-medium text-lg">{selectedShop.name}</p>
                {selectedShop.address && (
                  <p className="text-xs text-muted-foreground truncate">{selectedShop.address}</p>
                )}
              </div>
            )}
            
            {cartItems.map(({ item, quantity, totalPrice }) => (
              <Card key={item.id} className="p-3 flex gap-3">
                {item.image_url && (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="w-20 h-20 object-cover rounded-md"
                  />
                )}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium line-clamp-1">{item.name}</h4>
                      <p className="font-semibold text-sm">₹{totalPrice}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">₹{item.price} x {quantity}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {item.is_veg && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-200">
                          VEG
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-background rounded-md"
                        onClick={() => updateQuantity(item.id, quantity - 1)}
                      >
                        {quantity === 1 ? (
                          <Trash2 className="h-3 w-3 text-destructive" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                      </Button>
                      <span className="text-sm font-medium w-4 text-center">{quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-background rounded-md"
                        onClick={() => updateQuantity(item.id, quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="mt-4 space-y-4 pt-4 border-t bg-background">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Item Total</span>
            <span>₹{total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxes & Charges</span>
            <span>₹{Math.round(total * 0.05)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>Grand Total</span>
            <span>₹{total + Math.round(total * 0.05)}</span>
          </div>
        </div>

        <Button className="w-full py-6 text-lg font-semibold shadow-lg" onClick={handleViewCart}>
          View Cart & Checkout
        </Button>
      </div>
    </div>
  )
}
