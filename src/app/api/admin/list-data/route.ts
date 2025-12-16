import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder' // Use service role for admin queries
)

export async function GET() {
  try {
    // Get vendors
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, name, email, phone, is_active')
      .order('created_at', { ascending: false })

    if (vendorsError) throw vendorsError

    // Get users (if you have a users table)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .order('created_at', { ascending: false })

    // If users table doesn't exist, return empty array
    const usersList = usersError ? [] : users

    return NextResponse.json({
      vendors: vendors || [],
      users: usersList || [],
      vendorCount: vendors?.length || 0,
      userCount: usersList?.length || 0
    })
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
