"use client";
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface FeatureStopProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  children?: React.ReactNode;
}

export const FeatureStop = ({ title, description, icon, align = 'left', children }: FeatureStopProps) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0.1, 0.4, 0.6, 0.9], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0.1, 0.4], [50, 0]);
  
  const alignmentClasses = {
    left: "md:text-left md:items-start md:mr-auto",
    right: "md:text-right md:items-end md:ml-auto",
    center: "text-center items-center mx-auto"
  };

  return (
    <motion.div 
      ref={ref}
      style={{ opacity, y }}
      className={`relative z-10 max-w-lg p-6 my-20 bg-background/80 backdrop-blur-md border border-border/50 rounded-xl shadow-2xl flex flex-col gap-4 ${alignmentClasses[align]}`}
    >
      {icon && <div className="p-3 bg-primary/10 rounded-lg w-fit">{icon}</div>}
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-foreground">{title}</h3>
        <p className="mt-2 text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {children}
    </motion.div>
  );
};
