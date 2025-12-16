"use client";
import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useAnimationFrame } from 'framer-motion';
import { Car } from './Car';

export const RoadMap = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHeight, setSvgHeight] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);
  const [svgWidth, setSvgWidth] = useState(0);

  // Measure container and window
  useEffect(() => {
    const updateDims = () => {
         if (containerRef.current) {
            setSvgHeight(containerRef.current.scrollHeight);
            setSvgWidth(containerRef.current.clientWidth);
        }
        setWindowHeight(window.innerHeight);
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  const { scrollY } = useScroll();
  
  // Motion values for Car transparency/position
  const carX = useMotionValue(50); // Percent
  const carRotate = useMotionValue(0);

  // SHARED MATH FUNCTION
  // Returns X (0-100) for a given Y (0-totalHeight)
  const getRoadX = (y: number, totalH: number) => {
      if (totalH === 0) return 50;
      const progress = y / totalH;
      
      // Amplitude: 25% of width (results in 25-75 range)
      const amplitude = 25; 
      const center = 50;
      
      // Frequency: 5 full waves over the total height
      const cycles = 5;
      const radian = progress * Math.PI * 2 * cycles;
      
      // -sin to start going Left (matches visual expectation of reading flow sometimes, or just arbitrary)
      return center + Math.sin(radian) * -amplitude;
  };
  
  // Get Slope for rotation
  const getRoadSlope = (y: number, totalH: number) => {
       if (totalH === 0) return 0;
       const progress = y / totalH;
       const amplitude = 25; // In X-percent units
       const cycles = 5;
       
       // Derivative of sin(k*y) is k*cos(k*y).
       // We need dx/dy (change in X percent per change in Y pixels).
       const k = (Math.PI * 2 * cycles) / totalH; 
       // dx/dy = -amplitude * k * cos(k*y)
       // This gives percent change per pixel.
       
       // To get degrees, we need atan(dx/dy).
       // However, 'dx' is in percent. We need pixels.
       // dx_px = dx_percent * (width/100).
       // dx_px/dy_px = (dx/dy) * (width/100).
       
       const deriv = -amplitude * k * Math.cos(progress * Math.PI * 2 * cycles);
       const pixelSlope = deriv * (svgWidth / 100);
       
       // atan returns radians. Convert to deg.
       return Math.atan(pixelSlope) * (180 / Math.PI);
  };

  // Generate SVG Path
  // We use many small steps to approximation the Sine wave perfectly with Line segments
  const generatePath = () => {
      if(svgHeight === 0) return "";
      const steps = 200; // Resolution
      let d = `M 50 0`;
      for(let i=0; i<=steps; i++) {
          const y = (i / steps) * svgHeight;
          const x = getRoadX(y, svgHeight);
          d += ` L ${x} ${y}`;
      }
      return d;
  };
  
  // Animation Loop to update Car Position based on current Scroll
  useAnimationFrame(() => {
     const currentScroll = scrollY.get();
     
     // Position Car at 50% of screen height (or wherever you want it fixed visually)
     // BUT: It must be relative to the ROAD.
     // Road Y at Screen Center = CurrentScroll + WindowHeight/2
     const carYOnRoad = currentScroll + (windowHeight * 0.5);
     
     // Calculate X at this Y
     const x = getRoadX(carYOnRoad, svgHeight);
     const rot = getRoadSlope(carYOnRoad, svgHeight);
     
     carX.set(x);
     carRotate.set(rot);
  });

  return (
    <div ref={containerRef} className="relative w-full min-h-[400vh] bg-[#050505] overflow-hidden">
      
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#ffffff11_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
      
      {/* SVG Layer */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
         <svg 
            className="w-full h-full" 
            viewBox={`0 0 100 ${svgHeight}`} 
            preserveAspectRatio="none"
         >
            {/* Glow */}
            <motion.path
                d={generatePath()}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="6"
                strokeOpacity="0.2"
                vectorEffect="non-scaling-stroke" 
                className="blur-md"
            />
             {/* Surface */}
            <motion.path
                d={generatePath()}
                fill="none"
                stroke="#1f2937"
                strokeWidth="20" // Thick road
                vectorEffect="non-scaling-stroke"
            />
             {/* Center Line */}
            <motion.path
                d={generatePath()}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
                strokeDasharray="10 20"
                vectorEffect="non-scaling-stroke"
            />
         </svg>
      </div>

      {/* The Car - FIXED to viewport, animated properties */}
      <motion.div
        className="fixed top-1/2 left-0 z-20 pointer-events-none -mt-10 -ml-6"
        style={{
            left: useTransform(carX, (val) => `${val}%`),
            rotate: carRotate
        }}
      >
        <Car />
      </motion.div>

      {/* Content Layer */}
      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
      </div>

    </div>
  );
};
