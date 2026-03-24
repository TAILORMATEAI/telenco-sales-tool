import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowPathIcon as RefreshCw, PlayIcon } from '@heroicons/react/24/outline';

interface SyncLog {
  id: string;
  created_at: string;
  run_id: string;
  message: string;
}

export default function LiveSyncTerminal({ onSyncComplete }: { onSyncComplete: () => void }) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentLogs = async () => {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data && !error) setLogs(data.reverse()); // Show oldest to newest in the log window
  };

  useEffect(() => {
    fetchRecentLogs();

    // Subscribe to realtime logs
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sync_logs' },
        (payload) => {
          const newLog = payload.new as SyncLog;
          setLogs((prev) => [...prev.slice(-49), newLog]); // Keep max 50 logs
          
          if (newLog.message.includes('succesvol afgerond') || newLog.message.includes('Fatale fout')) {
            setIsSyncing(false);
            onSyncComplete(); // Refresh parent data when done
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onSyncComplete]);

  const handleStartSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setError(null);
    setLogs([]); // Clear logs for new run

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
    } catch (err: any) {
      setError(err.message);
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">Live Sync Terminal</h3>
          <p className="text-sm text-slate-400">Automatische marktprijzen synchronisatie met Elindus</p>
        </div>
        <div className="flex items-center gap-3">
          {isSyncing && (
            <button 
              onClick={() => { setIsSyncing(false); setError('Sync handmatig geannuleerd.'); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-rose-500 font-bold text-sm hover:bg-slate-100 hover:border-slate-300 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 9H9v6h6z" /></svg>
              Stop Sync
            </button>
          )}
          <button 
            onClick={handleStartSync} 
            disabled={isSyncing} 
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
            {isSyncing ? 'Sync is bezig...' : 'Start Handmatige Sync'}
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
        
        <div className="p-4 font-mono text-sm overflow-y-auto flex-1 flex flex-col bg-slate-50/50">
          {logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <p>Geen recente logs gevonden.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {logs.map((log) => (
                  <motion.div 
                    key={log.id} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className={`flex gap-3 text-xs ${
                      log.message.includes('❌') || log.message.includes('Fatale fout') ? 'text-rose-600 font-medium' :
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
                  <span>Wachten op scraper respons...</span>
                </motion.div>
              )}
              {/* Dummy div to scroll to bottom */}
              <div style={{ float:"left", clear: "both" }} ref={(el) => { el?.scrollIntoView({ behavior: 'smooth' }) }}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
