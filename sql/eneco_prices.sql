-- Eneco prijzen toevoegen aan market_prices tabel
-- Voer dit uit in de Supabase SQL Editor

-- Residentieel (Particulier) tarieven
INSERT INTO market_prices (indicator_name, value, unit, last_updated)
VALUES
  ('ENECO_RES_ELEC_VAST', 0, 'MWh', NOW()),
  ('ENECO_RES_ELEC_VARIABEL', 0, 'MWh', NOW()),
  ('ENECO_RES_GAS_VAST', 0, 'MWh', NOW()),
  ('ENECO_RES_GAS_VARIABEL', 0, 'MWh', NOW())
ON CONFLICT (indicator_name) DO NOTHING;

-- SOHO tarieven
INSERT INTO market_prices (indicator_name, value, unit, last_updated)
VALUES
  ('ENECO_SOHO_ELEC_VAST', 0, 'MWh', NOW()),
  ('ENECO_SOHO_ELEC_VARIABEL', 0, 'MWh', NOW()),
  ('ENECO_SOHO_GAS_VAST', 0, 'MWh', NOW()),
  ('ENECO_SOHO_GAS_VARIABEL', 0, 'MWh', NOW())
ON CONFLICT (indicator_name) DO NOTHING;

-- Oude ENDEX / TTF ENDEX rijen verwijderen (optioneel)
DELETE FROM market_prices WHERE indicator_name IN ('ENDEX', 'TTF_ENDEX');

-- Oude 4-field Eneco entries verwijderen als die al bestonden
DELETE FROM market_prices WHERE indicator_name IN ('ENECO_ELEC_VAST', 'ENECO_ELEC_VARIABEL', 'ENECO_GAS_VAST', 'ENECO_GAS_VARIABEL');
