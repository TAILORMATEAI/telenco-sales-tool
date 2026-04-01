-- Voeg injectie-kolommen toe aan de energy_orders tabel
-- Voer dit uit in de Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

ALTER TABLE energy_orders
  ADD COLUMN IF NOT EXISTS elec_injection_mwh NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elec_current_injection_price_mwh NUMERIC DEFAULT 0;

-- Optioneel: verwijder overbodige dag/nacht injectie marktprijzen als die als rijen in market_prices staan
-- DELETE FROM market_prices WHERE indicator_name IN (
--   'ENECO_RES_INJ_ELEC_DAG',
--   'ENECO_RES_INJ_ELEC_NACHT',
--   'ENECO_SOHO_INJ_ELEC_DAG',
--   'ENECO_SOHO_INJ_ELEC_NACHT'
-- );
