import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { GREY_WAVES } from '../components/LoginBackgroundWaves';
import LoginBackgroundWaves from '../components/LoginBackgroundWaves';
import { useNavigate } from 'react-router-dom';

export default function RecenteActiviteit() {
  const { lang, t } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const navigate = useNavigate();

  const backButton = (
    <button onClick={() => navigate('/')} className="flex shrink-0 items-center justify-center w-[clamp(1.5rem,4vw,2rem)] h-[clamp(1.5rem,4vw,2rem)] 2xl:w-[clamp(2rem,1.5vw,2.5rem)] 2xl:h-[clamp(2rem,1.5vw,2.5rem)] bg-white rounded-full shadow-sm hover:shadow-md hover:scale-[1.05] active:scale-[0.95] transition-all border border-slate-200">
      <svg className="w-[clamp(0.875rem,2vw,1.125rem)] h-[clamp(0.875rem,2vw,1.125rem)] 2xl:w-[clamp(1rem,1vw,1.25rem)] 2xl:h-[clamp(1rem,1vw,1.25rem)] text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
    </button>
  );

  useEffect(() => {
    const fetchLogs = async () => {
      setLogsLoading(true);
      const [ { data: lData }, { data: oData } ] = await Promise.all([
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('energy_orders').select('*').order('created_at', { ascending: false }).limit(50)
      ]);
      
      const combinedLogs = [];

      if (lData) {
        combinedLogs.push(...lData.map(l => ({ ...l, type: 'activity', actionDate: l.created_at })));
      }
      if (oData) {
        combinedLogs.push(...oData.map(o => ({
           id: `order_${o.id}`,
           user_id: o.user_id,
           user_email: o.user_email,
           action: 'ORDER_CREATED',
           energy_type: o.energy_type,
           customer_type: o.customer_type,
           created_at: o.created_at,
           actionDate: o.created_at,
           commission_code: o.commission_code,
           type: 'order'
        })));
      }
      
      const filteredLogs = combinedLogs.filter(l => !(l.type === 'activity' && (l.action === 'ORDER_CREATED' || l.action === 'ENERGY_ORDER')));
      const sortedLogs = filteredLogs.sort((a,b) => new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime()).slice(0, 50);

      if (sortedLogs.length > 0) {
        const uids = Array.from(new Set(sortedLogs.map(l => l.user_id).filter(Boolean)));
        const { data: pData } = await supabase.from('profiles').select('id, first_name, last_name, avatar_id').in('id', uids);
        const logsWithProfiles = sortedLogs.map(l => ({
          ...l,
          profiles: pData?.find(p => p.id === l.user_id) || null
        }));
        setLogs(logsWithProfiles);
      } else {
        setLogs([]);
      }
      setLogsLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div className="relative min-h-[100dvh] bg-slate-50 overflow-hidden flex flex-col font-outfit">
      <div className="absolute inset-0 z-0 opacity-50 pointer-events-none">
        <LoginBackgroundWaves config={GREY_WAVES} useGradient={false} />
      </div>
      <div className="flex-1 flex flex-col w-full z-10" style={{ zoom: 0.8 }}>
        <Header actionButton={backButton} />
        <main className="relative z-10 flex-1 w-full flex flex-col items-center">
        <div className="w-full max-w-4xl min-[2000px]:max-w-5xl mx-auto px-[clamp(1rem,4vw,1.5rem)] py-[clamp(0.5rem,2vh,2rem)]">
          <div className="w-full mb-[clamp(1rem,2vw,1.5rem)]">
            <h1 className="text-[clamp(1.25rem,3.5vw,2rem)] font-black text-slate-700 tracking-tight">{t?.recentActivity || 'Recente Activiteit'}</h1>
            <div className="h-1 w-[clamp(3rem,8vw,5rem)] bg-gradient-to-r from-slate-300 to-transparent mt-[clamp(0.5rem,1vw,0.75rem)] rounded-full"></div>
          </div>

          <div className="w-full bg-white rounded-[clamp(1rem,4vw,2rem)] sm:rounded-[clamp(1rem,2vh,2rem)] shadow-sm border border-slate-100 p-[clamp(1rem,3vw,1.5rem)] sm:p-[clamp(1.5rem,2vh,2rem)] flex flex-col">
            {logsLoading ? (
            <div className="flex-1 flex py-20 items-center justify-center">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="flex flex-col gap-4">
              {logs.map(log => {
                const actionIsOrder = log.action === 'ORDER_CREATED' || log.action === 'ENERGY_ORDER';
                const name = log.profiles?.first_name || log.user_email.split('@')[0];
                
                const d = new Date(log.actionDate || log.created_at);
                const pad = (n: number) => String(n).padStart(2, '0');
                const timeText = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                
                const eTypeRaw = log.energy_type?.toUpperCase() || '';
                const eType = eTypeRaw === 'BOTH' ? 'E/G' : eTypeRaw === 'ELEC' ? 'E' : eTypeRaw === 'GAS' ? 'G' : (log.energy_type || 'Energie');
                const roleText = actionIsOrder && log.customer_type ? ` · ${log.customer_type}` : '';

                return (
                  <div key={log.id} className="flex items-center gap-[clamp(0.5rem,2vw,1rem)] w-full bg-slate-50/50 p-[clamp(0.5rem,2vw,0.75rem)] rounded-xl border border-slate-100/50 hover:bg-slate-50 transition-colors">
                    <div className="w-[clamp(1.75rem,5vw,2.5rem)] h-[clamp(1.75rem,5vw,2.5rem)] rounded-full border border-slate-200 overflow-hidden shrink-0 bg-white shadow-sm">
                      {log.profiles?.avatar_id ? (
                        <img src={log.profiles.avatar_id} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-[clamp(10px,2vw,12px)] uppercase">
                          {name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[clamp(11px,2.5vw,14px)] font-black text-slate-600 truncate">
                        {name}
                      </p>
                      <p className="text-[clamp(9px,2vw,12px)] text-slate-400 capitalize truncate mt-0.5">
                        {actionIsOrder ? `${eType}${roleText}` : `Berekening - ${eType}`}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end justify-center">
                      {actionIsOrder && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <svg className="w-[clamp(10px,2vw,14px)] h-[clamp(10px,2vw,14px)] text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="bg-gradient-to-r from-[#E5394C] to-[#c73a3c] text-white px-2 py-0.5 rounded text-[clamp(8px,1.5vw,10px)] font-black tracking-widest uppercase shadow-sm shadow-[#E5394C]/20">Energie</span>
                        </div>
                      )}
                      <span className="text-[clamp(8px,1.5vw,10px)] font-bold text-slate-300">{timeText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <p className="text-slate-400 font-bold text-[clamp(0.875rem,2.5vw,1.25rem)]">{t?.noActivityYet || (lang === 'NL' ? 'Nog geen recente activiteit' : 'Aucune activité récente')}</p>
              <p className="text-slate-300 mt-2 text-[clamp(0.75rem,1.5vw,1rem)]">{t?.activityWillAppear || (lang === 'NL' ? 'Activiteiten verschijnen hier automatisch.' : 'Les activités apparaîtront ici automatiquement.')}</p>
            </div>
          )}
        </div>
        </div>
      </main>
      </div>
    </div>
  );
}
