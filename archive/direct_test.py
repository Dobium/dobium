import sys
sys.path.insert(0, '.')

from server import app
import json

# Create a test client
client = app.test_client()

# Test data
data = {
    "market_id": "drake_iceman_release",
    "outcome_id": "yes",
    "stake_amount": 10,
    "odds_at_prediction": 50,
    "user_id": "demo_user"
}

print("Testing prediction creation directly...")
print(f"Data: {json.dumps(data, indent=2)}")

response = client.post('/api/predictions', 
                       data=json.dumps(data),
                       content_type='application/json')

print(f"\nStatus: {response.status_code}")
print(f"Response: {response.get_json()}")

if response.status_code != 201:
    print("\nERROR OCCURRED!")
