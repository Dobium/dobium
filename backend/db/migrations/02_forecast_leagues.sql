-- Dobium Forecast Leagues
-- Leagues are standalone seasonal containers over existing markets. No event FK is
-- used so they can cover sports, politics, entertainment, finance, tech, and any
-- future category.

CREATE TABLE IF NOT EXISTS platform_configs (
    key VARCHAR(80) PRIMARY KEY,
    value DECIMAL(12,4) NOT NULL DEFAULT 0
);

INSERT INTO platform_configs (key, value) VALUES
    ('league_max_stake', 1000),
    ('called_it_probability_threshold', 0.25),
    ('called_it_min_points', 250),
    ('default_early_multiplier', 2.0),
    ('default_standard_multiplier', 1.0),
    ('default_late_multiplier', 0.5)
ON CONFLICT (key) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx
    ON users (lower(username))
    WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS forecast_leagues (
    id VARCHAR(12) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    admin_user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL DEFAULT 'seasonal',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'locked', 'completed')),
    prediction_lock TIMESTAMP NOT NULL,
    season_start TIMESTAMP NOT NULL,
    season_end TIMESTAMP NOT NULL,
    invite_code VARCHAR(16) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS league_timing_windows (
    id VARCHAR(12) PRIMARY KEY,
    league_id VARCHAR(12) NOT NULL REFERENCES forecast_leagues(id) ON DELETE CASCADE,
    label VARCHAR(80) NOT NULL,
    tier VARCHAR(2) NOT NULL DEFAULT 'B',
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    multiplier DECIMAL(6,3) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS league_members (
    id VARCHAR(12) PRIMARY KEY,
    league_id VARCHAR(12) NOT NULL REFERENCES forecast_leagues(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    final_rank INTEGER,
    final_score DECIMAL(12,2),
    UNIQUE (league_id, user_id)
);

CREATE TABLE IF NOT EXISTS league_predictions (
    id VARCHAR(12) PRIMARY KEY,
    league_id VARCHAR(12) NOT NULL REFERENCES forecast_leagues(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    market_id VARCHAR(50) NOT NULL REFERENCES markets(id),
    outcome_id VARCHAR(50) NOT NULL REFERENCES outcomes(id),
    real_prediction_id VARCHAR(50) REFERENCES predictions(id),
    p_entry DECIMAL(8,5) NOT NULL,
    stake_amount DECIMAL(10,2) NOT NULL,
    allocation_pct DECIMAL(6,2) NOT NULL DEFAULT 0,
    stake_weight DECIMAL(8,5) NOT NULL DEFAULT 0,
    timing_window_id VARCHAR(12) REFERENCES league_timing_windows(id),
    timing_multiplier DECIMAL(6,3) NOT NULL DEFAULT 1,
    difficulty_multiplier DECIMAL(8,4) NOT NULL DEFAULT 1,
    conviction_multiplier DECIMAL(8,4) NOT NULL DEFAULT 1,
    hold_factor DECIMAL(6,3) NOT NULL DEFAULT 1,
    exit_quality DECIMAL(8,4) NOT NULL DEFAULT 1,
    base_points DECIMAL(12,2) NOT NULL DEFAULT 0,
    exit_points DECIMAL(12,2) NOT NULL DEFAULT 0,
    resolution_points DECIMAL(12,2) NOT NULL DEFAULT 0,
    final_points DECIMAL(12,2) NOT NULL DEFAULT 0,
    was_correct BOOLEAN,
    is_called_it BOOLEAN NOT NULL DEFAULT FALSE,
    position_status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (position_status IN ('open', 'partial_exit', 'exited', 'resolved')),
    predicted_outcome VARCHAR(160) NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS position_exits (
    id VARCHAR(12) PRIMARY KEY,
    league_id VARCHAR(12) NOT NULL REFERENCES forecast_leagues(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    prediction_id VARCHAR(12) NOT NULL REFERENCES league_predictions(id) ON DELETE CASCADE,
    market_id VARCHAR(50) NOT NULL REFERENCES markets(id),
    p_entry DECIMAL(8,5) NOT NULL,
    p_exit DECIMAL(8,5) NOT NULL,
    stake_amount_sold DECIMAL(10,2) NOT NULL,
    allocation_pct_sold DECIMAL(6,2) NOT NULL DEFAULT 0,
    held_duration_pct DECIMAL(6,3) NOT NULL DEFAULT 1,
    exit_quality DECIMAL(8,4) NOT NULL DEFAULT 1,
    hold_factor DECIMAL(6,3) NOT NULL DEFAULT 1,
    exit_points DECIMAL(12,2) NOT NULL DEFAULT 0,
    exit_type VARCHAR(20) NOT NULL DEFAULT 'partial' CHECK (exit_type IN ('partial', 'full', 'forced')),
    exited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS league_scores (
    id VARCHAR(12) PRIMARY KEY,
    league_id VARCHAR(12) NOT NULL REFERENCES forecast_leagues(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    total_points DECIMAL(12,2) NOT NULL DEFAULT 0,
    accuracy_pct DECIMAL(6,2) NOT NULL DEFAULT 0,
    calibration_score DECIMAL(6,2) NOT NULL DEFAULT 0,
    calibration_tier VARCHAR(20) NOT NULL DEFAULT 'Unrated',
    called_it_count INTEGER NOT NULL DEFAULT 0,
    timing_tier VARCHAR(2) NOT NULL DEFAULT 'B',
    conviction_tier VARCHAR(20) NOT NULL DEFAULT 'Medium',
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    archetype VARCHAR(40) NOT NULL DEFAULT 'Consensus',
    league_rank INTEGER,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (league_id, user_id)
);

CREATE TABLE IF NOT EXISTS called_it_registry (
    id VARCHAR(12) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id),
    league_id VARCHAR(12) NOT NULL REFERENCES forecast_leagues(id) ON DELETE CASCADE,
    market_id VARCHAR(50) NOT NULL REFERENCES markets(id),
    p_entry DECIMAL(8,5) NOT NULL,
    timing_tier VARCHAR(2) NOT NULL DEFAULT 'B',
    points_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, league_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_forecast_leagues_status ON forecast_leagues(status);
CREATE INDEX IF NOT EXISTS idx_league_members_user ON league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_league_predictions_league_user ON league_predictions(league_id, user_id);
CREATE INDEX IF NOT EXISTS idx_league_predictions_market ON league_predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_position_exits_prediction ON position_exits(prediction_id);
CREATE INDEX IF NOT EXISTS idx_league_scores_rank ON league_scores(league_id, league_rank);
CREATE INDEX IF NOT EXISTS idx_called_it_user ON called_it_registry(user_id);

CREATE OR REPLACE VIEW league_leaderboard AS
WITH prediction_counts AS (
    SELECT league_id, user_id, COUNT(*) AS prediction_count
    FROM league_predictions
    GROUP BY league_id, user_id
)
SELECT
    s.league_id,
    s.user_id,
    u.username,
    s.total_points,
    s.accuracy_pct,
    s.calibration_score,
    s.calibration_tier,
    s.called_it_count,
    s.timing_tier,
    s.conviction_tier,
    s.correct_count,
    s.wrong_count,
    s.archetype,
    pc.prediction_count,
    RANK() OVER (PARTITION BY s.league_id ORDER BY s.total_points DESC, s.accuracy_pct DESC, s.called_it_count DESC) AS league_rank
FROM league_scores s
JOIN users u ON u.id = s.user_id
JOIN prediction_counts pc ON pc.league_id = s.league_id AND pc.user_id = s.user_id
WHERE pc.prediction_count >= 3;
