
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ListOrdered, User, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/home', label: 'Home', icon: HomeIcon },
  { href: '/orders', label: 'Orders', icon: ListOrdered },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
                           (item.href === "/home" && pathname === "/") ||
                           (item.href === "/profile" && pathname.startsWith("/profile")) ||
                           (item.label === "Orders" && pathname.startsWith("/order-tracking")); // Make orders active during tracking
          return (
            <Link key={item.label} href={item.href} legacyBehavior>
              <a
                className={cn(
                  "flex flex-col items-center justify-center space-y-1 rounded-md p-2 text-sm font-medium transition-colors w-1/3",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary/80"
                )}
              >
                <item.icon className={cn("h-6 w-6", isActive ? "text-primary" : "")} />
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 h-0.5 w-12 bg-primary rounded-t-full"></div>
                )}
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

    