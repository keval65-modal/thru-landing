
# Project Requirements Document: Thru

## 1. Core Concept & Vision

**Thru** is a mobile-first web application designed to streamline errands by integrating them into a user's daily commute. The core concept is to allow users to pre-order items from various local stores (groceries, takeout, medical supplies, etc.) and pick them up from the curbside along a pre-planned travel route.

The app's mission is to save users time by eliminating in-store shopping and consolidating multiple shopping trips into one efficient, optimized journey.

---

## 2. Technology Stack

*   **Frontend Framework**: Next.js (with App Router)
*   **UI Library**: React with TypeScript
*   **Styling**: Tailwind CSS
*   **Component Library**: ShadCN UI
*   **Backend & Database**: Firebase (Authentication, Firestore)
*   **AI/Geospatial Logic**: Genkit for AI-powered features, Google Maps Platform APIs for maps, routing, and places.

---

## 3. Core Features

### 3.1. User Authentication & Profile Management

*   **Primary Signup/Login**: Phone number with OTP verification (powered by Firebase Authentication). The flow should include:
    *   A signup page to enter a phone number.
    *   An OTP entry page with a countdown timer and resend functionality.
    *   Use of an invisible reCAPTCHA for security.
*   **Social Login**: Allow users to sign up and log in using their Google account (Firebase Authentication).
*   **Password-based Login**: As an alternative, users can log in with their phone number and a password.
*   **Forgot/Reset Password**: A standard flow where a user can enter their phone number, receive an OTP, and set a new password.
*   **Profile Creation**: After initial signup (OTP or social), users are directed to a "Create Profile" page to set their name and a password for future logins. This page also allows for optional information like email, address, and vehicle numbers.
*   **Landing Page**: A marketing page for unauthenticated users showcasing the app's features and benefits.

### 3.2. The "Plan a Trip" Flow (Multi-Step)

This is the core user journey of the application.

#### Step 1: Define Route (`/plan-trip/step-1`)

*   **Inputs**:
    1.  **Start Location**: Text input with Google Places Autocomplete.
    2.  **Destination**: Text input with Google Places Autocomplete.
    3.  **Max Detour Slider**: A slider for the user to specify the maximum distance (in km) they are willing to deviate from their primary route.
*   **Functionality**:
    *   A "Use current location" button that uses the browser's Geolocation API to fill the start location.
    *   A "Swap" button to interchange start and destination.
    *   The "Proceed" button is disabled until both locations are filled.

#### Step 2: Select Items & Shops (`/plan-trip/step-2`)

*   **Hub & Spoke Model**: This page acts as a central hub where users select categories to shop from.
*   **"Item-First" vs. "Shop-First" Logic**:
    *   For categories like "Groceries" or "Medical," the user first selects from a master list of generic items (`item-first`).
    *   For categories like "Takeout Food" or "Gifts," the user first selects a specific vendor, and then browses that vendor's unique menu/inventory (`shop-first`).
*   **Shopping Preference Toggle**: For `item-first` categories, a toggle must be present allowing the user to choose between:
    *   **Single Store**: The app will attempt to find one single vendor that has all the selected items.
    *   **Multiple Stores**: The app is allowed to assign items to different vendors along the route for optimal pickup.
*   **UI**: The page should display categories in a grid. Clicking a category transitions the view to either an item list or a shop list. The UI must support quantity steppers for adding items to the cart. A running total of selected items should be visible.

#### Step 3: Review Shops & Optimized Route (`/plan-trip/step-3`)

*   **Core Logic**: This step is where the app's intelligence shines. It takes all selected items and the user's route/detour preferences and generates a final plan.
    *   **Vendor Assignment**: The system assigns each selected item to a vendor. It prioritizes shop-specific selections first. Then, for generic items, it assigns them to the nearest vendors within the max detour limit that are known to carry that category of item. It must respect the "Single vs. Multiple Store" preference.
*   **UI**:
    *   Display an overview of the route (Start, Destination, Max Detour).
    *   Show a static map image visualizing the route with vendor stops.
    *   Display a list of "Planned Stops" as cards. Each card shows:
        *   Vendor Name, Type, and Address.
        *   A list of items assigned to that vendor with quantities and prices.
        *   The subtotal for that vendor.

#### Step 4: Cart & Final Review (`/cart`)

*   **Functionality**: This page acts as the final review before payment.
*   **UI**:
    *   Summarize all items, grouped by the vendor they have been assigned to.
    *   Allow users to remove items.
    *   Display the overall subtotal.
    *   A clear "Confirm & Pay" button.

#### Step 5: Confirm & Pay (`/plan-trip/step-5`)

