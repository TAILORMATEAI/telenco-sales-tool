import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
// ─────────────────────────────────────────────
// Supabase Client
// ─────────────────────────────────────────────
const supabaseUrl = 'https://lksvpkoavcmlwfkonowc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc3Zwa29hdmNtbHdma29ub3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODU3MzksImV4cCI6MjA4OTc2MTczOX0.s5VUHfBm7AaPxn5NwhK2LD04zJBMsy5i4ux_mF_dfAg';
const supabase = createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface MarketDataPoint {
  x: number;       // timestamp
  y: number;       // price
  name?: string;   // label
  fromUtc?: string; // ISO date
}

interface MarketStatistics {
  averagePrice?: number;
  averageDayPrice?: number;
  averageNightPrice?: number;
  maxPrice?: number;
  minPrice?: number;
}

interface MarketApiResponse {
  statistics?: MarketStatistics;
  dataSeries?: {
    data?: MarketDataPoint[];
  };
}

interface ScrapedMarket {
  indicator_name: string;
  value: number | null;
  max_price: number | null;
  min_price: number | null;
  avg_day_price: number | null;
  avg_night_price: number | null;
  unit: string;
  hourly_data: MarketDataPoint[] | null;
}

// ─────────────────────────────────────────────
// Core Scraper — Uses Puppeteer Network Interception
// Navigates directly to the iframe URLs that trigger
// each market's API call, then intercepts the JSON.
// ─────────────────────────────────────────────

// The Elindus iframe base URL that hosts all market charts
const IFRAME_BASE = 'https://mijn.elindus.be';

// Each market maps to a specific iframe path + query params
const MARKET_PAGES: { name: string; path: string }[] = [
  { name: 'EPEX_SPOT',  path: '/marketinfo/electricity/variable' },
  { name: 'ENDEX',      path: '/marketinfo/electricity/fixed' },
  { name: 'TTF_DAM',    path: '/marketinfo/gas/variable' },
  { name: 'TTF_ENDEX',  path: '/marketinfo/gas/fixed' },
];

