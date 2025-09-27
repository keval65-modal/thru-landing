import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import bcrypt from 'bcryptjs';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, password } = await req.json();
    console.log('[LoginAPI] Incoming payload', {
      phoneNumberSample: typeof phoneNumber === 'string' ? phoneNumber.slice(0, 6) + '...' : typeof phoneNumber,
      passwordLen: typeof password === 'string' ? password.length : undefined,
    });
    if (typeof phoneNumber !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }
    const isE164 = /^\+[1-9]\d{1,14}$/.test(phoneNumber);
    if (!isE164) {
      return NextResponse.json({ success: false, message: 'Phone number must be in E.164 format (e.g., +91XXXXXXXXXX).' }, { status: 400 });
    }

    // Fetch user doc by phone number (E.164 id)
    const db = adminDb();
    const userDocId = phoneNumber;
    console.log('[LoginAPI] Fetching user doc', { userDocId });
    const userSnap = await db.collection('users').doc(userDocId).get();
    if (!userSnap.exists) {
      console.warn('[LoginAPI] User doc not found', { userDocId });
      return NextResponse.json({ success: false, message: 'Invalid phone number or password.' }, { status: 401 });
    }

    const data = userSnap.data() as any;
    const hashedPassword = data?.hashedPassword as string | undefined;
    console.log('[LoginAPI] Loaded user doc', {
      hasHash: !!hashedPassword,
      hashPrefix: typeof hashedPassword === 'string' ? hashedPassword.substring(0, 7) : undefined,
    });
    if (!hashedPassword) {
      return NextResponse.json({ success: false, message: 'Password not set for this account. Try OTP login or reset password.' }, { status: 400 });
    }

    const candidate = typeof password === 'string' ? password.trim() : password;
    const ok = await bcrypt.compare(candidate, hashedPassword);
    console.log('[LoginAPI] Bcrypt compare result', { ok });
    if (!ok) {
      return NextResponse.json({ success: false, message: 'Invalid phone number or password.' }, { status: 401 });
    }

    // Ensure a Firebase Auth user exists for this phone number
    const auth = adminAuth();
    let uid: string;
    try {
      const userRecord = await auth.getUserByPhoneNumber(phoneNumber);
      uid = userRecord.uid;
    } catch (err: any) {
      // Some environments may fail with UNAUTHENTICATED if Google credentials aren't accepted yet.
      // Fallback: use a deterministic UID and allow sign-in via custom token; Firebase will create the user on first sign-in.
      const sanitized = phoneNumber.replace(/[^\d+]/g, '');
      uid = `user_phone_${sanitized}`;
    }

    // Mint a custom token so the client can sign in
    const customToken = await auth.createCustomToken(uid, { phone_number: phoneNumber });
    console.log('[LoginAPI] Minted custom token for uid');

    return NextResponse.json({ success: true, token: customToken }, { status: 200 });
  } catch (e: any) {
    console.error('Login API error:', e);
    const msg = typeof e?.message === 'string' ? e.message : 'Internal error.';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}


