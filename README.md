# AFA Fresh Eggs · Shop & Ledger Manager

**AFA Fresh Eggs Manager** is a mobile-first, offline-capable Progressive Web App for running a crated-egg distribution business. It tracks farm pickups, daily sales across multiple shops, customer credit, transport costs, and live per-shop stock — syncing everything to Supabase so the books stay current across the office phone, the market stall, and the delivery van.

**Live app:** https://obuobibernard.github.io/AFA_Fresh_Eggs/

---

## 👨‍💻 Creator & Lead Developer

<div align="center">
  <img src="assets/bernard.jpg" width="90" height="90" style="border-radius: 50%; border: 2px solid #1F5E3B;" alt="Bernard Owusu Obuobi" />
  <h3 style="margin: 10px 0 0 0;">Bernard Owusu Obuobi</h3>
  <p style="font-size: 14px; margin: 4px 0;">Lead Architect &amp; Developer</p>
</div>

> Add your photo at `assets/bernard.jpg` — it is referenced above but not committed yet.

---

## 🚀 Core Workflows & Features

* **End-to-End Daily Flow:** Set farm prices → Record pickup → Sell from shop → Chase credit → Review the week's profit.
* **Weekly Dashboard with Date Picker:** Every KPI on the Home tab is scoped to the **Monday–Sunday week you select**. Step back with **◀ Prev Week**, pick any date on the calendar, or tap **This Week** to revisit past performance instead of only seeing the current week.
  * Sales & Cash Received, Net Cash Profit, Farm Purchases, Transport/Costs
  * A per-week itemized **Sales** list and **Farm Pickups** list (quantity × unit price, shop, customer, paid vs. owed)
  * Running **Customers Owe You** and **You Owe Farmers** balances
* **Two-Shop Stock Ledger:** Live crate counts for `Main Shop` and `Market Shop`, computed as pickups minus sales. Selling beyond available stock shows a red **"Exceeds current stock!"** warning instead of silently going negative.
* **Stock Transfers & Breakage:** Move crates between shops, or deduct cracked/spoiled crates, without distorting purchase totals or profit figures.
* **Customer Credit with FIFO Settlement:** Outstanding balances settle oldest-due-first. One tap generates a WhatsApp reminder stating the exact balance owed.
* **Farmer Payables:** Unpaid or part-paid pickups are listed with their running balance, so farm debts can be cleared off in instalments.
* **WhatsApp Receipts & Reminders:** Pre-formatted `wa.me` links carrying itemized receipts (Ghanaian numbers normalized `0xx` → `233xx`) for both sales receipts and debt reminders.
* **Backup, Export & Restore:** Download a full JSON backup, export sales/collections/expenses to CSV for accountants, and restore a previous JSON snapshot back into the database.
* **True Offline Support:** Installs to the Android/iOS home screen as a PWA. Data is mirrored to `localStorage` so the app opens and stays usable at the market with zero signal, then re-syncs automatically when connectivity returns.
* **Secure Multi-Device Access:** Supabase email/password authentication, with a shared session across the owner's devices.
* **Polish:** Light/dark themes (respects the OS preference, remembers your manual choice), safe-area insets for notched phones, and inline SVG icons so there are no missing-asset 404s.

---

## 🗄️ Database Schema

Six PostgreSQL tables in Supabase. Monetary values are numeric (Ghana Cedi, GH₵); dates are `YYYY-MM-DD` text.

| Table | Key columns | Purpose |
| --- | --- | --- |
| `prices` | `id`, `farm`, `item`, `buy`, `sell` | Farm name + egg size with buy and selling price per crate |
| `collections` | `id`, `date`, `pid`, `lbl`, `qty`, `buy`, `shop`, `paid_amt` | Farm pickups **and** stock adjustments (`qty` negative with `buy = 0`) |
| `sales` | `id`, `date`, `pid`, `lbl`, `qty`, `price`, `shop`, `cust_id`, `paid`, `method`, `due` | Sales lines; `cust_id` is null for walk-ins, `due` set when on credit |
| `payments` | `id`, `date`, `cust_id`, `amt` | Debt repayments received from customers |
| `costs` | `id`, `date`, `descr`, `amt` | Transport, fuel and general expenses |
| `customers` | `id`, `name`, `phone` | Customer directory for credit and WhatsApp |

