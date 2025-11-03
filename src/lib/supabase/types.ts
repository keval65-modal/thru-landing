/**
 * Supabase Database Types
 * Auto-generated types for type-safe database queries
 * 
 * To regenerate: npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          user_id: string
          status: string
          items: Json
          route: Json
          detour_preferences: Json | null
          vendor_quotes: Json
          selected_vendor_id: string | null
          total_amount: number | null
          created_at: string
          updated_at: string
          quote_deadline: string | null
        }
        Insert: {
          id?: string
          user_id: string
          status?: string
          items: Json
          route: Json
          detour_preferences?: Json | null
          vendor_quotes?: Json
          selected_vendor_id?: string | null
          total_amount?: number | null
          created_at?: string
          updated_at?: string
          quote_deadline?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          items?: Json
          route?: Json
          detour_preferences?: Json | null
          vendor_quotes?: Json
          selected_vendor_id?: string | null
          total_amount?: number | null
          created_at?: string
          updated_at?: string
          quote_deadline?: string | null
        }
      }
      vendors: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          address: string | null
          location: Json
          categories: string[]
          store_type: string | null
          is_active: boolean
          is_active_on_thru: boolean
          grocery_enabled: boolean
          operating_hours: Json | null
          fcm_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          address?: string | null
          location: Json
          categories?: string[]
          store_type?: string | null
          is_active?: boolean
          is_active_on_thru?: boolean
          grocery_enabled?: boolean
          operating_hours?: Json | null
          fcm_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          location?: Json
          categories?: string[]
          store_type?: string | null
          is_active?: boolean
          is_active_on_thru?: boolean
          grocery_enabled?: boolean
          operating_hours?: Json | null
          fcm_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vendor_responses: {
        Row: {
          id: string
          order_id: string
          vendor_id: string
          status: string
          total_price: number | null
          item_prices: Json | null
          estimated_ready_time: string | null
          notes: string | null
          counter_offer: Json | null
          responded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          vendor_id: string
          status: string
          total_price?: number | null
          item_prices?: Json | null
          estimated_ready_time?: string | null
          notes?: string | null
          counter_offer?: Json | null
          responded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          vendor_id?: string
          status?: string
          total_price?: number | null
          item_prices?: Json | null
          estimated_ready_time?: string | null
          notes?: string | null
          counter_offer?: Json | null
          responded_at?: string
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          firebase_uid: string
          phone: string | null
          name: string | null
          email: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firebase_uid: string
          phone?: string | null
          name?: string | null
          email?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          firebase_uid?: string
          phone?: string | null
          name?: string | null
          email?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      vendors_near_location: {
        Args: {
          lat: number
          lng: number
          radius_km?: number
        }
        Returns: Array<{
          id: string
          name: string
          phone: string | null
          email: string | null
          address: string | null
          location: Json
          categories: string[]
          store_type: string | null
          is_active: boolean
          is_active_on_thru: boolean
          grocery_enabled: boolean
          operating_hours: Json | null
          fcm_token: string | null
          created_at: string
          updated_at: string
          distance_km: number
        }>
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}


