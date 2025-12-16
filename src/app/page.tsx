"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CarFront, Store, Package, ShoppingBag, Coffee, Utensils, Pill, Gift, Croissant } from 'lucide-react';
import { HorizontalContainer } from '@/components/landing/HorizontalContainer';
import { RouteSection } from '@/components/landing/RouteSection';
import { ShopFronts } from '@/components/landing/ShopFronts';

export default function LandingPage() {
  return (
    <div className="bg-white text-gray-900 font-sans">
      
      <header className="fixed top-0 z-50 w-full px-6 py-4 flex justify-between items-center bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
                <CarFront className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-xl tracking-tight text-primary">Thru</span>
          </div>
          <nav className="flex gap-3 items-center">
             <Button variant="ghost" asChild className="hidden md:flex text-gray-600 hover:text-primary">
                 <Link href="/vendor-signup">Partner with Us</Link>
             </Button>
               <Button variant="outline" asChild className="border-gray-200">
                 <Link href="/login">Login</Link>
               </Button>
               <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30">
                 <Link href="/signup">Sign Up</Link>
               </Button>
          </nav>
      </header>

      <HorizontalContainer>
        
        {/* Section 1: Hero */}
        <div className="w-screen h-full flex-shrink-0 flex flex-col justify-center px-6 md:px-24 relative overflow-hidden">
            {/* Content Group - Moved UP for breathing space */}
            <div className="relative z-10 max-w-2xl -mt-20 md:-mt-32 pointer-events-none">
                 <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 md:mb-6 leading-tight">
                    Drive Thru <br />
                    <span className="text-primary">Life.</span>
                 </h1>
                 <p className="text-base md:text-xl text-gray-600 mb-6 md:mb-8 max-w-[280px] md:max-w-lg leading-relaxed">
                    The only app that syncs your errands with your route. Order coffee, groceries, and takeout for instant curbside pickup.
                 </p>
                 <div className="flex gap-4 items-center pointer-events-auto">
                    <Button size="lg" asChild className="h-12 md:h-14 px-6 md:px-8 text-base md:text-lg rounded-full bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-transform hover:scale-105">
                        <Link href="/signup">Shop on the Go</Link>
                    </Button>
                    <span className="text-sm font-medium text-gray-400 animate-pulse hidden md:inline-block">
                        Scroll Down to Drive →
                    </span>
                 </div>
            </div>
            
            {/* Actual Shops Background */}
            <ShopFronts />
        </div>

        {/* Section 2: Plan (Route) */}
        <RouteSection />

        {/* Section 3: Shop Grid */}
        <div className="w-screen h-full flex-shrink-0 flex items-center justify-center px-6 md:px-12 bg-gray-50/50">
             <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-center max-w-7xl w-full">
                <div className="max-w-md text-center md:text-left">
                     <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4 md:mb-6 shadow-sm mx-auto md:mx-0">
                        <Store className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-gray-900">Your Daily Marketplace.</h2>
                    <p className="text-sm md:text-lg text-gray-600 mb-6 md:mb-8 max-w-xs mx-auto md:mx-0">
                        Support local businesses while saving time. Grab your morning brew, tonight's dinner elements, or pharmacy essentials.
                    </p>
                    <Button variant="outline" asChild className="rounded-full px-6 text-sm md:text-base">
                        <Link href="/login">Explore All Shops</Link>
                    </Button>
                </div>
                
                {/* Visual: Elegant Grid Layout with Indian Brand Names */}
                {/* Mobile: 2 columns, fewer items visible? Or smaller grid. Let's do 2 columns. */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 scale-90 md:scale-100 origin-center">
                    {/* Column 1 */}
                    <div className="space-y-3 md:space-y-6 md:mt-8">
                        {/* Card 1 */}
                         <div className="h-40 md:h-56 bg-white rounded-2xl border border-gray-100 shadow-xl flex flex-col items-center justify-center p-4 hover:-translate-y-2 transition-transform duration-300 group">
                              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-amber-50 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-amber-100 transition-colors">
                                <Coffee className="w-5 h-5 md:w-7 md:h-7 text-amber-500" />
                              </div>
                              <span className="font-bold text-gray-800 text-sm md:text-base">Cafe</span>
                              <span className="text-[10px] md:text-xs text-gray-400 mt-1">Daily Roast</span>
                         </div>
                         {/* Card 4 - Hidden on very small screens? No, 2 cols is fine */}
                         <div className="h-40 md:h-56 bg-white rounded-2xl border border-gray-100 shadow-xl flex flex-col items-center justify-center p-4 hover:-translate-y-2 transition-transform duration-300 group">
                               <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-red-50 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-red-100 transition-colors">
                                  <Pill className="w-5 h-5 md:w-7 md:h-7 text-red-500" />
                               </div>
                              <span className="font-bold text-gray-800 text-sm md:text-base">Pharmacy</span>
                              <span className="text-[10px] md:text-xs text-gray-400 mt-1">HealthPlus</span>
                         </div>
                    </div>

                    {/* Column 2 - Offset */}
                     <div className="space-y-3 md:space-y-6 transform translate-y-4 md:translate-y-0">
                         {/* Card 2 */}
                         <div className="h-40 md:h-56 bg-white rounded-2xl border border-gray-100 shadow-xl flex flex-col items-center justify-center p-4 hover:-translate-y-2 transition-transform duration-300 group">
                              <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-emerald-100 transition-colors">
                                 <ShoppingBag className="w-5 h-5 md:w-7 md:h-7 text-emerald-500" />
                              </div>
                              <span className="font-bold text-gray-800 text-sm md:text-base">Groceries</span>
                              <span className="text-[10px] md:text-xs text-gray-400 mt-1">Fresh Choice</span>
                         </div>
                         {/* Card 5 */}
                         <div className="h-40 md:h-56 bg-white rounded-2xl border border-gray-100 shadow-xl flex flex-col items-center justify-center p-4 hover:-translate-y-2 transition-transform duration-300 group">
                               <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-purple-50 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-purple-100 transition-colors">
                                  <Gift className="w-5 h-5 md:w-7 md:h-7 text-purple-500" />
                               </div>
                              <span className="font-bold text-gray-800 text-sm md:text-base">Gifts</span>
                              <span className="text-[10px] md:text-xs text-gray-400 mt-1">The Gift Studio</span>
                         </div>
                    </div>

                    {/* Column 3 - Hidden on mobile, shown on md+ */}
                     <div className="space-y-6 mt-12 hidden md:block">
                         {/* Card 3 */}
                         <div className="h-56 bg-white rounded-2xl border border-gray-100 shadow-xl flex flex-col items-center justify-center p-4 hover:-translate-y-2 transition-transform duration-300 group">
                               <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
                                  <Croissant className="w-7 h-7 text-orange-500" />
                               </div>
                              <span className="font-bold text-gray-800">Bakery</span>
                              <span className="text-xs text-gray-400 mt-1">Oven Fresh</span>
                         </div>
                          {/* Card 6 */}
                         <div className="h-56 bg-white rounded-2xl border border-gray-100 shadow-xl flex flex-col items-center justify-center p-4 hover:-translate-y-2 transition-transform duration-300 group">
                               <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                                  <Utensils className="w-7 h-7 text-blue-500" />
                               </div>
                              <span className="font-bold text-gray-800">Dining</span>
                              <span className="text-xs text-gray-400 mt-1">Saffron Diner</span>
                         </div>
                    </div>

                </div>
             </div>
        </div>

        {/* Section 4: Arrive */}
        <div className="w-screen h-full flex-shrink-0 flex items-center justify-center px-6 md:px-12">
            <div className="text-center max-w-4xl w-full flex flex-col h-full justify-center">
                <div className="flex-1 flex flex-col justify-center items-center">
                    {/* Simplified Icon, No bouncing/dancing elements */}
                    <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-full text-primary mb-6 md:mb-8">
                        <Package className="w-8 h-8 md:w-10 md:h-10" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black mb-4 md:mb-6 text-gray-900">Ready to Drive?</h2>
                    <p className="text-base md:text-xl text-gray-600 mb-8 md:mb-10 max-w-2xl px-4">
                        Join the thousands of commuters reclaiming their time with Thru.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 w-full max-w-md">
                         <Button size="lg" asChild className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg rounded-full bg-primary hover:bg-primary/90 w-full sm:w-auto shadow-lg shadow-primary/20">
                            <Link href="/signup">Get Started for Free</Link>
                        </Button>
                         <Button size="lg" variant="outline" asChild className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg rounded-full border-gray-200 text-gray-600 hover:bg-gray-50 w-full sm:w-auto">
                            <Link href="/login">Login</Link>
                        </Button>
                    </div>
                </div>

                {/* Compact Footer */}
                <div className="py-6 border-t border-gray-100 w-full flex flex-col md:flex-row justify-between text-xs md:text-sm text-gray-400 mt-auto items-center gap-4 md:gap-0">
                    <span>&copy; {new Date().getFullYear()} Thru Inc.</span>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
                        <Link href="/vendor-signup" className="hover:text-primary transition-colors">Vendors</Link>
                    </div>
                </div>
            </div>
        </div>

      </HorizontalContainer>
    </div>
  );
}