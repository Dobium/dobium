// ============================================================================
// DOBIUM ENGINE — CLI Entry Point
// ============================================================================
//
// Usage (called by Node.js via child_process):
//
//   echo '{"command":"settle","stake":100,"probability":0.5,"did_win":true}' \
//     | ./dobium-engine
//
//   echo '{"command":"breakdown","stake":100,"probability":0.25}' \
//     | ./dobium-engine
//
//   echo '{"command":"resolve","winning_outcome_id":"YES","trades":[...]}' \
//     | ./dobium-engine
//
//   echo '{"command":"invest","b":100,"q_yes":0,"q_no":0,"side":"YES","stake":50}' \
//     | ./dobium-engine
//
// All commands read JSON from stdin and write JSON to stdout.
// Errors are returned as {"error":"..."} with exit code 1.
// ============================================================================

use std::io::{self, Read};
use serde::{Deserialize, Serialize};
use serde_json;
use dobium_engine::{
    payout::{settle_trade, resolve_market, trade_breakdown, TradeInput, PLATFORM_FEE},
    pricing::LmsrMarket,
};

// ── Command envelope ─────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(tag = "command", rename_all = "snake_case")]
enum Command {
    /// Settle a single trade             → PayoutResult (partial)
    Settle {
        stake: f64,
        probability: f64,
        did_win: bool,
    },
    /// Full trade preview breakdown      → TradeBreakdown
    Breakdown {
        stake: f64,
        probability: f64,
    },
    /// Resolve all trades in a market    → ResolutionResult
    Resolve {
        winning_outcome_id: String,
        trades: Vec<TradeInput>,
    },
    /// Invest on YES/NO in an LMSR market → InvestResult + new state
    Invest {
        b: f64,
        q_yes: f64,
        q_no: f64,
        side: String,
        stake: f64,
    },
    /// Get current probability from market state → { probability, probability_percent }
    Probability {
        b: f64,
        q_yes: f64,
        q_no: f64,
    },
}

// ── Response helpers ──────────────────────────────────────────────────────────

fn ok(payload: impl Serialize) {
    println!("{}", serde_json::to_string(&payload).unwrap_or_else(|e| {
        format!("{{\"error\":\"serialization failed: {e}\"}}")
    }));
}

fn err(msg: &str) {
    eprintln!("dobium-engine error: {msg}");
    println!("{{\"error\":\"{msg}\"}}");
    std::process::exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

fn main() {
    // Read all of stdin
    let mut input = String::new();
    if let Err(e) = io::stdin().read_to_string(&mut input) {
        err(&format!("failed to read stdin: {e}"));
        return;
    }

    let input = input.trim();
    if input.is_empty() {
        err("empty input — send a JSON command via stdin");
        return;
    }

    // Parse the command
    let cmd: Command = match serde_json::from_str(input) {
        Ok(c) => c,
        Err(e) => {
            err(&format!("invalid JSON command: {e}. Input was: {input}"));
            return;
        }
    };

    match cmd {
        // ── settle ────────────────────────────────────────────────────────────
        Command::Settle { stake, probability, did_win } => {
            let (payout, platform_rev, formula) =
                settle_trade(stake, probability, did_win, PLATFORM_FEE);
            ok(serde_json::json!({
                "payout": payout,
                "platform_revenue": platform_rev,
                "formula": formula,
                "won": did_win,
                "stake": stake,
                "probability": probability,
            }));
        }

        // ── breakdown ─────────────────────────────────────────────────────────
        Command::Breakdown { stake, probability } => {
            let bd = trade_breakdown(stake, probability, PLATFORM_FEE);
            ok(bd);
        }

        // ── resolve ───────────────────────────────────────────────────────────
        Command::Resolve { winning_outcome_id, trades } => {
            let result = resolve_market(&trades, &winning_outcome_id);
            ok(result);
        }

        // ── invest ────────────────────────────────────────────────────────────
        Command::Invest { b, q_yes, q_no, side, stake } => {
            let mut market = LmsrMarket { b, q_yes, q_no };
            let result = market.invest(&side, stake);
            ok(serde_json::json!({
                "invest_result": result,
                "new_state": market.state(),
            }));
        }

        // ── probability ───────────────────────────────────────────────────────
        Command::Probability { b, q_yes, q_no } => {
            let market = LmsrMarket { b, q_yes, q_no };
            let p = market.probability();
            ok(serde_json::json!({
                "probability": p,
                "probability_percent": p * 100.0,
                "state": market.state(),
            }));
        }
    }
}
