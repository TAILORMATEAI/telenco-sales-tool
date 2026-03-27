-- Veilige RLS (Row Level Security) Policies
-- Kopieer alles hieronder en plak het in de Supabase "SQL Editor" -> "New query" en klik op RUN.

-- 1. BEVEILIG de [sales_logs] (Dit is je meest gevoelige table!)
-- Iedereen mocht dit lezen/verwijderen. Nu: Alleen Ingelogde mensen.
DROP POLICY IF EXISTS "Allow anon all on sales_logs" ON sales_logs;
CREATE POLICY "Allow logged in users to read sales_logs" ON sales_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow logged in users to insert sales_logs" ON sales_logs FOR INSERT TO authenticated WITH CHECK (true);
-- Opmerking: Verwijderen en Updaten (DELETE/UPDATE) in sales_logs doen we niet openbaar, dat mag alleen via Vercel of de Service Role!

-- 2. BEVEILIG de [market_prices]
-- De scraper (elindus tool) zal via een service role updaten, dus de voorkant mag alléén lezen als ze ingelogd zijn.
DROP POLICY IF EXISTS "Allow anon all on market_prices" ON market_prices;
CREATE POLICY "Allow logged in users to read market_prices" ON market_prices FOR SELECT TO authenticated USING (true);

-- 3. BEVEILIG de [app_settings]
DROP POLICY IF EXISTS "Allow anon all on app_settings" ON app_settings;
CREATE POLICY "Allow logged in users to read app_settings" ON app_settings FOR SELECT TO authenticated USING (true);

-- 4. BEVEILIG de [sync_logs] 
-- Alleen ingelogden mogen sync logs zien en manipuleren
DROP POLICY IF EXISTS "Allow anon read from sync_logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Allow anon insert to sync_logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Allow anon delete from sync_logs" ON public.sync_logs;

CREATE POLICY "Allow logged in read sync_logs" ON public.sync_logs FOR SELECT TO authenticated USING (true);
