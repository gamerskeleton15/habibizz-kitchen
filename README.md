# Habibizz Kitchens

A bold, energetic full-stack fast food restaurant website built with React, Vite, Tailwind CSS, Framer Motion, Node.js, and Express. Cash on Delivery / Cash on Pickup only — no online payment gateway.

This is a beginner-friendly project. The code is commented throughout to make it easy to read and learn from.

## What's inside

- **Frontend** (`/frontend`) — React + Vite + Tailwind CSS + Framer Motion
- **Backend** (`/backend`) — Node.js + Express with a JSON file data store, Passport (Google + GitHub OAuth) for customer sign-in
- **No database** — the menu, orders, users, and support threads are stored in plain JSON files in `backend/data/`

## Features

- Sticky black navbar with the Habibizz Kitchens wordmark, a yellow cart badge, and a "Sign in" button that supports Google and GitHub OAuth (login is optional — guests can still order)
- Hero section with an animated yellow spark/flash background (built with Framer Motion)
- Menu section pulling live data from `GET /api/menu`, grouped by category
- Custom flat SVG icons for Burgers, Sides, Drinks, and Desserts
- White menu cards with bold name, description, price, and yellow Add to Cart button
- Slide-out cart drawer with quantity controls and a subtotal
- Checkout modal that collects name, phone, address (if delivery), and fulfillment type
- **Cash on Delivery / Cash on Pickup only** — no card or online payment UI anywhere
- Order confirmation screen with order number, estimated time, and a cash reminder
- Cart persisted to `localStorage` so it survives a refresh
- Dedicated **/support** chat page where customers send messages to the shopkeeper; threads survive refreshes via a localStorage thread ID
- **`/admin/support`** inbox where the shopkeeper reads and replies to customer chats, with close/reopen and an unread badge
- **AI auto-responder** — when a customer sends a message, the backend asks Gemini to draft a reply. The AI handles menu questions, hours, address, and small talk. If the customer's message matches a complaint keyword, they ask for a human, or the AI self-flags `needs_human: true`, the thread is escalated — the AI still sends a final empathetic reply, the thread is marked `needsAttention`, and the admin dashboard plays a higher-pitched double beep so the shopkeeper knows a real human needs to follow up. Once the shopkeeper replies (or even just opens the thread), the AI steps out permanently for that conversation.
- **/orders** page showing currently active orders and the full history with one-click reorder
- Fully responsive, keyboard-accessible, and respects `prefers-reduced-motion`

## Prerequisites

