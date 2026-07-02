# 🎲 Dobium: Trade on Entertainment

Dobium is a modern, fully data-driven prediction market platform that allows users to trade on the Entertainment

Trade on what you believe, track your portfolio, and watch probabilities dynamically shift based on real-time market sentiment—all completely risk-free.

## Features

- **Dynamic Market Pricing**: Fully dynamic markets, probabilities, and pricing based on real trading activity and liquidity.
- **Automated Market Maker (LMSR)**: Uses the Logarithmic Market Scoring Rule (via a custom Rust/Python engine) for mathematically sound probability pricing.
- **Real-Time Notifications**: Get instant alerts when new markets drop, events are resolved, and when your positions win.
- **Paper Trading & Virtual Wallet**: Currently operating purely in paper-trading mode. Users get a starting balance of virtual funds to practice forecasting without risking real money.
- **Stripe Integration (Test Mode)**: Architecture in place for fiat on-ramps, currently operating strictly in test mode to support paper-trading top-ups.
- **Responsible Trading Module**: Built-in risk controls, cooldown periods, and educational nudges to promote healthy forecasting habits.
- **Rich Dashboard**: Track portfolio value, PnL, active stakes, and transaction history all in one place.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, React Router
- **Backend**: Node.js, Express.js, Sequelize (PostgreSQL)
- **Pricing Engine**: Rust / Python (LMSR implementation)
- **Authentication**: Supabase Auth (Email/Password & Magic Links)
- **Payments**: Stripe API & Webhooks

## 📁 Project Structure

```
dobium/
├── frontend/               # React application (Vite)
│   ├── src/
│   │   ├── components/     # UI components (MarketCard, Sidebar, etc.)
│   │   ├── pages/          # Route views (Dashboard, Explore, etc.)
│   │   └── hooks/          # Custom React hooks (useAuth, useWallet)
│
├── backend/                # Express.js API server
│   ├── engine/             # Rust-based LMSR calculation engine
│   ├── lib/                # Datastore, database models, and utilities
│   │   └── database/       # Sequelize models (PostgreSQL)
│   ├── scripts/            # Database seeders and migration tools
│   └── server.js           # Primary Express application entry point
│
├── data/                   # Fallback JSON datastore (markets, predictions)
├── docs/                   # Architectural documentation
└── server.js               # Legacy/JSON-based Express server
```

## 🎮 Usage Guide

1. **Sign Up**: Create an account using email or Google OAuth to receive your initial $10,000 in paper-trading funds.
2. **Explore Markets**: Browse active events across various categories or check out the curated trending slideshow.
3. **Place a Trade**: Predict 'Yes' or 'No' (or select from multiple outcomes). Your position's value will update dynamically as the market probability shifts.
4. **Track & Manage**: Monitor your portfolio in real-time. Sell early to secure profits or cut losses, or hold your position until the event officially resolves.
5. **Daily Digest**: Check your inbox every day at 12 PM for a personalized summary of your portfolio and active market movements.

## 🚀 Getting Started

### Prerequisites
- PostgreSQL (Optional, but required for production features)
- Rust (Optional, if you wish to recompile the pricing engine)

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/annavajhula10/samsa.git dobium
cd dobium
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory (use `.env.example` as a template):

```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/dobium_dev
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Database Initialization

If you are using PostgreSQL, you can initialize and seed the database using:

```bash
npm run db:init
npm run seed
```
*(Note: The backend is also capable of falling back to the local `data/*.json` files if no database is provided, running entirely in-memory for quick testing).*

### 4. Running the App

You can start both the frontend and backend concurrently from the root directory:

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 🔌 Core API Endpoints

### Markets
- `GET /api/markets` - Fetch all active markets and probabilities
- `GET /api/markets/:id` - Fetch details for a specific market
- `POST /api/markets` - Create a new market (admin/system)
- `GET /api/markets/trending` - Fetch markets sorted by highest volume
- `POST /api/markets/:id/resolve` - Resolve a market and trigger payouts

### Trading & Predictions
- `GET /api/predictions` - Fetch prediction history
- `POST /api/predictions` - Place a new trade (automatically updates LMSR pricing)
- `POST /api/positions/sell` - Sell an active position early

### Wallet & Users
- `GET /api/users/:id/balance` - Get buying power and PnL metrics
- `GET /api/users/:id/transactions` - Get transaction history
- `POST /api/users/:id/deposit` - Record a fiat deposit
- `GET /api/users/:id/notifications` - Fetch user alerts

## 🧮 How LMSR Pricing Works

Dobium uses a mathematical market maker called the **Logarithmic Market Scoring Rule (LMSR)**. 

- Prices (between 0¢ and 100¢) represent the market's estimated probability of an event occurring.
- Buying shares incrementally increases the price; selling decreases it.
- The system uses a `BASE_LIQUIDITY` parameter to prevent extreme 0% or 100% pricing swings on low-volume markets.
- **Linear-Probability Valuation**: The value of an active position dynamically scales based on the current market probability relative to your entry price.
- **Dynamic PnL**: Position value is calculated via linear interpolation between the minimum and maximum possible returns based on real-time odds.

This linear interpolation system allows forecasters to actively trade in and out of positions, securing profits or cutting losses as market consensus shifts over time.

## 💳 Stripe Integration

Dobium's architecture includes a secure fiat transaction flow via Stripe, **currently configured to operate entirely in test/simulated mode to support paper trading**:

1. **Deposits**: Users open the "Buying Power" modal to add funds.
2. **Payment Intents**: The backend generates a Stripe PaymentIntent (`/api/payments/create-intent`).
3. **Elements**: The React frontend securely captures payment details using Stripe Elements.
4. **Webhooks**: A secure webhook (`/api/stripe/webhook`) listens for `payment_intent.succeeded` to finalize the deposit and credit the user's Buying Power.

*Note: The platform is currently in paper-trading mode. No real money is processed or at risk.*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Dobium** - *Trade on the World* 🦋
