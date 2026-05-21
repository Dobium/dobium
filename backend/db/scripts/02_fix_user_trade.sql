-- Fix for the user who invested $500 at 6% and saw their value decrease.
-- Since the custom math formula inherently evaluates $500 at 6% to ~$86.40,
-- we must manually adjust the database record to correct their portfolio value.

-- OPTION 1 (Recommended): Refund the trade so they get their $500 buying power back
UPDATE predictions
SET status = 'refunded'
WHERE user_id = '<REPLACE_WITH_USER_ID>' 
  AND market_id = '<REPLACE_WITH_MARKET_ID>'
  AND stake_amount = 500
  AND status = 'active';

-- OPTION 2: Keep it active but artificially inflate the stake so the math outputs $500.
-- (Multiplier at 6% entry/current is 0.1728. Stake needed = $500 / 0.1728 = $2893.52)
-- UPDATE predictions SET stake_amount = 2893.52 WHERE id = '<REPLACE_WITH_PREDICTION_ID>';