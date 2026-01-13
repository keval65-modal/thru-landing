"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface FormState {
  shopName: string;
  ownerName: string;
  city: string;
  phone: string;
  email: string;
  notes: string;
  whatsappOptIn: boolean;
}

export function ShopOptInForm() {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<FormState>({
    shopName: "",
    ownerName: "",
    city: "",
    phone: "",
    email: "",
    notes: "",
    whatsappOptIn: true,
  });

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);

    try {
      const res = await fetch("/api/demo-shop-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok !== false) {
        toast({
          title: "Saved",
          description: "We’ll ping you on WhatsApp when Thru opens.",
        });
        setForm({
          shopName: "",
          ownerName: "",
          city: "",
          phone: "",
          email: "",
          notes: "",
          whatsappOptIn: true,
        });
      } else {
        toast({
          title: "Couldn’t save",
          description: data?.message || "Please try again in a moment.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Network issue",
        description: "Check your connection and retry.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="md:sticky md:top-4">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Share your shop details</CardTitle>
          <CardDescription>
            We’ll reach out with WhatsApp updates when Thru goes live for registrations.
          </CardDescription>
        </div>
        <Button size="sm" variant="secondary" type="submit" form="shop-opt-in-form">
          {pending ? "Saving…" : "WhatsApp updates"}
        </Button>
      </CardHeader>
      <CardContent>
        <form id="shop-opt-in-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              placeholder="Shop name"
              value={form.shopName}
              onChange={(e) => updateField("shopName", e.target.value)}
            />
            <Input
              required
              placeholder="Owner name"
              value={form.ownerName}
              onChange={(e) => updateField("ownerName", e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              placeholder="City or locality"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
            <Input
              required
              type="tel"
              placeholder="Phone / WhatsApp number"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>
          <Input
            type="email"
            placeholder="Work email (optional)"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
          <Textarea
            placeholder="Anything specific we should know? (optional)"
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
          />
          <div className="flex items-center justify-between rounded-md border bg-muted/60 p-3">
            <div>
              <Label htmlFor="shop-wa-optin" className="font-medium">
                WhatsApp updates
              </Label>
              <p className="text-xs text-muted-foreground">
                Opt in to get the go-live date and your registration link.
              </p>
            </div>
            <Switch
              id="shop-wa-optin"
              checked={form.whatsappOptIn}
              onCheckedChange={(checked) => updateField("whatsappOptIn", checked)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Send me WhatsApp updates"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm((prev) => ({ ...prev, whatsappOptIn: true }))
              }
            >
              Keep updates on
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
