import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const schema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  honeypot: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ ok: false, message: 'Service misconfigured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { email, name, phone, honeypot } = schema.parse(body);

    if (honeypot) return NextResponse.json({ ok: true }, { status: 200 });

    const { error } = await supabase
      .from('launch_waitlist')
      .insert({
        email: email.toLowerCase(),
        name: name || null,
        phone: phone?.trim() || null,
        source: 'landing',
        user_agent: req.headers.get('user-agent') || null,
      });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, message: 'Already on the list' }, { status: 200 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const message = err?.issues?.[0]?.message || 'Unable to save';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

