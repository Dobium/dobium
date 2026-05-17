import json
from datetime import datetime

markets = [
    {
        "id": "drake_iceman_release",
        "title": "Will Drake release \"Iceman\" by May 15th?",
        "description": "Predict whether Drake will release his new album \"Iceman\" by May 15th, 2026.",
        "category": "entertainment",
        "status": "active",
        "close_date": "2026-05-15T00:00:00.000Z",
        "resolution_date": None,
        "outcomes": [
            {"id": "yes", "title": "Yes", "probability": 50.0, "total_stake": 0},
            {"id": "no", "title": "No", "probability": 50.0, "total_stake": 0}
        ],
        "total_volume": 0,
        "image_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
        "winning_outcome_id": None,
        "search_keywords": "drake iceman album release date music hip hop rap",
        "price_history": [
            {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "prices": {"yes": 50.0, "no": 50.0}
            }
        ]
    },
    {
        "id": "drake_iceman_sales",
        "title": "How many units will \"Iceman\" sell in its first week?",
        "description": "Predict the first-week sales numbers for Drake's \"Iceman\" album. The album dropped on 5/15 at 11 PM CST, and this market will resolve exactly one week later on 5/22 at 11 PM CST.",
        "category": "entertainment",
        "status": "active",
        "close_date": "2026-05-23T04:00:00.000Z",
        "resolution_date": None,
        "outcomes": [
            {"id": "under_300k", "title": "Under 300K", "probability": 25.0, "total_stake": 0},
            {"id": "300k_500k", "title": "300K - 500K", "probability": 25.0, "total_stake": 0},
            {"id": "500k_700k", "title": "500K - 700K", "probability": 25.0, "total_stake": 0},
            {"id": "over_700k", "title": "Over 700K", "probability": 25.0, "total_stake": 0}
        ],
        "total_volume": 0,
        "image_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
        "winning_outcome_id": None,
        "search_keywords": "drake iceman album sales first week units music",
        "price_history": [
            {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "prices": {
                    "under_300k": 25.0,
                    "300k_500k": 25.0,
                    "500k_700k": 25.0,
                    "over_700k": 25.0
                }
            }
        ]
    },
    {
        "id": "drake_iceman_streaming",
        "title": "Will \"Iceman\" break the streaming record in the first 24 hours?",
        "description": "Will Drake's \"Iceman\" break the record for most streams in the first 24 hours?",
        "category": "entertainment",
        "status": "active",
        "close_date": "2026-05-20T00:00:00.000Z",
        "resolution_date": None,
        "outcomes": [
            {"id": "yes", "title": "Yes", "probability": 50.0, "total_stake": 0},
            {"id": "no", "title": "No", "probability": 50.0, "total_stake": 0}
        ],
        "total_volume": 0,
        "image_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
        "winning_outcome_id": None,
        "search_keywords": "drake iceman streaming record spotify apple music 24 hours",
        "price_history": [
            {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "prices": {"yes": 50.0, "no": 50.0}
            }
        ]
    },
    {
        "id": "drake_iceman_features",
        "title": "Who will be featured in Drake's \"Iceman\"?",
        "description": "Predict which artists will be featured on Drake's \"Iceman\" album.",
        "category": "entertainment",
        "status": "active",
        "close_date": "2026-05-15T00:00:00.000Z",
        "resolution_date": None,
        "outcomes": [
            {"id": "kendrick", "title": "Kendrick Lamar", "probability": 20.0, "total_stake": 0},
            {"id": "travis", "title": "Travis Scott", "probability": 20.0, "total_stake": 0},
            {"id": "21savage", "title": "21 Savage", "probability": 20.0, "total_stake": 0},
            {"id": "future", "title": "Future", "probability": 20.0, "total_stake": 0},
            {"id": "other", "title": "Other Artist", "probability": 20.0, "total_stake": 0}
        ],
        "total_volume": 0,
        "image_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
        "winning_outcome_id": None,
        "search_keywords": "drake iceman features collaborations kendrick travis 21savage future",
        "price_history": [
            {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "prices": {
                    "kendrick": 20.0,
                    "travis": 20.0,
                    "21savage": 20.0,
                    "future": 20.0,
                    "other": 20.0
                }
            }
        ]
    }
]

# Write to markets.json
with open('data/markets.json', 'w') as f:
    json.dump(markets, f, indent=2)

print("Successfully created 4 Drake Iceman markets!")
