"use client";
import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { SideCar } from './SideCar';
import { Cloud, Apple, Pill, Pizza, Smartphone, Coffee } from 'lucide-react';

export const HorizontalContainer = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track vertical scroll
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Since we are using Lenis for smooth scrolling, we don't need useSpring here as well.
  // Double smoothing causes "floaty" or "laggy" feeling.
  
  // Physics-based smoothing for the main horizontal translation
  // This helps removing the "micro-jitters" from pure scroll mapping
  const smoothProgress = useSpring(scrollYProgress, { damping: 50, stiffness: 400 });
  
  // Map vertical scroll (0 to 1) to horizontal translateX
  // Using smoothed progress for transform
  const x = useTransform(smoothProgress, [0, 1], ["0%", "-300%"]);
  
  // Parallax layers
  const cloudX = useTransform(smoothProgress, [0, 1], ["0%", "-50%"]); // Clouds move slower
  const roadX = useTransform(smoothProgress, [0, 1], ["0%", "-300%"]); // Road moves with content

  return (
    // Height determines how long we scroll vertically to get through the horizontal content
    // UPDATED: 135vh - Aggressively reduced to eliminate "space at the end". Fast, snappy drive.
    <div ref={containerRef} className="relative h-[135vh] md:h-[300vh]"> 
      
      {/* Sticky Viewport: use dvh to prevent mobile address bar jumps */}
      <div className="sticky top-0 left-0 h-screen md:h-screen w-full overflow-hidden bg-gradient-to-b from-sky-100 to-white" style={{ height: '100dvh' }}>
        
        {/* Background Pattern Layer - Items instead of Clouds */}
        <motion.div style={{ x: cloudX }} className="absolute top-0 left-0 w-[400vw] h-full flex items-center justify-around opacity-20 pointer-events-none">
             {/* Scattered background items */}
             <div className="absolute top-[10%] left-[5%]"><Apple className="w-24 h-24 text-red-400" /></div>
             <div className="absolute top-[20%] left-[15%]"><Pill className="w-16 h-16 text-blue-400" /></div>
             <div className="absolute top-[15%] left-[25%]"><Coffee className="w-20 h-20 text-amber-600" /></div>
             <div className="absolute top-[25%] left-[35%]"><Pizza className="w-28 h-28 text-orange-500" /></div>
             <div className="absolute top-[10%] left-[45%]"><Smartphone className="w-16 h-16 text-slate-600" /></div>
             
             {/* Repeat pattern for length */}
             <div className="absolute top-[18%] left-[55%]"><Apple className="w-20 h-20 text-green-500" /></div>
             <div className="absolute top-[12%] left-[65%]"><Pill className="w-16 h-16 text-purple-400" /></div>
             <div className="absolute top-[22%] left-[75%]"><Coffee className="w-24 h-24 text-amber-700" /></div>
             <div className="absolute top-[15%] left-[85%]"><Pizza className="w-24 h-24 text-orange-600" /></div>
             <div className="absolute top-[20%] left-[95%]"><Smartphone className="w-16 h-16 text-zinc-600" /></div>
        </motion.div>

        {/* Content Layer */}
        <motion.div 
            style={{ x }} 
            className="absolute top-0 left-0 h-full flex items-center w-[400vw] will-change-transform"
        >
            {children}
        </motion.div>
        
        {/* Road Layer - Foreground */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-[#333] border-t-4 border-gray-400 z-10 flex items-center overflow-hidden">
             {/* Road Striping */}
             <motion.div 
                style={{ x: roadX }}
                className="flex gap-40 w-[400vw]"
             >
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="w-20 h-4 bg-white/30" />
                ))}
            </motion.div>
        </div>
        
        {/* The Car - Stays Relative to Viewport (Driving Effect) */}
        {/* It stays in the "center-left" of the screen while everything else moves left */}
        <div className="absolute bottom-20 left-[10%] z-20">
             <SideCar />
        </div>

      </div>
    </div>
  );
};
