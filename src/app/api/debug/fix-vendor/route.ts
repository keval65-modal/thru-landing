import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { vendorId, updates } = await request.json();
    
    if (!vendorId) {
      return NextResponse.json({
        success: false,
        error: 'vendorId is required'
      }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    
    // Update the vendor
    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Vendor updated successfully',
      vendor: data
    });

  } catch (error) {
    console.error('❌ Error updating vendor:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update vendor'
    }, { status: 500 });
  }
}

// GET endpoint to enable a vendor for grocery
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vendorId = url.searchParams.get('vendorId');
    const action = url.searchParams.get('action') || 'enable-grocery';
    
    if (!vendorId) {
      return NextResponse.json({
        success: false,
        error: 'vendorId parameter is required'
      }, { status: 400 });
    }

    const supabase = createServiceSupabaseClient();
    
    let updates: any = {};
    
    if (action === 'enable-grocery') {
      updates = {
        grocery_enabled: true,
        store_type: 'grocery',
        updated_at: new Date().toISOString()
      };
    }

    // Update the vendor
    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Vendor ${data.name} is now enabled for grocery orders`,
      vendor: {
        id: data.id,
        name: data.name,
        storeType: data.store_type,
        groceryEnabled: data.grocery_enabled,
        isActive: data.is_active
      }
    });

  } catch (error) {
    console.error('❌ Error updating vendor:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update vendor'
    }, { status: 500 });
  }
}

