"""
SAMSA - Python Backend Server
Flask-based API for prediction markets
"""

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
import json
import uuid
import math
from datetime import datetime
from functools import wraps

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Configuration
PORT = int(os.environ.get('PORT', 3001))
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
MARKETS_PATH = os.path.join(DATA_DIR, 'markets.json')
PREDICTIONS_PATH = os.path.join(DATA_DIR, 'predictions.json')

# ============================================================================
# DATA STORE UTILITIES
# ============================================================================

def read_json(file_path: str) -> list:
    """Read JSON data from file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def write_json(file_path: str, data: list) -> None:
    """Write JSON data to file"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def generate_id(length: int = 12) -> str:
    """Generate a unique ID similar to nanoid"""
    return uuid.uuid4().hex[:length]

# ============================================================================
# LMSR ENGINE (Python Implementation)
# ============================================================================

class LMSRMarket:
    """
    LMSR Market Class
    Implements the Logarithmic Market Scoring Rule for prediction markets
    """
    
    PLATFORM_FEE = 0.01  # 1% platform fee
    
    def __init__(self, b: float = 100, initial_probability: float = 0.5):
        self.b = b
        self.q_yes = 0.0
        self.q_no = 0.0
        
        if initial_probability != 0.5:
            clamped_p = max(0.01, min(0.99, initial_probability))
            self.q_yes = b * math.log(clamped_p / (1 - clamped_p))
    
    def get_probability(self) -> float:
        """Get current market probability for YES outcome"""
        e_yes = math.exp(self.q_yes / self.b)
        e_no = math.exp(self.q_no / self.b)
        return e_yes / (e_yes + e_no)
    
    def invest(self, side: str, stake: float) -> float:
        """Risk-weighted investment on YES or NO"""
        p = self.get_probability()
        delta_q = stake * (1 - p)
        
        if side.upper() == "YES":
            self.q_yes += delta_q
        else:
            self.q_no += delta_q
        
        new_p = self.get_probability()
        return max(0.05, min(0.95, new_p))
    
    def get_state(self) -> dict:
        """Get market state for persistence"""
        return {
            'q_yes': self.q_yes,
            'q_no': self.q_no,
            'b': self.b,
            'probability': self.get_probability()
        }
    
    @staticmethod
    def calc_win_profit(stake: float, probability: float, fee: float = 0.01) -> float:
        """Calculate win profit: S × (1-p) × (1-f)"""
        p = probability / 100 if probability > 1 else probability
        return stake * (1 - p) * (1 - fee)
    
    @staticmethod
    def calc_win_return(stake: float, probability: float, fee: float = 0.01) -> float:
        """Calculate total return on win"""
        return stake + LMSRMarket.calc_win_profit(stake, probability, fee)
    
    @staticmethod
    def calc_loss_amount(stake: float, probability: float) -> float:
        """Calculate loss amount: S × (1-p)"""
        p = probability / 100 if probability > 1 else probability
        return stake * (1 - p)
    
    @staticmethod
    def calc_lose_return(stake: float, probability: float) -> float:
        """Calculate refund on loss: S × p"""
        p = probability / 100 if probability > 1 else probability
        return stake * p
    
    @staticmethod
    def calc_platform_revenue(stake: float, probability: float, fee: float = 0.01) -> float:
        """Calculate platform revenue from a trade"""
        p = probability / 100 if probability > 1 else probability
        return stake * (1 - p) * fee
    
    @staticmethod
    def settle_trade(stake: float, probability: float, did_win: bool, fee: float = 0.01) -> dict:
        """Full settlement calculation"""
        p = probability / 100 if probability > 1 else probability
        
        profit = stake * (1 - p) * (1 - fee)
        platform_revenue = stake * (1 - p) * fee
        loss = stake * (1 - p)
        refund = stake * p
        
        if did_win:
            return {
                'outcome': 'WIN',
                'user_net': profit,
                'total_return': stake + profit,
                'platform_revenue': platform_revenue
            }
        else:
            return {
                'outcome': 'LOSE',
                'user_net': -loss,
                'refund': refund,
                'total_return': refund,
                'platform_revenue': 0
            }
    
    @staticmethod
    def get_trade_breakdown(stake: float, probability: float, fee: float = 0.01) -> dict:
        """Get full trade breakdown for API responses"""
        p = probability / 100 if probability > 1 else probability
        
        win_profit = LMSRMarket.calc_win_profit(stake, p, fee)
        win_return = LMSRMarket.calc_win_return(stake, p, fee)
        loss_amount = LMSRMarket.calc_loss_amount(stake, p)
        lose_return = LMSRMarket.calc_lose_return(stake, p)
        platform_revenue = LMSRMarket.calc_platform_revenue(stake, p, fee)
        
        return {
            'stake': stake,
            'probability': p,
            'probability_percent': p * 100,
            'fee': fee,
            'win': {
                'profit': round(win_profit, 2),
                'total_return': round(win_return, 2),
                'return_percent': round((win_return / stake) * 100, 2) if stake > 0 else 0
            },
            'lose': {
                'loss': round(loss_amount, 2),
                'refund': round(lose_return, 2),
                'return_percent': round((lose_return / stake) * 100, 2) if stake > 0 else 0
            },
            'platform_revenue': round(platform_revenue, 2)
        }