*   **Functionality**: Simulates the final checkout process.
*   **UI**:
    *   Display a final, optimized route on an interactive Google Map, showing the start, destination, and all vendor waypoints.
    *   Show a final price breakdown including item subtotal, platform fees, and payment gateway fees.
    *   Include placeholder payment method buttons (e.g., "Credit Card", "UPI").
*   **Action**: Clicking "Confirm & Pay" will:
    1.  Create an `order` document in the Firestore database with all the necessary details.
    2.  Redirect the user to the Order Tracking page.

### 3.3. Post-Order Features

*   **Order Tracking Page (`/order-tracking/[orderId]`)**:
    *   Displays the user's route on a live, interactive Google Map. Markers for start, destination, and all vendor stops must be visible and styled according to vendor type.
    *   Provides a "Navigate with Google Maps" button that opens the route in Google Maps in a new browser tab.
    *   Includes a "Live Proximity Check" feature that uses a Genkit flow (`predict-arrival-time`) to estimate ETA to the next vendor.
*   **My Orders Page (`/orders`)**:
    *   A tabbed view for "Active" and "Past" orders.
    *   Each order card summarizes the trip and the items within, grouped by vendor.
    *   Active orders have buttons to "Track in App" (linking to the order tracking page) and "Navigate with Google Maps".
    *   Active orders also have a "Scan QR to Confirm Pickup" button.
*   **QR Code Scanning Page (`/orders/scan-qr/[orderId]`)**:
    *   Uses the device camera (`getUserMedia`) to provide a view for scanning a QR code.
    *   Simulates a successful scan to mark a portion of the order as "Picked Up".

### 3.4. Onboarding & UI Enhancements

*   **Feature Tour**: A step-by-step modal dialog that appears for first-time users (tracked via `localStorage`) to explain the app's main features.
*   **Floating To-Do List**: A floating action button that opens a "Quick List" panel. This allows users to jot down items they need to buy, which can later be used to seed the trip planning process.

---

## 4. Firestore Data Models

*   **`users` collection**:
    *   Document ID: User's phone number in E.164 format.
    *   Fields: `hashedPassword`, `profileData: { name, email, address, etc. }`.
*   **`orders` collection**:
    *   Document ID: Auto-generated unique ID (e.g., `THRU-XYZ123`).
    *   Fields: `orderId`, `createdAt`, `overallStatus`, `paymentStatus`, `grandTotal`, `tripStartLocation`, `tripDestination`, `customerInfo`, `vendorIds` (array of strings), and `vendorPortions` (array of objects).
*   **`vendorPortions` object (within an order)**:
    *   Fields: `vendorId`, `vendorName`, `status`, `items` (array of objects), `vendorSubtotal`.
*   **`items` object (within a vendor portion)**:
    *   Fields: `itemId`, `name`, `quantity`, `pricePerItem`, `totalPrice`.
*   **`vendors` collection**: (For populating vendor data)
    *   Document ID: Unique vendor ID (e.g., email `zeothechef@gmail.com`).
    *   Fields: `shopName`, `type`, `address`, `latitude`, `longitude`, `categories` (array), `isActiveOnThru` (boolean), `simulatedDetourKm` (number).
*   **`vendor_inventory` collection**: (For populating item data)
    *   Document ID: Unique item ID.
    *   Fields: `itemName`, `price`, `category` (e.g., "grocery"), `vendorId` (if specific to a vendor), `isAvailableOnThru` (boolean).

---

## 5. Vendor App Integration & Logic

*   **Real-Time Order Fetching**: The corresponding Vendor App must listen for new orders in real-time.
*   **Query Logic**: The Vendor App should use a Firestore `onSnapshot` listener with a query on the `orders` collection:
    *   `where("vendorIds", "array-contains", loggedInVendorEmail)`
    *   Initially, do not filter by status to ensure all relevant orders are captured. Status filtering (`where("overallStatus", "in", ["New", "Preparing"])`) can be added later.
*   **Data Flow on Test Order**: The customer-facing Thru app has a "Send Test Order" button. When clicked, it creates a new order document in Firestore with `vendorId: "zeothechef@gmail.com"` and `overallStatus: "New"`. The Vendor App, listening with the correct query, should immediately see this new order appear without a page refresh.
*   **Permissions**: The Firestore security rules must be configured to allow reads and writes to the `orders` collection. For development, a permissive rule is acceptable:
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if true;
        }
      }
    }
    ```

---

## 6. Style & Design Guidelines

*   **Primary Color**: `#F6675E`
*   **Background Color**: Light gray (`#F0F0F5`), lightly tinted with the primary color.
*   **Accent Color**: Muted teal (`#70A1AF`).
*   **Font**: 'Inter', sans-serif.
*   **UI Components**: Use minimalist, line-based icons (from `lucide-react`) and clean, card-based layouts.
*   **ShadCN Theme**: The `globals.css` file should be configured with HSL variables corresponding to the color palette above.

