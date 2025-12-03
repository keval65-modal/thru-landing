'use server'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createServiceSupabaseClient } from '@/lib/supabase/server'

const OrderItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  quantity: z.number(),
  pricePerItem: z.number(),
  totalPrice: z.number(),
  imageUrl: z.string().optional().nullable(),
  details: z.string().optional().nullable(),
  dataAiHint: z.string().optional().nullable(),
})

const VendorPortionSchema = z.object({
  vendorId: z.string(),
  vendorName: z.string(),
  vendorAddress: z.string().optional().nullable(),
  vendorType: z.string().optional().nullable(),
  vendorLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional().nullable(),
  status: z.string(),
  vendorSubtotal: z.number(),
  items: z.array(OrderItemSchema),
  prepTime: z.number().optional(),
})

const OrderSchema = z.object({
  orderId: z.string(),
  createdAt: z.string().optional(),
  customerInfo: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      phoneNumber: z.string().optional(),
    })
    .optional(),
  tripStartLocation: z.string().optional().nullable(),
  tripDestination: z.string().optional().nullable(),
  overallStatus: z.string(),
  paymentStatus: z.string(),
  grandTotal: z.number(),
  platformFee: z.number().optional(),
  paymentGatewayFee: z.number().optional(),
  vendorPortions: z.array(VendorPortionSchema).min(1),
  vendorIds: z.array(z.string()).min(1),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const payload = OrderSchema.parse(json)

    const supabase = createServiceSupabaseClient()

    const { data, error } = await supabase
      .from('placed_orders')
      .insert({
        order_id: payload.orderId,
        created_at: payload.createdAt ?? new Date().toISOString(),
        customer_info: payload.customerInfo ?? null,
        trip_start_location: payload.tripStartLocation ?? null,
        trip_destination: payload.tripDestination ?? null,
        overall_status: payload.overallStatus,
        payment_status: payload.paymentStatus,
        grand_total: payload.grandTotal,
        platform_fee: payload.platformFee ?? 0,
        payment_gateway_fee: payload.paymentGatewayFee ?? 0,
        vendor_portions: payload.vendorPortions,
        vendor_ids: payload.vendorIds,
      })
      .select('order_id')
      .single()

    if (error) {
      console.error('[orders:create] Supabase insert failed:', error)
      return NextResponse.json(
        { success: false, error: error.message ?? 'Failed to store order.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orderId: data.order_id,
    })
  } catch (error) {
    console.error('[orders:create] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
