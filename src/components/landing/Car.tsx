import React from 'react';

export const Car = ({ className }: { className?: string }) => {
  return (
    <div className={`relative w-12 h-20 ${className}`}>
      {/* Car Body Shadow/Glow */}
      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
      
      {/* Car SVG */}
      <svg
        viewBox="0 0 50 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-2xl"
      >
        {/* Chassis */}
        <path
          d="M10 15 C10 5, 40 5, 40 15 L45 80 C45 90, 5 90, 5 80 Z"
          className="fill-zinc-900 stroke-zinc-700"
          strokeWidth="1"
        />
        {/* Windshield */}
        <path
          d="M12 25 L38 25 L35 40 L15 40 Z"
          className="fill-zinc-800"
        />
        {/* Roof */}
        <path
          d="M15 40 L35 40 L35 65 L15 65 Z"
          className="fill-zinc-900"
        />
        {/* Rear Window */}
        <path
          d="M15 65 L35 65 L38 75 L12 75 Z"
          className="fill-zinc-800"
        />
        {/* Headlights */}
        <path
          d="M12 12 L8 8"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M38 12 L42 8"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Headlight Beams (Glow) */}
        <path
           d="M10 10 L-20 -40 L0 -50 Z"
           className="fill-primary/20"
        />
         <path
           d="M40 10 L70 -40 L50 -50 Z"
           className="fill-primary/20"
        />
        
        {/* Tail Lights */}
         <path
          d="M10 85 L15 85"
          className="stroke-red-500"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M35 85 L40 85"
          className="stroke-red-500"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
