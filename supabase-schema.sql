-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Market Prices Table
CREATE TABLE market_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indicator_name TEXT UNIQUE NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'MWh',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for market_prices
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for anon (Internal Tool)
CREATE POLICY "Allow anon all on market_prices"
ON market_prices FOR ALL
TO anon
USING (true)
WITH CHECK (true);


-- 2. App Settings Table
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value NUMERIC NOT NULL,
    description TEXT
);

-- Enable RLS for app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for anon
CREATE POLICY "Allow anon all on app_settings"
ON app_settings FOR ALL
TO anon
USING (true)
WITH CHECK (true);


-- 3. Sales Logs Table
CREATE TABLE sales_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    energy_type TEXT NOT NULL,
    consumption_kwh NUMERIC NOT NULL,
    margin_applied NUMERIC NOT NULL,
    fixed_fee NUMERIC NOT NULL,
    commission_value NUMERIC NOT NULL,
    eli_code TEXT NOT NULL
);

-- Enable RLS for sales_logs
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for anon
CREATE POLICY "Allow anon all on sales_logs"
ON sales_logs FOR ALL
TO anon
USING (true)
WITH CHECK (true);

