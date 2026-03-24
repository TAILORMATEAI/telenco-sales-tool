import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import {
  ArrowPathIcon as RefreshCw,
  ArrowRightStartOnRectangleIcon as LogOut,
  CalculatorIcon as Calculator,
  ChartBarIcon,
  UsersIcon,
  CurrencyEuroIcon,
  ClockIcon,
  TrashIcon,
  BoltIcon as Zap,
  FireIcon as Flame
} from '@heroicons/react/24/outline';

interface MarketData {
  epexSpot: number;
  endex: number;
  ttfEndex: number;
  ttfDam: number;
  margin30to80: number;
  margin80to100: number;
  lastUpdated?: string;
}

interface ActivityLog {
  id: string;
  user_email: string;
  action: string;
  energy_type: string;
  consumption_mwh: number;
  commission_code: string;
  created_at: string;
  profiles?: { first_name?: string; last_name?: string; };
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  last_login: string;
  first_name?: string;
  last_name?: string;
}

type Tab = 'prices' | 'activity' | 'users';

export default function AdminDashboard() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('prices');

  // Market Data
  const [marketData, setMarketData] = useState<MarketData>({
    epexSpot: 65.40, endex: 72.10, ttfEndex: 35.20, ttfDam: 32.50,
    margin30to80: 15, margin80to100: 15
  });
  const [overrideData, setOverrideData] = useState<MarketData>({ ...marketData });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Activity Logs
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Users
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const fetchMarketData = async () => {
    const { data, error } = await supabase.from('market_prices').select('*');
    if (!error && data && data.length > 0) {
      const fetched: MarketData = {
        epexSpot: data.find(p => p.indicator_name === 'EPEX_SPOT')?.value || 65.40,
        endex: data.find(p => p.indicator_name === 'ENDEX')?.value || 72.10,
        ttfEndex: data.find(p => p.indicator_name === 'TTF_ENDEX')?.value || 35.20,
        ttfDam: data.find(p => p.indicator_name === 'TTF_DAM')?.value || 32.50,
        margin30to80: data.find(p => p.indicator_name === 'MARGIN_30_80')?.value || 15,
        margin80to100: data.find(p => p.indicator_name === 'MARGIN_80_100')?.value || 15,
        lastUpdated: data[0].last_updated
      };
      setMarketData(fetched);
      setOverrideData(fetched);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*, profiles(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) setLogs(data);
    setLogsLoading(false);
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('last_login', { ascending: false });
    if (!error && data) setUsers(data);
    setUsersLoading(false);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Weet je zeker dat je account ${userEmail} wilt verwijderen? Dit beëindigt hun toegang definitief.`)) return;
    
    setUsersLoading(true);
    const { error } = await supabase.rpc('delete_user_by_admin', { uid: userId });
    
    if (error) {
      console.error('Delete error', error);
      alert(`Fout bij verwijderen van gebruiker: ${error.message}`);
      setUsersLoading(false);
    } else {
      fetchUsers();
    }
  };

  useEffect(() => {
    fetchMarketData();
    fetchLogs();
    fetchUsers();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const nowIso = new Date().toISOString();
    const updates = [
      { indicator_name: 'EPEX_SPOT', value: overrideData.epexSpot, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'ENDEX', value: overrideData.endex, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'TTF_ENDEX', value: overrideData.ttfEndex, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'TTF_DAM', value: overrideData.ttfDam, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'MARGIN_30_80', value: overrideData.margin30to80, unit: '€/MWh', last_updated: nowIso },
      { indicator_name: 'MARGIN_80_100', value: overrideData.margin80to100, unit: '€/MWh', last_updated: nowIso }
    ];
    await supabase.from('market_prices').upsert(updates, { onConflict: 'indicator_name' });
    await fetchMarketData();
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'cooldown'; message: string; detail?: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'cooldown', message: string, detail?: string) => {
    setToast({ type, message, detail });
    setTimeout(() => setToast(null), 6000);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await axios.post('/api/sync-prices');
      await fetchMarketData();
      showToast('success', 'Prijzen bijgewerkt!', 'Elindus marktdata is succesvol gesynchroniseerd.');
    } catch (error: any) { 
      const serverMsg = error?.response?.data?.error || '';
      const retrySeconds = error?.response?.data?.retryAfterSeconds;
      
      if (retrySeconds) {
        const mins = Math.ceil(retrySeconds / 60);
        showToast('cooldown', `Cooldown actief`, `Probeer opnieuw over ${mins} ${mins === 1 ? 'minuut' : 'minuten'}.`);
      } else {
        showToast('error', 'Sync mislukt', serverMsg || 'Server onbereikbaar.');
      }
    }
    setIsSyncing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'prices', label: 'Marktprijzen', icon: CurrencyEuroIcon },
    { key: 'activity', label: 'Activiteiten', icon: ChartBarIcon },
    { key: 'users', label: 'Gebruikers', icon: UsersIcon },
  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
           d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  };

  const priceFields: { key: keyof MarketData; label: string; desc: string; color: string }[] = [
    { key: 'epexSpot', label: 'EPEX SPOT', desc: 'Elektriciteit Variabel', color: 'from-yellow-500 to-orange-500' },
    { key: 'endex', label: 'ENDEX', desc: 'Elektriciteit Vast', color: 'from-blue-500 to-indigo-500' },
    { key: 'ttfEndex', label: 'TTF ENDEX', desc: 'Gas Vast', color: 'from-emerald-500 to-teal-500' },
    { key: 'ttfDam', label: 'TTF DAM', desc: 'Gas Variabel', color: 'from-purple-500 to-pink-500' },
  ];

  const marginFields: { key: keyof MarketData; label: string; desc: string }[] = [
    { key: 'margin30to80', label: 'Marge 30-80 MWh', desc: 'Vaste marge voor kleine verbruikers' },
    { key: 'margin80to100', label: 'Marge 80-100 MWh', desc: 'Vaste marge voor middelgrote verbruikers' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E74B4D] to-[#c73a3c] flex items-center justify-center shadow-lg shadow-[#E74B4D]/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
              <p className="text-xs text-slate-400 font-medium">{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => navigate('/home')} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all hidden sm:flex">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6"/></svg>
              Portaal
            </button>
            <button onClick={() => navigate('/calculator')} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all">
              <Calculator className="w-4 h-4" /> <span className="hidden sm:inline">Calculator</span>
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#E74B4D] font-bold text-sm transition-all">
              <LogOut className="w-4 h-4" /> Uitloggen
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-[#E74B4D] text-white shadow-lg shadow-[#E74B4D]/20'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* PRICES TAB */}
          {activeTab === 'prices' && (
            <motion.div key="prices" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {/* Action bar */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Marktprijzen & Marges</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Laatst bijgewerkt: {marketData.lastUpdated ? formatDate(marketData.lastUpdated) : 'Nooit'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Elindus'}
                  </button>
                  <button onClick={handleSave} disabled={isSaving} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-[#E74B4D] text-white hover:bg-[#c73a3c]'} disabled:opacity-50`}>
                    {saveSuccess ? '✓ Opgeslagen' : isSaving ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>
              </div>

              {/* Market Price Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                {priceFields.map(field => (
                  <div key={field.key} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${field.color} flex items-center justify-center mb-4`}>
                      {field.desc.includes('Elek') ? <Zap className="w-5 h-5 text-white" /> : <Flame className="w-5 h-5 text-white" />}
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{field.label}</p>
                    <p className="text-[10px] text-slate-300 mb-3">{field.desc}</p>
                    <input
                      type="number"
                      step="0.01"
                      value={overrideData[field.key] as number}
                      onChange={e => setOverrideData({ ...overrideData, [field.key]: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 text-lg focus:ring-2 focus:ring-[#E74B4D]/30 focus:border-[#E74B4D] transition-all"
                    />
                    <p className="text-[10px] text-slate-300 mt-2 text-right">€/MWh</p>
                  </div>
                ))}
              </div>

              {/* Margin Cards */}
              <h3 className="text-lg font-black text-slate-900 mb-4">Vaste Marges per Categorie</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marginFields.map(field => (
                  <div key={field.key} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <p className="text-sm font-bold text-slate-700 mb-1">{field.label}</p>
                    <p className="text-xs text-slate-400 mb-4">{field.desc}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-bold text-lg">€</span>
                      <input
                        type="number"
                        step="0.5"
                        value={overrideData[field.key] as number}
                        onChange={e => setOverrideData({ ...overrideData, [field.key]: Number(e.target.value) })}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 text-lg focus:ring-2 focus:ring-[#E74B4D]/30 focus:border-[#E74B4D] transition-all"
                      />
                      <span className="text-slate-400 text-xs font-bold">/MWh</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Activiteitenlog</h2>
                  <p className="text-sm text-slate-400 mt-1">{logs.length} recente activiteiten</p>
                </div>
                <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all">
                  <RefreshCw className="w-4 h-4" /> Vernieuwen
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {logsLoading ? (
                  <div className="p-12 text-center">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-[#E74B4D] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">Laden...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="p-12 text-center">
                    <ClockIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">Nog geen activiteiten gelogd</p>
                    <p className="text-slate-300 text-sm mt-1">Activiteiten verschijnen hier zodra verkopers de calculator gebruiken.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Verkoper</th>
                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Actie</th>
                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Verbruik</th>
                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Code</th>
                        <th className="text-right px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tijdstip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => {
                        const name = log.profiles?.first_name || log.profiles?.last_name 
                          ? `${log.profiles.first_name || ''} ${log.profiles.last_name || ''}`.trim() 
                          : log.user_email;
                        return (
                        <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">{name}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                              log.action === 'CALCULATION' ? 'bg-blue-50 text-blue-600' :
                              log.action === 'LOGIN' ? 'bg-emerald-50 text-emerald-600' :
                              'bg-slate-50 text-slate-500'
                            }`}>{log.action}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{log.energy_type || '-'}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{log.consumption_mwh ? `${log.consumption_mwh} MWh` : '-'}</td>
                          <td className="px-6 py-4 text-sm font-mono text-[#E74B4D] font-bold">{log.commission_code || '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-400 text-right">{formatDate(log.created_at)}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Gebruikers</h2>
                  <p className="text-sm text-slate-400 mt-1">{users.length} geregistreerde gebruikers</p>
                </div>
                <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all">
                  <RefreshCw className="w-4 h-4" /> Vernieuwen
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {usersLoading ? (
                  <div className="col-span-full p-12 text-center">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-[#E74B4D] rounded-full animate-spin mx-auto" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-100">
                    <UsersIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">Nog geen gebruikers</p>
                  </div>
                ) : users.map(u => {
                  const name = u.first_name || u.last_name 
                    ? `${u.first_name || ''} ${u.last_name || ''}`.trim() 
                    : u.email;
                  const initial = u.first_name ? u.first_name[0].toUpperCase() : u.email ? u.email[0].toUpperCase() : '?';

                  return (
                  <div key={u.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm ${
                        u.role === 'admin' ? 'bg-gradient-to-br from-[#E74B4D] to-[#c73a3c]' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                      }`}>
                        {initial}
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        u.role === 'admin' ? 'bg-[#E74B4D]/10 text-[#E74B4D]' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Verkoper'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate" title={u.email}>{name}</p>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {u.last_login ? `Laatst actief: ${formatDate(u.last_login)}` : 'Nog niet ingelogd'}
                      </p>
                      {u.id !== profile?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Gebruiker verwijderen"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sync Notification Popup */}
      <AnimatePresence>
        {toast && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setToast(null)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
            />
            {/* Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
                {/* Static SVG wave lines decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.08]">
                  <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                    <path d="M0,80 C50,60 100,100 150,80 C200,60 250,100 300,80 C350,60 400,100 450,80" fill="none" stroke="#0ea5e9" strokeWidth="3" />
                    <path d="M0,95 C60,75 120,115 180,95 C240,75 300,115 360,95 C420,75 450,100 450,95" fill="none" stroke="#E74B4D" strokeWidth="3" />
                    <path d="M0,110 C45,90 90,130 135,110 C180,90 225,130 270,110 C315,90 360,130 405,110" fill="none" stroke="#FFC421" strokeWidth="3" />
                    <path d="M0,125 C55,105 110,145 165,125 C220,105 275,145 330,125 C385,105 440,145 450,125" fill="none" stroke="#91C848" strokeWidth="3" />
                  </svg>
                </div>

                {/* Content */}
                <div className="relative px-8 pt-10 pb-8 text-center">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
                    toast.type === 'success'
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30'
                      : toast.type === 'cooldown'
                      ? 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-lg shadow-slate-500/30'
                      : 'bg-gradient-to-br from-[#E74B4D] to-[#c73a3c] shadow-lg shadow-[#E74B4D]/30'
                  }`}>
                    {toast.type === 'success' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>
                    ) : toast.type === 'cooldown' ? (
                      <ClockIcon className="w-8 h-8 text-white" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
                    )}
                  </div>

                  {/* Message */}
                  <h3 className="text-xl font-black text-slate-900 mb-2">{toast.message}</h3>
                  {toast.detail && (
                    <p className="text-sm text-slate-400 leading-relaxed">{toast.detail}</p>
                  )}

                  {/* Button */}
                  <button
                    onClick={() => setToast(null)}
                    className={`mt-6 px-8 py-3 rounded-xl font-bold text-sm text-white transition-all ${
                      toast.type === 'success'
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : toast.type === 'cooldown'
                        ? 'bg-slate-800 hover:bg-slate-900'
                        : 'bg-[#E74B4D] hover:bg-[#c73a3c]'
                    }`}
                  >
                    Begrepen
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
