import { NextRequest, NextResponse } from 'next/server';
import { migrateExistingUsers } from '@/lib/migrate-users';

export async function POST(req: NextRequest) {
  try {
    console.log('API: Starting user migration...');
    
    const result = await migrateExistingUsers();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        updatedCount: result.updatedCount
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        updatedCount: result.updatedCount
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API: Migration error:', error);
    return NextResponse.json({
      success: false,
      message: `Migration failed: ${error}`,
      updatedCount: 0
    }, { status: 500 });
  }
}

