​🚀 QR-Billing SaaS - Enterprise POS Architecture (Master Blueprint)
​📌 1. Project Overview
​Type: B2B Multi-Tenant Point of Sale (POS) & Smart Inventory SaaS.
​Target Audience: Local Garment SMEs (e.g., Rampurhat Garments).
​Core Philosophy: Frictionless Magic Scans for customers, decentralized worker inventory management, and premium digital billing for owners.
​🛠️ 2. Tech Stack
​Framework: Next.js (App Router - app/ directory)
​Backend/Database: Supabase (PostgreSQL, Auth, Storage)
​Styling: Tailwind CSS
​Animations: Framer Motion
​Icons: Lucide React
​QR Tech: qrcode.react (Generation), html5-qrcode (Scanning)
​📂 3. Folder Structure Breakdown (App Router)
​Based on the VS Code workspace, the project follows a strict tenant-based dynamic routing system.
​🟢 app/ (The Root)
​layout.tsx & page.tsx: Main landing page of the SaaS company (Agency front).
​globals.css: Tailwind directives and global print/PDF styling.
​login/page.tsx: Authentication portal for store owners.
​🟡 app/actions/ (Server Actions)
​adminActions.ts: Server-side logic for store settings, analytics fetching.
​authActions.ts: Supabase authentication handling.
​billingActions.ts: Logic for generating bills, calculating totals, and finalizing sales.
​cartActions.ts: Managing cart state, locking/unlocking qr_tags globally.
​🔵 app/[store_slug]/ (Customer-Facing & Tenant Routing)
​(This entire route relies on the dynamic store_slug to load specific store branding/themes).
​[tag_id]/page.tsx: The Magic Scan Page. Customers land here after scanning a QR. Shows product details, real-time cart check, and silently updates the scan_count in DB.
​cart/page.tsx: The customer's digital shopping bag.
​scan/page.tsx: In-app camera scanner for customers to add more items.
​bill/[cart_id]/page.tsx: Premium Digital Receipt. Fetch exact sale data and render an A4-optimized printable/downloadable bill.
​success/[cart_id]/page.tsx: Post-checkout success animation and redirection to the bill.
​worker/page.tsx: Decentralized Worker Form. Standalone URL for staff to upload photos, add price/size, and bind new items to empty tags. (Uses added_by_device tracking).
​🔴 app/admin/[store_slug]/ (Owner Control Room)
​(Secured routes for shop owners to manage their specific store).
​page.tsx: Main Admin Settings (Theme colors, logos, store name).
​analytics/page.tsx: Intelligence Dashboard (Viewing live stats, most scanned items, revenue).
​inventory/page.tsx: Main Inventory Management. Grid view of all tags, PDF QR code generation (16 per A4 page), binding/unbinding items, manual edits.
​inventory/worker-mode/page.tsx: Worker Terminal. Admin control panel that generates the worker link and displays a live-refreshing table of which device (e.g., iPhone, Samsung) added how many items today.
​⚙️ components/ & lib/
​components/AddToCart.tsx: Modular button component for cart logic.
​components/HomeButton.tsx: UI navigation component.
​lib/supabase.ts: Standard Supabase client for browser (Client Components).
​lib/supabaseServer.ts: Secure Supabase client for Server Actions.
​🗄️ 4. Supabase Database Schema (Core Tables)
​Any AI working on this must understand how these tables relate to each other.
​1. stores (Tenants)
​id (UUID, Primary Key)
​slug (Text, Unique) - E.g., 'rampurhat-garments'
​store_name (Text)
​logo_url (Text)
​theme_color (Text) - E.g., '#10b981'
​2. products (Inventory Items)
​id (UUID, Primary Key)
​store_id (UUID, Foreign Key -> stores.id)
​name (Text)
​price (Numeric)
​size (Text) - Default: 'Free Size'
​image_url (Text)
​scan_count (Integer, Default: 0) - Used for analytics.
​added_by_device (Text) - Tracks which worker phone added this.
​3. qr_tags (The Physical QR Bridge)
​id (Text) - E.g., 'TAG001', 'TAG002'.
​store_id (UUID, Foreign Key -> stores.id)
​product_id (UUID, Foreign Key -> products.id, Nullable)
​status (Text) - STRICT values: 'free', 'active', 'in_cart', 'sold'.
​4. sales (Completed Orders)
​cart_id (Text, Primary Key) - E.g., 'CART1564'
​store_id (UUID, Foreign Key -> stores.id)
​total_amount (Numeric)
​purchased_items (JSONB) - Snapshot of items at the time of sale.
​payment_status (Text) - E.g., 'completed'
​payment_method (Text) - E.g., 'CASH', 'ONLINE'
​items_count (Integer)
​created_at (Timestamp)
​🧠 5. Key Logic & Business Rules
​Tag Binding Logic: A tag is considered "Empty" ONLY IF product_id is null and status is NOT 'active' or 'sold'.
​Worker Mode Architecture: The Admin page (worker-mode) is just a live tracker. The actual data entry happens on /[store_slug]/worker, where the system detects the user's phone model (navigator.userAgent) and saves it to added_by_device in the products table.
​Magic Scan Analytics: When a customer opens /[store_slug]/[tag_id], a silent background Supabase update increments the scan_count in the products table by +1 without blocking the UI load.
​PDF Printing Rules: All printable components (Tags and Bills) use strictly structured Tailwind print directives (print:pb-0, print:bg-white, @media print { @page { margin: 0; } }) to prevent blank page generation.