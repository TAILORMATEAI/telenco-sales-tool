/**
 * Standalone Elindus Market Data Scraper
 * 
 * Usage:  npx tsx scripts/scrape-elindus.ts
 * 
 * Uses Puppeteer to navigate Elindus market pages,
 * intercepts API responses, and upserts data to Supabase.
 * 
 * Environment variables (set via GitHub Secrets):
 *   SUPABASE_URL  — Supabase project URL
 *   SUPABASE_KEY  — Supabase anon/public key
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ─────────────────────────────────────────────
// Config — from env vars or fallback defaults
// ─────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL || 'https://lksvpkoavcmlwfkonowc.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc3Zwa29hdmNtbHdma29ub3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODU3MzksImV4cCI6MjA4OTc2MTczOX0.s5VUHfBm7AaPxn5NwhK2LD04zJBMsy5i4ux_mF_dfAg';
const supabase = createClient(supabaseUrl, supabaseKey);
const RUN_ID = crypto.randomUUID();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface MarketDataPoint {
  x: number;
  y: number;
  name?: string;
  fromUtc?: string;
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
// Utilities
// ─────────────────────────────────────────────
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logProgress(message: string) {
  console.log(message);
  await supabase.from('sync_logs').insert({
    status: 'info',
    message
  });
}

function humanDelay() {
  const ms = 3000 + Math.floor(Math.random() * 4000);
  return delay(ms);
}

// ─────────────────────────────────────────────
// Scraper
// ─────────────────────────────────────────────

// Rotating pool of realistic Chrome/Firefox/Safari user agents
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
];

async function scrapeElindusData(): Promise<ScrapedMarket[]> {
  await logProgress(`[${new Date().toISOString()}] > Start iteratie: Browser opstarten...`);

  const selectedUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const viewportWidth = 1280 + Math.floor(Math.random() * 400);
  const viewportHeight = 800 + Math.floor(Math.random() * 200);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      `--window-size=${viewportWidth},${viewportHeight}`,
      '--disable-infobars',
    ],
  });

  const page = await browser.newPage();

  // Mask WebDriver fingerprint (prevents bot detection via navigator.webdriver)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    (window as any).chrome = { runtime: {} };
  });

  await page.setViewport({ width: viewportWidth, height: viewportHeight });
  await page.setUserAgent(selectedUA);

  // Realistic browser headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'nl-BE,nl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  });

  // Storage for intercepted API data
  const intercepted: Record<string, MarketApiResponse> = {};

  page.on('response', async (response) => {
    const url = response.url();
    if (response.status() !== 200) return;

    try {
      if (url.includes('/marketinfo/dayahead/prices') && url.includes('market=ELECTRICITY')) {
        intercepted['EPEX_SPOT'] = await response.json();
        await logProgress('\u2713 Data voor EPEX SPOT (Elektriciteit Variabel) ontvangen.');
      }
      if (url.includes('/marketinfo/dayahead/prices') && url.includes('market=GAS')) {
        intercepted['TTF_DAM'] = await response.json();
        await logProgress('\u2713 Data voor TTF DAM (Aardgas Variabel) ontvangen.');
      }
      if (url.includes('/marketinfo/fixed/prices') && url.includes('market=ELECTRICITY')) {
        intercepted['ENDEX'] = await response.json();
        await logProgress('\u2713 Data voor ENDEX (Elektriciteit Vast) ontvangen.');
      }
      if (url.includes('/marketinfo/fixed/prices') && url.includes('market=GAS')) {
        intercepted['TTF_ENDEX'] = await response.json();
        await logProgress('\u2713 Data voor TTF ENDEX (Aardgas Vast) ontvangen.');
      }
    } catch {
      // Not JSON — skip
    }
  });

  // Navigate to main page (triggers EPEX SPOT)
  await logProgress('> Navigeren naar hoofdpagina Elindus Marktinformatie...');
  await page.goto('https://klant.elindus.be/s/marktinformatie?language=nl_NL', {
    waitUntil: 'networkidle2',
    timeout: 45000,
  });
  await humanDelay();

  // Navigate to each remaining market page with wider random delays (6–12s)
  const marketPages = [
    { url: 'https://klant.elindus.be/s/marktinformatie/endex', key: 'ENDEX', label: 'ENDEX' },
    { url: 'https://klant.elindus.be/s/marktinformatie/ttf-dam', key: 'TTF_DAM', label: 'TTF DAM' },
    { url: 'https://klant.elindus.be/s/marktinformatie/ttf-endex', key: 'TTF_ENDEX', label: 'TTF ENDEX' },
  ];

  for (const market of marketPages) {
    if (intercepted[market.key]) {
      await logProgress(`> ${market.label} reeds opgehaald, volgende pagina...`);
      continue;
    }

    await delay(6000 + Math.floor(Math.random() * 6000));

    try {
      await logProgress(`> Navigeren naar tabblad ${market.label}...`);
      await page.goto(market.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await humanDelay();

      if (intercepted[market.key]) {
        await logProgress(`\u2713 ${market.label} succesvol onderschept.`);
      } else {
        await logProgress(`! Geen data ontvangen voor ${market.label}.`);
      }
    } catch (err: any) {
      await logProgress(`! Fout bij navigeren naar ${market.label}: ${err.message}`);
    }
  }

  await browser.close();

  // Build results
  const results: ScrapedMarket[] = [];

  for (const [name, apiData] of Object.entries(intercepted)) {
    const stats = apiData?.statistics;
    const series = apiData?.dataSeries?.data || null;

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

  await logProgress(`✓ Scrape iteratie voltooid — ${results.length}/4 markten succesvol uitgelezen.`);
  return results;
}

// ─────────────────────────────────────────────
// Save to Supabase
// ─────────────────────────────────────────────
async function saveToSupabase(markets: ScrapedMarket[]) {
  const nowIso = new Date().toISOString();
  await logProgress('> Data voorbereiden voor opslag in Supabase database...');

  // 1. Upsert current prices
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
    await logProgress(`x Fout bij updaten van huidige prijzen: ${upsertError.message}`);
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
    await logProgress(`! Fout bij schrijven naar geschiedenis log: ${historyError.message}`);
  }

  await logProgress('✓ Alle marktdata succesvol opgeslagen in database.');
  return { success: true, historyLogged: !historyError };
}

// ─────────────────────────────────────────────
// Main — run and exit
// ─────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════');
  console.log(' Elindus Market Scraper — GitHub Action');
  console.log(`  ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════');
  
  await logProgress('> Start: GitHub Actions Script geinitialiseerd.');

  try {
    const markets = await scrapeElindusData();

    if (markets.length === 0) {
      console.error('x No markets captured — exiting with error');
      process.exit(1);
    }

    const result = await saveToSupabase(markets);

    // Print summary
    console.log('\nSummary:');
    for (const m of markets) {
      console.log(`  ${m.indicator_name}: ${m.value?.toFixed(2) ?? 'N/A'} euro/MWh (${m.hourly_data?.length ?? 0} data points)`);
    }

    if (!result.success) {
      await logProgress('x Fatale fout tijdens database operations.');
      process.exit(1);
    }

    await logProgress('Scraper succesvol afgerond! Proces wordt afgesloten.');
    process.exit(0);
  } catch (error: any) {
    await logProgress(`x Onverwachte fout: ${error.message}`);
    process.exit(1);
  }
}

main();
