-- Maak de nieuwe energy_orders tabel aan
CREATE TABLE energy_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  
  -- Berekening Info
  energy_type TEXT,
  customer_type TEXT,
  meter_type TEXT, -- 'ENKEL' of 'TWEEVOUDIG'
  elec_consumption_mwh NUMERIC,
  elec_dag_mwh NUMERIC,
  elec_nacht_mwh NUMERIC,
  gas_consumption_mwh NUMERIC,
  has_solar BOOLEAN,
  comparison_view TEXT, -- 'ENECO' of 'ELINDUS'
  commission_code TEXT,
  
  -- Klantgegevens
  company_name TEXT,
  vat_number TEXT,
  first_name TEXT,
  last_name TEXT,
  birth_date TEXT,
  phone TEXT,
  email TEXT,
  
  -- Verbruiksadres
  connection_street TEXT,
  connection_house_number TEXT,
  connection_bus TEXT,
  connection_postal_code TEXT,
  connection_city TEXT,
  
  -- Facturatieadres
  billing_same BOOLEAN DEFAULT TRUE,
  billing_street TEXT,
  billing_house_number TEXT,
  billing_bus TEXT,
  billing_postal_code TEXT,
  billing_city TEXT
);

-- RLS Security (Row Level Security) aanzetten
ALTER TABLE energy_orders ENABLE ROW LEVEL SECURITY;

-- Verkopers kunnen enkel hun eigen bonnen bekijken en aanmaken
CREATE POLICY "Users can manage their own orders" ON energy_orders
  FOR ALL USING (auth.uid() = user_id);

-- Admins kunnen alles bekijken en beheren
CREATE POLICY "Admins have full access to all orders" ON energy_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
