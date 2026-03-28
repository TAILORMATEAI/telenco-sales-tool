import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import LiveSyncTerminal from '../components/LiveSyncTerminal';
import AdminUsers from '../components/AdminUsers';
import DottedSurface from '../components/DottedSurface';
import {
  RefreshCwIcon as RefreshCw,
  LogoutIcon as LogOut,
  CalculatorIcon as Calculator,
  ChartBarIcon,
  UserIcon as UsersIcon,
  CurrencyEuroIcon,
  ClockIcon,
  TrashIcon,
  ZapIcon as Zap,
  FlameIcon as Flame,
  HomeIcon,
  TrophyIcon
} from '../components/Icons';

interface MarketData {
  epexSpot: number;
  ttfDam: number;
  margin30to80: number;
  margin80to100: number;
  enecoResElecVast: number;
  enecoResElecVar: number;
  enecoResGasVast: number;
  enecoResGasVar: number;
  enecoSohoElecVast: number;
  enecoSohoElecVar: number;
  enecoSohoGasVast: number;
  enecoSohoGasVar: number;
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

type Tab = 'overview' | 'prices' | 'activity' | 'users';

export default function AdminDashboard() {
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const getDisplayName = () => {
    let first = '';
    let last = '';

    if (profile?.first_name) first = profile.first_name;
    else if (user?.user_metadata?.first_name) first = user.user_metadata.first_name;

    if (profile?.last_name) last = profile.last_name;
    else if (user?.user_metadata?.last_name) last = user.user_metadata.last_name;

    if (first || last) {
      return `${first} ${last}`.trim();
    }

    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;

    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase();
    }
    return '';
  };

  // Market Data
  const [marketData, setMarketData] = useState<MarketData>({
    epexSpot: 65.40, ttfDam: 32.50,
    margin30to80: 15, margin80to100: 15,
    enecoResElecVast: 0, enecoResElecVar: 0, enecoResGasVast: 0, enecoResGasVar: 0,
    enecoSohoElecVast: 0, enecoSohoElecVar: 0, enecoSohoGasVast: 0, enecoSohoGasVar: 0
  });
  const [overrideData, setOverrideData] = useState<MarketData>({ ...marketData });
  const [inputStrings, setInputStrings] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const hasChanges = Object.keys(marketData).some(key => {
    if (key === 'lastUpdated') return false;
    return marketData[key as keyof MarketData] !== overrideData[key as keyof MarketData];
  });

