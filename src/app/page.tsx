
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CarFront, ShoppingCart, MapPin, Package, ArrowRight, GitFork } from 'lucide-react';

export default function LandingPage() {

  const features = [
    {
      icon: <GitFork className="h-8 w-8 text-primary" />,
      title: 'Plan Your Route First',
      description: 'Simply enter your start and destination. Thru finds all the stores you need right along your path.',
      dataAiHint: 'navigation route map',
    },
    {
      icon: <ShoppingCart className="h-8 w-8 text-primary" />,
      title: 'Pre-Order Everything',
      description: 'Browse from groceries, medical supplies, takeout, and more. Add items to your cart from multiple stores.',
      dataAiHint: 'online shopping cart',
    },
    {
      icon: <MapPin className="h-8 w-8 text-primary" />,
      title: 'Get One Optimized Route',
      description: 'No more juggling multiple trips. We combine all your stops into a single, efficient route with live tracking.',
      dataAiHint: 'order tracking map',
    },
    {
      icon: <Package className="h-8 w-8 text-primary" />,
      title: 'Instant Curbside Pickup',
      description: 'Just drive up, scan a QR code, and get your orders. No waiting in lines, ever.',
      dataAiHint: 'curbside pickup package',
    },
  ];

  const howItWorksSteps = [
    { number: '1', title: 'Set Your A to B', description: 'Enter your start and end locations for the day.' },
    { number: '2', title: 'Add to Cart', description: 'Select items you need from any available store.' },
    { number: '3', title: 'Confirm & Pay', description: 'Review your optimized route and pay for all items at once.' },
    { number: '4', title: 'Drive & Pick Up', description: 'Follow the route and enjoy lightning-fast curbside pickups.' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex items-center">
            <CarFront className="h-6 w-6 text-primary mr-2" />
            <span className="font-bold text-lg">Thru</span>
          </div>
          <nav className="flex flex-1 items-center space-x-4 justify-end">
            <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
                <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 text-center">
          <div
              aria-hidden="true"
              className="absolute inset-0 top-0 z-0 h-full w-full bg-background bg-dot-black/[0.2] dark:bg-black dark:bg-dot-white/[0.2]"
          >
             <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
          </div>

          <div className="container relative z-10">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Turn your commute into a <span className="text-primary">drive-thru</span>.
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
              Pre-order everything you need—from groceries to takeout—and pick it all up from the curbside without leaving your route. No lines, no waiting, no wasted time.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild className="text-base py-6 px-8">
                <Link href="/signup">Get Started <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24 bg-muted">
            <div className="container">
                <div className="text-center">
                    <h2 className="text-3xl font-bold md:text-4xl">How It Works</h2>
                    <p className="mt-4 max-w-xl mx-auto text-muted-foreground">Four simple steps to reclaim your time.</p>
                </div>
                <div className="mt-12 grid gap-8 md:grid-cols-4">
                    {howItWorksSteps.map((step) => (
                        <div key={step.number} className="text-center">
                            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-primary text-primary-foreground rounded-full text-xl font-bold">
                                {step.number}
                            </div>
                            <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                            <p className="mt-1 text-muted-foreground">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>


        {/* Features Section */}
        <section id="features" className="py-16 md:py-24">
          <div className="container">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl">Your errands, streamlined.</h2>
              <p className="mt-4 max-w-xl mx-auto text-muted-foreground">Thru is more than an app; it's a new way to manage your day.</p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="p-6 rounded-lg border bg-card">
                  {feature.icon}
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary/90 text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Ready to Stop Waiting?</h2>
            <p className="mt-4 max-w-xl mx-auto">Sign up for Thru today and experience a smarter way to shop.</p>
            <div className="mt-8">
              <Button size="lg" variant="secondary" asChild className="text-base py-6 px-8">
                <Link href="/signup">Create Your Free Account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-8 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Thru. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">Terms</Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
