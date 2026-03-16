# Admin Views Overhaul — Design Spec
**Date:** 2026-03-16
**Project:** pay.convexo.xyz
**Scope:** Four admin improvements implemented in priority order

---

## 1. Pay Orders — Page per Order

### Problem
The current admin pay orders list (`/admin/pagar`) renders everything in a flat table. Admins cannot see order details clearly (financial breakdown, supplier info, payment coordinates) nor manage the status workflow effectively.

### Solution
Two pages: an improved list + a dedicated detail page per order.

### 1a. List Page (`/admin/pagar`)
- **Columns:** `#ID` (short, monospace) · User email · Supplier · Amount + Currency · Fiat equivalent · Status badge · Created date · `→ Ver` button
- **Status filter pills** at top: All / OPENED / EN_REVISION / PROCESANDO / PAYED / RECHAZADO
- Clicking any row or the Ver button navigates to `/admin/pagar/[id]`
- Existing pagination retained

### 1b. Detail Page (`/admin/pagar/[id]`)
Two-column layout (desktop). Single column (mobile).

**Left column (~65%) — read-only information:**
1. **Order header** — short ID (`#ABCD1234`), PAY badge, creation date, user email
2. **Financial breakdown card**
   - Token + Amount (e.g. USDC 1,000.00)
   - Processing fee (if set)
   - Total to deposit
   - Fiat equivalent: currency, amount, exchange rate
   - Reference number (user's PO/invoice)
3. **Supplier info card** — internal name, legal name, registration country, company type, contact email + phone
4. **Payment method card** — full coordinates based on method type:
   - BANK: bank name, account holder, account number, SWIFT/routing, branch code, bank code, currency, country
   - CRYPTO: chain, token, wallet address + QR code

**Right column (~35%) — management:**
1. **Status stepper** — visual progress bar: `OPENED → EN_REVISION → PROCESANDO → PAYED` (or `RECHAZADO` branch)
2. **Action card** — context-sensitive based on current status:
   - `OPENED` / `ORDERED` → "Mover a Revisión" button
   - `EN_REVISION` → "Iniciar Proceso" button + "Rechazar" (rejection reason textarea)
   - `PROCESANDO` → "Marcar como Pagado" (proof URL input) + "Rechazar"
   - `PAYED` / `RECHAZADO` → read-only, no actions
3. **Status history timeline** — chronological list: status badge + timestamp + who made the change

**Breadcrumb** back to list at top.

### Data Requirements
- Fetch order by ID including: user email, entity name (suppliers/clients table), payment profile details
- Supplier join: `suppliers.internal_name`, `legal_name`, `contact_email`, `company_phone`
- Payment profile join: full `details` JSONB
- Status history from `status_history` JSONB column

---

## 2. OTC Orders — Expandable Table Rows

### Problem
Current `WalletRequestManager` crams all actions (spread input, proof URL, status buttons, notes) into table cells, making it hard to read or operate.

### Solution
Keep the list view but replace inline cells with expandable rows. Clicking a row reveals a rich detail + action panel below it.

### Table (`/admin/cuenta`)
**Columns:** `#ID` · User email · Type (COMPRAR / VENDER badge) · Amount + Currency · COP equivalent · Spread % · Status badge · Created date

**Two sections:** Active requests (non-terminal) at top, Completed/Cancelled below.

### Expanded Row Panel
Two sections side by side:

**Left — Details:**
- User profile: name, email, phone (from `profiles` join)
- Transaction: amount + currency, type, base rate (USD/COP), spread applied, final effective rate, COP equivalent

**Right — Status + Actions:**
- Status stepper: `ORDERED → ACEPTADO → POR_PAGAR → REVISION → LIQUIDADO`
- Action card by status:
  - `ORDERED` → spread override input (leave empty = keep default 1%) + "Aceptar" button + "Cancelar"
  - `ACEPTADO` → "Habilitar Pago" + "Cancelar"
  - `POR_PAGAR` → info message "Esperando pago del cliente" (user action, no admin button) + "Cancelar"
  - `REVISION` → proof URL input + admin note textarea + "Liquidar" + "Cancelar"
  - `LIQUIDADO` / `CANCELADO` → read-only history only

### Data Requirements
- Join `wallet_requests` with `users` (email) and `profiles` (first_name, last_name, phone, phone_country_code)
- Compute `finalRate = usdcop_rate * (1 ± spread)` client-side

---

## 3. Suppliers & Clients — Entity Detail Pages

### Problem
Admin list pages for suppliers (`/admin/proveedores`) and clients (`/admin/clientes`) are read-only flat tables with no way to drill into an entity's details, payment methods, or order history.

### Solution
Add clickable rows to existing lists → dedicated detail page per entity.

### List Pages (existing, minimal change)
- Add `→ Ver` button to each row
- Row click navigates to `/admin/proveedores/[id]` or `/admin/clientes/[id]`

### Detail Page — Two Columns

**Left column (~65%):**
1. **Company info** — internal name, legal name, company type, registration country, registration number
2. **Contact** — contact email, company phone, contact person (name, email, phone)
3. **Office address** — country, state, city, street address, postal code
4. **Payment methods** — list of all `payment_profiles` for this entity:
   - Method badge (BANK / CRYPTO / WECHAT / etc.)
   - Label + key details (bank name, account number for BANK; address for CRYPTO)
   - Default badge if `is_default = true`
   - Admin can add new payment method (uses existing `PaymentProfileForm`)

**Right sidebar (~35%):**
1. **Order history** — recent PAY or COLLECT orders linked to this entity (by `entity_id`), columns: `#ID` · Amount · Status · Date · link to order detail page
2. **Stats** — total orders count, total USDC volume processed

### Routes
- Suppliers: `/admin/proveedores/[id]/page.tsx` (server component)
- Clients: `/admin/clientes/[id]/page.tsx` (server component)
- Shared detail component to avoid duplication: `components/admin/EntityDetailView.tsx`

### Data Requirements
- Fetch entity by ID from `suppliers` or `clients` table
- Fetch payment profiles: `payment_profiles` where `entity_id = id`
- Fetch orders: `payment_orders` where `entity_id = id`, ordered by `created_at` desc, limit 20

---

## 4. ConvexoAccountForm — 3-Step Wizard

### Problem
The current form shows all fields at once which is overwhelming, especially since the fields change completely depending on the method type (BANK vs CRYPTO vs CASH).

### Solution
Replace single-page form with a 3-step wizard with a progress indicator.

### Step 1 — Method Type
Three large selection cards:
- 🏦 **Bank Account** — "Wire transfer · financial coordinates"
- ₿ **Crypto Wallet** — "USDC/crypto on-chain address"
- 💵 **Cash Point** — "Physical location for in-person cash exchange"

Next button activates once a method is selected.

### Step 2 — Details
Fields rendered based on selected method (existing field sets):
- **BANK:** bank name, bank address (optional), account holder, account number/IBAN, SWIFT/routing (optional), branch code (optional), bank code (optional), currency, country
- **CRYPTO:** chain selector (Ethereum/Solana/Tron), token, wallet address, QR preview
- **CASH:** place name (optional), country, state/department, city, street address, instructions (optional)

Back / Next buttons.

### Step 3 — Configuration
- **Label** — friendly name for this account
- **Available for** — direction selector: COMPRAR / VENDER / COMPRAR+VENDER / COLLECTIONS / ALL
- **Set as default** — checkbox
- **Save** button

### Progress Indicator
Three-step bar at top of form showing current step (1 / 2 / 3).

---

## Shared Patterns

### Styling
Follows project conventions (CLAUDE.md):
- Admin pages: white/light background (`background: white`, `border: 1px solid #e8e4dc`)
- Status badges: existing `StatusBadge` component
- Primary buttons: `background: linear-gradient(135deg, #334EAC, #401777)` with white text
- All inline styles, no Tailwind

### Auth & Security
- All server components check `privy-token` cookie, redirect to `/login` if missing
- All server actions call `requireAdmin(privyToken)` — no exceptions
- Detail pages use `createClient(privyToken)` for reads (admin RLS policy covers it)

### New Server Actions Needed
- `adminGetOrderById(privyToken, orderId)` — full order with entity + payment profile join
- `adminGetSupplierById(privyToken, id)` — supplier + payment profiles + orders
- `adminGetClientById(privyToken, id)` — client + payment profiles + orders
- OTC join: extend existing wallet_requests query to include `profiles` join for user contact info

---

## Implementation Order
1. Pay orders detail page + updated list
2. OTC expandable rows
3. Supplier/Client detail pages + shared component
4. ConvexoAccountForm wizard