  // Activity Logs
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Users
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const fetchMarketData = async () => {
    const { data, error } = await supabase.from('market_prices').select('*');
    if (!error && data && data.length > 0) {
      const find = (name: string) => data.find(p => p.indicator_name === name);
      const rp = (val: number | undefined, fb: number) => Number(Number(val ?? fb).toFixed(2));

      const fetched: MarketData = {
        epexSpot: rp(find('EPEX_SPOT')?.value, 65.40),
        ttfDam: rp(find('TTF_DAM')?.value, 32.50),
        margin30to80: rp(find('MARGIN_30_80')?.value, 15),
        margin80to100: rp(find('MARGIN_80_100')?.value, 15),
        enecoResElecVast: rp(find('ENECO_RES_ELEC_VAST')?.value, 0),
        enecoResElecVar: rp(find('ENECO_RES_ELEC_VARIABEL')?.value, 0),
        enecoResGasVast: rp(find('ENECO_RES_GAS_VAST')?.value, 0),
        enecoResGasVar: rp(find('ENECO_RES_GAS_VARIABEL')?.value, 0),
        enecoSohoElecVast: rp(find('ENECO_SOHO_ELEC_VAST')?.value, 0),
        enecoSohoElecVar: rp(find('ENECO_SOHO_ELEC_VARIABEL')?.value, 0),
        enecoSohoGasVast: rp(find('ENECO_SOHO_GAS_VAST')?.value, 0),
        enecoSohoGasVar: rp(find('ENECO_SOHO_GAS_VARIABEL')?.value, 0),
        lastUpdated: data[0].last_updated
      };
      setMarketData(fetched);
      setOverrideData(fetched);
      const s: Record<string, string> = {};
      for (const [k, v] of Object.entries(fetched)) { if (k !== 'lastUpdated') s[k] = String(v); }
      setInputStrings(s);
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

  const [syncError, setSyncError] = useState<{ message: string; time: string } | null>(null);

  const fetchSyncStatus = async () => {
    const { data } = await supabase
       .from('sync_logs')
       .select('*')
       .order('created_at', { ascending: false })
       .limit(1);
    
    if (data && data.length > 0 && data[0].status === 'error') {
       const logDate = new Date(data[0].created_at);
       const now = new Date();
       if ((now.getTime() - logDate.getTime()) < 48 * 60 * 60 * 1000) {
         setSyncError({ message: data[0].message, time: data[0].created_at });
       } else {
         setSyncError(null);
       }
    } else {
       setSyncError(null);
    }
  };

  useEffect(() => {
    fetchMarketData();
    fetchLogs();
    fetchUsers();
    fetchSyncStatus();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const nowIso = new Date().toISOString();
    const indicators: [string, number][] = [
      ['EPEX_SPOT', overrideData.epexSpot],
      ['TTF_DAM', overrideData.ttfDam],
      ['MARGIN_30_80', overrideData.margin30to80],
      ['MARGIN_80_100', overrideData.margin80to100],
      ['ENECO_RES_ELEC_VAST', overrideData.enecoResElecVast],
      ['ENECO_RES_ELEC_VARIABEL', overrideData.enecoResElecVar],
      ['ENECO_RES_GAS_VAST', overrideData.enecoResGasVast],
      ['ENECO_RES_GAS_VARIABEL', overrideData.enecoResGasVar],
      ['ENECO_SOHO_ELEC_VAST', overrideData.enecoSohoElecVast],
      ['ENECO_SOHO_ELEC_VARIABEL', overrideData.enecoSohoElecVar],
      ['ENECO_SOHO_GAS_VAST', overrideData.enecoSohoGasVast],
      ['ENECO_SOHO_GAS_VARIABEL', overrideData.enecoSohoGasVar],
    ];
    const updates = indicators.map(([name, value]) => ({
      indicator_name: name, value, unit: name.startsWith('MARGIN') ? '\u20ac/MWh' : 'MWh', last_updated: nowIso
    }));
    const { error } = await supabase.from('market_prices').upsert(updates, { onConflict: 'indicator_name' });
    if (error) {
      console.error('Save error:', error);
      showToast('error', 'Opslaan mislukt.', error.message);
    } else {
      await fetchMarketData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'cooldown'; message: string; detail?: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'cooldown', message: string, detail?: string) => {
    setToast({ type, message, detail });
    setTimeout(() => setToast(null), 6000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overzicht', icon: HomeIcon },
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
    { key: 'ttfDam', label: 'TTF DAM', desc: 'Gas Variabel', color: 'from-purple-500 to-pink-500' },
  ];

  const enecoPriceFields: { group: string; fields: { key: keyof MarketData; label: string; icon: 'elec' | 'gas' }[] }[] = [
    {
      group: 'Residentieel (Particulier)',
      fields: [
        { key: 'enecoResElecVast', label: 'Elek Vast', icon: 'elec' },
        { key: 'enecoResElecVar', label: 'Elek Variabel', icon: 'elec' },
        { key: 'enecoResGasVast', label: 'Gas Vast', icon: 'gas' },
        { key: 'enecoResGasVar', label: 'Gas Variabel', icon: 'gas' },
      ]
    },
    {
      group: 'SOHO',
      fields: [
        { key: 'enecoSohoElecVast', label: 'Elek Vast', icon: 'elec' },
        { key: 'enecoSohoElecVar', label: 'Elek Variabel', icon: 'elec' },
        { key: 'enecoSohoGasVast', label: 'Gas Vast', icon: 'gas' },
        { key: 'enecoSohoGasVar', label: 'Gas Variabel', icon: 'gas' },
      ]
    }
  ];

  const marginFields: { key: keyof MarketData; label: string; desc: string }[] = [
    { key: 'margin30to80', label: 'Marge 30-80 MWh', desc: 'Vaste marge voor kleine verbruikers' },
    { key: 'margin80to100', label: 'Marge 80-100 MWh', desc: 'Vaste marge voor middelgrote verbruikers' },
  ];

  return (
    <div className="flex flex-col sm:flex-row h-screen bg-slate-50 overflow-hidden w-full relative">
      {/* Background SVG moved outside the zoom wrapper to stay unscaled */}
      <div className="absolute top-0 left-0 w-full h-[60vh] sm:h-[50vh] bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 z-[0] overflow-hidden pointer-events-none">
        <svg className="absolute bottom-0 w-full min-w-[1200px]" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ transform: 'translateY(2px)' }}>
          <path fill="#cbd5e1" fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,149.3C672,149,768,203,864,224C960,245,1056,235,1152,213.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="#e2e8f0" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,186.7C672,171,768,117,864,117.3C960,117,1056,171,1152,192C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="#f8fafc" d="M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,229.3C672,224,768,192,864,192C960,192,1056,224,1152,240C1248,256,1344,256,1392,256L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <div className="flex flex-col sm:flex-row w-full h-full z-10 relative" style={{ zoom: 0.8 }}>
        <aside className="w-full sm:w-64 bg-white border-b sm:border-r border-slate-200 flex flex-col justify-between shrink-0 sm:h-full relative z-30 shadow-sm sm:shadow-none sm:overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* Logo & Header */}
            <div className="p-5 sm:p-6 sm:h-20 border-b border-slate-100 flex items-center justify-center sm:justify-start shrink-0">
              <img
                src="https://odqxwaggjgrjpeeqcznk.supabase.co/storage/v1/object/public/images/logos/telencologo.png"
                alt="Telenco"
                className="h-5 sm:h-6 opacity-80 grayscale object-contain"
              />
            </div>

            {/* Navigation Links */}
            <nav className="p-3 sm:p-4 flex sm:flex-col flex-row gap-1.5 overflow-x-auto sm:overflow-visible flex-1">
              <p className="hidden sm:block px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-2">Menu</p>

              {/* Mobile "Naar Portaal" button injected directly into the swipable row */}
              <button onClick={() => navigate('/home')} className="sm:hidden flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap shrink-0 text-slate-500 hover:text-slate-500 hover:bg-slate-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6" /></svg>
                <span>Portaal</span>
              </button>

              {tabs.map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center px-3 py-2.5 rounded-xl font-bold text-sm transition-colors whitespace-nowrap shrink-0 sm:w-full ${isActive ? 'text-slate-600' : 'text-slate-500 hover:text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="adminTabHighlight"
                        className="absolute inset-0 bg-slate-100 rounded-xl shadow-sm border border-slate-200/50 z-0"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 w-full">
                      <tab.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-slate-600' : 'text-slate-400'}`} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Bottom Profile & Actions */}
            <div className="flex flex-col border-t border-slate-100 bg-slate-50/50 shrink-0">
              {/* Desktop "Naar Portaal" button only */}
              <div className="hidden sm:block p-4 pb-0">
                <button onClick={() => navigate('/home')} className="flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-500 hover:bg-slate-100 font-bold text-sm transition-all shrink-0 w-full mb-2 border border-slate-200/50 bg-white shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6" /></svg>
                  <span>Naar Portaal</span>
                </button>
              </div>

              <div className="p-3 sm:p-4 pt-2 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full border border-slate-300 overflow-hidden shrink-0 bg-slate-200">
                    {profile?.avatar_id ? (
                      <img src={profile.avatar_id} alt={getDisplayName()} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-bold text-slate-600 text-xs uppercase">{getDisplayName() ? getDisplayName().charAt(0) : '?'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col hidden sm:flex min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-3">Ingelogd als</p>
                    <p className="text-xs font-bold text-slate-600 truncate leading-4" title={getDisplayName()}>{getDisplayName()}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-colors shrink-0"
                  title="Uitloggen"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 h-full min-h-0 overflow-y-auto relative bg-transparent w-full overflow-x-hidden flex flex-col">
          <div className="flex-1 w-full max-w-[clamp(45rem,110vh,65rem)] min-[2000px]:max-w-[clamp(65rem,130vh,80rem)] mx-auto px-4 sm:px-[clamp(1.5rem,3vw,3.5rem)] py-[clamp(1.5rem,4vh,4rem)] relative z-20">

            {syncError && (
              <div className="mb-6 bg-rose-50 border border-rose-200 p-5 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -translate-y-16 translate-x-16 pointer-events-none" />
                <div className="p-3 bg-white rounded-xl shadow-sm border border-rose-100 shrink-0 relative z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-rose-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <div className="relative z-10">
                  <h3 className="text-rose-600 font-extrabold text-sm tracking-widest uppercase mb-1">Pas op: Automatische Scan Vastgelopen</h3>
                  <p className="text-rose-900 font-medium text-[15px] leading-relaxed">
                    De laatste poging om de marktprijzen op te halen bij Elindus is mislukt. Mogelijk is de Elindus structuur gewijzigd.
                  </p>
                  <p className="text-rose-500 text-xs font-semibold mt-2 font-mono bg-white inline-block px-2 py-1 rounded-md border border-rose-100">
                    Systeem log: {syncError.message}
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* OVERVIEW / WELCOME TAB */}
              {activeTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  {(() => {
                    const calculations = logs.filter(l => l.action === 'CALCULATION');
                    const totalCalcs = calculations.length;
                    const totalMwh = calculations.reduce((sum, l) => sum + (l.consumption_mwh || 0), 0);

                    const scoreboard = Array.from(
                      calculations.reduce((acc, l) => {
                        const email = l.user_email;
                        const name = l.profiles?.first_name ? `${l.profiles.first_name} ${l.profiles.last_name || ''}`.trim() : email;
                        const curr = acc.get(email) || { count: 0, mwh: 0, name };
                        acc.set(email, { count: curr.count + 1, mwh: curr.mwh + (l.consumption_mwh || 0), name });
                        return acc;
                      }, new Map<string, { count: number, mwh: number, name: string }>())
                    ).sort((a, b) => b[1].mwh - a[1].mwh).slice(0, 5); // Top 5

                    return (
                      <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] p-8 sm:p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                          <h2 className="text-3xl font-black text-slate-600 tracking-tight relative z-10">Welkom, {getDisplayName()}</h2>
                          <p className="text-slate-500 mt-2 text-lg relative z-10">Dit is het strakke overzicht van het Telenco Sales Portaal.</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 relative z-10">
                            {/* Light, Non-dark Card 1 */}
                            <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center">
                                  <Zap className="w-7 h-7 text-[#E74B4D]" />
                                </div>
                                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Totaal Volume</p>
                              </div>
                              <div>
                                <h3 className="text-5xl font-black text-slate-600">{totalMwh.toFixed(0)} <span className="text-xl text-slate-400">MWh</span></h3>
                                <p className="text-slate-500 text-sm font-medium mt-2">Berekend over de laatste 100 sessies</p>
                              </div>
                            </div>

                            {/* Light, Non-dark Card 2 */}
                            <div className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center">
                                  <Calculator className="w-7 h-7 text-amber-500" />
                                </div>
                                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">Berekeningen</p>
                              </div>
                              <div>
                                <h3 className="text-5xl font-black text-slate-600">{totalCalcs}</h3>
                                <p className="text-slate-500 text-sm font-medium mt-2">Actieve klantvoorstellen in totaal</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Top Sellers Scoreboard */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="flex items-center justify-center">
                              <TrophyIcon className="w-7 h-7 text-amber-500" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-slate-500 tracking-tight">Topverkopers Scoreboard</h3>
                              <p className="text-sm text-slate-400">Gebaseerd op aangeboden MWh volume</p>
                            </div>
                          </div>

                          {scoreboard.length === 0 ? (
                            <p className="text-slate-400 text-center py-6">Nog niet genoeg data voor een scoreboard.</p>
                          ) : (
                            <div className="space-y-4">
                              {scoreboard.map(([email, score], idx) => (
                                <div key={email} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <div className="flex items-center gap-4">
                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${idx === 0 ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/30' : idx === 1 ? 'bg-slate-300 text-white shadow-md' : idx === 2 ? 'bg-amber-700/40 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <p className="font-bold text-slate-600">{score.name}</p>
                                      <p className="text-xs text-slate-400">{score.count} simulaties</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-lg text-[#E74B4D]">{score.mwh.toFixed(0)} <span className="text-xs text-slate-400">MWh</span></p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Recent Activity Preview */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <ClockIcon className="w-6 h-6 text-slate-400" />
                              <h3 className="text-xl font-black text-slate-500 tracking-tight">Recente Activiteit</h3>
                            </div>
                            <button onClick={() => setActiveTab('activity')} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs transition-all">Alles bekijken →</button>
                          </div>
                          {logs.length === 0 ? (
                            <p className="text-slate-400 text-center py-6">Nog geen activiteiten gelogd.</p>
                          ) : (
                            <div className="space-y-3">
                              {logs.slice(0, 5).map(log => {
                                const name = log.profiles?.first_name || log.profiles?.last_name
                                  ? `${log.profiles.first_name || ''} ${log.profiles.last_name || ''}`.trim()
                                  : log.user_email;
                                return (
                                  <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${log.action === 'CALCULATION' ? 'bg-blue-50 text-blue-600' :
                                          log.action === 'LOGIN' ? 'bg-emerald-50 text-emerald-600' :
                                            log.action === 'TELENET_WIZARD' ? 'bg-amber-50 text-amber-600' :
                                              'bg-slate-100 text-slate-500'
                                        }`}>{log.action}</span>
                                      <span className="text-sm font-medium text-slate-500">{name}</span>
                                    </div>
                                    <span className="text-xs text-slate-400">{formatDate(log.created_at)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* PRICES TAB */}
              {activeTab === 'prices' && (
                <motion.div key="prices" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  {/* Action bar */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-500">Marktprijzen & Marges</h2>
                      <p className="text-sm text-slate-400 mt-1">
                        Laatst bijgewerkt: {marketData.lastUpdated ? formatDate(marketData.lastUpdated) : 'Nooit'}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleSave} disabled={isSaving || !hasChanges} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-[#E74B4D] text-white hover:bg-[#c73a3c]'} disabled:opacity-50`}>
                        {saveSuccess ? '✓ Opgeslagen' : isSaving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
                      </button>
                    </div>
                  </div>


                  <h3 className="text-lg font-black text-slate-500 mb-4 mt-8">Huidige Marktprijzen</h3>
                  {/* Market Price Cards */}
                  <div className="grid grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4 mb-8">
                    {priceFields.map(field => (
                      <div key={field.key} className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center mb-4">
                          {field.desc.includes('Elek') ? <Zap className="w-6 h-6 text-[#E74B4D]" /> : <Flame className="w-6 h-6 text-[#E74B4D]" />}
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{field.label}</p>
                        <p className="text-[10px] text-slate-300 mb-3">{field.desc}</p>
                        <input
                          type="number"
                          step="0.01"
                          value={inputStrings[field.key] ?? String(overrideData[field.key] ?? '')}
                          onChange={e => setInputStrings(prev => ({ ...prev, [field.key]: e.target.value }))}
                          onBlur={e => {
                            const parsed = parseFloat(e.target.value);
                            const val = isNaN(parsed) ? 0 : parsed;
                            setOverrideData(prev => ({ ...prev, [field.key]: val }));
                            setInputStrings(prev => ({ ...prev, [field.key]: String(val) }));
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 font-bold text-slate-600 text-base sm:text-lg focus:ring-2 focus:ring-[#E74B4D]/30 focus:border-[#E74B4D] transition-all"
                        />
                        <p className="text-[10px] text-slate-300 mt-2 text-right">€/MWh</p>
                      </div>
                    ))}
                  </div>

                  {/* Eneco Tarieven */}
                  <h3 className="text-lg font-black text-slate-500 mb-4">
                    <span className="inline-flex items-center gap-2">
                      <img src="./eneco-grey.png" alt="Eneco" className="h-8 object-contain opacity-60" />
                      Tarieven
                    </span>
                  </h3>
                  {enecoPriceFields.map(group => (
                    <div key={group.group} className="mb-6">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{group.group}</p>
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                        {group.fields.map(field => (
                          <div key={field.key} className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center mb-4">
                              {field.icon === 'elec' ? <Zap className="w-5 h-5 text-[#E74B4D]" /> : <Flame className="w-5 h-5 text-[#E74B4D]" />}
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{field.label}</p>
                            <input
                              type="number"
                              step="0.01"
                              value={inputStrings[`${field.key}_ctkwh`] ?? String(Number(((overrideData[field.key] as number) || 0) / 10).toFixed(2))}
                              onChange={e => setInputStrings(prev => ({ ...prev, [`${field.key}_ctkwh`]: e.target.value }))}
                              onBlur={e => {
                                const parsed = parseFloat(e.target.value);
                                const centKwh = isNaN(parsed) ? 0 : parsed;
                                const mwhVal = centKwh * 10;
                                setOverrideData(prev => ({ ...prev, [field.key]: mwhVal }));
                                setInputStrings(prev => ({ ...prev, [`${field.key}_ctkwh`]: String(centKwh), [field.key]: String(mwhVal) }));
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 font-bold text-slate-600 text-base sm:text-lg focus:ring-2 focus:ring-[#E74B4D]/30 focus:border-[#E74B4D] transition-all"
                            />
                            <p className="text-[10px] text-slate-300 mt-2 text-right">€cent/kWh</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Margin Cards */}
                  <h3 className="text-lg font-black text-slate-500 mb-4">Vaste Marges per Categorie</h3>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4">
                    {marginFields.map(field => (
                      <div key={field.key} className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm">
                        <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1 leading-tight">{field.label}</p>
                        <p className="text-[10px] sm:text-xs text-slate-400 mb-3 sm:mb-4 leading-tight">{field.desc}</p>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-slate-400 font-bold text-base sm:text-lg">€</span>
                          <input
                            type="number"
                            step="0.5"
                            value={inputStrings[field.key] ?? String(overrideData[field.key] ?? '')}
                            onChange={e => setInputStrings(prev => ({ ...prev, [field.key]: e.target.value }))}
                            onBlur={e => {
                              const parsed = parseFloat(e.target.value);
                              const val = isNaN(parsed) ? 0 : parsed;
                              setOverrideData(prev => ({ ...prev, [field.key]: val }));
                              setInputStrings(prev => ({ ...prev, [field.key]: String(val) }));
                            }}
                            className="flex-1 w-full min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 font-bold text-slate-600 text-base sm:text-lg focus:ring-2 focus:ring-[#E74B4D]/30 focus:border-[#E74B4D] transition-all"
                          />
                          <span className="text-slate-400 text-[10px] sm:text-xs font-bold">/MWh</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-8 border-t border-slate-200 relative z-20">
                    <LiveSyncTerminal onSyncComplete={fetchMarketData} />
                  </div>
                </motion.div>
              )}

              {/* ACTIVITY TAB */}
              {activeTab === 'activity' && (
                <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-500">Activiteitenlog</h2>
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
                                <td className="px-6 py-4 text-sm font-medium text-slate-500">{name}</td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${log.action === 'CALCULATION' ? 'bg-blue-50 text-blue-600' :
                                    log.action === 'LOGIN' ? 'bg-emerald-50 text-emerald-600' :
                                      'bg-slate-50 text-slate-500'
                                    }`}>{log.action}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">{log.energy_type || '-'}</td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-500">{log.consumption_mwh ? `${log.consumption_mwh} MWh` : '-'}</td>
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
                  <AdminUsers currentUserEmail={user?.email || ''} />
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
                        <path d="M0,125 C30,105 60,145 90,125 C120,105 150,145 180,125 C210,105 240,145 270,125 C300,105 330,145 360,125 C390,105 420,145 450,125" fill="none" stroke="#91C848" strokeWidth="3" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="relative px-8 pt-10 pb-8 text-center">
                      {/* Icon */}
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${toast.type === 'success'
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
                      <h3 className="text-xl font-black text-slate-500 mb-2">{toast.message}</h3>
                      {toast.detail && (
                        <p className="text-sm text-slate-400 leading-relaxed">{toast.detail}</p>
                      )}

                      {/* Button */}
                      <button
                        onClick={() => setToast(null)}
                        className={`mt-6 px-8 py-3 rounded-xl font-bold text-sm text-white transition-all ${toast.type === 'success'
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

          {/* Footer — sits at the bottom of the content, scrolls with page, pushed down by mt-auto */}
          <div className="w-full py-6 flex justify-center items-center mt-auto shrink-0">
            <div className="flex items-center gap-1.5 text-[9px] sm:text-xs font-bold text-slate-400/80">
              © 2026 Telenco <span className="mx-0.5 opacity-40">·</span> Powered by
              <a href="https://tailormate.ai" target="_blank" rel="noopener noreferrer" className="group flex items-center">
                <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-[9px] sm:h-3 opacity-50 group-hover:opacity-100 ml-0.5 object-contain transition-all grayscale brightness-0 group-hover:grayscale-0 group-hover:brightness-100" />
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
