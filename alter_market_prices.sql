ALTER TABLE market_prices
ADD COLUMN updated_by TEXT DEFAULT 'Systeem',
ADD COLUMN updated_by_avatar TEXT;
