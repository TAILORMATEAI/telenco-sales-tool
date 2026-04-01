-- Rename table from energy_orders to pendings
ALTER TABLE energy_orders RENAME TO pendings;

-- Let op: Policies op een tabel blijven (meestal) gewoon behouden na rename in Postgres,
-- maar we updaten even voor de zekerheid de RLS policies in onze source bestanden!