async function scrapeElindusData(): Promise<ScrapedMarket[]> {
  console.log(`[${new Date().toLocaleTimeString('nl-BE')}] 🔄 Starting Elindus scrape via network interception...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // ── Anti-detection: randomized viewport + realistic user agent ──
  const viewportWidth = 1280 + Math.floor(Math.random() * 400);   // 1280–1680
  const viewportHeight = 800 + Math.floor(Math.random() * 200);   // 800–1000
  await page.setViewport({ width: viewportWidth, height: viewportHeight });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );

  // Storage for intercepted API data
  const intercepted: Record<string, MarketApiResponse> = {};

  // Listen to ALL responses BEFORE navigating
  page.on('response', async (response) => {
    const url = response.url();
    if (response.status() !== 200) return;

    try {
      if (url.includes('/marketinfo/dayahead/prices') && url.includes('market=ELECTRICITY')) {
        intercepted['EPEX_SPOT'] = await response.json();
        console.log('  ✅ Intercepted EPEX SPOT (Elektriciteit Variabel)');
      }
      if (url.includes('/marketinfo/dayahead/prices') && url.includes('market=GAS')) {
        intercepted['TTF_DAM'] = await response.json();
        console.log('  ✅ Intercepted TTF DAM (Aardgas Variabel)');
      }
      if (url.includes('/marketinfo/fixed/prices') && url.includes('market=ELECTRICITY')) {
        intercepted['ENDEX'] = await response.json();
        console.log('  ✅ Intercepted ENDEX (Elektriciteit Vast)');
      }
      if (url.includes('/marketinfo/fixed/prices') && url.includes('market=GAS')) {
        intercepted['TTF_ENDEX'] = await response.json();
        console.log('  ✅ Intercepted TTF ENDEX (Aardgas Vast)');
      }
    } catch {
      // Not all responses are JSON — silently skip
    }
  });

  // ── Strategy: visit the main page first (sets cookies/session), ──
  // ── then navigate to each market tab with human-like delays.    ──
  
  // Step 1: Load the main Elindus page — this triggers EPEX SPOT automatically
  await page.goto('https://klant.elindus.be/s/marktinformatie?language=nl_NL', {
    waitUntil: 'networkidle2',
    timeout: 45000,
  });
  await humanDelay(); // Random 3–7 sec wait — mimic a real person reading the page

  // Step 2: Navigate to each remaining market page.
  // Each Elindus market page triggers the corresponding API call in the iframe.
  // Our network interceptor (set up above) catches ALL API responses automatically.
  const marketPages = [
    { url: 'https://klant.elindus.be/s/marktinformatie/endex', key: 'ENDEX', label: 'ENDEX' },
    { url: 'https://klant.elindus.be/s/marktinformatie/ttf-dam', key: 'TTF_DAM', label: 'TTF DAM' },
    { url: 'https://klant.elindus.be/s/marktinformatie/ttf-endex', key: 'TTF_ENDEX', label: 'TTF ENDEX' },
  ];

  for (const market of marketPages) {
    if (intercepted[market.key]) {
      console.log(`  ⏩ ${market.label} already intercepted, skipping`);
      continue;
    }

    await delay(5000 + Math.floor(Math.random() * 5000)); // 5-10s gentle delay

    try {
      console.log(`  🔄 Navigating to ${market.label} page...`);
      await page.goto(market.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await humanDelay(); // Wait for iframe API calls to fire

      if (intercepted[market.key]) {
        console.log(`  ✅ Intercepted ${market.label}`);
      } else {
        console.log(`  ⚠️ No API call intercepted for ${market.label}`);
      }
    } catch {
      console.log(`  ⚠️ Failed to navigate to ${market.label}`);
    }
  }

  await browser.close();

  // ── Build results from intercepted data ──
  const results: ScrapedMarket[] = [];

  for (const [name, apiData] of Object.entries(intercepted)) {
    const stats = apiData?.statistics;
    const series = apiData?.dataSeries?.data || null;

    // For fixed/prices endpoints, statistics is null — compute from dataSeries.data
    let avgPrice = stats?.averagePrice ?? null;
    let maxPrice = stats?.maxPrice ?? null;
    let minPrice = stats?.minPrice ?? null;

    if (!stats && series && Array.isArray(series) && series.length > 0) {
      const yValues = series.map((p: any) => p.y).filter((v: any) => typeof v === 'number');
      if (yValues.length > 0) {
        avgPrice = yValues.reduce((a: number, b: number) => a + b, 0) / yValues.length;
        maxPrice = Math.max(...yValues);
        minPrice = Math.min(...yValues);
      }
    }

    results.push({
      indicator_name: name,
      value: avgPrice,
      max_price: maxPrice,
      min_price: minPrice,
      avg_day_price: stats?.averageDayPrice ?? null,
      avg_night_price: stats?.averageNightPrice ?? null,
      unit: 'MWh',
      hourly_data: series,
    });
  }

  console.log(`[${new Date().toLocaleTimeString('nl-BE')}] ✅ Scrape complete — ${results.length} markets captured`);
  return results;
}

// ─────────────────────────────────────────────
// Save to Supabase
// ─────────────────────────────────────────────
async function saveToSupabase(markets: ScrapedMarket[]) {
  const nowIso = new Date().toISOString();

  // 1. Upsert current prices (only columns that exist in market_prices table)
  const upsertData = markets.map((m) => ({
    indicator_name: m.indicator_name,
    value: m.value,
    unit: m.unit,
    last_updated: nowIso,
  }));

  const { error: upsertError } = await supabase
    .from('market_prices')
    .upsert(upsertData, { onConflict: 'indicator_name' });

  if (upsertError) {
    console.error('❌ Failed to upsert market_prices:', upsertError);
    return { success: false, error: upsertError };
  }

  // 2. Append to history log
  const historyLog = markets.map((m) => ({
    indicator_name: m.indicator_name,
    value: m.value,
    unit: m.unit,
    scraped_at: nowIso,
  }));

  const { error: historyError } = await supabase
    .from('price_history')
    .insert(historyLog);

  if (historyError) {
    console.error('⚠️ Failed to log to price_history:', historyError);
  }

  return { success: true, historyLogged: !historyError };
}

// ─────────────────────────────────────────────
// Full Sync (Scrape + Save)
// ─────────────────────────────────────────────
async function runFullSync() {
  try {
    const markets = await scrapeElindusData();

    if (markets.length === 0) {
      console.log('⚠️ No market data intercepted — page structure might have changed.');
      return { success: false, error: 'No data intercepted' };
    }

    const dbResult = await saveToSupabase(markets);

    // Store in memory for the /api/day-prices endpoint
    lastScrapedMarkets = markets;

    const summary = markets.map((m) => ({
      indicator: m.indicator_name,
      avg: m.value,
      max: m.max_price,
      min: m.min_price,
      dataPoints: m.hourly_data?.length ?? 0,
    }));

    console.log('📊 Sync summary:', JSON.stringify(summary, null, 2));

    return {
      success: dbResult.success,
      source: 'puppeteer_network_interception',
      markets: summary,
      historyLogged: dbResult.historyLogged,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Full sync failed:', error);
    return { success: false, error: String(error) };
  }
}

// ─────────────────────────────────────────────
// Auto-Sync Scheduler — 2x per dag (elke 12 uur)
// EPEX SPOT day-ahead prijzen worden typisch
// rond 13:00 CET gepubliceerd, dus 2x is genoeg.
// ─────────────────────────────────────────────
const AUTO_SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MANUAL_COOLDOWN_MS = 30 * 60 * 1000;          // 30 minutes
let syncIntervalId: NodeJS.Timeout | null = null;
let lastSyncResult: any = null;
let lastSyncTime: string | null = null;
let isSyncing = false;
let activeSyncProcess: any = null;
let lastScrapedMarkets: ScrapedMarket[] = []; // In-memory cache of last scrape

function startAutoSync() {
  console.log(`⏰ Auto-sync enabled — running every ${AUTO_SYNC_INTERVAL_MS / (60 * 60 * 1000)} hours`);
  console.log(`🛡️ Manual sync cooldown: ${MANUAL_COOLDOWN_MS / (60 * 1000)} minutes`);

  // Run once on startup (ONLY IN PRODUCTION)
  if (process.env.NODE_ENV === 'production') {
    runFullSync().then((result) => {
      lastSyncResult = result;
      lastSyncTime = new Date().toISOString();
    });
  } else {
    console.log('⏩ LOCAL DEV: Automatische startup scrape is uitgeschakeld zodat de server direct opstart.');
  }

  // Then repeat on interval
  syncIntervalId = setInterval(async () => {
    console.log('\n⏰ Auto-sync triggered...');
    const result = await runFullSync();
    lastSyncResult = result;
    lastSyncTime = new Date().toISOString();
  }, AUTO_SYNC_INTERVAL_MS);
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Random delay between 3–7 seconds to mimic human browsing */
function humanDelay() {
  const ms = 3000 + Math.floor(Math.random() * 4000);
  return delay(ms);
}

/** Check if the manual cooldown period has passed */
function canManualSync(): { allowed: boolean; waitSeconds?: number } {
  if (!lastSyncTime) return { allowed: true };
  const elapsed = Date.now() - new Date(lastSyncTime).getTime();
  if (elapsed < MANUAL_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((MANUAL_COOLDOWN_MS - elapsed) / 1000);
    return { allowed: false, waitSeconds };
  }
  return { allowed: true };
}

/** Format a Date to YYYY-MM-DD in local timezone */
function formatDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Convert a UTC date to Belgian local date string (YYYY-MM-DD) */
function toBelgianDateStr(d: Date): string {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' }); // sv-SE gives YYYY-MM-DD
}

/** Get Belgian hour (0-23) from a UTC date */
function toBelgianHour(d: Date): number {
  return parseInt(d.toLocaleString('en-GB', { timeZone: 'Europe/Brussels', hour: '2-digit', hour12: false }));
}

/** Extract hourly prices for a specific date (Belgian time) + compute daily stats */
function extractDayPrices(hourlyData: MarketDataPoint[], dateStr: string) {
  // Filter data points matching the target date in Belgian timezone
  const dayPoints = hourlyData.filter(p => {
    const d = p.fromUtc ? new Date(p.fromUtc) : new Date(p.x);
    return toBelgianDateStr(d) === dateStr;
  });

  if (dayPoints.length === 0) {
    return { date: dateStr, available: false, avgPrice: null, maxPrice: null, minPrice: null, hours: [] };
  }

  const prices = dayPoints.map(p => p.y);
  const avgPrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
  const maxPrice = Math.round(Math.max(...prices) * 100) / 100;
  const minPrice = Math.round(Math.min(...prices) * 100) / 100;

  // Sort by Belgian hour and format
  const hours = dayPoints
    .map(p => {
      const d = p.fromUtc ? new Date(p.fromUtc) : new Date(p.x);
      const belgianHour = toBelgianHour(d);
      return {
        hour: `${String(belgianHour).padStart(2, '0')}:00`,
        price: Math.round(p.y * 100) / 100,
        _sortKey: belgianHour,
      };
    })
    .sort((a, b) => a._sortKey - b._sortKey)
    .map(({ hour, price }) => ({ hour, price }));

  return {
    date: dateStr,
    available: true,
    avgPrice,
    maxPrice,
    minPrice,
    hours,
  };
}

// ─────────────────────────────────────────────
// Express Server
// ─────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      lastSync: lastSyncTime,
      autoSyncIntervalHours: AUTO_SYNC_INTERVAL_MS / (60 * 60 * 1000),
    });
  });

  // ─────────────────────────────────────────────
  // API Endpoints
  // ─────────────────────────────────────────────

  // Legacy Sync Endpoint (Wait for result, old method)
  app.post('/api/sync-prices', async (req, res) => {
    console.log('Handmatige sync aangevraagd via oud endpoint...');
    try {
      const markets = await scrapeElindusData();
      const result = await saveToSupabase(markets);
      if (!result.success) throw new Error('Database save failed');
      res.json({ success: true, markets });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Day prices (today + tomorrow) from last scrape ──
  // GET /api/day-prices  →  serves from in-memory cache
  app.get('/api/day-prices', (_req, res) => {
    const epex = lastScrapedMarkets.find(m => m.indicator_name === 'EPEX_SPOT');

    if (!epex || !epex.hourly_data || epex.hourly_data.length === 0) {
      return res.json({
        success: false,
        error: 'Nog geen data beschikbaar. Wacht op de eerste sync.',
        lastSync: lastSyncTime,
      });
    }

    // Build day summaries
    const today = new Date();
    const todayStr = formatDateLocal(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateLocal(tomorrow);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateLocal(yesterday);

    const result = {
      success: true,
      lastSync: lastSyncTime,
      yesterday: extractDayPrices(epex.hourly_data, yesterdayStr),
      today: extractDayPrices(epex.hourly_data, todayStr),
      tomorrow: extractDayPrices(epex.hourly_data, tomorrowStr),
    };

    res.json(result);
  });

  // ── Manual sync trigger (with cooldown protection) ──
  // POST /api/sync-prices  →  scrape + save immediately
  app.post(['/api/sync-prices', '/api/trigger-sync'], async (_req, res) => {
    // Guard: cooldown check (DISABLED FOR DEVELOPMENT TESTING)
    // const cooldown = canManualSync();
    // if (!cooldown.allowed) {
    //   return res.status(429).json({
    //     success: false,
    //     error: `Cooldown actief — probeer opnieuw over ${cooldown.waitSeconds} seconden.`,
    //     retryAfterSeconds: cooldown.waitSeconds,
    //   });
    // }

    // Guard: prevent overlapping syncs
    if (isSyncing) {
      return res.status(409).json({
        success: false,
        error: 'Er loopt al een scan. Even geduld.',
      });
    }

    try {
      isSyncing = true;
      console.log('\n🔧 Manual sync requested...');

      // Hybrid Architecture: We universally trigger the dedicated GitHub Action CI Pipeline via REST API.
      // This enforces parity between local testing and Vercel production.
      if (true) {
        if (!process.env.GITHUB_PAT) {
          throw new Error('Geen GITHUB_PAT gevonden in environment variabelen. Voeg deze toe in Vercel om productie syncs te activeren.');
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
        
        if (!response.ok) {
          throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
        }

        console.log('GitHub Action workflow dispatch succesvol.');
        // We render success early; Supabase Realtime via the Action will populate the actual end-result.
        lastSyncTime = new Date().toISOString();
        res.json({ success: true, message: 'GitHub Action pipeline gestart. Check terminal logs.' });
      } else {
        // Local desktop mode: Run the explicit scraper script via child process 
        // to ensure Supabase sync_logs get populated for the UI terminal.
        activeSyncProcess = spawn(/^win/.test(process.platform) ? 'npx.cmd' : 'npx', ['tsx', 'scripts/scrape-elindus.ts'], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });
        
        activeSyncProcess.unref();
        
        res.status(200).json({ success: true, message: 'Lokale scraper succesvol gestart op de achtergrond. Check de terminal logs.' });
      }
      
    } catch (error: any) {
      console.error('Manual sync error:', error);
      res.status(500).json({ success: false, error: 'Failed to sync market data.', details: error?.message || String(error) });
    } finally {
      // Unconditionally release the lock immediately to allow uninhibited testing
      isSyncing = false;
    }
  });

  // ── Manual sync cancellation ──
  app.post('/api/cancel-sync', async (_req, res) => {
    isSyncing = false;
    try {
      if (!process.env.GITHUB_PAT) {
        return res.json({ success: false, message: 'Geen GITHUB_PAT gevonden voor annulatie.'});
      }

      const runsRes = await fetch('https://api.github.com/repos/TAILORMATEAI/telenco-sales-tool/actions/runs?event=workflow_dispatch&status=in_progress', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${process.env.GITHUB_PAT}`
        }
      });
      const runsData = await runsRes.json();
      const runs = runsData.workflow_runs || [];

      if (runs.length > 0) {
        for (const run of runs) {
          console.log(`🛑 Cancelling GitHub Action Run ID: ${run.id}`);
          await fetch(`https://api.github.com/repos/TAILORMATEAI/telenco-sales-tool/actions/runs/${run.id}/cancel`, {
            method: 'POST',
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'Authorization': `token ${process.env.GITHUB_PAT}`
            }
          });
        }
        return res.json({ success: true, message: 'Cloud Scan succesvol gestopt.' });
      }
      res.json({ success: false, message: 'Geen actieve acties gevonden.' });
    } catch(err) {
      res.json({ success: false, message: 'Fout bij annuleren actie.' });
    }
  });

  // ── Scan status: polls GitHub Actions for most recent run status ──
  app.get('/api/scan-status', async (_req, res) => {
    try {
      if (!process.env.GITHUB_PAT) {
        return res.json({ status: 'unknown' });
      }
      const runsRes = await fetch('https://api.github.com/repos/TAILORMATEAI/telenco-sales-tool/actions/workflows/scrape-elindus.yml/runs?per_page=1', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${process.env.GITHUB_PAT}`
        }
      });
      const runsData = await runsRes.json();
      const latestRun = runsData.workflow_runs?.[0];
      if (!latestRun) return res.json({ status: 'unknown' });
      // conclusion is null while in_progress, then 'success'/'failure'/'cancelled'
      const status = latestRun.conclusion || latestRun.status; // 'queued','in_progress','completed'
      res.json({ status, run_id: latestRun.id, updated_at: latestRun.updated_at });
    } catch (err) {
      res.json({ status: 'unknown' });
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

  // ── Get latest synced data ──
  // GET /api/market-prices  →  read from Supabase
  app.get('/api/market-prices', async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('indicator_name');

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      res.json({
        success: true,
        lastSync: lastSyncTime,
        data,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch market prices.' });
    }
  });

  // ── Get sync status ──
  // GET /api/sync-status  →  see last result + next scheduled run
  app.get('/api/sync-status', (_req, res) => {
    const nextSync = lastSyncTime
      ? new Date(new Date(lastSyncTime).getTime() + AUTO_SYNC_INTERVAL_MS).toISOString()
      : null;

    const cooldown = canManualSync();

    res.json({
      lastSyncTime,
      nextScheduledSync: nextSync,
      intervalHours: AUTO_SYNC_INTERVAL_MS / (60 * 60 * 1000),
      manualSyncAvailable: cooldown.allowed,
      manualCooldownSeconds: cooldown.waitSeconds ?? 0,
      isSyncing,
      lastResult: lastSyncResult,
    });
  });

  // ── Admin User Management ──

  // Fetch email confirmation status from auth.users (only accessible via service role)
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

  app.post('/api/admin/create-user', express.json(), async (req, res) => {
    const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return res.status(500).json({ error: 'Geen SERVICE_ROLE sleutel gevonden in de server omgeving.' });
    
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { email, password, firstName, lastName, role, avatarId, adminName } = req.body;
    
    try {
      const { data: user, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { first_name: firstName, last_name: lastName, role: role || 'user', inviter_name: adminName || 'Een beheerder' },
        redirectTo: `${process.env.VITE_SITE_URL || 'http://localhost:3000'}/wachtwoord`
      });

      if (authError) throw authError;
      
      if (user?.user?.id) {
        await adminClient.from('profiles').upsert({ 
          id: user.user.id,
          email: email,
          role: role || 'user',
          first_name: firstName,
          last_name: lastName,
          avatar_id: avatarId || 'gradient-1',
          is_active: true,
          is_archived: false
        }, { onConflict: 'id' });
      }
      res.json({ success: true, user: user.user });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

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

  app.post('/api/admin/update-user', express.json(), async (req, res) => {
    const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return res.status(500).json({ error: 'Geen SERVICE_ROLE sleutel gevonden.' });
    const adminClient = createClient(supabaseUrl, serviceKey);
    
    const { id, firstName, lastName, avatarId, role } = req.body;
    try {
      // Check if user exists in Auth system to derive email for new records
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(id);
      if (userError || !userData?.user) throw new Error('Gebruiker niet gevonden in Auth backend.');
      
      const userEmail = userData.user.email;
      
      // Pull current permissions if they exist
      const { data: existingProfile } = await adminClient.from('profiles').select('*').eq('id', id).single();
      
      // Determine role: use explicitly provided role, fall back to existing, then default
      const resolvedRole = role || existingProfile?.role || (userData.user.user_metadata?.role || 'user');
      
      const { error } = await adminClient.from('profiles').upsert({
        id: id,
        email: existingProfile?.email || userEmail,
        first_name: firstName,
        last_name: lastName,
        avatar_id: avatarId,
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

  // ── Presence heartbeat (bypasses RLS via service role) ──
  app.post('/api/presence', express.json(), async (req, res) => {
    const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return res.status(500).json({ error: 'No service key' });
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    try {
      const { error } = await adminClient.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', userId);
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Vite dev middleware ──
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  // Start the auto-sync scheduler
  startAutoSync();
}

startServer();
