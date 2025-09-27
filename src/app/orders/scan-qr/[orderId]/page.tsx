
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, CameraOff, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ScanQrPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const orderId = params.orderId as string;
  const vendorId = searchParams.get("vendorId");

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);

  React.useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("MediaDevices API not supported.");
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Unsupported Browser",
          description: "Your browser does not support camera access.",
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCameraPermission(false);
        const errorName = (error as Error).name;
        let description = "Please enable camera permissions in your browser settings.";
        if (errorName === "NotAllowedError") {
          description = "Camera access was denied. Please enable it in your browser settings.";
        } else if (errorName === "NotFoundError") {
          description = "No camera found. Please ensure a camera is connected and enabled.";
        }
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: description,
        });
      }
    };

    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const handleScan = () => {
    setIsScanning(true);
    toast({
      title: "Scanning...",
      description: "Looking for a QR code. (Simulated)",
    });

    // Simulate successful scan
    setTimeout(() => {
      setIsScanning(false);
      const completionKey = vendorId ? `completed_order_${orderId}_vendor_${vendorId}` : `completed_order_${orderId}`;
      try {
        localStorage.setItem(completionKey, "true");
        localStorage.setItem('last_scanned_order_id', orderId); // To help trigger update on orders page
         if(vendorId) localStorage.setItem('last_scanned_vendor_id', vendorId);
        else localStorage.removeItem('last_scanned_vendor_id');


        toast({
          title: "Scan Successful!",
          description: `Order ${orderId}${vendorId ? ` (for ${vendorId})` : ''} marked as processed.`,
          variant: "default"
        });
        router.push("/orders");
      } catch (e) {
        console.error("Failed to write to localStorage:", e);
        toast({
          title: "Storage Error",
          description: "Could not save completion status. Please try again.",
          variant: "destructive",
        });
      }
    }, 2000);
  };
  
  const handleDownloadQR = () => {
    toast({
        title: "Download My QR Code",
        description: "This would allow the vendor to scan your order details. (Not implemented)",
    });
  };


  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center p-4 border-b sticky top-0 bg-background z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Scan QR Code</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        <p className="text-muted-foreground text-center">
          Scan the QR code provided by the vendor for order: <strong className="text-primary">{orderId}</strong>
          {vendorId && <> from vendor: <strong className="text-primary">{vendorId}</strong></>}
        </p>

        <div className="w-full max-w-md aspect-square bg-muted rounded-lg overflow-hidden shadow-lg relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          {hasCameraPermission === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
              <CameraOff className="h-16 w-16 mb-4" />
              <p className="text-lg font-semibold mb-2">Camera Access Problem</p>
              <p className="text-center text-sm">
                Could not access the camera. Please check permissions or ensure a camera is available.
              </p>
              <Button variant="outline" className="mt-4 text-foreground" onClick={() => window.location.reload()}>
                 <RefreshCw className="mr-2 h-4 w-4"/> Try Again
              </Button>
            </div>
          )}
           {hasCameraPermission === null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
              <p>Requesting camera permission...</p>
            </div>
          )}
          {isScanning && (
            <div className="absolute inset-0 border-4 border-primary rounded-lg animate-pulse"></div>
          )}
        </div>
        
        {hasCameraPermission === true && (
          <Button onClick={handleScan} disabled={isScanning || hasCameraPermission !== true} className="w-full max-w-md py-3 text-base">
            {isScanning ? "Scanning..." : "Simulate Scan & Complete"}
          </Button>
        )}
        
         <Button variant="outline" onClick={handleDownloadQR} className="w-full max-w-md py-3 text-base">
            <Download className="mr-2 h-5 w-5" />
            Download My QR Code
        </Button>
        <p className="text-xs text-muted-foreground text-center max-w-md">
            If you are the customer, ask the vendor to scan your QR code (downloadable above). If you are the vendor, use this screen to scan the customer's QR.
        </p>

      </main>
    </div>
  );
}
