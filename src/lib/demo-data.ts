export type DemoVendorType = "grocery" | "medical" | "bakery" | "restaurant";

export interface DemoCatalogItem {
  id: string;
  name: string;
  quantity?: string;
  weight?: string;
  basePrice: number;
  brands?: string[];
  suggestedPacks?: string[];
  notes?: string;
}

export interface DemoOrderLine extends DemoCatalogItem {
  available?: boolean;
  selectedBrand?: string;
  proposedPrice?: number;
  proposedPack?: string;
  vendorNote?: string;
}

export interface DemoOrder {
  id: string;
  vendorType: DemoVendorType;
  arrivalMinutes: number;
  items: DemoOrderLine[];
  amount: number;
  sessionCode: string;
}

export const vendorTypeOptions: {
  value: DemoVendorType;
  label: string;
  description: string;
}[] = [
  {
    value: "grocery",
    label: "Grocery Store",
    description: "Freeform list, substitutions, pack sizes, brands, photos.",
  },
  {
    value: "medical",
    label: "Medical / Pharmacy",
    description: "Prescription upload, alternates, photos, brands.",
  },
  {
    value: "bakery",
    label: "Bakery",
    description: "Pre-seeded cakes with weights and prices.",
  },
  {
    value: "restaurant",
    label: "Restaurant",
    description: "Pre-seeded menu; accept or 86 unavailable items.",
  },
];

const catalog: Record<DemoVendorType, DemoCatalogItem[]> = {
  grocery: [
    {
      id: "rice",
      name: "Basmati Rice",
      quantity: "1 kg",
      basePrice: 140,
      suggestedPacks: ["5 x 200g", "2 x 500g"],
      brands: ["Daawat", "India Gate"],
    },
    {
      id: "milk",
      name: "Toned Milk",
      quantity: "2 L",
      basePrice: 120,
      suggestedPacks: ["4 x 500ml"],
      brands: ["Amul", "Mother Dairy"],
    },
    {
      id: "atta",
      name: "Whole Wheat Atta",
      quantity: "5 kg",
      basePrice: 260,
      suggestedPacks: ["10 x 500g", "2 x 2.5kg"],
      brands: ["Aashirvaad", "Pillsbury"],
    },
  ],
  medical: [
    {
      id: "para",
      name: "Paracetamol 500mg",
      quantity: "1 strip",
      basePrice: 35,
      brands: ["Calpol", "Crocin"],
    },
    {
      id: "cet",
      name: "Cetirizine",
      quantity: "1 strip",
      basePrice: 25,
      brands: ["Cetzine", "Okacet"],
    },
    {
      id: "saline",
      name: "Nasal Saline Spray",
      quantity: "1 unit",
      basePrice: 120,
      brands: ["Nasivion", "Otrivin"],
    },
  ],
  bakery: [
    {
      id: "black-forest",
      name: "Black Forest Cake",
      weight: "1 kg",
      basePrice: 900,
    },
    {
      id: "red-velvet",
      name: "Red Velvet Cake",
      weight: "500 g",
      basePrice: 550,
    },
    {
      id: "cheesecake",
      name: "Baked Cheesecake",
      weight: "750 g",
      basePrice: 780,
    },
  ],
  restaurant: [
    { id: "paneer", name: "Paneer Tikka", basePrice: 260 },
    { id: "biryani", name: "Veg Biryani", basePrice: 240 },
    { id: "dal", name: "Dal Makhani", basePrice: 190 },
    { id: "naan", name: "Butter Naan", basePrice: 40 },
  ],
};

export const defaultArrivalMinutes = 5;

export function getCatalog(type: DemoVendorType): DemoCatalogItem[] {
  return catalog[type];
}

export function normalizeSessionCode(input?: string): string {
  const safe = (input || "demo")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 12);
  return safe || "demo";
}

export function buildOrderId(
  vendorType: DemoVendorType,
  sessionCode: string
): string {
  return `${vendorType}-${normalizeSessionCode(sessionCode)}`.toLowerCase();
}

export function createDemoOrder(
  vendorType: DemoVendorType,
  arrivalMinutes: number,
  sessionCode: string
): DemoOrder {
  const items = getCatalog(vendorType).map<DemoOrderLine>((item) => ({
    ...item,
    available: true,
    proposedPrice: item.basePrice,
    proposedPack: item.suggestedPacks?.[0],
    selectedBrand: item.brands?.[0],
  }));

  const amount = items.reduce(
    (total, item) => total + (item.proposedPrice ?? item.basePrice),
    0
  );

  return {
    id: buildOrderId(vendorType, sessionCode),
    vendorType,
    arrivalMinutes,
    items,
    amount,
    sessionCode: normalizeSessionCode(sessionCode),
  };
}

export function createVendorSuggestedResponse(
  order: DemoOrder
): DemoOrderLine[] {
  return order.items.map((item, idx) => {
    // Nudge one item to show an unavailable / substitute case for the demo.
    if (idx === 0 && (order.vendorType === "grocery" || order.vendorType === "medical")) {
      return {
        ...item,
        available: true,
        proposedPack: item.suggestedPacks?.[1] ?? item.proposedPack,
        vendorNote: "Offering smaller packs to match requested quantity.",
      };
    }

    if (idx === 1 && order.vendorType === "restaurant") {
      return {
        ...item,
        available: false,
        vendorNote: "Item 86ed — out of stock right now.",
      };
    }

    return {
      ...item,
      available: true,
      vendorNote:
        order.vendorType === "bakery"
          ? "Fresh batch ready in the next slot."
          : "In stock and reserved.",
    };
  });
}

export function hashChecksum(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

export function buildQrPayload(order: DemoOrder, amount?: number) {
  const payload = {
    orderId: order.id,
    vendorType: order.vendorType,
    amount: amount ?? order.amount,
    session: order.sessionCode,
    ts: Date.now(),
  };
  const json = JSON.stringify(payload);
  return {
    payload,
    encoded: json,
    checksum: hashChecksum(json),
  };
}