# Global market manager
lmsr_markets = {}

def get_or_create_market(market_id: str, b: float = 100, initial_prob: float = 0.5) -> LMSRMarket:
    """Get or create an LMSR market"""
    if market_id not in lmsr_markets:
        lmsr_markets[market_id] = LMSRMarket(b, initial_prob)
    return lmsr_markets[market_id]

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def update_price(p: float, trade_size: float, direction: str) -> float:
    """Update price based on trade size and direction"""
    k = 0.001  # sensitivity
    
    if direction == "YES":
        p += k * trade_size
    else:
        p -= k * trade_size
    
    return max(0.01, min(0.99, p))

def recompute_market_stats(market: dict) -> None:
    """Recompute market statistics after a trade"""
    total_stake = sum(o.get('total_stake', 0) for o in market['outcomes'])
    market['total_volume'] = total_stake
    
    # Normalize probabilities to ensure they sum to 100%
    total_prob = sum(o.get('probability', 0) for o in market['outcomes'])
    if total_prob > 0:
        for outcome in market['outcomes']:
            outcome['probability'] = round((outcome.get('probability', 0) / total_prob) * 100, 2)

# ============================================================================
# STATIC FILE ROUTES
# ============================================================================

@app.route('/')
def serve_index():
    """Serve the main index.html"""
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    if os.path.exists(path):
        return send_from_directory('.', path)
    return send_file('index.html')

# ============================================================================
# API ROUTES
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'ok': True, 'service': 'samsa-api-python'})

# --- Markets ---

@app.route('/api/markets', methods=['GET'])
def get_markets():
    """Get all markets"""
    markets = read_json(MARKETS_PATH)
    return jsonify(markets)

@app.route('/api/markets/<market_id>', methods=['GET'])
def get_market(market_id: str):
    """Get a specific market by ID"""
    markets = read_json(MARKETS_PATH)
    market = next((m for m in markets if m['id'] == market_id), None)
    
    if not market:
        return jsonify({'error': 'Market not found'}), 404
    
    return jsonify(market)

