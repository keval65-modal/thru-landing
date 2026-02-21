"use client";
// Force redeploy - C2 customer demo page

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { vendorTypeOptions, DemoOrder } from "@/lib/demo-data";
import { useToast } from "@/hooks/use-toast";
import { DemoState } from "@/lib/demo-sync";
import { CustomerSignUpForm } from "@/components/demo/CustomerSignUpForm";

export default function C2CustomerPage() {
  const { toast } = useToast();
  const [vendorType, setVendorType] = useState(vendorTypeOptions[0].value);
  const [state, setState] = useState<DemoState | null>(null);
  const [arrivalSeconds, setArrivalSeconds] = useState(600);

  const QR_VALUE = "THRU-DEMO-QR";

  useEffect(() => {
    // Fresh session on every load to avoid stale orders
    fetch("/api/demo-order", { method: "DELETE" }).catch(() => undefined);
    const id = setInterval(async () => {
      const res = await fetch("/api/demo-order").then((r) => r.json());
      setState(res);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    if (state?.status === "placed" || state?.status === "accepted") {
      timer = window.setInterval(() => {
        if (!state) return;
        const elapsed = (Date.now() - state.arrivalStartTs) / 1000;
        const remaining = Math.max(0, state.arrivalTotalSeconds - elapsed);
        setArrivalSeconds(Math.round(remaining));
      }, 1000);
    } else {
      setArrivalSeconds(0);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [state]);

  const placeOrder = async () => {
    const res = await fetch("/api/demo-order", {
      method: "POST",
      body: JSON.stringify({ vendorType }),
    }).then((r) => r.json());
    setState(res);
    toast({ title: "Order placed", description: `Sent to ${vendorType}.` });
  };

  const confirmDelivered = async () => {
    await fetch("/api/demo-order", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    toast({ title: "Delivered", description: "Marked as completed." });
  };

  const order: DemoOrder | null = state?.order ?? null;

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1.4fr_0.9fr]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className="w-fit">
            Demo · Customer (C2)
          </Badge>
          <h1 className="text-2xl font-semibold">Place a quick demo order</h1>
          <p className="text-sm text-muted-foreground">
            One tap to place. Vendor sees it instantly—no session code needed.
          </p>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Shop type</CardTitle>
              <CardDescription>Pick the store and place the demo order.</CardDescription>
            </div>
            <Badge variant="secondary">Status: {state?.status ?? "idle"}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Select
                value={vendorType}
                onValueChange={(val) => setVendorType(val as typeof vendorType)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select shop type" />
                </SelectTrigger>
                <SelectContent>
                  {vendorTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This is sent to the vendor immediately.
              </p>
            </div>
            <Button onClick={placeOrder}>Place demo order</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Order</CardTitle>
              <CardDescription>Live status and arrival timer.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">
                Arrival: {state?.arrivalTotalSeconds === 30 ? "30s" : "10m"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const fast = state?.arrivalTotalSeconds === 30;
                  const next = fast ? 600 : 30;
                  await fetch("/api/demo-order", {
                    method: "PATCH",
                    body: JSON.stringify({
                      arrivalTotalSeconds: next,
                      arrivalStartTs: Date.now(),
                    }),
                  });
                  setState((prev) =>
                    prev
                      ? {
                          ...prev,
                          arrivalTotalSeconds: next,
                          arrivalStartTs: Date.now(),
                        }
                      : prev
                  );
                }}
              >
                {state?.arrivalTotalSeconds === 30
                  ? "Back to 10m"
                  : "Fast-forward to 30s"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {order ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Order ID: {order.id}</Badge>
                  <Badge variant="secondary">Vendor: {order.vendorType}</Badge>
                  <Badge variant="outline">Status: {state?.status}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Arrival countdown</p>
                    <p className="text-lg font-semibold">
                      {Math.floor(arrivalSeconds / 60)}m {arrivalSeconds % 60}s
                    </p>
                  </div>
                  <div className="h-2 w-40 overflow-hidden rounded bg-muted">
                    <div
                      className="h-2 bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.max(
                          5,
                          100 -
                            (arrivalSeconds /
                              (state?.arrivalTotalSeconds ?? 600)) *
                              100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="divide-y rounded-lg border">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 p-3"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity || item.weight}
                        </p>
                      </div>
                      <Badge variant="secondary">₹{item.basePrice}</Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Place an order to see details.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Handoff</CardTitle>
              <CardDescription>Show QR when vendor accepts.</CardDescription>
            </div>
            <Badge variant="outline">Demo only</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {state?.status === "accepted" && order ? (
              <>
                <div className="flex flex-col items-center gap-2 rounded-lg border bg-white p-4">
                  <QRCodeCanvas value={QR_VALUE} size={180} includeMargin />
                  <p className="text-xs text-muted-foreground">Scan on vendor phone</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                QR appears after vendor accepts.
              </p>
            )}
            {state?.status === "validated" && (
              <div className="space-y-2 rounded-lg border bg-emerald-50 p-3">
                <p className="font-medium">Order delivered?</p>
                <p className="text-sm text-muted-foreground">
                  Vendor validated the QR. Confirm handoff to finish.
                </p>
                <Button onClick={confirmDelivered}>Confirm delivered</Button>
              </div>
            )}
            {state?.status === "completed" && (
              <div className="rounded-lg border bg-emerald-50 p-3 text-sm">
                Order completed. Vendor payout triggered.
              </div>
            )}
            {state?.status === "accepted" && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs font-mono">
                Fallback payload: {QR_VALUE}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerSignUpForm />
    </main>
  );
}
