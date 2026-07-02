# Data-Driven Architecture

## Overview
The Dobium application is **100% data-driven** with no hardcoded values for prices, probabilities, or market data. All information flows from the backend API based on actual market data and user transactions.

## Market Data Flow

### Source of Truth
- **Backend**: `backend/data/markets.json`
- All market probabilities come from this file
- Probabilities represent actual market consensus based on liquidity and trading activity

### Data Pipeline
```
markets.json → Backend API → Frontend API Client → React Components
```

### Key Components

#### 1. MarketCard Component
**Location**: `frontend/src/components/MarketCard.jsx`

**Data Sources** (all dynamic):
- `outcome.probability` - Current market probability (0-100)
- `market.outcomes` - All outcome options with their probabilities
- `market.category` - Market category
- `market.title` - Market title
- `market.description` - Market description

**No Hardcoded Values**:
- ✅ Probabilities come from API data
- ✅ Outcome titles come from API data
- ✅ All displayed percentages/cents are calculated from `outcome.probability`
- ✅ Chart data is generated from actual probability values

#### 2. Portfolio Page
**Location**: `frontend/src/pages/PortfolioPage.jsx`

**Data Sources** (all dynamic):
- `balance` - User's current balance from wallet API
- `predictions` - All user predictions from API
- `markets` - Market data to display prediction details
- `profitLossHistory` - Calculated from actual prediction outcomes

**Calculations** (all data-driven):
- Portfolio Value = `balance + activePredictionsValue`
- Net Profit/Loss = `totalReturned - settledStake`
- Accuracy Score = `(wonPredictions / totalSettled) * 100`
- All monetary values calculated from actual transactions

#### 3. Explore Page
**Location**: `frontend/src/pages/ExplorePage.jsx`

**Data Sources** (all dynamic):
- Markets fetched via `useMarkets()` hook from API
- Trending markets sorted by `total_volume`
- Filtering based on actual market categories
- Search based on actual market titles

## Price Calculation (LMSR-Based)

### How Prices Work
Prices in prediction markets should be influenced by:
1. **Liquidity** - Total stake in the market
2. **Trading Activity** - Buy/sell pressure
3. **Market Maker Algorithm** - LMSR (Logarithmic Market Scoring Rule)

### Current Implementation
The backend uses LMSR pricing engine located in:
- `backend/engine/src/pricing.rs` (Rust implementation)
- `backend/lib/lmsr.py` (Python implementation)

### Price Updates
When trades occur:
1. User places prediction → `POST /api/predictions`
2. Backend updates outcome probabilities using LMSR
3. New probabilities saved to database/markets.json
4. Frontend fetches updated data
5. UI displays new prices automatically

## API Endpoints

### Markets
- `GET /api/markets` - All markets with current probabilities
- `GET /api/markets/:id` - Single market details
- `GET /api/markets/trending` - Markets sorted by volume
- `POST /api/markets` - Create new market

### Predictions
- `GET /api/predictions` - User's predictions
- `POST /api/predictions` - Place new prediction (updates prices)

### Wallet
- `GET /api/users/:id/balance` - Current balance
- `POST /api/users/:id/deposit` - Add funds
- `POST /api/users/:id/withdraw` - Withdraw funds

## Verification Checklist

### ✅ No Hardcoded Market Data
- [x] Market probabilities from API
- [x] Outcome titles from API
- [x] Market categories from API
- [x] Market descriptions from API

### ✅ No Hardcoded Financial Data
- [x] Portfolio value calculated from balance + positions
- [x] Profit/loss calculated from actual returns
- [x] Buying power from wallet balance
- [x] Position values from prediction stakes

### ✅ No Hardcoded User Data
- [x] Predictions fetched from API
- [x] User stats calculated from actual data
- [x] Accuracy based on win/loss ratio
- [x] All monetary amounts from transactions

## Adding New Markets

To add a new market with proper pricing:

1. **Add to markets.json**:
```json
{
  "id": "unique_id",
  "title": "Market Question",
  "description": "Details",
  "category": "politics",
  "outcomes": [
    {
      "id": "outcome_1",
      "title": "Yes",
      "probability": 50,
      "total_stake": 0
    },
    {
      "id": "outcome_2",
      "title": "No",
      "probability": 50,
      "total_stake": 0
    }
  ],
  "total_volume": 0
}
```

2. **Initial Probabilities**: Set based on expert consensus or 50/50 for binary
3. **Liquidity**: Starts at 0, grows with trading
4. **Price Updates**: Automatic via LMSR when trades occur

## Future Enhancements

### Real-Time Price Updates
- WebSocket connection for live price feeds
- Automatic UI updates when prices change
- Real-time chart updates

### Historical Price Data
- Store price snapshots over time
- Display actual 30-day price history (not flat lines)
- Historical volume charts

### Advanced Liquidity Features
- Liquidity pools
- Market maker incentives
- Dynamic fee structures based on liquidity

## Testing Data Flow

To verify data is truly dynamic:

1. **Update markets.json** - Change a probability value
2. **Restart backend** - `node backend/server.js`
3. **Refresh frontend** - Should see new probability
4. **Place prediction** - Should update probabilities via LMSR
5. **Check portfolio** - Should reflect actual stake amounts

## Conclusion

The application is fully data-driven with:
- ✅ Zero hardcoded market probabilities
- ✅ Zero hardcoded financial values
- ✅ All data from API/database
- ✅ Prices influenced by liquidity and trading
- ✅ Portfolio calculations based on actual transactions
