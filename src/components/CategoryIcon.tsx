import React from 'react'
import { 
  Apple, 
  Carrot, 
  Milk, 
  Croissant, 
  Fish, 
  Beef, 
  Coffee, 
  Cookie, 
  IceCream, 
  Wine, 
  ShoppingBag, 
  Package,
  Utensils,
  Droplets,
  Leaf,
  Zap
} from 'lucide-react'

interface CategoryIconProps {
  category?: string
  className?: string
  size?: number
}

const categoryIconMap: Record<string, React.ComponentType<any>> = {
  'fruits': Apple,
  'vegetables': Carrot,
  'dairy': Milk,
  'bakery': Croissant,
  'seafood': Fish,
  'meat': Beef,
  'beverages': Coffee,
  'snacks': Cookie,
  'frozen': IceCream,
  'alcohol': Wine,
  'groceries': ShoppingBag,
  'pantry': Package,
  'cooking': Utensils,
  'beverage': Droplets,
  'organic': Leaf,
  'energy': Zap,
  // Default fallbacks
  'default': ShoppingBag,
  '': ShoppingBag,
  'undefined': ShoppingBag
}

export function CategoryIcon({ category, className = "w-12 h-12", size = 48 }: CategoryIconProps) {
  // Normalize category name
  const normalizedCategory = category?.toLowerCase().trim() || 'default'
  
  // Find matching icon or use default
  const IconComponent = categoryIconMap[normalizedCategory] || categoryIconMap['default']
  
  return (
    <div className={`flex items-center justify-center rounded-lg border bg-muted ${className}`}>
      <IconComponent className="text-muted-foreground" size={size} />
    </div>
  )
}

export default CategoryIcon
