"use client";
import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { SideCar } from './SideCar';
import Link from 'next/link';
import { Apple, Pill, Pizza, Smartphone, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const HorizontalContainer = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waitlistRef = useRef<HTMLElement | null>(null);

  const childArray = React.Children.toArray(children);
  const sectionCount = Math.max(childArray.length, 1);
  const totalHeight = `${sectionCount * 100}dvh`;
  const totalWidth = `${sectionCount * 100}vw`;
  const endX = `-${(sectionCount - 1) * 100}%`;
  const [showEndNotice, setShowEndNotice] = useState(false);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Slow, eased feel: lower stiffness and higher damping for gentle accel/brake.
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 24, mass: 1.1 });

  // Flat horizontal translation.
  const x = useTransform(smoothProgress, [0, 1], ["0%", endX]);
  const cloudX = useTransform(smoothProgress, [0, 1], ["0%", "-35%"]);
  const roadX = useTransform(smoothProgress, [0, 1], ["0%", endX]);

  // Smoothly return user to the final (4th) page / waitlist section.
  const scrollToWaitlist = () => {
    if (!waitlistRef.current) {
      waitlistRef.current = document.getElementById('waitlist') as HTMLElement | null;
    }
    const el = waitlistRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Stop scrolling past the 4th page; show end notice and clamp position.
  useEffect(() => {
    const handle = () => {
      const el = containerRef.current;
      if (!el) return;
      const top = el.offsetTop;
      const end = top + el.offsetHeight - window.innerHeight;
      const atEnd = window.scrollY >= end - 12; // trigger just before hard stop (mobile friendly)
      if (window.scrollY > end) window.scrollTo({ top: end, behavior: 'auto' });
      setShowEndNotice(atEnd);
      if (atEnd) {
        scrollToWaitlist(); // bring user back to the final page immediately on trigger
      }
    };
    window.addEventListener('scroll', handle, { passive: true });
    // Run once so mobile users who start near the bottom still see the popup
    handle();
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return (
    <div ref={containerRef} className="relative" style={{ height: totalHeight }}>
      
      {/* Sticky viewport overlay */}
      <div className="absolute inset-0">
        <div className="sticky top-0 left-0 h-screen w-full overflow-hidden bg-gradient-to-b from-sky-100 to-white" style={{ height: '100dvh' }}>
          
          {/* Background Pattern Layer */}
          <motion.div style={{ x: cloudX }} className="absolute top-0 left-0 w-[200vw] h-full flex items-center justify-around opacity-20 pointer-events-none">
              <div className="absolute top-[10%] left-[5%]"><Apple className="w-24 h-24 text-red-400" /></div>
              <div className="absolute top-[20%] left-[15%]"><Pill className="w-16 h-16 text-blue-400" /></div>
              <div className="absolute top-[15%] left-[25%]"><Coffee className="w-20 h-20 text-amber-600" /></div>
              <div className="absolute top-[25%] left-[35%]"><Pizza className="w-28 h-28 text-orange-500" /></div>
              <div className="absolute top-[10%] left-[45%]"><Smartphone className="w-16 h-16 text-slate-600" /></div>
              
              <div className="absolute top-[18%] left-[55%]"><Apple className="w-20 h-20 text-green-500" /></div>
              <div className="absolute top-[12%] left-[65%]"><Pill className="w-16 h-16 text-purple-400" /></div>
              <div className="absolute top-[22%] left-[75%]"><Coffee className="w-24 h-24 text-amber-700" /></div>
              <div className="absolute top-[15%] left-[85%]"><Pizza className="w-24 h-24 text-orange-600" /></div>
              <div className="absolute top-[20%] left-[95%]"><Smartphone className="w-16 h-16 text-zinc-600" /></div>
          </motion.div>

          {/* Content Layer */}
          <motion.div 
              style={{ x, width: totalWidth }} 
              className="absolute top-0 left-0 h-full flex items-center will-change-transform"
          >
              {childArray}
          </motion.div>
          
          {/* Road Layer */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-[#333] border-t-4 border-gray-400 z-10 flex items-center overflow-hidden">
               <motion.div 
                  style={{ x: roadX, width: totalWidth }}
                  className="flex gap-32"
               >
                  {Array.from({ length: sectionCount * 6 }).map((_, i) => (
                      <div key={i} className="w-20 h-4 bg-white/30" />
                  ))}
               </motion.div>
          </div>
          
          {/* Car */}
          <div className="absolute bottom-20 left-[10%] z-20">
               <SideCar />
          </div>

        </div>
      </div>
      {showEndNotice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-6">
          <div className="max-w-sm w-full rounded-2xl bg-white shadow-2xl p-6 text-center space-y-3">
            <h3 className="text-2xl font-bold text-gray-900">A lot more to come!</h3>
            <p className="text-gray-600 text-sm">
              We’re adding more stops to your route soon. Stay tuned.
            </p>
            <div className="flex justify-center">
              <Button
                type="button"
                className="px-6"
                onClick={() => {
                  setShowEndNotice(false);
                  scrollToWaitlist(); // return to 4th page when clicking CTA
                }}
              >
                Sign Up
              </Button>
            </div>
            <p className="text-gray-500 text-xs">We’ll notify you when we’re live! 🚗</p>
          </div>
        </div>
      )}
    </div>
  );
};
