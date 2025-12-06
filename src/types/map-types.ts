/**
 * Map View Type Definitions
 */

export enum ShopCategory {
  CAFE = 'cafe',
  RESTAURANT = 'restaurant',
  MEDICAL = 'medical',
  GROCERY = 'grocery',
  OTHER = 'other'
}

export interface DayHours {
  open: string;  // Format: "HH:MM" (24-hour)
  close: string; // Format: "HH:MM" (24-hour)
  closed: boolean;
}

export interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface ShopMarkerData {
  id: string;
  name: string;
  category: ShopCategory;
  address?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  operatingHours?: OperatingHours;
  isOpen: boolean;
  phone?: string;
  email?: string;
  cuisine?: string;
  images?: string[];
}

export interface ShopStatus {
  isOpen: boolean;
  nextOpenTime?: string;
  currentDayHours?: DayHours;
}

export interface CategoryFilter {
  category: ShopCategory;
  label: string;
  icon: string;
  color: string;
  activeColor: string;
}
