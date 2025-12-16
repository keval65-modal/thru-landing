"use client";
import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useVelocity, useSpring, useTransform } from 'framer-motion';

export const SideCar = ({ className }: { className?: string }) => {
  // Enhanced physics animation:
  // 1. Detect scroll velocity to determine direction and speed.
  // 2. Tilt the car: Front rises (rotate negative) when moving forward (scrolling down).
  // 3. Back rises (rotate positive) when moving backward (scrolling up).

  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  
  // Smooth out the velocity for less jittery rotation
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });

  // Wheel rotation (keep as is, maybe adjust multiplier)
  const smoothScroll = useSpring(scrollY, { damping: 50, stiffness: 400 }); 
  const wheelRotate = useTransform(smoothScroll, [0, 5000], [0, 360 * 15]);

  // Car Body Tilt
  // Velocity Range is roughly -2000 to 2000 depending on scroll speed.
  // We want a max tilt of approx 3-5 degrees.
  // Forward (positive velocity) -> Front rises -> Negative Rotation
  const rawTilt = useTransform(smoothVelocity, [-2000, 2000], [3, -3]); 
  const smoothTilt = useSpring(rawTilt, { damping: 30, stiffness: 200 });

  // Suspension Bounce (Vertical) - Reacts to velocity 'bumps'
  // When velocity is high, sink slightly (downforce/speed) -> actually let's keep the idle bounce
  // effectively mixed with some velocity reaction.
  const velocityY = useTransform(smoothVelocity, [-2000, 2000], [0.5, -0.5]);
  const smoothVelocityY = useSpring(velocityY, { damping: 20, stiffness: 200 });

  return (
    // Responsive sizing: w-48 on mobile (60% size), w-80 on desktop
    <div className={`relative w-48 md:w-80 h-auto aspect-[300/120] ${className}`}>
        
        {/* Gradients */}
        <svg width="0" height="0">
          <defs>
            <linearGradient id="carBodyGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#F87171" /> {/* Lighter Red */}
              <stop offset="100%" stopColor="#DC2626" /> {/* Darker Red */}
            </linearGradient>
            <linearGradient id="windowGradient" x1="0" x2="0" y1="0" y2="1">
               <stop offset="0%" stopColor="#A5F3FC" stopOpacity="0.6" />
               <stop offset="100%" stopColor="#0891B2" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>

        {/* Car Body Group */}
        <motion.div
             // Idle Bounce + Tilt
             animate={{ y: [0, -2, 0] }}
             transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
             style={{ 
                rotate: smoothTilt,
                y: smoothVelocityY,
                transformOrigin: "center bottom" 
             }}
             className="w-full h-full will-change-transform"
        >
            <svg
                viewBox="0 0 300 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-2xl"
            >
                {/* Sleek Modern Coupe Design */}
                
                {/* Main Chassis */}
                <path
                    d="M10 80 L20 60 L60 50 L120 40 L190 40 L260 55 L290 65 L290 90 L275 95 L25 95 L10 80 Z"
                    fill="url(#carBodyGradient)"
                    stroke="#991B1B"
                    strokeWidth="1"
                />
                
                {/* Roof / Greenhouse - Lower, sleeker */}
                <path
                    d="M65 50 L100 25 L210 25 L245 55 L65 55 Z"
                    className="fill-zinc-800"
                />
                
                {/* Windows - Gradient */}
                <path
                    d="M105 30 L205 30 L235 50 L70 50 Z"
                    fill="url(#windowGradient)"
                />
                 {/* Window Pillars */}
                <path d="M155 30 L155 50" className="stroke-zinc-900 stroke-[3]" />

                {/* Side Body Contour Line */}
                <path d="M30 65 L270 65" className="stroke-white/20 stroke-[2]" />
                <path d="M30 65 L270 65" className="stroke-black/10 stroke-[1] transform translate-y-[1px]" />

                {/* Wheel Wells - Tighter fit */}
                 <path d="M45 95 A 32 32 0 0 1 109 95 Z" className="fill-[#222]" />
                 <path d="M210 95 A 32 32 0 0 1 274 95 Z" className="fill-[#222]" />

                {/* Door Handles - Sleek flush */}
                <rect x="120" y="62" width="20" height="4" className="fill-black/20" rx="1" />
                <rect x="180" y="62" width="20" height="4" className="fill-black/20" rx="1" />

                {/* Headlights - LED Strip style */}
                <path d="M280 68 L290 66 L290 74 L280 72 Z" className="fill-amber-300 drop-shadow-md" />
                
                {/* Tail lights - Modern Strip */}
                <path d="M10 65 L15 65 L15 75 L10 75 Z" className="fill-red-600 drop-shadow-md" />
                
                {/* Bumper details */}
                <path d="M10 85 L290 85" className="stroke-black/10 stroke-1" />

            </svg>
        </motion.div>

        {/* Wheels - Detailed Alloys */}
        {/* These need to move WITH the car body tilt/bounce if we want realism, 
            but for simple "suspension" usually wheels stay planted while body moves.
            However, our 'tilt' rotates the whole div. The wheels are children, so they will rotate with the body.
            This gives a "popping a wheelie" effect which is what's requested (front rises).
        */}

        {/* Rear Wheel */}
        <motion.div 
            className="absolute will-change-transform"
            style={{ 
                rotate: wheelRotate,
                top: '55%', 
                left: '16%',
                width: '19%', 
                height: 'auto',
                aspectRatio: '1/1'
            }}
        >
             <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                <circle cx="50" cy="50" r="48" className="fill-zinc-950" />
                <circle cx="50" cy="50" r="32" className="fill-zinc-400" />
                <circle cx="50" cy="50" r="12" className="fill-zinc-900" />
                {/* Sport Spokes */}
                <path d="M50 20 L55 50 L50 80 L45 50 Z" className="fill-zinc-600" />
                <path d="M80 50 L50 55 L20 50 L50 45 Z" className="fill-zinc-600" />
                <path d="M70 70 L52 52 L30 30" className="stroke-zinc-800 stroke-[4]" />
                <path d="M30 70 L48 52 L70 30" className="stroke-zinc-800 stroke-[4]" />
             </svg>
        </motion.div>

         {/* Front Wheel */}
        <motion.div 
            className="absolute will-change-transform"
            style={{ 
                rotate: wheelRotate,
                top: '55%', 
                left: '71%',
                width: '19%',
                height: 'auto',
                aspectRatio: '1/1'
            }}
        >
             <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                <circle cx="50" cy="50" r="48" className="fill-zinc-950" />
                <circle cx="50" cy="50" r="32" className="fill-zinc-400" />
                <circle cx="50" cy="50" r="12" className="fill-zinc-900" />
                {/* Sport Spokes */}
                <path d="M50 20 L55 50 L50 80 L45 50 Z" className="fill-zinc-600" />
                <path d="M80 50 L50 55 L20 50 L50 45 Z" className="fill-zinc-600" />
                <path d="M70 70 L52 52 L30 30" className="stroke-zinc-800 stroke-[4]" />
                <path d="M30 70 L48 52 L70 30" className="stroke-zinc-800 stroke-[4]" />
             </svg>
        </motion.div>
    </div>
  );
};
