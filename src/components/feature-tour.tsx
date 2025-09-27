
"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CarFront,
  ShoppingCart,
  MapPin,
  Package,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface FeatureTourProps {
  open: boolean;
  onFinish: () => void;
}

const tourSteps = [
  {
    icon: CarFront,
    title: "Plan Your Route",
    description:
      "Start by telling us where you're going. We'll find the best shops right on your way.",
    image: "https://placehold.co/400x250.png",
    dataAiHint: "map navigation route",
  },
  {
    icon: ShoppingCart,
    title: "Pre-Order Your Items",
    description:
      "Browse items from various stores and add them to your cart. No more wandering down aisles!",
    image: "https://placehold.co/400x250.png",
    dataAiHint: "online shopping cart",
  },
  {
    icon: MapPin,
    title: "Live Order Tracking",
    description:
      "We'll give you a single, optimized route to all your stops. Track your order status in real-time as vendors prepare it.",
    image: "https://placehold.co/400x250.png",
    dataAiHint: "order tracking map",
  },
  {
    icon: Package,
    title: "Quick & Easy Pickup",
    description:
      "Arrive at the store, scan a QR code, and get your order instantly. No queues, no waiting!",
    image: "https://placehold.co/400x250.png",
    dataAiHint: "curbside pickup package",
  },
];

export function FeatureTour({ open, onFinish }: FeatureTourProps) {
  const [step, setStep] = React.useState(0);
  const currentStep = tourSteps[step];

  const handleNext = () => {
    if (step < tourSteps.length - 1) {
      setStep(step + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onFinish()}>
      <DialogContent className="sm:max-w-[425px] p-0 gap-0">
        <div className="relative h-48 w-full">
            <Image
            src={currentStep.image}
            alt={currentStep.title}
            layout="fill"
            objectFit="cover"
            className="rounded-t-lg"
            data-ai-hint={currentStep.dataAiHint}
            />
        </div>
        <DialogHeader className="p-6 text-center items-center">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 mb-2">
                <currentStep.icon className="h-6 w-6 text-primary" />
            </div>
          <DialogTitle className="text-2xl">{currentStep.title}</DialogTitle>
          <DialogDescription className="text-base">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center my-4 space-x-2">
          {tourSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setStep(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === step ? "w-6 bg-primary" : "bg-muted-foreground/20"
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        <DialogFooter className="p-6 flex-row justify-between sm:justify-between w-full">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={step === 0}
              className={step === 0 ? "opacity-0 pointer-events-none" : ""}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {step === tourSteps.length - 1 ? (
                <Button onClick={onFinish} className="bg-accent hover:bg-accent/80">
                    Let's Go!
                </Button>
            ) : (
                <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
