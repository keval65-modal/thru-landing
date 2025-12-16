"use client";
import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useVelocity, useSpring, useTransform } from 'framer-motion';

export const SideCar = ({ className }: { className?: string }) => {
  // Enhanced physics animation:
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  
  // Smooth out the velocity for less jittery rotation
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });

  // Wheel rotation
  const smoothScroll = useSpring(scrollY, { damping: 50, stiffness: 400 }); 
  const wheelRotate = useTransform(smoothScroll, [0, 5000], [0, 360 * 15]);

  // Car Body Tilt
  // UPDATED: Reduced sensitivity to [-4, 4] degrees to prevent tire collision
  const rawTilt = useTransform(smoothVelocity, [-100, 100], [5, -5]); 
  const smoothTilt = useSpring(rawTilt, { damping: 20, stiffness: 150 });

  // Suspension Bounce (Vertical)
  const velocityY = useTransform(smoothVelocity, [-400, 400], [1, -1]);
  const smoothVelocityY = useSpring(velocityY, { damping: 20, stiffness: 200 });

  return (
    // Responsive sizing: w-48 on mobile (60% size), w-80 on desktop
    <div className={`relative w-48 md:w-80 h-auto aspect-[300/120] ${className}`}>
        
        {/* Gradients */}
        <svg width="0" height="0">
          <defs>
            <linearGradient id="carBodyGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" /> {/* Red */}
              <stop offset="100%" stopColor="#B91C1C" /> {/* Dark Red */}
            </linearGradient>
            <linearGradient id="windowGradient" x1="0" x2="0" y1="0" y2="1">
               <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.9" />
               <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.6" />
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Car Body Group */}
        <motion.div
             // Idle Bounce Animation - "Car is On"
             animate={{ y: [0, -2, 0] }}
             transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} // Faster bobbing for engine idle
             style={{ 
                rotate: smoothTilt,
                y: smoothVelocityY,
                transformOrigin: "center 80%" // Pivot closer to wheels to reduce clipping
             }}
             className="w-full h-full will-change-transform"
        >
            <svg
                viewBox="0 0 300 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-xl"
            >
                {/* IMPROVED CAR MODEL: More curved, modern hatchback/SUV crossover style */}
                
                {/* Main Body */}
                <path
                    d="M10 85 L25 55 L70 45 L130 35 L220 35 L270 55 L290 65 L290 90 L275 95 L25 95 L10 85 Z"
                    fill="url(#carBodyGradient)"
                    stroke="#7F1D1D"
                    strokeWidth="1"
                />
                
                {/* Roof / Greenhouse */}
                <path
                    d="M75 45 L110 20 L200 20 L235 50 L75 45 Z"
                    className="fill-slate-800"
                />
                
                {/* Windows */}
                <path
                    d="M115 25 L195 25 L225 45 L80 45 Z"
                    fill="url(#windowGradient)"
                />
                <path d="M155 25 L155 45" className="stroke-slate-900 stroke-[4]" />

                {/* Side Accents */}
                <path d="M25 70 L275 60" className="stroke-white/20 stroke-[3]" />

                {/* Wheel Wells - Darker */}
                 <path d="M45 95 A 34 34 0 0 1 113 95 Z" className="fill-[#1a1a1a]" />
                 <path d="M206 95 A 34 34 0 0 1 274 95 Z" className="fill-[#1a1a1a]" />

                {/* Headlights */}
                <path d="M275 60 L290 62 L285 70 L270 65 Z" className="fill-yellow-200" filter="url(#glow)" />
                
                {/* Tail lights */}
                <path d="M10 60 L20 62 L20 70 L10 68 Z" className="fill-red-500" filter="url(#glow)" />

            </svg>
        </motion.div>

        {/* Wheels - Static relative to container, rotating internally */}
        {/* Rear Wheel */}
        <motion.div 
            className="absolute will-change-transform"
            style={{ 
                rotate: wheelRotate,
                top: '55%', 
                left: '16.5%', // Adjusted for new body
                width: '19%', 
                height: 'auto',
                aspectRatio: '1/1'
            }}
        >
             <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                <circle cx="50" cy="50" r="46" className="fill-zinc-950" />
                <circle cx="50" cy="50" r="30" className="fill-zinc-500" />
                <circle cx="50" cy="50" r="10" className="fill-zinc-900" />
                <path d="M50 10 L55 50 L50 90 L45 50 Z" className="fill-zinc-300" />
                <path d="M90 50 L50 55 L10 50 L50 45 Z" className="fill-zinc-300" />
             </svg>
        </motion.div>

         {/* Front Wheel */}
        <motion.div 
            className="absolute will-change-transform"
            style={{ 
                rotate: wheelRotate,
                top: '55%', 
                left: '70%', // Adjusted for new body
                width: '19%',
                height: 'auto',
                aspectRatio: '1/1'
            }}
        >
             <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                <circle cx="50" cy="50" r="46" className="fill-zinc-950" />
                <circle cx="50" cy="50" r="30" className="fill-zinc-500" />
                <circle cx="50" cy="50" r="10" className="fill-zinc-900" />
                <path d="M50 10 L55 50 L50 90 L45 50 Z" className="fill-zinc-300" />
                <path d="M90 50 L50 55 L10 50 L50 45 Z" className="fill-zinc-300" />
             </svg>
        </motion.div>
    </div>
  );
};
