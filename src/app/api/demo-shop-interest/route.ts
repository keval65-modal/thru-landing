import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Schema that handles both customer and vendor forms
const schema = z.object({
  // Customer form fields
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  
  // Vendor form fields
  shopName: z.string().min(2).max(140).optional(),
  ownerName: z.string().min(2).max(120).optional(),
  shopCategory: z.string().optional(),
  
  // Common fields
  phone: z.string().min(6).max(32),
  location: z.string().min(2).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  notes: z.string().max(400).optional(),
  whatsappOptIn: z.boolean(),
  
  // Legacy fields (for backward compatibility)
  city: z.string().min(2).max(80).optional(),
}).refine(
  (data) => {
    // Either customer form (name) or vendor form (shopName + ownerName) must be present
    return (data.name) || (data.shopName && data.ownerName);
  },
  {
    message: "Either name (customer) or shopName + ownerName (vendor) must be provided",
  }
);

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
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

    // Determine source from referer to track which demo page the submission came from
    const referer = req.headers.get("referer") || "";
    let source = "customer-demo-panel"; // default fallback
    
    if (referer.includes("/v2")) {
      source = "vendor-demo-v2";
    } else if (referer.includes("/c2")) {
      source = "customer-demo-c2";
    } else if (referer.includes("/demo/vendor")) {
      source = "vendor-demo-panel";
    } else if (referer.includes("/demo/customer")) {
      source = "customer-demo-panel";
    }

    // Extract city from location if not provided
    const city = parsed.city || parsed.location.split(',').pop()?.trim() || '';
    
    // Prepare data for insertion
    const insertData: any = {
      phone: parsed.phone.trim(),
      location: parsed.location.trim(),
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      notes: parsed.notes?.trim() || null,
      whatsapp_opt_in: parsed.whatsappOptIn,
      source: source,
      user_agent: req.headers.get("user-agent"),
    };

    // Add customer-specific fields
    if (parsed.name) {
      insertData.name = parsed.name.trim();
      insertData.email = parsed.email?.trim() || null;
      insertData.shop_name = null;
      insertData.owner_name = null;
      insertData.shop_category = null;
    }

    // Add vendor-specific fields
    if (parsed.shopName && parsed.ownerName) {
      insertData.shop_name = parsed.shopName.trim();
      insertData.owner_name = parsed.ownerName.trim();
      insertData.shop_category = parsed.shopCategory?.trim() || null;
      insertData.name = null;
      insertData.email = null;
    }

    // Add city (extracted from location or provided)
    insertData.city = city;

    const { error } = await supabase.from("demo_shop_interest").insert(insertData);

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