@app.route('/api/markets', methods=['POST'])
def create_market():
    """Create a new market"""
    data = request.get_json()
    
    title = data.get('title')
    description = data.get('description')
    category = data.get('category')
    outcomes = data.get('outcomes', [])
    image_url = data.get('image_url', '')
    search_keywords = data.get('search_keywords', '')
    close_date = data.get('close_date')
    resolution_date = data.get('resolution_date')
    
    # Validation
    if not title or not description or not category or not isinstance(outcomes, list) or len(outcomes) < 2:
        return jsonify({'error': 'Invalid market payload'}), 400
    
    markets = read_json(MARKETS_PATH)
    
    # Normalize outcomes - all start with equal probabilities
    normalized_outcomes = []
    equal_prob = round(100 / len(outcomes), 2)  # Equal probability for all outcomes
    
    for i, o in enumerate(outcomes):
        normalized_outcomes.append({
            'id': o.get('id') or generate_id(8),
            'title': o.get('title'),
            'probability': equal_prob,
            'total_stake': 0
        })
    
    market = {
        'id': generate_id(12),
        'title': title,
        'description': description,
        'category': category,
        'status': 'active',
        'close_date': close_date,
        'resolution_date': resolution_date,
        'outcomes': normalized_outcomes,
        'total_volume': 0,
        'image_url': image_url,
        'winning_outcome_id': None,
        'search_keywords': search_keywords,
        'price_history': [{
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'prices': {o['id']: o['probability'] for o in normalized_outcomes}
        }]
    }
    
    recompute_market_stats(market)
    markets.append(market)
    write_json(MARKETS_PATH, markets)
    
    return jsonify(market), 201

@app.route('/api/markets/<market_id>/resolve', methods=['POST'])
def resolve_market(market_id: str):
    """Resolve a market with a winning outcome"""
    data = request.get_json()
    winning_outcome_id = data.get('winning_outcome_id')
    
    markets = read_json(MARKETS_PATH)
    predictions = read_json(PREDICTIONS_PATH)
    
    market = next((m for m in markets if m['id'] == market_id), None)
    if not market:
        return jsonify({'error': 'Market not found'}), 404
    
    win_outcome = next((o for o in market['outcomes'] if o['id'] == winning_outcome_id), None)
    if not win_outcome:
        return jsonify({'error': 'Invalid winning_outcome_id'}), 400
    
    # Update market status
    market['status'] = 'resolved'
    market['winning_outcome_id'] = winning_outcome_id
    market['resolution_date'] = datetime.utcnow().isoformat() + 'Z'
    
    # Settle predictions using LMSR
    updated_predictions = []
    for p in predictions:
        if p['market_id'] != market_id:
            updated_predictions.append(p)
            continue
        
        won = p['outcome_id'] == winning_outcome_id
        settlement = LMSRMarket.settle_trade(
            p['stake_amount'],
            p['odds_at_prediction'],
            won
        )
        
        updated_predictions.append({
            **p,
            'status': 'won' if won else 'lost',
            'actual_return': settlement['total_return'],
            'settlement': settlement
        })
    
    write_json(PREDICTIONS_PATH, updated_predictions)
    write_json(MARKETS_PATH, markets)
    
    return jsonify({'ok': True, 'market': market})

# --- Predictions ---

@app.route('/api/predictions', methods=['GET'])
def get_predictions():
    """Get all predictions, optionally filtered by market_id"""
    predictions = read_json(PREDICTIONS_PATH)
    market_id = request.args.get('market_id')
    
    if market_id:
        predictions = [p for p in predictions if p['market_id'] == market_id]
    
    return jsonify(predictions)

