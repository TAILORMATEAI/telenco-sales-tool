import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCwIcon as RefreshCw, PlayIcon } from '../components/Icons';
import LoginBackgroundWaves, { DEFAULT_WAVES } from '../components/LoginBackgroundWaves';

interface SyncLog {
  id: string;
  created_at: string;
  run_id: string;
  message: string;
}

export default function LiveSyncTerminal({ onSyncComplete }: { onSyncComplete: () => void }) {
  const [liveLogs, setLiveLogs] = useState<SyncLog[]>([]);
  const [historyLogs, setHistoryLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentLogs = async () => {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data && !error) setHistoryLogs(data); // Newest first for history list
  };

  // Track the latest log ID we've already shown to avoid duplicates during polling
  const lastLogIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    fetchRecentLogs();

    // Subscribe to realtime logs (primary channel)
    const channel = supabase
      .channel('sync_logs_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sync_logs' },
        (payload) => {
          const newLog = payload.new as SyncLog;
          lastLogIdRef.current = newLog.id;
          setLiveLogs((prev) => [...prev.slice(-49), newLog]);
          setHistoryLogs((prev) => [newLog, ...prev.slice(0, 99)]);

          if (newLog.message.includes('succesvol afgerond') || newLog.message.includes('Fatale fout') || newLog.message.includes('Scrape complete') || newLog.message.includes('🏁')) {
            setIsSyncing(false);
            onSyncComplete();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onSyncComplete]);

  // Polling fallback: when scan is active, poll every 3s for new logs
  // This works even if Realtime is not enabled on the table
  useEffect(() => {
    if (!isSyncing) return;

    const pollInterval = setInterval(async () => {
      const query = supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      const { data } = await query;
      if (!data || data.length === 0) return;

      // Only take logs newer than what we've already seen
      setLiveLogs(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const fresh = data.filter(l => !existingIds.has(l.id));
        if (fresh.length === 0) return prev;
        lastLogIdRef.current = fresh[fresh.length - 1].id;
        return [...prev, ...fresh].slice(-50);
      });

      setHistoryLogs(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const fresh = data.filter(l => !existingIds.has(l.id));
        if (fresh.length === 0) return prev;
        return [...fresh.reverse(), ...prev].slice(0, 100);
      });

      // Check for completion signal
      const doneLog = data.find(l =>
        l.message.includes('succesvol afgerond') ||
        l.message.includes('Fatale fout') ||
        l.message.includes('🏁')
      );
      if (doneLog) {
        setIsSyncing(false);
        onSyncComplete();
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isSyncing, onSyncComplete]);

  const handleStartSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setError(null);
    setLiveLogs([]); // Clear live logs for new run

    try {
      const response = await fetch('/api/trigger-sync', { method: 'POST' });
      const text = await response.text();
      let data: any = {};

      try {
        if (text) data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server fout (Geen JSON): ${text.slice(0, 150)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `Netwerkfout: ${response.statusText}`);
      }

      // Poll GitHub Actions until the run completes (max 5 min)
      const startTime = Date.now();
      const MAX_WAIT_MS = 5 * 60 * 1000;
      const POLL_INTERVAL_MS = 5000;

      const pollCompletion = async () => {
        if (Date.now() - startTime > MAX_WAIT_MS) {
          setIsSyncing(false);
          await fetchRecentLogs();
          onSyncComplete();
          return;
        }

        try {
          const statusRes = await fetch('/api/scan-status');
          const statusData = await statusRes.json();
          if (statusData.status === 'completed' || statusData.status === 'success' || statusData.status === 'failure' || statusData.status === 'cancelled') {
            setIsSyncing(false);
            await fetchRecentLogs();
            onSyncComplete();
            return;
          }
        } catch (_) {}

        setTimeout(pollCompletion, POLL_INTERVAL_MS);
      };

      setTimeout(pollCompletion, POLL_INTERVAL_MS);

    } catch (err: any) {
      setError(err.message);
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">Market Scan</h3>
          <p className="text-sm text-slate-400">Automatische marktprijzen synchronisatie met Elindus</p>
        </div>
        <div className="flex items-center gap-3">
          {isSyncing && (
            <button
              onClick={async () => { 
                setIsSyncing(false); 
                setError('Scan handmatig geannuleerd.'); 
                try { await fetch('/api/cancel-sync', { method: 'POST' }); } catch(err) {} 
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-rose-500 font-bold text-sm hover:bg-slate-100 hover:border-slate-300 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 9H9v6h6z" /></svg>
              Stop Scan
            </button>
          )}
          <button
            onClick={handleStartSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
            {isSyncing ? 'Scan is bezig...' : 'Start Market Scan'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0 mt-0.5"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
          <div>
            <p className="font-bold">Kon Market Scan niet starten.</p>
            <p className="text-rose-500 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Terminal UI */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-64">
        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
            </div>
            <span className="ml-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Market Scan</span>
          </div>
          {isSyncing && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
            </div>
          )}
        </div>

        <div className="p-0 font-mono text-sm overflow-hidden flex-1 flex flex-col bg-slate-50 relative z-0">
          <AnimatePresence mode="wait">
            {liveLogs.length === 0 ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, backgroundColor: isSyncing ? "#ffffff" : "rgba(255, 255, 255, 0)" }}
                exit={{ opacity: 0, filter: "brightness(2) blur(10px)", backgroundColor: "#ffffff" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden bg-slate-50/50"
              >
                <AnimatePresence>
                  {isSyncing && (
                    <motion.div
                      key="waves"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 z-0 bg-white grayscale"
                    >
                      <LoginBackgroundWaves config={DEFAULT_WAVES} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative z-10 flex flex-col items-center text-center px-4">
                  {isSyncing ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#E74B4D] rounded-full animate-spin mx-auto mb-3" />
                      <h4 className="font-bold text-slate-800">Start Market Scan...</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-[250px]">Marktgegevens ophalen en synchroniseren. Een ogenblik geduld aub.</p>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h4 className="font-bold text-slate-400">Marktprijzen Systeem</h4>
                      <p className="text-xs text-slate-400/70 mt-1">Druk op Start om de scan uit te voeren</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="live-logs"
                initial={{ opacity: 0, filter: "brightness(2) blur(5px)" }}
                animate={{ opacity: 1, filter: "brightness(1) blur(0px)" }}
                transition={{ duration: 0.6 }}
                className="space-y-2 relative z-20 w-full h-full p-4 overflow-y-auto bg-slate-50/50"
              >
                <AnimatePresence>
                  {liveLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-3 text-xs ${log.message.includes('❌') || log.message.includes('Fatale fout') ? 'text-rose-600 font-medium' :
                          log.message.includes('✅') || log.message.includes('🏁') ? 'text-emerald-600 font-medium' :
                            log.message.includes('🚀') ? 'text-blue-600 font-bold' :
                              'text-slate-600'
                        }`}
                    >
                      <span className="text-slate-400 shrink-0 select-none">[{new Date(log.created_at).toLocaleTimeString('nl-BE')}]</span>
                      <span className="break-words">{log.message}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isSyncing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 text-slate-400 mt-4 animate-pulse text-xs">
                    <span className="shrink-0">[{new Date().toLocaleTimeString('nl-BE')}]</span>
                    <span>Wachten op scraper componenten...</span>
                  </motion.div>
                )}
                <div style={{ float: "left", clear: "both" }} ref={(el) => { el?.scrollIntoView({ behavior: 'smooth' }) }}></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Historical Logs List */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h4 className="font-bold text-slate-800">Systeem Logboek</h4>
          <p className="text-xs text-slate-500">Historische weergave van alle netwerk- en applicatie-interacties.</p>
        </div>
        <div className="h-64 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
          {historyLogs.map(log => (
            <div key={log.id} className="flex gap-3 text-xs">
              <span className="text-slate-400 shrink-0">[{new Date(log.created_at).toLocaleString('nl-BE')}]</span>
              <span className={`break-words ${
                log.message.includes('✅') || log.message.includes('🏁') ? 'text-emerald-600 font-medium' : 
                log.message.includes('❌') || log.message.includes('Fatale fout') ? 'text-rose-600 font-medium' : 
                'text-slate-600'
              }`}>{log.message}</span>
            </div>
          ))}
          {historyLogs.length === 0 && (
            <div className="text-slate-400 text-center py-8">Geen historische logs gevonden.</div>
          )}
        </div>
      </div>
    </div>
  );
}
