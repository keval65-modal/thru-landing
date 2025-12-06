/**
 * Operating Hours Utility Functions
 */

import { OperatingHours, DayHours, ShopStatus } from '@/types/map-types';

/**
 * Get the current day name in lowercase
 */
function getCurrentDay(): keyof OperatingHours {
  const days: (keyof OperatingHours)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
  return days[new Date().getDay()];
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if a shop is currently open based on operating hours
 */
export function isShopOpen(operatingHours?: OperatingHours | null): boolean {
  if (!operatingHours) {
    // If no operating hours specified, assume open 24/7
    return true;
  }

  const currentDay = getCurrentDay();
  const todayHours = operatingHours[currentDay];

  if (!todayHours || todayHours.closed) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = timeToMinutes(todayHours.open);
  const closeMinutes = timeToMinutes(todayHours.close);

  // Handle cases where closing time is past midnight
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Get shop status with additional details
 */
export function getShopStatus(operatingHours?: OperatingHours | null): ShopStatus {
  if (!operatingHours) {
    return {
      isOpen: true,
      currentDayHours: undefined
    };
  }

  const currentDay = getCurrentDay();
  const todayHours = operatingHours[currentDay];
  const isOpen = isShopOpen(operatingHours);

  return {
    isOpen,
    currentDayHours: todayHours,
    nextOpenTime: isOpen ? undefined : getNextOpenTime(operatingHours)
  };
}

/**
 * Get the next opening time for a closed shop
 */
function getNextOpenTime(operatingHours: OperatingHours): string | undefined {
  const days: (keyof OperatingHours)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
  
  const currentDayIndex = new Date().getDay();
  
  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const day = days[dayIndex];
    const dayHours = operatingHours[day];
    
    if (dayHours && !dayHours.closed) {
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      return `${dayName} ${formatTime(dayHours.open)}`;
    }
  }
  
  return undefined;
}

/**
 * Format time from 24-hour to 12-hour format
 */
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format operating hours for display
 */
export function formatOperatingHours(dayHours?: DayHours): string {
  if (!dayHours || dayHours.closed) {
    return 'Closed';
  }
  return `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`;
}

/**
 * Get today's operating hours formatted
 */
export function getTodayHours(operatingHours?: OperatingHours | null): string {
  if (!operatingHours) {
    return 'Open 24/7';
  }

  const currentDay = getCurrentDay();
  const todayHours = operatingHours[currentDay];
  
  return formatOperatingHours(todayHours);
}