Enable **Row Level Security** on all six tables with a policy of `auth.role() = 'authenticated'` so only signed-in users can read or write records.

---

## 🛠️ Tech Stack
* **Frontend:** Vanilla JavaScript (ES6+, zero build step), HTML5, CSS3 custom properties
* **Database & Auth:** Supabase (PostgreSQL + `signInWithPassword`)
* **Offline & Distribution:** Progressive Web App — `manifest.json` with inline SVG icons + Service Worker cache-first shell
* **Hosting:** GitHub Pages

No framework, no bundler, no `node_modules` — edit five files and push.

---

## 📁 Project Structure

```
AFA_Fresh_Eggs/
├── index.html        # App shell, header, nav container, Supabase CDN + SW registration
├── app.js            # All application logic (state, sync, views, handlers)
├── style.css         # Themed design system (light/dark) + responsive layout
├── manifest.json     # PWA manifest with inline SVG icons (any + maskable)
├── sw.js             # Service Worker: caches the shell, never caches Supabase traffic
└── README.md
```

`app.js` is organized into six commented sections: configuration & state, database sync, utilities, view templates, actions & handlers, and navigation & boot.

---

## ⚙️ Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/obuobibernard/AFA_Fresh_Eggs.git
   cd AFA_Fresh_Eggs
   ```

2. **Add your Supabase credentials** — edit lines 4–5 of `app.js`:
   ```javascript
   var SB_URL = 'https://YOUR-PROJECT.supabase.co';
   var SB_KEY = 'YOUR-ANON-PUBLIC-KEY';
   ```
   Found under **Project Settings → API Keys** in the Supabase dashboard.

   > ⚠️ If you use a new-style `sb_publishable_...` key, keep the CDN on `@supabase/supabase-js@2` (v2.49+). Older SDK builds send it as a bearer JWT and the auth endpoint returns `401 Invalid API key`.

3. **Create the six tables** listed in the schema above, with `id` as the primary key (text/uuid).

4. **Serve the files locally**
   ```bash
   npx serve .
   # or: python -m http.server 8000
   ```
   Opening `index.html` directly via `file://` will not work — Service Workers and `fetch` require an `http(s)` origin.

---

## 🚀 Deployment

The app is fully static, so it deploys straight from a GitHub repository:

1. Push all five files to the repository root.
2. In **Settings → Pages**, set the source to your deployment branch and the root folder.
3. Hard-refresh (`Ctrl + Shift + R`) after each push to bypass the cached Service Worker.
4. After any code change, bump `CACHE_NAME` in `sw.js` (e.g. `afa-eggs-v3`) so clients pick up the new assets.

---

## 📱 Installing as an App

| Platform | Steps |
| --- | --- |
| **Android (Chrome)** | Open the site → ⋮ menu → **Add to Home screen** / **Install app** |
| **iOS (Safari)** | Open the site → Share → **Add to Home Screen** |

Once installed it launches standalone, full-screen, with no browser chrome.

---

## 🔐 Security Notes

* The Supabase `anon` public key is intentionally public — it is not a secret. Your data is protected by **Row Level Security policies** and authentication, not by hiding the key.
* Never put a Supabase `service_role` key in this codebase; it bypasses all RLS and grants full database access.
* Config (project URL and key) lives only in `app.js` lines 4–5 to keep the no-build-step architecture. If you later move to a bundler, shift them into environment variables.

---

<div align="center">
  <sub>Built for AFA Fresh Eggs · GH₵ books that stay accurate, even offline.</sub>
</div>

