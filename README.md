# CodeAlpha – Simple E-commerce Store (Node.js + SQLite)

A minimal yet production-style full-stack e-commerce app built for the CodeAlpha internship task.
It includes a product catalog, product detail pages, per-user shopping cart, checkout with order processing, user auth, profile/shipping management, and an orders page with cancel/reorder.

> Frontend: HTML/CSS/JS (no framework) • Backend: Node.js/Express • DB: SQLite

---

## Features

* **Product catalog** with categories, images, price & stock
* **Product details** page (`/product.html?id=…`)
* **Per-user shopping cart** (guest cart merges on login)
* **Checkout & order processing**

  * COD, and demo CARD/PayPal flows (simulated)
  * Stock decremented on purchase, **restored on cancel**
* **User auth** (register/login via JWT)
* **Profile & default shipping** (auto-fills checkout) + avatar upload
* **Orders page** with details & **reorder** / **cancel**
* **Seed script** to populate products & a demo catalog
* Security basics: `helmet`, `cors`, `dotenv`

---

## Tech Stack

* **Backend:** Node.js, Express, JWT, bcrypt, sqlite3
* **Frontend:** Vanilla HTML/CSS/JS
* **Database:** SQLite (`store.db` in project root)

---

## Project Structure

```
CodeAlpha_SimpleEcommerce/
├─ public/                    # static frontend
│  ├─ css/styles.css
│  ├─ js/
│  │   api.js                # small fetch/JWT helper + cart utils
│  │   auth.js               # login/register page logic
│  │   checkout.js           # checkout flow
│  │   orders-page.js        # orders list/details
│  │   profile.js            # profile & shipping
│  ├─ index.html             # catalog
│  ├─ product.html           # product detail
│  ├─ cart.html
│  ├─ checkout.html
│  ├─ orders.html
│  ├─ login.html
│  └─ profile.html
├─ routes/
│  ├─ auth.js
│  ├─ products.js
│  ├─ orders.js
│  └─ me.js                  # /api/me & profile
├─ seed/seed.js              # seeds the DB with products
├─ db.js                     # sqlite connection & schema bootstrap
├─ server.js                 # express app
├─ .env.example
├─ package.json
└─ store.db                  # created at runtime (SQLite file)
```

---

## Getting Started

### Prerequisites

* Node.js 18+ (or 20+)
* npm

### 1) Clone & install

```bash
git clone <your-repo-url> CodeAlpha_SimpleEcommerce
cd CodeAlpha_SimpleEcommerce
npm install
```

### 2) Environment variables

Create `.env` (or copy from `.env.example`):

```env
PORT=3000
JWT_SECRET=change_me_for_prod
```

### 3) First-time setup

```bash
# (optional) local folder for uploaded images if you add any
mkdir uploads

# seed products & demo content
node seed/seed.js
```

### 4) Run the app

```bash
# dev (auto-restart)
npm run dev
# or prod
npm start
```

Open: `http://localhost:3000/`

---

## How to Use (Happy Path)

1. **Register** a new user (`/login.html` → “Create account”).
   *(Optional: add default shipping now; it will auto-fill at checkout.)*
2. **Browse** the catalog (`/`) and **open details** (`/product.html?id=…`).
3. **Add items to cart**. Cart is per user (guest cart merges on login).
4. **Checkout** (`/checkout.html`):
5. **See your orders** (`/orders.html`):

   * Click **Details** to view line items (with thumbnails, qty, price).
   * **Cancel** to restock or **Reorder** to add items back to cart.
6. **Edit profile/shipping** (`/profile.html`), upload avatar, and change display name.

---

## Database

SQLite file: `store.db`

**Tables**

* `products(id, title, description, price, stock, image_url, category, created_at)`
* `users(id, name, email, password_hash, role, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country, avatar_url)`
* `orders(id, user_id, total, status, payment_method, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_country, created_at)`
* `order_items(id, order_id, product_id, quantity, unit_price)`

**Reset DB (dev)**

```bash
# remove old database and reseed
del store.db          # Windows PowerShell
# rm store.db         # macOS/Linux
node seed/seed.js
```

---

## API Overview

### Auth

* `POST /api/auth/register`
  Body: `{ name, email, password, shipping_name?, shipping_address?, shipping_city?, shipping_zip?, shipping_country? }`
  → `{ token, user }`
* `POST /api/auth/login`
  Body: `{ email, password }` → `{ token, user }`

### Me / Profile

* `GET /api/me` → user with name/email/role & shipping fields
* `GET /api/me/profile` → `{ shipping_*, avatar_url }`
* `PUT /api/me/profile`
  Body: `{ name?, shipping_*, avatar_url? }` → `{ updated: n }`

### Products

* `GET /api/products` → list of products
* `GET /api/products/:id` → single product

### Orders

* `POST /api/orders` *(auth)*
  Body:

  ```json
  {
    "items": [ { "productId": 1, "qty": 2 }, ... ],
    "shipping": { "name": "", "address": "", "city": "", "zip": "", "country": "" },
    "payment_method": "COD" | "CARD" | "PAYPAL"
  }
  ```

  → `{ orderId, total, status, order? }`
* `GET /api/orders/me/full` *(auth)* → orders with line items + product images
* `POST /api/orders/:id/cancel` *(auth)* → restocks and sets status `CANCELLED`

---

## npm Scripts

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "seed": "node seed/seed.js"
}
```

---

## Troubleshooting

* **“Cannot find module 'helmet'”** → `npm i helmet`
* **Images don’t load**
  Use local `/uploads` or data-URI placeholders (no external image CSP issues).
* **DB migration error (column missing)**
  Delete `store.db` and run `node seed/seed.js` again.
* **Login/register works but name doesn’t persist**
  Ensure `PUT /api/me/profile` updates `name` and the frontend refreshes the cached user (`API.setAuth`).

---

## Roadmap / Nice-to-haves

* Admin UI for product CRUD + inventory
* Real payment integration (Stripe)
* promo codes


If you want, I can also add a small set of screenshots and a **“How it maps to the task requirements”** section with checkmarks.