@app.route('/api/predictions', methods=['POST'])
def create_prediction():
    """Create a new prediction (place a trade)"""
    try:
        data = request.get_json()
        
        market_id = data.get('market_id')
        outcome_id = data.get('outcome_id')
        stake_amount = data.get('stake_amount')
        odds_at_prediction = data.get('odds_at_prediction')
        user_id = data.get('user_id')
        
        print(f"Creating prediction: market={market_id}, outcome={outcome_id}, stake={stake_amount}")
        
        # Validation
        if not market_id or not outcome_id or not isinstance(stake_amount, (int, float)) or not isinstance(odds_at_prediction, (int, float)):
            return jsonify({'error': 'Invalid prediction payload'}), 400
        
        markets = read_json(MARKETS_PATH)
        predictions = read_json(PREDICTIONS_PATH)
        
        market = next((m for m in markets if m['id'] == market_id), None)
        if not market:
            return jsonify({'error': 'Market not found'}), 404
        
        if market['status'] != 'active':
            return jsonify({'error': 'Market is not active'}), 400
        
        outcome = next((o for o in market['outcomes'] if o['id'] == outcome_id), None)
        if not outcome:
            return jsonify({'error': 'Outcome not found'}), 404
        
        # Update price dynamically based on trade
        current_prob = outcome.get('probability', 50) / 100.0
        new_prob = update_price(current_prob, stake_amount, "YES")
        outcome['probability'] = round(new_prob * 100, 2)
        
        # Adjust other outcomes proportionally
        remaining_prob = 100 - outcome['probability']
        other_outcomes = [o for o in market['outcomes'] if o['id'] != outcome_id]
        if other_outcomes:
            total_other_prob = sum(o.get('probability', 0) for o in other_outcomes)
            if total_other_prob > 0:
                for other in other_outcomes:
                    other['probability'] = round((other.get('probability', 0) / total_other_prob) * remaining_prob, 2)
        
        # Record price history snapshot
        if 'price_history' not in market:
            market['price_history'] = []
        
        # Add current snapshot with timestamp
        snapshot = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'prices': {o['id']: o['probability'] for o in market['outcomes']}
        }
        market['price_history'].append(snapshot)
        
        # Keep only last 100 snapshots to avoid bloat
        if len(market['price_history']) > 100:
            market['price_history'] = market['price_history'][-100:]
        
        # Get LMSR breakdown for payout calculation
        breakdown = LMSRMarket.get_trade_breakdown(stake_amount, outcome['probability'])
        
        prediction = {
            'id': generate_id(12),
            'market_id': market_id,
            'outcome_id': outcome_id,
            'stake_amount': stake_amount,
            'odds_at_prediction': odds_at_prediction,
            'potential_return': round(breakdown['win']['total_return'], 2),
            'potential_profit': round(breakdown['win']['profit'], 2),
            'potential_refund': round(breakdown['lose']['refund'], 2),
            'status': 'active',
            'actual_return': 0,
            'user_id': user_id,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'lmsr_breakdown': breakdown
        }
        
        predictions.append(prediction)
        
        # Update market outcome stake
        outcome['total_stake'] = outcome.get('total_stake', 0) + stake_amount
        
        # Recalculate all probabilities from LMSR state
        recompute_market_stats(market)
        
        write_json(PREDICTIONS_PATH, predictions)
        write_json(MARKETS_PATH, markets)
        
        print(f"Prediction created successfully: {prediction['id']}")
        return jsonify(prediction), 201
    except Exception as e:
        print(f"Error creating prediction: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to create prediction: {str(e)}'}), 500

# --- LMSR API ---

@app.route('/api/lmsr/calculate', methods=['POST'])
def calculate_lmsr():
    """Calculate LMSR trade breakdown"""
    data = request.get_json()
    
    stake = data.get('stake', 0)
    probability = data.get('probability', 50)
    fee = data.get('fee', LMSRMarket.PLATFORM_FEE)
    
    breakdown = LMSRMarket.get_trade_breakdown(stake, probability, fee)
    return jsonify(breakdown)

@app.route('/api/lmsr/settle', methods=['POST'])
def settle_lmsr():
    """Settle a trade using LMSR"""
    data = request.get_json()
    
    stake = data.get('stake', 0)
    probability = data.get('probability', 50)
    did_win = data.get('did_win', False)
    fee = data.get('fee', LMSRMarket.PLATFORM_FEE)
    
    settlement = LMSRMarket.settle_trade(stake, probability, did_win, fee)
    return jsonify(settlement)

@app.route('/api/lmsr/market/<market_id>', methods=['GET'])
def get_lmsr_market_state(market_id: str):
    """Get LMSR market state"""
    if market_id not in lmsr_markets:
        return jsonify({'error': 'LMSR market not found'}), 404
    
    return jsonify(lmsr_markets[market_id].get_state())

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print(f"Samsa API (Python) listening on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)

