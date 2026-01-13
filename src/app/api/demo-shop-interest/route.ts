import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  shopName: z.string().min(2).max(140),
  ownerName: z.string().min(2).max(120),
  city: z.string().min(2).max(80),
  phone: z.string().min(6).max(32),
  email: z.string().email().optional(),
  notes: z.string().max(400).optional(),
  whatsappOptIn: z.boolean(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ok: false, message: "Service misconfigured" },
        { status: 500 }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const parsed = schema.parse(body);

    const { error } = await supabase.from("demo_shop_interest").insert({
      shop_name: parsed.shopName.trim(),
      owner_name: parsed.ownerName.trim(),
      city: parsed.city.trim(),
      phone: parsed.phone.trim(),
      email: parsed.email?.trim() || null,
      notes: parsed.notes?.trim() || null,
      whatsapp_opt_in: parsed.whatsappOptIn,
      source: "customer-demo-panel",
      user_agent: req.headers.get("user-agent"),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, message: "Already captured" }, { status: 200 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const message = err?.issues?.[0]?.message || err?.message || "Unable to save";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
