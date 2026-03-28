// Vercel Serverless Handler — API routes only (no Vite, no Puppeteer)
import express from 'express';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lksvpkoavcmlwfkonowc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc3Zwa29hdmNtbHdma29ub3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODU3MzksImV4cCI6MjA4OTc2MTczOX0.s5VUHfBm7AaPxn5NwhK2LD04zJBMsy5i4ux_mF_dfAg';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());

// ── Health ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Trigger market scan via GitHub Actions ──
app.post(['/api/trigger-sync', '/api/sync-prices'], async (_req, res) => {
  try {
    if (!process.env.GITHUB_PAT) {
      throw new Error('Geen GITHUB_PAT gevonden in environment variabelen.');
    }
    const response = await fetch('https://api.github.com/repos/TAILORMATEAI/telenco-sales-tool/actions/workflows/scrape-elindus.yml/dispatches', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ref: 'main' })
    });
    if (!response.ok) throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    res.json({ success: true, message: 'GitHub Action pipeline gestart.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Cancel active GitHub Action scan ──
app.post('/api/cancel-sync', async (_req, res) => {
  try {
    if (!process.env.GITHUB_PAT) return res.json({ success: false, message: 'Geen GITHUB_PAT.' });
    const runsRes = await fetch('https://api.github.com/repos/TAILORMATEAI/telenco-sales-tool/actions/runs?event=workflow_dispatch&status=in_progress', {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `token ${process.env.GITHUB_PAT}` }
    });
    const runsData = await runsRes.json();
    const runs = runsData.workflow_runs || [];
    for (const run of runs) {
      await fetch(`https://api.github.com/repos/TAILORMATEAI/telenco-sales-tool/actions/runs/${run.id}/cancel`, {
        method: 'POST',
        headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `token ${process.env.GITHUB_PAT}` }
      });
    }
    res.json({ success: true });
  } catch { res.json({ success: false }); }
});

// ── Scan status ──
app.get('/api/scan-status', async (_req, res) => {
  try {
    if (!process.env.GITHUB_PAT) return res.json({ status: 'unknown' });
    const runsRes = await fetch('https://api.github.com/repos/TAILORMATEAI/telenco-sales-tool/actions/workflows/scrape-elindus.yml/runs?per_page=1', {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `token ${process.env.GITHUB_PAT}` }
    });
    const runsData = await runsRes.json();
    const latestRun = runsData.workflow_runs?.[0];
    if (!latestRun) return res.json({ status: 'unknown' });
    res.json({ status: latestRun.conclusion || latestRun.status, run_id: latestRun.id, updated_at: latestRun.updated_at });
  } catch { res.json({ status: 'unknown' }); }
});

// ── Market prices ──
app.get('/api/market-prices', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('market_prices').select('*').order('indicator_name');
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch market prices.' });
  }
});

// ── Save market price overrides ──
app.post('/api/save-market-overrides', express.json(), async (req, res) => {
  try {
    const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const client = serviceKey ? createClient(supabaseUrl, serviceKey) : supabase;
    const { overrides } = req.body;
    const { error } = await client.from('market_prices').upsert(overrides, { onConflict: 'indicator_name' });
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Clear sync logs ──
app.delete('/api/clear-sync-logs', async (_req, res) => {
  try {
    const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const client = serviceKey ? createClient(supabaseUrl, serviceKey) : supabase;
    const { error } = await client.from('sync_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Admin: Get Auth Users ──
app.get('/api/admin/auth-users', async (_req, res) => {
  const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Geen SERVICE_ROLE sleutel gevonden.' });
  const adminClient = createClient(supabaseUrl, serviceKey);
  try {
    const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;
    const mapped = (data?.users || []).map(u => ({
      id: u.id,
      email: u.email,
      email_confirmed_at: u.email_confirmed_at || u.confirmed_at || null,
      last_sign_in_at: u.last_sign_in_at || null
    }));
    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: Create user ──
app.post('/api/admin/create-user', express.json(), async (req, res) => {
  const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Geen SERVICE_ROLE sleutel gevonden.' });
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { email, firstName, lastName, role, avatarId } = req.body;
  try {
    const { data: user, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName, role: role || 'user' },
      redirectTo: `${process.env.VITE_SITE_URL || 'http://localhost:3000'}/wachtwoord`
    });
    if (authError) throw authError;
    if (user?.user?.id) {
      await adminClient.from('profiles').upsert({
        id: user.user.id, email, role: role || 'user',
        first_name: firstName, last_name: lastName,
        avatar_id: avatarId || 'gradient-1', is_active: true, is_archived: false
      }, { onConflict: 'id' });
    }
    res.json({ success: true, user: user.user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Admin: Update user ──
app.post('/api/admin/update-user', express.json(), async (req, res) => {
  const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Geen SERVICE_ROLE sleutel gevonden.' });
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { id, firstName, lastName, avatarId, role } = req.body;
  try {
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(id);
    if (userError || !userData?.user) throw new Error('Gebruiker niet gevonden.');
    const { data: existingProfile } = await adminClient.from('profiles').select('*').eq('id', id).single();
    const resolvedRole = role || existingProfile?.role || (userData.user.user_metadata?.role || 'user');
    const { error } = await adminClient.from('profiles').upsert({
      id, email: existingProfile?.email || userData.user.email,
      first_name: firstName, last_name: lastName, avatar_id: avatarId,
      role: resolvedRole,
      is_active: existingProfile?.is_active ?? true,
      is_archived: existingProfile?.is_archived ?? false,
    }, { onConflict: 'id' });
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Admin: Toggle user status ──
app.post('/api/admin/toggle-user-status', express.json(), async (req, res) => {
  const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Geen SERVICE_ROLE sleutel gevonden.' });
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { id, is_active, is_archived } = req.body;
  try {
    const { error } = await adminClient.from('profiles').update({ is_active, is_archived }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Admin: Hard delete user ──
app.post('/api/admin/hard-delete-user', express.json(), async (req, res) => {
  const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Geen SERVICE_ROLE sleutel gevonden.' });
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { id } = req.body;
  try {
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default app;
