import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    
    // Test connection by checking vendors table
    const { data, error, count } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: '🎉 Supabase connected successfully!',
      vendorCount: count || 0,
      note: 'Database is empty and ready for fresh data',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
