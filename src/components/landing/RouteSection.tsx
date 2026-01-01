"use client";
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { GitFork, Coffee, ShoppingBag } from 'lucide-react';

export const RouteSection = () => {
    // We can track the progress of this specific section being in view, OR rely on the global scroll.
    // Since the whole page is driven by a single mapped scroll, we can just animate the bar to fill constantly 
    // or fill as this section passes.
    // Let's make it fill from 0 to 100% as the user scrolls through the "Plan" phase.
    
    // Simpler hack: An infinite "loading" bar? User asked "make the bar complete as the car moves forward".
    // This implies a direct link to global scroll.
    // But since this component is inside the horizontal container, we don't have easy access to the exact global scroll value
    // without context. 
    // ALTERNATIVE: Use `useScroll` on `document`?
    // Let's try constant animation that loops, which is "alive".
    // User said: "make the bar complete as the car moves forward in sync".
    // This implies 1-to-1 mapping.
    
    // Let's grab window scroll.
    const { scrollYProgress } = useScroll();
    // With height=250vh and 4 sections:
    // Section 1: 0 - 0.25
    // Section 2 (Plan): 0.25 - 0.55
    // Section 3: 0.55 - 0.85
    // Section 4: 0.85 - 1.0
    const progressWidth = useTransform(scrollYProgress, [0.25, 0.55], ["0%", "100%"]);

    return (
        <div className="w-screen h-full flex-shrink-0 flex items-center justify-center px-6 md:px-12 bg-white/50 border-r border-dashed border-gray-200">
             <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center max-w-6xl w-full">
                <div className="order-2 md:order-1 relative flex justify-center">
                    {/* Visual: Straight Route with Stops */}
                    <div className="bg-white p-5 md:p-8 rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md">
                        <div className="flex justify-between text-[11px] md:text-xs font-bold text-gray-400 mb-5 md:mb-6 uppercase tracking-wider">
                             <span>Office</span>
                             <span>Home</span>
                         </div>
                        <div className="relative flex items-center justify-between h-12">
                             {/* The Route Path (Background) */}
                             <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-100 rounded-full -translate-y-1/2 overflow-hidden">
                                  {/* The Progress Bar (Foreground) */}
                                  <motion.div 
                                    style={{ width: progressWidth }}
                                    className="h-full bg-blue-500"
                                  />
                             </div>
                             
                             {/* Start Point (Office) */}
                             <div className="relative z-10 w-4 h-4 rounded-full bg-black border-4 border-white shadow-sm"></div>

                             {/* Stop 1 */}
                             <div className="relative z-10 flex flex-col items-center top-8">
                                 <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border-4 border-white shadow-md text-amber-600 mb-1">
                                    <Coffee className="w-4 h-4" />
                                 </div>
                                 <span className="text-xs font-semibold text-gray-600">Cafe</span>
                             </div>

                             {/* Stop 2 */}
                              <div className="relative z-10 flex flex-col items-center -top-8">
                                 <span className="text-xs font-semibold text-gray-600 mb-1">Market</span>
                                 <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-white shadow-md text-emerald-600">
                                    <ShoppingBag className="w-4 h-4" />
                                 </div>
                             </div>

                             {/* End Point (Home) */}
                              <div className="relative z-10 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm"></div>
                         </div>
                    </div>
                </div>
                <div className="order-1 md:order-2 px-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-6 shadow-sm">
                        <GitFork className="w-6 h-6" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4 text-gray-900">One Intelligent Route.</h2>
                    <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-lg">
                        Input your commute. We calculate the most efficient path and suggest the best stops with <span className="text-primary font-semibold">minimum detours</span>.
                    </p>
                </div>
             </div>
        </div>
    );
}
