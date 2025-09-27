import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns a nice stock image URL from Unsplash Source based on a hint
// Example: getStockImageUrl('road trip planning', 600, 338)
export function getStockImageUrl(hint: string, width: number, height: number): string {
  const topic = encodeURIComponent(hint || 'lifestyle');
  return `https://source.unsplash.com/${width}x${height}/?${topic}`;
}

// Shimmer SVG for Image blur placeholder
export function shimmer(width: number, height: number): string {
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
      <linearGradient id="g">
        <stop stop-color="#f3f4f6" offset="20%"/>
        <stop stop-color="#e5e7eb" offset="50%"/>
        <stop stop-color="#f3f4f6" offset="70%"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="#f3f4f6" />
    <rect id="r" width="${width}" height="${height}" fill="url(#g)" />
    <animate xlink:href="#r" attributeName="x" from="-${width}" to="${width}" dur="1.2s" repeatCount="indefinite"  />
  </svg>`;
}

export function toBase64(str: string): string {
  if (typeof window === 'undefined') {
    return Buffer.from(str).toString('base64');
  }
  return window.btoa(str);
}
