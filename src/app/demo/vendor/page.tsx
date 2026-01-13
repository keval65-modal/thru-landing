"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DemoOrder,
  DemoOrderLine,
  DemoVendorType,
  getCatalog,
  vendorTypeOptions,
} from "@/lib/demo-data";
import { ShopOptInForm } from "@/components/demo/ShopOptInForm";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DemoState } from "@/lib/demo-sync";

type ViewStatus =
  | "idle"
  | "placed"
  | "vendor_review"
  | "accepted"
  | "rejected"
  | "validated"
  | "completed";

export default function DemoVendorPage() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scanner, setScanner] = useState<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(false);

  const [vendorType, setVendorType] = useState<DemoVendorType>("grocery");
  const [state, setState] = useState<DemoState | null>(null);
  const [items, setItems] = useState<DemoOrderLine[]>([]);
  const [readyIn, setReadyIn] = useState(8);
  const [progress, setProgress] = useState(0);
  const [ledger, setLedger] = useState<
    { id: string; amount: number; ts: number }[]
  >([]);
  const [manualPayload, setManualPayload] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    setScanner(reader);
    return () => {
      BrowserMultiFormatReader.releaseAllStreams();
    };
  }, []);

  useEffect(() => {
    // Fresh session on every load to avoid stale orders
    fetch("/api/demo-order", { method: "DELETE" }).catch(() => undefined);
    const id = setInterval(async () => {
      const res = await fetch("/api/demo-order").then((r) => r.json());
      setState(res);
      if (res?.order) {
        setItems(res.order.items);
        setVendorType(res.order.vendorType);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const current = state;
    if (!current || (current.status !== "accepted" && current.status !== "placed")) {
      setProgress(0);
      return;
    }
    const updateProgress = () => {
      const elapsed = (Date.now() - current.arrivalStartTs) / 1000;
      const pct = Math.min(
        100,
        (elapsed / current.arrivalTotalSeconds) * 100
      );
      setProgress(Math.round(pct));
    };
    updateProgress();
    const id = window.setInterval(updateProgress, 1000);
    return () => clearInterval(id);
  }, [state]);

  const total = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (item.proposedPrice ?? item.basePrice),
      0
    );
  }, [items]);

  const QR_VALUE = "THRU-DEMO-QR";

  const pushItems = async (nextItems: DemoOrderLine[]) => {
    setItems(nextItems);
    await fetch("/api/demo-order", {
      method: "PATCH",
      body: JSON.stringify({ lines: nextItems, vendorNote: "Updated by vendor" }),
    });
  };

  const accept = async () => {
    await fetch("/api/demo-order", {
      method: "PATCH",
      body: JSON.stringify({ status: "accepted" }),
    });
    toast({ title: "Accepted", description: "Customer will see the QR." });
  };

  const reject = async () => {
    await fetch("/api/demo-order", {
      method: "PATCH",
      body: JSON.stringify({ status: "rejected" }),
    });
    toast({ title: "Rejected", description: "Customer notified." });
  };

  const handleManualCode = async (text: string) => {
    if (text.trim() !== QR_VALUE) {
      toast({
        title: "Invalid QR",
        description: "Use the demo QR shown on the customer phone.",
        variant: "destructive",
      });
      return;
    }
    await fetch("/api/demo-order", {
      method: "PATCH",
      body: JSON.stringify({ status: "validated" }),
    });
    toast({ title: "QR validated", description: "Waiting for customer confirm." });
  };

  const startScan = async () => {
    if (!scanner || !videoRef.current) {
      toast({
        title: "Scanner not ready",
        description: "Camera not available.",
        variant: "destructive",
      });
      return;
    }
    setScanning(true);
    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const deviceId = devices[devices.length - 1]?.deviceId;
      const result = await scanner.decodeOnceFromVideoDevice(
        deviceId,
        videoRef.current
      );
      handleManualCode(result.getText());
    } catch (err) {
      toast({
        title: "Scan interrupted",
        description:
          err instanceof Error ? err.message : "Could not access the camera.",
        variant: "destructive",
      });
    } finally {
      BrowserMultiFormatReader.releaseAllStreams();
      setScanning(false);
    }
  };

  const markPaid = async () => {
    const current = state?.order;
    if (!current) return;
    setLedger((prev) => [
      { id: current.id, amount: total, ts: Date.now() },
      ...prev.slice(0, 3),
    ]);
    toast({ title: "Payment complete", description: "Money transferred to account." });
  };

  const viewStatus: ViewStatus = state?.status ?? "idle";
  const order: DemoOrder | null = state?.order ?? null;
  const catalog = getCatalog(vendorType);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <Badge variant="outline" className="w-fit">
          Demo · Vendor
        </Badge>
        <h1 className="text-2xl font-semibold">Respond to demo orders</h1>
        <p className="text-sm text-muted-foreground">
          Orders appear instantly from the customer demo. Accept, reject, or tweak items.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Current order</CardTitle>
            <CardDescription>Auto-polls every second.</CardDescription>
          </div>
          <Badge variant="secondary">Status: {viewStatus}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {order ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Order ID: {order.id}</Badge>
                <Badge variant="secondary">Shop: {order.vendorType}</Badge>
              </div>
              <div className="divide-y rounded-lg border">
                {items.map((item) => (
                  <div key={item.id} className="space-y-2 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity || item.weight}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Avail</span>
                        <Switch
                          checked={item.available !== false}
                          onCheckedChange={(checked) =>
                            pushItems(
                              items.map((x) =>
                                x.id === item.id ? { ...x, available: checked } : x
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {item.brands?.length ? (
                        <Select
                          value={item.selectedBrand}
                          onValueChange={(val) =>
                            pushItems(
                              items.map((x) =>
                                x.id === item.id ? { ...x, selectedBrand: val } : x
                              )
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Brand" />
                          </SelectTrigger>
                          <SelectContent>
                            {item.brands.map((b) => (
                              <SelectItem key={b} value={b}>
                                {b}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div />
                      )}
                      <Input
                        type="number"
                        value={item.proposedPrice ?? item.basePrice}
                        onChange={(e) =>
                          pushItems(
                            items.map((x) =>
                              x.id === item.id
                                ? { ...x, proposedPrice: Number(e.target.value) }
                                : x
                            )
                          )
                        }
                      />
                      <div className="flex items-center justify-end">
                        <Badge variant="secondary">
                          ₹{item.proposedPrice ?? item.basePrice}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total</p>
                <div className="text-lg font-semibold">₹{total}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={accept}>Accept</Button>
                <Button variant="outline" onClick={reject}>
                  Reject
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Waiting for customer order…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Prep & arrival</CardTitle>
              <CardDescription>Lightweight demo map with live marker.</CardDescription>
          </div>
          <Badge variant="secondary">{progress}%</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="relative h-32 overflow-hidden rounded-lg border bg-gradient-to-br from-sky-50 via-slate-100 to-slate-200">
              <div className="absolute inset-3 rounded-lg border border-dashed border-slate-300" />
              <div className="absolute inset-6">
                <svg className="h-full w-full" viewBox="0 0 200 100" role="presentation">
                  <polyline
                    points="10,80 60,60 120,70 170,35"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="3"
                    strokeDasharray="6,6"
                  />
                </svg>
              </div>
              <div
                className="absolute h-4 w-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-400/50 transition-transform"
                style={{ transform: `translate(${10 + (progress / 100) * 160}px, 28px)` }}
              />
              <div className="absolute left-3 top-3 text-[11px] font-semibold text-slate-600">
                Demo map
              </div>
              <div className="absolute inset-x-4 bottom-3 flex items-center justify-between text-xs text-slate-700">
                <span>Customer ETA</span>
                <span>Shop</span>
              </div>
            </div>
          <p className="text-sm text-muted-foreground">
              Tap “Accept” to start movement; fast-forward on customer side updates ETA.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Handoff & payout</CardTitle>
            <CardDescription>
              Scan the customer QR, then wait for their confirmation.
            </CardDescription>
          </div>
          <Badge variant="outline">Demo only</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[280px_1fr]">
          <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
            <video
              ref={videoRef}
              className={cn(
                "h-56 w-full rounded-md bg-black/60 object-cover",
                scanning ? "opacity-100" : "opacity-60"
              )}
              muted
              autoPlay
              playsInline
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={startScan} disabled={!order}>
                {scanning ? "Scanning…" : "Scan QR"}
              </Button>
              <Button variant="outline" disabled={!order} onClick={() => handleManualCode(QR_VALUE)}>
                Simulate scan
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use back camera; hold 15–30 cm away.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border bg-white p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Manual code (paste if camera blocked)
              </p>
              <Input
                placeholder="Paste QR payload"
                value={manualPayload}
                onChange={(e) => setManualPayload(e.target.value)}
              />
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => handleManualCode(manualPayload)}
              >
                Validate
              </Button>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Demo QR value: {QR_VALUE}
              </p>
            </div>

            {viewStatus === "validated" && (
              <div className="rounded-md border bg-emerald-50 p-3 text-sm">
                Waiting for customer to confirm delivery…
              </div>
            )}
            {viewStatus === "completed" && (
              <div className="space-y-2 rounded-md border bg-emerald-50 p-3 text-sm">
                <p className="font-medium">Order completed</p>
                <p>Money transferred to your selected account.</p>
                <Button onClick={markPaid}>Acknowledge payout</Button>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Demo ledger</p>
              {ledger.length ? (
                <div className="divide-y rounded-md border">
                  {ledger.map((entry) => (
                    <div
                      key={entry.id + entry.ts}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{entry.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.ts).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant="secondary">₹{entry.amount}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Validate a QR to log a payout.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <ShopOptInForm />
    </main>
  );
}


