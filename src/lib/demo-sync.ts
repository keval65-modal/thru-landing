import { DemoOrder, DemoOrderLine, DemoVendorType, createDemoOrder } from "./demo-data";

export type DemoStatus =
  | "idle"
  | "placed"
  | "vendor_review"
  | "accepted"
  | "rejected"
  | "validated"
  | "completed";

export interface DemoState {
  order: DemoOrder | null;
  status: DemoStatus;
  vendorNote?: string;
  arrivalTotalSeconds: number;
  arrivalStartTs: number;
  updatedAt: number;
}

// In-memory demo store (best-effort, survives while the server instance is warm).
const store: DemoState = {
  order: null,
  status: "idle",
  arrivalTotalSeconds: 600,
  arrivalStartTs: Date.now(),
  updatedAt: Date.now(),
};

export function getDemoState(): DemoState {
  return store;
}

export function resetDemoState(): DemoState {
  store.order = null;
  store.status = "idle";
  store.vendorNote = undefined;
  store.arrivalTotalSeconds = 600;
  store.arrivalStartTs = Date.now();
  store.updatedAt = Date.now();
  return store;
}

export function placeDemoOrder(vendorType: DemoVendorType): DemoState {
  store.order = createDemoOrder(vendorType, 10, "demo-default");
  store.status = "placed";
  store.vendorNote = undefined;
  store.arrivalTotalSeconds = 600;
  store.arrivalStartTs = Date.now();
  store.updatedAt = Date.now();
  return store;
}

export function updateDemoOrderLines(lines: DemoOrderLine[], vendorNote?: string): DemoState {
  if (store.order) {
    store.order = { ...store.order, items: lines };
  }
  store.vendorNote = vendorNote;
  store.status = "vendor_review";
  store.updatedAt = Date.now();
  return store;
}

export function setDemoStatus(status: DemoStatus, vendorNote?: string): DemoState {
  store.status = status;
  if (vendorNote !== undefined) store.vendorNote = vendorNote;
  store.updatedAt = Date.now();
  return store;
}

export function updateArrival(totalSeconds: number, startTs?: number): DemoState {
  store.arrivalTotalSeconds = totalSeconds;
  store.arrivalStartTs = startTs ?? Date.now();
  store.updatedAt = Date.now();
  return store;
}

