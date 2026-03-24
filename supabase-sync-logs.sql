-- Create the `sync_logs` table
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    run_id UUID NOT NULL,
    message TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (from the scraper)
CREATE POLICY "Allow anon insert to sync_logs" ON public.sync_logs
    FOR INSERT WITH CHECK (true);

-- Allow anonymous reads (for the frontend live sequence) 
CREATE POLICY "Allow anon read from sync_logs" ON public.sync_logs
    FOR SELECT USING (true);

-- Allow anonymous deletes (to cleanup old logs)
CREATE POLICY "Allow anon delete from sync_logs" ON public.sync_logs
    FOR DELETE USING (true);

-- ENABLE REALTIME FOR THIS TABLE
-- First check if the publication 'supabase_realtime' exists, if so add the table:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sync_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_logs;
  END IF;
END $$;
