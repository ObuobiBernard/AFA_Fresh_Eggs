# AFA Fresh Eggs · Shop & Ledger Manager (React SPA)

**AFA Fresh Eggs Manager** is a mobile-first, offline-capable React application with TypeScript and Vite for running a crated-egg distribution business. It tracks farm pickups, daily sales across multiple shops, customer credit, transport costs, and live per-shop stock — syncing seamlessly to Supabase while preserving full local offline capability.

---

## 👨‍💻 Creator & Lead Developer

<div align="center">
  <img src="/assets/bernard.jpg" width="90" height="90" style="border-radius: 50%; border: 2px solid #1F5E3B;" alt="Bernard Owusu Obuobi" />
  <h3 style="margin: 10px 0 0 0;">Bernard Owusu Obuobi</h3>
  <p style="font-size: 14px; margin: 4px 0;">Lead Architect &amp; Developer</p>
</div>

---

## 🚀 Core Workflows & Features

* **End-to-End Daily Flow:** Set farm prices → Record pickup → Sell from shop → Chase credit → Review the week's profit.
* **Weekly Dashboard with Date Picker:** Every KPI on the Home tab is scoped to the **Monday–Sunday week you select**. Step back with **◀ Prev Week**, pick any date on the calendar, or tap **This Week** to revisit past performance.
  * Sales & Cash Received, Net Cash Profit, Farm Purchases, Transport/Costs
  * Per-week itemized **Sales** list and **Farm Pickups** list
  * Running **Customers Owe You** and **You Owe Farmers** balances
* **Two-Shop Stock Ledger:** Live crate counts for `Main Shop` and `Market Shop`, computed as pickups minus sales. Selling beyond available stock warns with a red **"Exceeds current stock!"** alert.
* **Stock Transfers & Breakage:** Move crates between shops or record cracked/spoiled crates without distorting purchase totals or profit figures.
* **Customer Credit with FIFO Settlement:** Outstanding balances settle oldest-due-first. One tap generates a WhatsApp reminder stating the exact balance owed.
* **Farmer Payables:** Unpaid or part-paid pickups are listed with their running balance, so farm debts can be cleared off in installments.
* **WhatsApp Receipts & Reminders:** Pre-formatted `wa.me` links carrying itemized receipts (Ghanaian numbers normalized `0xx` → `233xx`) for sales receipts and debt reminders.
* **Role-Based Access Control (RBAC):** Granular permissions for CEO, Data Entry, Shop Attendant (locked to designated shop), Driver, and Pending Approval.
* **Backup, Export & Restore:** Download a full JSON backup, export sales/collections/expenses to CSV for accountants, and restore a previous JSON snapshot.
* **Full Offline Resilience:** Data is mirrored to `localStorage` (`afa_cache`) so the app stays functional with zero connectivity, then syncs automatically.
* **Polish:** Light/dark glassmorphic themes, responsive layout, inline SVG iconography.

---

## 🛠️ Tech Stack

* **Framework:** React 18 with TypeScript
* **Bundler:** Vite
* **Styling:** Glassmorphism Design System with CSS variables and light/dark mode
* **State & Sync:** React Context + Supabase JS v2 with LocalStorage offline caching
* **Printable / Bluetooth POS Thermal Receipts:** Formatted mini thermal slip modal with `window.print()` and Web Share API (`navigator.share`) for Bluetooth mini printers and instant receipts.
* **Customer Statement of Account:** Chronological statement showing credit purchases, debt repayments, and running balances with one-tap WhatsApp statement delivery.
* **Live Customer Search:** Real-time filter bar across customer directory and outstanding balances.
* **Day-by-Day Sales Bar Chart:** Visual Monday–Sunday breakdown of daily crate volumes and revenue.
* **Top-Selling Sizes & Profit Margins:** Product performance analytics tracking total crates sold, revenue, and gross profit margins.
* **Low-Stock Alert Badges:** Automatic warnings when stock drops below 10 crates with quick reorder shortcuts.
* **End-of-Day Physical Stock Reconciliation:** Physical floor crate audit tool that reconciles variances into the inventory ledger.
* **Haptic Vibration Feedback:** Tactile mobile confirmation (`navigator.vibrate`) upon recording sales, payments, and pickups.
* **Distribution & PWA:** Installable Progressive Web App powered by `vite-plugin-pwa` with auto-updating Service Worker, standalone app window, home screen installation prompt, and iOS Safari Add-to-Home-Screen guide.

---

## 💻 Development

Run the development server on port 3000:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```