You need **Node.js** (v16 or newer) and **npm** installed. Download from [nodejs.org](https://nodejs.org).

To check, open a terminal and run:

```bash
node --version
npm --version
```

### Optional: enable the AI auto-responder

The AI feature is **off by default**. To turn it on, add your Gemini API key to `backend/.env`:

```
GEMINI_API_KEY=your-key-here
```

You can get a free key from [aistudio.google.com](https://aistudio.google.com/app/apikey). The free tier allows 15 requests per minute and 1,500 per day — plenty for a small restaurant chat. Without the key, customer messages still reach the shopkeeper — the AI just falls back to a "a real person will be with you shortly" reply and escalates every thread to a human.

The menu, hours, address, and policies are baked into the AI's system prompt inside `backend/lib/aiSupport.js`. Edit that file (and restart the backend) to change what the AI knows.

### Optional: enable customer sign-in (Google + GitHub)

The "Sign in" button in the navbar works out of the box, but it just shows the two provider buttons. To actually let customers log in you need OAuth credentials. Facebook is intentionally **not** included — it requires Meta app review before going live, which is too much overhead for a first project.

**Step 1 — copy the example file**

```bash
cd backend
cp .env.example .env
```

The file already has placeholders for everything (Google, GitHub, Gemini, session secret). Open `backend/.env` in your editor and fill in the values below.

**Step 2 — register a Google OAuth app**

1. Open [console.cloud.google.com](https://console.cloud.google.com/) and create a new project (or pick an existing one).
2. In the left sidebar go to **APIs & Services → Credentials**.
3. Click **+ Create Credentials → OAuth client ID**.
4. If Google asks you to configure the consent screen first:
   - Choose **External** user type.
   - Fill in the required app name ("Habibizz Kitchens"), support email, and developer contact.
   - On the **Scopes** step, leave the defaults (`openid`, `email`, `profile`) — that's all we need.
   - On the **Test users** step (only for unverified apps), add any Google accounts you want to be able to log in during development.
   - Save and continue.
5. Back on the Credentials screen, choose **Application type: Web application**.
6. Under **Authorized redirect URIs**, click **Add URI** and paste:
   ```
   http://localhost:4000/auth/google/callback
   ```
   (For production you'll add a second URI using your real domain, e.g. `https://yourdomain.com/auth/google/callback`.)
7. Click **Create**. Google shows a popup with your **Client ID** and **Client Secret** — copy both into `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```

**Step 3 — register a GitHub OAuth app**

1. Open [github.com/settings/developers](https://github.com/settings/developers) and click **New OAuth App**.
2. Fill in:
   - **Application name**: `Habibizz Kitchens` (or anything you like — customers see this on the consent screen).
   - **Homepage URL**: `http://localhost:5173` (the Vite dev server). For production swap in your real domain.
   - **Application description** (optional): a one-liner.
   - **Authorization callback URL**: `http://localhost:4000/auth/github/callback`
3. Click **Register application**.
4. On the next page, copy the **Client ID** into `backend/.env`.
5. Click **Generate a new client secret**, copy it, and paste it into `backend/.env` as `GITHUB_CLIENT_SECRET`. **You only see the secret once** — if you lose it, generate a new one.

**Step 4 — set a session secret**

Generate a random string and paste it as `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The session secret signs the HTTP-only session cookie. If you change it later, all users get logged out — which is fine for development.

**Step 5 — restart the backend**

```bash
cd backend
npm run dev
```

You should see no warnings about missing OAuth credentials. Open the site, click **Sign in** in the navbar, and try the **Continue with Google** or **Continue with GitHub** buttons. You should end up back on the site with your avatar in the navbar, and the next time you open the checkout modal your name will be pre-filled.

**Notes**

- Login is **optional**. Guests can still browse, order, and use the support chat. Signing in only speeds up checkout by pre-filling the name.
- User data is stored in `backend/data/users.json`. The file is just a JSON array of `{ id, name, email, avatar, provider, createdAt }` records — no passwords, no secrets.
- The session cookie is `httpOnly` so JavaScript can't read it. The frontend only ever sees the user object that comes back from `GET /auth/me`.
- If you ever see a 503 from `/auth/google` or `/auth/github`, it means the matching client ID/secret isn't set in `.env` yet. The button will still render but clicking it will show a configuration error instead of bouncing to the provider.

## How to run it locally

You'll need two terminals open — one for the backend and one for the frontend.

### 1. Start the backend

```bash
cd backend
npm install
npm run dev
```

The backend will start on **http://localhost:4000**. You should see:

```
Server is running on port 4000
```

Endpoints available:

- `GET  /api/menu` — returns the full menu (or filter by `?category=Burgers`)
- `POST /api/orders` — creates a new order (auto-assigns `status: "new"`)
- `GET  /api/orders` — returns all orders, newest first (used by the admin dashboard)
- `GET  /api/orders/:id` — looks up a specific order
- `PATCH /api/orders/:id/status` — updates an order's status (e.g. `new` → `preparing` → `ready` → `completed`)
- `GET  /auth/google` — kicks off the Google OAuth flow (returns 503 if not configured)
- `GET  /auth/google/callback` — Google redirects the browser here; sets the session cookie and redirects to the frontend
- `GET  /auth/github` — kicks off the GitHub OAuth flow (returns 503 if not configured)
- `GET  /auth/github/callback` — GitHub redirects the browser here; sets the session cookie and redirects to the frontend
- `GET  /auth/me` — returns `{ user }` (the current logged-in user) or `{ user: null }` if nobody is signed in
- `POST /auth/logout` — destroys the session and clears the cookie
- `POST /api/support/threads` — creates a new support thread with the customer's first message
- `GET  /api/support/threads/:id` — public; returns a single thread (also marks it read by the customer)
- `POST /api/support/threads/:id/messages` — public; appends a customer message and reopens a closed thread
- `GET  /api/support/threads` — **admin only**; lists all threads with an `unreadByAdmin` flag
- `POST /api/support/threads/:id/reply` — **admin only**; appends an admin reply
- `PATCH /api/support/threads/:id/status` — **admin only**; close or reopen a thread
- `POST /api/support/threads/:id/read` — **admin only**; marks the thread as read by the admin

### Two views, one app

The frontend now uses React Router to serve two views:

- **`http://localhost:5173/`** — the customer ordering experience (Hero, Menu, Cart, Checkout)
- **`http://localhost:5173/admin`** — the **shopkeeper dashboard**. Polls `/api/orders` every 5 seconds, shows orders in four columns (New / Preparing / Ready / Completed), plays a beep when a brand-new order arrives, and lets the shopkeeper advance each order's status with one click.

Customers also get a sticky **"Your Orders"** banner at the bottom of the page that polls the backend and live-updates the status of any order they just placed.

### 2. Start the frontend

In a **separate terminal**:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on **http://localhost:5173**. Open that URL in your browser.

The Vite dev server is configured to proxy `/api/*` requests to the backend on port 4000 (see `frontend/vite.config.js`), so the two pieces talk to each other automatically.

## Project structure

```
habibizz-kitchens/
├── backend/
│   ├── package.json
│   ├── server.js                # Express app entry point
│   ├── auth.js                  # Admin password auth + Passport OAuth strategies
│   ├── routes/
│   │   ├── menu.js              # GET /api/menu
│   │   ├── orders.js            # POST, GET (all + by id), PATCH status
│   │   ├── auth.js              # POST /api/admin/login, /api/admin/logout
│   │   ├── oauth.js             # /auth/google, /auth/github, /auth/me, /auth/logout
│   │   └── support.js           # Support chat (public + admin endpoints)
│   └── data/
│       ├── menu.json            # Seeded with 10 menu items
│       ├── orders.json          # Starts as []
│       ├── support.json         # Starts as []
│       └── users.json           # Customer accounts from Google/GitHub login
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js           # Proxies /api and /auth to localhost:4000
│   ├── tailwind.config.js       # Brand colors and fonts
│   ├── postcss.config.js
│   ├── index.html               # Loads Google Fonts (Archivo Black, Work Sans)
│   └── src/
│       ├── main.jsx             # React entry point (wraps in BrowserRouter + AuthProvider)
│       ├── App.jsx              # Routes for all customer + admin pages
│       ├── index.css            # Tailwind base + custom focus styles
│       ├── auth/
│       │   └── AuthProvider.jsx # React context for the current logged-in user
│       └── components/
│           ├── Home.jsx         # Customer view: Hero, Menu, Cart, Footer
│           ├── AdminDashboard.jsx   # Shopkeeper view: polls orders, has audio alert
│           ├── AdminSupportPage.jsx # Shopkeeper support inbox
│           ├── SupportColumn.jsx    # Summary card on the admin dashboard
│           ├── SupportPage.jsx  # Customer-facing /support chat
│           ├── OrdersPage.jsx   # /orders - active + history with reorder
│           ├── OrderTracker.jsx # Sticky live-status banner for the customer
│           ├── Navbar.jsx
│           ├── Hero.jsx              # Animated background here
│           ├── Menu.jsx
│           ├── MenuCard.jsx
│           ├── Cart.jsx
│           ├── CheckoutModal.jsx
│           ├── OrderConfirmation.jsx
│           ├── Footer.jsx
│           └── icons/
│               ├── BurgerIcon.jsx
│               ├── FriesIcon.jsx
│               ├── DrinkIcon.jsx
│               ├── DessertIcon.jsx
│               ├── ChickenIcon.jsx
│               └── CartIcon.jsx
│
└── README.md
```

## Brand colors

| Color | Hex | Use |
| --- | --- | --- |
| Brand Black | `#0D0D0D` | Primary background |
| Brand Dark | `#161616` | Secondary background |
| Brand Yellow | `#FFD400` | Primary accent (buttons, badge) |
| Warm Yellow | `#FFE24D` | Secondary accent (hover) |
| White | `#FFFFFF` | Text on dark, menu cards |
| Off-white | `#F5F5F0` | Light sections (menu) |

## Notes for beginners

- **Data store**: The backend uses a simple JSON file (`backend/data/orders.json`) instead of a real database. It's fine for a learning project, but in production you'd use a real database.
- **CORS**: The backend uses the `cors` middleware so the frontend can call it from a different port during development. OAuth requires `credentials: true` so the session cookie is sent on cross-origin requests — this is already wired up in `server.js`.
- **Animations**: All Framer Motion animations are wrapped with `useReducedMotion` so they automatically disable for users who prefer reduced motion.
- **Accessibility**: A custom yellow focus ring is set in `index.css`. Every interactive element has an `aria-label`.
- **localStorage**: The cart is saved automatically and restored on page load — try refreshing after adding items!
- **Sessions**: The OAuth login uses an `httpOnly` session cookie set by the backend, *not* localStorage. The frontend never sees the cookie directly — it calls `GET /auth/me` on every page load to learn who's signed in. This means a logged-in user keeps their session even if they refresh or close the tab.

## License

MIT — do whatever you want with this code. Enjoy!
