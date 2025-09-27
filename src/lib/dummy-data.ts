// Dummy vendor data for development and testing
export interface Vendor {
  id: string;
  name: string;
  shopName?: string;
  type: string;
  imageUrl?: string;
  dataAiHint?: string;
  categories?: string[];
  address?: string;
  simulatedDetourKm?: number;
  latitude?: number;
  longitude?: number;
  isActiveOnThru?: boolean;
}

// Mock vendor data removed - using only Firebase vendors

