import { NextResponse } from "next/server";
import {
  DemoOrderLine,
  DemoVendorType,
  createDemoOrder,
  getCatalog,
} from "@/lib/demo-data";
import {
  DemoStatus,
  getDemoState,
  placeDemoOrder,
  resetDemoState,
  setDemoStatus,
  updateDemoOrderLines,
  updateArrival,
} from "@/lib/demo-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getDemoState());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    vendorType?: DemoVendorType;
  };
  const vendorType = body.vendorType ?? "grocery";
  const state = placeDemoOrder(vendorType);
  return NextResponse.json(state);
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    status?: DemoStatus;
    lines?: DemoOrderLine[];
    vendorNote?: string;
    arrivalTotalSeconds?: number;
    arrivalStartTs?: number;
  };

  if (typeof body.arrivalTotalSeconds === "number") {
    const state = updateArrival(body.arrivalTotalSeconds, body.arrivalStartTs);
    return NextResponse.json(state);
  }

  if (body.lines) {
    const catalog = getCatalog(getDemoState().order?.vendorType ?? "grocery");
    const merged = catalog.map((item) => {
      const override = body.lines?.find((l) => l.id === item.id);
      return {
        ...item,
        ...override,
      };
    });
    const state = updateDemoOrderLines(merged, body.vendorNote);
    return NextResponse.json(state);
  }

  if (body.status) {
    const state = setDemoStatus(body.status, body.vendorNote);
    return NextResponse.json(state);
  }

  return NextResponse.json(getDemoState());
}

export async function DELETE() {
  const state = resetDemoState();
  return NextResponse.json(state);
}

