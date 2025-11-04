"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Check, Clock, MapPin, Star } from 'lucide-react'

interface ItemQuote {
  itemId: string
  itemName: string
  available: boolean
  pricePerUnit: number
  quantity: number
  totalPrice: number
  unit: string
}

interface VendorQuote {
  vendorId: string
  vendorName: string
  status: 'quoted' | 'declined'
  itemQuotes: ItemQuote[]
  unavailableItems: string[]
  totalPrice: number
  estimatedReadyTime: string
  notes?: string
  quotedAt: Date
}

interface QuoteComparisonProps {
  quotes: VendorQuote[]
  onSelectVendor: (vendorId: string) => void
  selectedVendorId?: string
}

export default function QuoteComparison({ quotes, onSelectVendor, selectedVendorId }: QuoteComparisonProps) {
  if (quotes.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
        <h3 className="text-lg font-semibold mb-2">Waiting for Vendor Quotes...</h3>
        <p className="text-sm text-muted-foreground">
          Vendors are reviewing your order and will send quotes shortly
        </p>
      </div>
    )
  }

  // Find best price
  const bestPrice = Math.min(...quotes.map(q => q.totalPrice))
  const sortedQuotes = [...quotes].sort((a, b) => a.totalPrice - b.totalPrice)

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">Compare Vendor Quotes</h3>
        <p className="text-muted-foreground">
          {quotes.length} vendor{quotes.length > 1 ? 's' : ''} have submitted quotes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedQuotes.map((quote, index) => {
          const isBestPrice = quote.totalPrice === bestPrice
          const isSelected = quote.vendorId === selectedVendorId

          return (
            <Card
              key={quote.vendorId}
              className={`relative ${
                isSelected ? 'ring-2 ring-primary' : 
                isBestPrice ? 'ring-2 ring-green-500' : ''
              }`}
            >
              {isBestPrice && !isSelected && (
                <Badge className="absolute -top-2 -right-2 bg-green-500">
                  Best Price
                </Badge>
              )}
              
              {isSelected && (
                <Badge className="absolute -top-2 -right-2 bg-primary">
                  Selected
                </Badge>
              )}

              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{quote.vendorName}</span>
                  <span className="text-2xl font-bold text-primary">
                    ₹{quote.totalPrice}
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Items:</h4>
                  {quote.itemQuotes.map(item => (
                    <div key={item.itemId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity} {item.unit} {item.itemName}
                      </span>
                      <span className="font-medium">₹{item.totalPrice}</span>
                    </div>
                  ))}
                  
                  {quote.unavailableItems.length > 0 && (
                    <div className="text-sm text-red-600">
                      Unavailable: {quote.unavailableItems.length} item(s)
                    </div>
                  )}
                </div>

                {/* Ready Time */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Ready in: {quote.estimatedReadyTime}</span>
                </div>

                {/* Notes */}
                {quote.notes && (
                  <div className="text-sm italic text-muted-foreground border-l-2 pl-3">
                    "{quote.notes}"
                  </div>
                )}

                {/* Select Button */}
                <Button
                  className="w-full"
                  variant={isBestPrice ? "default" : "outline"}
                  onClick={() => onSelectVendor(quote.vendorId)}
                  disabled={isSelected}
                >
                  {isSelected ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Selected
                    </>
                  ) : (
                    'Select This Vendor'
                  )}
                </Button>

                {/* Rank Badge */}
                <div className="text-center text-xs text-muted-foreground">
                  #{index + 1} of {quotes.length} quotes
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Best Quote:</p>
            <p className="text-2xl font-bold text-green-600">₹{bestPrice}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Average Quote:</p>
            <p className="text-lg font-semibold">
              ₹{Math.round(quotes.reduce((sum, q) => sum + q.totalPrice, 0) / quotes.length)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Total Quotes:</p>
            <p className="text-lg font-semibold">{quotes.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}



