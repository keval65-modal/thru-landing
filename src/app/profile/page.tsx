"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Bell, Shield, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function ProfileMainPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = React.useState<string>("");
  const [phone, setPhone] = React.useState<string>("");

  React.useEffect(() => {
    setDisplayName(auth?.currentUser?.displayName || "");
    setPhone(auth?.currentUser?.phoneNumber || "");
  }, []);

  const handleLogout = async () => {
    try {
      if (auth) {
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
      }
    } catch (_) {}
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="p-4 md:p-6 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">My Profile</h1>
      </div>

      <div className="px-6">
        <div className="flex items-center gap-4">
          <Image src="https://placehold.co/80x80.png" alt="User avatar" width={80} height={80} className="rounded-full" />
          <div>
            <p className="text-lg font-semibold">{displayName || "Your Name"}</p>
            <p className="text-sm text-muted-foreground">{phone || "Add phone"}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Link href="/profile/personal-information" className="flex items-center justify-between p-4 hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Image src="https://placehold.co/32x32.png" alt="pi" width={24} height={24} className="rounded" />
                <div>
                  <p className="text-sm font-medium">Personal Information</p>
                  <p className="text-xs text-muted-foreground">Edit your name, email & username</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Notifications</p>
                  <p className="text-xs text-muted-foreground">Get new updates</p>
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Privacy Policy</p>
                </div>
              </div>
            </div>
            <Separator />
            <button onClick={handleLogout} className="w-full text-left p-4 hover:bg-muted/50 flex items-center gap-3">
              <LogOut className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">Log out</span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



