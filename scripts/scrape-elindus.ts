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

// ─────────────────────────────────────────────
// Config — from env vars or fallback defaults
// ─────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL || 'https://lksvpkoavcmlwfkonowc.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc3Zwa29hdmNtbHdma29ub3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODU3MzksImV4cCI6MjA4OTc2MTczOX0.s5VUHfBm7AaPxn5NwhK2LD04zJBMsy5i4ux_mF_dfAg';
const supabase = createClient(supabaseUrl, supabaseKey);

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

function humanDelay() {
  const ms = 3000 + Math.floor(Math.random() * 4000);
  return delay(ms);
}

// ─────────────────────────────────────────────
// Scraper
// ─────────────────────────────────────────────
async function scrapeElindusData(): Promise<ScrapedMarket[]> {
  console.log(`[${new Date().toISOString()}] 🔄 Starting Elindus scrape...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
  });

  const page = await browser.newPage();

  // Anti-detection
  const viewportWidth = 1280 + Math.floor(Math.random() * 400);
  const viewportHeight = 800 + Math.floor(Math.random() * 200);
  await page.setViewport({ width: viewportWidth, height: viewportHeight });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  );

  // Storage for intercepted API data
  const intercepted: Record<string, MarketApiResponse> = {};

  page.on('response', async (response) => {
    const url = response.url();
    if (response.status() !== 200) return;

    try {
      if (url.includes('/marketinfo/dayahead/prices') && url.includes('market=ELECTRICITY')) {
        intercepted['EPEX_SPOT'] = await response.json();
        console.log('  ✅ Intercepted EPEX SPOT');
      }
      if (url.includes('/marketinfo/dayahead/prices') && url.includes('market=GAS')) {
        intercepted['TTF_DAM'] = await response.json();
        console.log('  ✅ Intercepted TTF DAM');
      }
      if (url.includes('/marketinfo/fixed/prices') && url.includes('market=ELECTRICITY')) {
        intercepted['ENDEX'] = await response.json();
        console.log('  ✅ Intercepted ENDEX');
      }
      if (url.includes('/marketinfo/fixed/prices') && url.includes('market=GAS')) {
        intercepted['TTF_ENDEX'] = await response.json();
        console.log('  ✅ Intercepted TTF ENDEX');
      }
    } catch {
      // Not JSON — skip
    }
  });

  // Navigate to main page (triggers EPEX SPOT)
  await page.goto('https://klant.elindus.be/s/marktinformatie?language=nl_NL', {
    waitUntil: 'networkidle2',
    timeout: 45000,
  });
  await humanDelay();

  // Navigate to each remaining market page
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

    await delay(5000 + Math.floor(Math.random() * 5000));

    try {
      console.log(`  🔄 Navigating to ${market.label}...`);
      await page.goto(market.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await humanDelay();

      if (intercepted[market.key]) {
        console.log(`  ✅ ${market.label} captured`);
      } else {
        console.log(`  ⚠️ No data for ${market.label}`);
      }
    } catch {
      console.log(`  ⚠️ Failed to navigate to ${market.label}`);
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

  console.log(`✅ Scrape complete — ${results.length}/4 markets captured`);
  return results;
}

// ─────────────────────────────────────────────
// Save to Supabase
// ─────────────────────────────────────────────
async function saveToSupabase(markets: ScrapedMarket[]) {
  const nowIso = new Date().toISOString();

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

  console.log('✅ Saved to Supabase');
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

  try {
    const markets = await scrapeElindusData();

    if (markets.length === 0) {
      console.error('❌ No markets captured — exiting with error');
      process.exit(1);
    }

    const result = await saveToSupabase(markets);

    // Print summary
    console.log('\n📊 Summary:');
    for (const m of markets) {
      console.log(`  ${m.indicator_name}: ${m.value?.toFixed(2) ?? 'N/A'} €/MWh (${m.hourly_data?.length ?? 0} data points)`);
    }

    if (!result.success) {
      console.error('❌ Database save failed');
      process.exit(1);
    }

    console.log('\n✅ All done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
