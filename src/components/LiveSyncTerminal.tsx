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
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
  // Track when the current scan started to filter out old logs
  const scanStartedAtRef = React.useRef<string | null>(null);

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
            setTimeout(() => setLiveLogs([]), 3000); // Clear live terminal 3s after done
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
        .gte('created_at', scanStartedAtRef.current || new Date(Date.now() - 600000).toISOString())
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
        setTimeout(() => setLiveLogs([]), 3000); // Clear live terminal 3s after done
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
    scanStartedAtRef.current = new Date().toISOString(); // Mark scan start time

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
          <h3 className="text-lg font-black text-slate-500">Market Scan</h3>
          <p className="text-sm text-slate-400">Automatische marktprijzen synchronisatie met Elindus</p>
        </div>
        <div className="flex items-center gap-3">
          {isSyncing && (
            <button
              onClick={async () => { 
                setIsSyncing(false);
                setLiveLogs([]);
                try { await fetch('/api/cancel-sync', { method: 'POST' }); } catch(_) {}
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
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

      {/* Terminal UI — shows only current active task */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-48">
        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-100 shrink-0">
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

        {/* Wave background — only visible when scanning */}
        <div className="relative flex-1 overflow-hidden bg-white">
          {isSyncing && (
            <div className="absolute inset-0 z-0 grayscale opacity-30">
              <LoginBackgroundWaves config={DEFAULT_WAVES} />
            </div>
          )}

          {/* Current task title */}
          <div className="relative z-10 flex items-center justify-center h-full px-8 text-center">
            <AnimatePresence mode="wait">
              {liveLogs.length > 0 ? (
                <motion.p
                  key={liveLogs[liveLogs.length - 1].id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="font-bold text-slate-600 text-base leading-snug max-w-md"
                >
                  {liveLogs[liveLogs.length - 1].message}
                </motion.p>
              ) : isSyncing ? (
                <motion.p
                  key="starting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-bold text-slate-500 text-sm"
                >
                  Scan opstarten via GitHub Actions...
                </motion.p>
              ) : (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium text-slate-400 text-sm"
                >
                  Klaar voor de volgende scan
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>



      {/* Historical Logs List */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-600">Systeem Logboek</h4>
            <p className="text-xs text-slate-500">Historische weergave van alle netwerk- en applicatie-interacties.</p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
            title="Wis alle logs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
        <div className="h-64 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
          {historyLogs.map(log => (
            <div key={log.id} className="flex gap-3 text-xs">
              <span className="text-slate-400 shrink-0">[{new Date(log.created_at).toLocaleString('nl-BE')}]</span>
              <span className={`break-words ${
                log.message.includes('succesvol') || log.message.includes('afgerond') || log.message.includes('✓') ? 'text-emerald-600 font-medium' : 
                log.message.includes('Fout') || log.message.includes('mislukt') || log.message.includes('fout') ? 'text-rose-600 font-medium' : 
                'text-slate-600'
              }`}>{log.message}</span>
            </div>
          ))}
          {historyLogs.length === 0 && (
            <div className="text-slate-400 text-center py-8">Geen historische logs gevonden.</div>
          )}
        </div>
      </div>

      {/* Custom confirm modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#E74B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </div>
                <h3 className="font-black text-slate-500 text-base">Systeem Logboek wissen</h3>
              </div>
              <p className="text-sm text-slate-500 mb-5">
                Dit verwijdert alle logboek-records permanent uit de database. Deze actie kan niet ongedaan worden gemaakt.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/clear-sync-logs', { method: 'DELETE' });
                    if (res.ok) {
                      setHistoryLogs([]);
                      setShowClearConfirm(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[#E74B4D] text-white font-bold text-sm hover:bg-[#c73a3c] transition-colors"
                >
                  Wis Alles
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
