/**
 * Vendor Service - Supabase Version
 * Handles all vendor operations using Supabase PostgreSQL
 */

import { getSupabaseClient } from './client'
import { createServiceSupabaseClient } from './server'

export interface Vendor {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  location: { latitude: number; longitude: number }
  categories: string[]
  storeType?: string
  isActive: boolean
  isActiveOnThru: boolean
  groceryEnabled: boolean
  operatingHours?: any
  fcmToken?: string
  createdAt: Date
  updatedAt: Date
}

export interface NearbyVendor extends Vendor {
  distanceKm: number
}

export class SupabaseVendorService {
  /**
   * Get all active vendors
   */
  static async getActiveVendors(filters?: {
    category?: string
    storeType?: string
  }): Promise<Vendor[]> {
    try {
      const supabase = getSupabaseClient()

      let query = supabase
        .from('vendors')
        .select('*')
        .eq('is_active', true)

      if (filters?.storeType) {
        query = query.eq('store_type', filters.storeType)
      }

      if (filters?.category) {
        query = query.contains('categories', [filters.category])
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(this.mapVendorFromDb)
    } catch (error) {
      console.error('Error fetching vendors:', error)
      return []
    }
  }

  /**
   * Get vendor by ID
   */
  static async getVendor(vendorId: string): Promise<Vendor | null> {
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single()

      if (error) throw error

      return this.mapVendorFromDb(data)
    } catch (error) {
      console.error('Error fetching vendor:', error)
      return null
    }
  }

  /**
   * Get vendors near a location using PostGIS
   */
  static async getVendorsNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    filters?: {
      storeType?: string
      category?: string
    }
  ): Promise<NearbyVendor[]> {
    try {
      const supabase = getSupabaseClient()

      // Call the PostGIS function
      const { data, error } = await supabase.rpc('vendors_near_location', {
        lat: latitude,
        lng: longitude,
        radius_km: radiusKm,
      })

      if (error) throw error

      let vendors = (data || []).map((v: any) => ({
        ...this.mapVendorFromDb(v),
        distanceKm: v.distance_km,
      }))

      // Apply additional filters
      if (filters?.storeType) {
        vendors = vendors.filter((v) => v.storeType === filters.storeType)
      }

      if (filters?.category) {
        vendors = vendors.filter((v) => v.categories.includes(filters.category!))
      }

      return vendors
    } catch (error) {
      console.error('Error fetching nearby vendors:', error)
      return []
    }
  }

  /**
   * Get vendors along a route
   */
  static async getVendorsAlongRoute(
    routePoints: Array<{ lat: number; lng: number }>,
    maxDetourKm: number = 2,
    filters?: {
      storeType?: string
      category?: string
    }
  ): Promise<NearbyVendor[]> {
    try {
      // For each point on the route, find nearby vendors
      const allVendors: Map<string, NearbyVendor> = new Map()

      for (const point of routePoints) {
        const vendors = await this.getVendorsNearLocation(
          point.lat,
          point.lng,
          maxDetourKm,
          filters
        )

        // Add to map (keeps closest distance for each vendor)
        vendors.forEach((vendor) => {
          const existing = allVendors.get(vendor.id)
          if (!existing || vendor.distanceKm < existing.distanceKm) {
            allVendors.set(vendor.id, vendor)
          }
        })
      }

      // Convert map to array and sort by distance
      return Array.from(allVendors.values()).sort(
        (a, b) => a.distanceKm - b.distanceKm
      )
    } catch (error) {
      console.error('Error fetching vendors along route:', error)
      return []
    }
  }

  /**
   * Create a new vendor (admin only)
   */
  static async createVendor(
    vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; vendorId?: string; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient()

      const vendor = {
        name: vendorData.name,
        phone: vendorData.phone,
        email: vendorData.email,
        address: vendorData.address,
        location: vendorData.location,
        categories: vendorData.categories,
        store_type: vendorData.storeType,
        is_active: vendorData.isActive,
        is_active_on_thru: vendorData.isActiveOnThru,
        grocery_enabled: vendorData.groceryEnabled,
        operating_hours: vendorData.operatingHours,
        fcm_token: vendorData.fcmToken,
      }

      const { data, error } = await supabase
        .from('vendors')
        .insert(vendor)
        .select()
        .single()

      if (error) throw error

      return { success: true, vendorId: data.id }
    } catch (error) {
      console.error('Error creating vendor:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create vendor',
      }
    }
  }

  /**
   * Update vendor
   */
  static async updateVendor(
    vendorId: string,
    updates: Partial<Vendor>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient()

      const updateData: any = {}

      // Map camelCase to snake_case
      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.phone !== undefined) updateData.phone = updates.phone
      if (updates.email !== undefined) updateData.email = updates.email
      if (updates.address !== undefined) updateData.address = updates.address
      if (updates.location !== undefined) updateData.location = updates.location
      if (updates.categories !== undefined)
        updateData.categories = updates.categories
      if (updates.storeType !== undefined)
        updateData.store_type = updates.storeType
      if (updates.isActive !== undefined)
        updateData.is_active = updates.isActive
      if (updates.isActiveOnThru !== undefined)
        updateData.is_active_on_thru = updates.isActiveOnThru
      if (updates.groceryEnabled !== undefined)
        updateData.grocery_enabled = updates.groceryEnabled
      if (updates.operatingHours !== undefined)
        updateData.operating_hours = updates.operatingHours
      if (updates.fcmToken !== undefined)
        updateData.fcm_token = updates.fcmToken

      const { error } = await supabase
        .from('vendors')
        .update(updateData)
        .eq('id', vendorId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error updating vendor:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update vendor',
      }
    }
  }

  /**
   * Update vendor FCM token
   */
  static async updateVendorFcmToken(
    vendorId: string,
    fcmToken: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateVendor(vendorId, { fcmToken })
  }

  /**
   * Delete vendor (admin only)
   */
  static async deleteVendor(
    vendorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceSupabaseClient()

      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting vendor:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete vendor',
      }
    }
  }

  /**
   * Activate/Deactivate vendor
   */
  static async setVendorActive(
    vendorId: string,
    active: boolean
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateVendor(vendorId, { isActive: active })
  }

  /**
   * Map database record to Vendor interface
   */
  private static mapVendorFromDb(data: any): Vendor {
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      location: data.location,
      categories: data.categories || [],
      storeType: data.store_type,
      isActive: data.is_active ?? true,
      isActiveOnThru: data.is_active_on_thru ?? false,
      groceryEnabled: data.grocery_enabled ?? false,
      operatingHours: data.operating_hours,
      fcmToken: data.fcm_token,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }
}


