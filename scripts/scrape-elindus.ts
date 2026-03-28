/**
 * Standalone Elindus Market Data API Fetcher
 * 
 * Usage:  npx tsx scripts/scrape-elindus.ts
 * 
 * Uses Native Fetch (Node 18+) to retrieve Elindus market prices directly
 * from their open API without the overhead or fragility of Puppeteer UI scraping.
 * Calculates the average price exclusively for the current month.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL || 'https://lksvpkoavcmlwfkonowc.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrc3Zwa29hdmNtbHdma29ub3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODU3MzksImV4cCI6MjA4OTc2MTczOX0.s5VUHfBm7AaPxn5NwhK2LD04zJBMsy5i4ux_mF_dfAg';
const supabase = createClient(supabaseUrl, supabaseKey);
const RUN_ID = crypto.randomUUID();

interface MarketDataPoint {
  x: number;
  y: number;
  name?: string;
  fromUtc?: string;
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

async function logProgress(message: string, isError = false) {
  console.log(message);
  await supabase.from('sync_logs').insert({
    status: isError ? 'error' : 'info',
    message
  });
}

// ─────────────────────────────────────────────
// Fetcher Core
// ─────────────────────────────────────────────
async function scrapeElindusData(): Promise<ScrapedMarket[]> {
  await logProgress(`[${new Date().toISOString()}] > Start iteratie: Directe API data ophalen...`);

  const results: ScrapedMarket[] = [];
  const now = new Date();

  // Fetch from the start of the year to ensure we have current month dates covered
  const fromStr = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]; 
  const toStr = new Date(now.getFullYear() + 1, 0, 1).toISOString().split('T')[0];

  const markets = [
    { key: 'EPEX_SPOT', marketParam: 'ELECTRICITY', label: 'EPEX SPOT' },
    { key: 'TTF_DAM', marketParam: 'GAS', label: 'TTF DAM' },
  ];

  for (const m of markets) {
    try {
      // Direct API extraction from Elindus Public Engine
      const url = `https://mijn.elindus.be/marketinfo/dayahead/prices?from=${fromStr}&to=${toStr}&market=${m.marketParam}&granularity=DAY`;
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error(`Elindus API weigert verbinding (HTTP ${res.status}). Mogelijk is de URL gewijzigd.`);
      }
      
      const apiData = await res.json();
      const series = apiData.dataSeries?.data;
      
      if (!series || !Array.isArray(series)) {
        throw new Error(`Data structuur gewijzigd door Elindus. Kan geen valid data vinden voor ${m.label}.`);
      }

      await logProgress(`\u2713 Ruwe datapunten voor ${m.label} succesvol opgehaald.`);

      // ── FILTER: We filteren expliciet op de "huidige maand" tot en met "vandaag" ──
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      const currentMonthData = series.filter((p: any) => {
        if (typeof p.y !== 'number') return false;
        return p.x >= startOfMonth && p.x <= endOfToday;
      });

      let avgPrice = null;
      let maxPrice = null;
      let minPrice = null;

      if (currentMonthData.length > 0) {
        const yValues = currentMonthData.map((p: any) => p.y);
        avgPrice = yValues.reduce((a, b) => a + b, 0) / yValues.length;
        maxPrice = Math.max(...yValues);
        minPrice = Math.min(...yValues);
      } else {
        // Trigger een error log als er ineens geen data meer in de huidige actuele view zit
        await logProgress(`! Waarschuwing: Geen actuele maand-data gevonden voor ${m.label}. Controleer of Elindus hun timestamp (x) formaat heeft veranderd.`, true);
      }

      results.push({
        indicator_name: m.key,
        value: avgPrice,
        max_price: maxPrice,
        min_price: minPrice,
        avg_day_price: null,
        avg_night_price: null,
        unit: 'MWh',
        hourly_data: currentMonthData,
      });

      // Small respect delay
      await new Promise(r => setTimeout(r, 1000));
    } catch (err: any) {
       // Log explicitly as error to trigger Admin Dashboard warnings
       await logProgress(`! Scanner Fout bij ${m.label}: ${err.message}`, true);
    }
  }

  await logProgress(`✓ Scrape iteratie voltooid — ${results.length}/2 markten uitgelezen.`);
  return results;
}

// ─────────────────────────────────────────────
// Database Persistence
// ─────────────────────────────────────────────
async function saveToSupabase(markets: ScrapedMarket[]) {
  const nowIso = new Date().toISOString();
  await logProgress('> Prijzen wegschrijven naar de actuele Market Prices tabellen...');

  if (markets.length === 0) return { success: false };

  // 1. Upsert current specific monthly prices
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
    await logProgress(`x Fout bij overschrijven current prices: ${upsertError.message}`, true);
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
    await logProgress(`! Fout bij vasthouden geschiedenis data: ${historyError.message}`, true);
  }

  await logProgress('✓ Geupdate API marktdata succesvol en verwerkt online geplaatst.');
  return { success: true, historyLogged: !historyError };
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════');
  console.log(' Elindus Raw API Scraper — Node.js');
  console.log(`  ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════');
  
  await logProgress('> Start: Elindus API Data Fetcher gestart.', false);

  try {
    const markets = await scrapeElindusData();

    if (markets.length === 0) {
      await logProgress('x Kritieke netwerkfout: 0 markten ingeladen. Scan faalt.', true);
      process.exit(1);
    }

    const result = await saveToSupabase(markets);

    // Summary terminal
    console.log('\nSummary (Maandgemiddelde tot vandaag):');
    for (const m of markets) {
      console.log(`  ${m.indicator_name}: ${m.value?.toFixed(2) ?? 'N/A'} euro/MWh (${m.hourly_data?.length ?? 0} data-points meegerekend)`);
    }

    if (!result.success) {
      await logProgress('x Externe Opslag Fout: Kon data niet naar centrale database sturen.', true);
      process.exit(1);
    }

    process.exit(0);
  } catch (error: any) {
    await logProgress(`x Onverwachte System Fout: ${error.message}`, true);
    process.exit(1);
  }
}

main();
