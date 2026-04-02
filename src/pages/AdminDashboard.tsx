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
  TrophyIcon,
  SaveIcon as Save,
  FileTextIcon
} from '../components/Icons';

interface MarketData {
  epexSpot: number;
  ttfDam: number;
  elecMultiplier: number;
  elecAdder?: number;
  gasMultiplier?: number;
  gasAdder?: number;
  injMultiplier?: number;
  injAdder?: number;
  enecoResElecVast?: number;
  enecoResElecVar: number;
  enecoResGasVast: number;
  enecoResGasVar: number;
  enecoSohoElecVast: number;
  enecoSohoElecVar: number;
  enecoSohoGasVast: number;
  enecoSohoGasVar?: number;
  enecoResElecInj?: number;
  enecoSohoElecInj?: number;
  // Dag/Nacht Eneco Elektriciteit
  enecoResElecDagVast?: number;
  enecoResElecNachtVast?: number;
  enecoResElecDagVar?: number;
  enecoResElecNachtVar?: number;
  enecoSohoElecDagVast?: number;
  enecoSohoElecNachtVast?: number;
  enecoSohoElecDagVar?: number;
  enecoSohoElecNachtVar?: number;

  // Vaste Vergoedingen
  enecoResVvElec?: number;
  enecoResVvGas?: number;
  enecoSohoVvElec?: number;
  enecoSohoVvGas?: number;
  enecoResVvInj?: number;
  enecoSohoVvInj?: number;
  elindusVvElec?: number;
  elindusVvGas?: number;
  elindusVvInj?: number;
  lastUpdated?: string;
  updatedBy?: string;
  updatedByAvatar?: string;
  promoElec?: number;
  promoGas?: number;
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

type Tab = 'overview' | 'elindus' | 'eneco' | 'activity' | 'users' | 'orders';

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
    elecMultiplier: 1.1, elecAdder: 18, gasMultiplier: 1.05, gasAdder: 14,
    injMultiplier: 0.9, injAdder: 15,
    enecoResElecVast: 0, enecoResElecVar: 0, enecoResGasVast: 0, enecoResGasVar: 0,
    enecoSohoElecVast: 0, enecoSohoElecVar: 0, enecoSohoGasVast: 0, enecoSohoGasVar: 0,
    enecoResElecInj: 0, enecoSohoElecInj: 0,
    enecoResElecDagVast: 0, enecoResElecNachtVast: 0, enecoResElecDagVar: 0, enecoResElecNachtVar: 0,
    enecoSohoElecDagVast: 0, enecoSohoElecNachtVast: 0, enecoSohoElecDagVar: 0, enecoSohoElecNachtVar: 0,

    enecoResVvElec: 65, enecoResVvGas: 65, enecoSohoVvElec: 90, enecoSohoVvGas: 90,
    enecoResVvInj: 0, enecoSohoVvInj: 0,
    elindusVvElec: 60, elindusVvGas: 60, elindusVvInj: 0,
    promoElec: 100, promoGas: 100
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

  // Energy Orders (Pendings)
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchMarketData = async () => {
    const { data, error } = await supabase.from('market_prices').select('*');
    if (!error && data && data.length > 0) {
      const find = (name: string) => data.find(p => p.indicator_name === name);
      const rp = (val: number | undefined, fb: number) => Number(Number(val ?? fb).toFixed(2));

      const fetched: MarketData = {
        epexSpot: rp(find('EPEX_SPOT')?.value, 65.40),
        ttfDam: rp(find('TTF_DAM')?.value, 32.50),
        elecMultiplier: rp(find('ELEC_MULTIPLIER')?.value, 1.1),
        elecAdder: rp(find('ELEC_ADDER')?.value, 18),
        gasMultiplier: rp(find('GAS_MULTIPLIER')?.value, 1.05),
        gasAdder: rp(find('GAS_ADDER')?.value, 14),
        injMultiplier: rp(find('INJ_MULTIPLIER')?.value, 0.9),
        injAdder: rp(find('INJ_ADDER')?.value, 15),
        enecoResElecVast: rp(find('ENECO_RES_ELEC_VAST')?.value, 0),
        enecoResElecVar: rp(find('ENECO_RES_ELEC_VARIABEL')?.value, 0),
        enecoResGasVast: rp(find('ENECO_RES_GAS_VAST')?.value, 0),
        enecoResGasVar: rp(find('ENECO_RES_GAS_VARIABEL')?.value, 0),
        enecoSohoElecVast: rp(find('ENECO_SOHO_ELEC_VAST')?.value, 0),
        enecoSohoElecVar: rp(find('ENECO_SOHO_ELEC_VARIABEL')?.value, 0),
        enecoSohoGasVast: rp(find('ENECO_SOHO_GAS_VAST')?.value, 0),
        enecoSohoGasVar: rp(find('ENECO_SOHO_GAS_VARIABEL')?.value, 0),
        enecoResElecInj: rp(find('ENECO_RES_INJ_ELEC')?.value, 0),
        enecoSohoElecInj: rp(find('ENECO_SOHO_INJ_ELEC')?.value, 0),
        enecoResElecDagVast: rp(find('ENECO_RES_ELEC_DAG_VAST')?.value, 0),
        enecoResElecNachtVast: rp(find('ENECO_RES_ELEC_NACHT_VAST')?.value, 0),
        enecoResElecDagVar: rp(find('ENECO_RES_ELEC_DAG_VAR')?.value, 0),
        enecoResElecNachtVar: rp(find('ENECO_RES_ELEC_NACHT_VAR')?.value, 0),
        enecoSohoElecDagVast: rp(find('ENECO_SOHO_ELEC_DAG_VAST')?.value, 0),
        enecoSohoElecNachtVast: rp(find('ENECO_SOHO_ELEC_NACHT_VAST')?.value, 0),
        enecoSohoElecDagVar: rp(find('ENECO_SOHO_ELEC_DAG_VAR')?.value, 0),
        enecoSohoElecNachtVar: rp(find('ENECO_SOHO_ELEC_NACHT_VAR')?.value, 0),

        enecoResVvElec: rp(find('ENECO_RES_VV_ELEC')?.value, 65),
        enecoResVvGas: rp(find('ENECO_RES_VV_GAS')?.value, 65),
        enecoSohoVvElec: rp(find('ENECO_SOHO_VV_ELEC')?.value, 90),
        enecoSohoVvGas: rp(find('ENECO_SOHO_VV_GAS')?.value, 90),
        enecoResVvInj: rp(find('ENECO_RES_VV_INJ')?.value, 0),
        enecoSohoVvInj: rp(find('ENECO_SOHO_VV_INJ')?.value, 0),
        elindusVvElec: rp(find('ELINDUS_VV_ELEC')?.value, 60),
        elindusVvGas: rp(find('ELINDUS_VV_GAS')?.value, 60),
        elindusVvInj: rp(find('ELINDUS_VV_INJ')?.value, 0),
        promoElec: rp(find('PROMO_ELEC')?.value, 100),
        promoGas: rp(find('PROMO_GAS')?.value, 100),
        lastUpdated: data[0].last_updated,
        updatedBy: data[0].updated_by || 'Systeem',
        updatedByAvatar: data[0].updated_by_avatar
      };
      setMarketData(fetched);
      setOverrideData(fetched);
      const s: Record<string, string> = {};
      for (const [k, v] of Object.entries(fetched)) { if (k !== 'lastUpdated' && k !== 'updatedBy' && k !== 'updatedByAvatar') s[k] = String(v); }
      setInputStrings(s);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    const { data: lData, error } = await supabase
      .from('activiteiten')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && lData) {
      const uids = Array.from(new Set(lData.map(l => l.user_id).filter(Boolean)));
      const { data: pData } = await supabase.from('profiles').select('id, first_name, last_name, avatar_id').in('id', uids);
      const logsWithProfiles = lData.map(l => ({
        ...l,
        profiles: pData?.find(p => p.id === l.user_id) || null
      }));
      setLogs(logsWithProfiles);
    }
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
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    const { data: oData, error } = await supabase.from('pendings').select('*').order('created_at', { ascending: false }).limit(100);
    if (!error && oData) {
      const uids = Array.from(new Set(oData.map(o => o.user_id).filter(Boolean)));
      const { data: pData } = await supabase.from('profiles').select('id, first_name, last_name, avatar_id').in('id', uids);
      const ordersWithProfiles = oData.map(o => ({
        ...o,
        profiles: pData?.find(p => p.id === o.user_id) || null
      }));
      setOrders(ordersWithProfiles);
    }
    setOrdersLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const nowIso = new Date().toISOString();
    const updaterName = `${profile?.first_name || 'Admin'} ${profile?.last_name || ''}`.trim();
    // Fetch avatar directly from profiles table for most up-to-date value
    let updaterAvatar = profile?.avatar_id || null;
    if (!updaterAvatar && user) {
      const { data: freshProfile } = await supabase.from('profiles').select('avatar_id').eq('id', user.id).single();
      if (freshProfile?.avatar_id) updaterAvatar = freshProfile.avatar_id;
    }

    const indicators: [string, number][] = [
      ['EPEX_SPOT', overrideData.epexSpot],
      ['TTF_DAM', overrideData.ttfDam],
      ['ELEC_MULTIPLIER', overrideData.elecMultiplier ?? 1.1],
      ['ELEC_ADDER', overrideData.elecAdder ?? 18],
      ['GAS_MULTIPLIER', overrideData.gasMultiplier ?? 1.05],
      ['GAS_ADDER', overrideData.gasAdder ?? 14],
      ['INJ_MULTIPLIER', overrideData.injMultiplier ?? 0.9],
      ['INJ_ADDER', overrideData.injAdder ?? 15],
      ['ENECO_RES_ELEC_VAST', overrideData.enecoResElecVast ?? 0],
      ['ENECO_RES_ELEC_VARIABEL', overrideData.enecoResElecVar],
      ['ENECO_RES_GAS_VAST', overrideData.enecoResGasVast],
      ['ENECO_RES_GAS_VARIABEL', overrideData.enecoResGasVar],
      ['ENECO_SOHO_ELEC_VAST', overrideData.enecoSohoElecVast],
      ['ENECO_SOHO_ELEC_VARIABEL', overrideData.enecoSohoElecVar],
      ['ENECO_SOHO_GAS_VAST', overrideData.enecoSohoGasVast ?? 0],
      ['ENECO_SOHO_GAS_VARIABEL', overrideData.enecoSohoGasVar ?? 0],
      ['ENECO_RES_INJ_ELEC', overrideData.enecoResElecInj ?? 0],
      ['ENECO_SOHO_INJ_ELEC', overrideData.enecoSohoElecInj ?? 0],
      ['ENECO_RES_ELEC_DAG_VAST', overrideData.enecoResElecDagVast ?? 0],
      ['ENECO_RES_ELEC_NACHT_VAST', overrideData.enecoResElecNachtVast ?? 0],
      ['ENECO_RES_ELEC_DAG_VAR', overrideData.enecoResElecDagVar ?? 0],
      ['ENECO_RES_ELEC_NACHT_VAR', overrideData.enecoResElecNachtVar ?? 0],
      ['ENECO_SOHO_ELEC_DAG_VAST', overrideData.enecoSohoElecDagVast ?? 0],
      ['ENECO_SOHO_ELEC_NACHT_VAST', overrideData.enecoSohoElecNachtVast ?? 0],
      ['ENECO_SOHO_ELEC_DAG_VAR', overrideData.enecoSohoElecDagVar ?? 0],
      ['ENECO_SOHO_ELEC_NACHT_VAR', overrideData.enecoSohoElecNachtVar ?? 0],

      ['ENECO_RES_VV_ELEC', overrideData.enecoResVvElec ?? 65],
      ['ENECO_RES_VV_GAS', overrideData.enecoResVvGas ?? 65],
      ['ENECO_SOHO_VV_ELEC', overrideData.enecoSohoVvElec ?? 90],
      ['ENECO_SOHO_VV_GAS', overrideData.enecoSohoVvGas ?? 90],
      ['ENECO_RES_VV_INJ', overrideData.enecoResVvInj ?? 0],
      ['ENECO_SOHO_VV_INJ', overrideData.enecoSohoVvInj ?? 0],
      ['ELINDUS_VV_ELEC', overrideData.elindusVvElec ?? 60],
      ['ELINDUS_VV_GAS', overrideData.elindusVvGas ?? 60],
      ['ELINDUS_VV_INJ', overrideData.elindusVvInj ?? 0],
      ['PROMO_ELEC', overrideData.promoElec ?? 100],
      ['PROMO_GAS', overrideData.promoGas ?? 100],
      ['ELINDUS_VV_INJ', overrideData.elindusVvInj ?? 0],
    ];
    const updates = indicators.map(([name, value]) => ({
      indicator_name: name, value, unit: (name.includes('MULTIPLIER') ? 'x' : name.includes('ADDER') ? '€/MWh' : name.includes('VV') ? '€/jaar' : '€/MWh'), last_updated: nowIso, updated_by: updaterName, updated_by_avatar: updaterAvatar
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
    { key: 'elindus', label: 'Elindus', icon: Zap },
    { key: 'eneco', label: 'Eneco', icon: Flame },
    { key: 'orders', label: 'Pendings', icon: FileTextIcon },
    { key: 'activity', label: 'Activiteiten', icon: ChartBarIcon },
    { key: 'users', label: 'Gebruikers', icon: UsersIcon },
  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
      d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  };

  const priceFields: { key: keyof MarketData; label: string; desc: string; color: string }[] = [
    { key: 'epexSpot', label: 'EPEX SPOT', desc: 'Elektriciteit Variabel', color: 'bg-amber-500' },
    { key: 'ttfDam', label: 'TTF DAM', desc: 'Gas Variabel', color: 'bg-rose-500' },
  ];

  const enecoPriceFields: { group: string; subGroups: { subLabel: string; fields: { key: keyof MarketData; label: string; type: string; icon: 'elec' | 'gas' }[] }[] }[] = [
    {
      group: 'Residentieel (Particulier)',
      subGroups: [
        { subLabel: 'Enkelvoudige Meter', fields: [
          { key: 'enecoResElecVast', label: 'Vast', type: 'Elektriciteit', icon: 'elec' },
          { key: 'enecoResElecVar', label: 'Variabel', type: 'Elektriciteit', icon: 'elec' },
        ]},
        { subLabel: 'Tweevoudige Meter (Dag/Nacht)', fields: [
          { key: 'enecoResElecDagVast', label: 'Dag Vast', type: 'Elektriciteit', icon: 'elec' },
          { key: 'enecoResElecNachtVast', label: 'Nacht Vast', type: 'Elektriciteit', icon: 'elec' },
          { key: 'enecoResElecDagVar', label: 'Dag Variabel', type: 'Elektriciteit', icon: 'elec' },
          { key: 'enecoResElecNachtVar', label: 'Nacht Variabel', type: 'Elektriciteit', icon: 'elec' },
        ]},
        { subLabel: 'Aardgas', fields: [
          { key: 'enecoResGasVast', label: 'Vast', type: 'Gas', icon: 'gas' },
          { key: 'enecoResGasVar', label: 'Variabel', type: 'Gas', icon: 'gas' },
        ]},
      ]
    },
    {
      group: 'SME (Zakelijk)',
      subGroups: [
        { subLabel: 'Enkelvoudige Meter', fields: [
          { key: 'enecoSohoElecVast', label: 'Vast', type: 'Elektriciteit', icon: 'elec' },
          { key: 'enecoSohoElecVar', label: 'Variabel', type: 'Elektriciteit', icon: 'elec' },
        ]},
        { subLabel: 'Tweevoudige Meter (Dag/Nacht)', fields: [
          { key: 'enecoSohoElecDagVast', label: 'Dag Vast', type: 'Elektriciteit', icon: 'elec' },
          { key: 'enecoSohoElecNachtVast', label: 'Nacht Vast', type: 'Elektriciteit', icon: 'elec' },
          { key: 'enecoSohoElecDagVar', label: 'Dag Variabel', type: 'Elektriciteit', icon: 'elec' },
          { key: 'enecoSohoElecNachtVar', label: 'Nacht Variabel', type: 'Elektriciteit', icon: 'elec' },
        ]},
        { subLabel: 'Aardgas', fields: [
          { key: 'enecoSohoGasVast', label: 'Vast', type: 'Gas', icon: 'gas' },
          { key: 'enecoSohoGasVar', label: 'Variabel', type: 'Gas', icon: 'gas' },
        ]},
      ]
    }
  ];

  const [simMwh, setSimMwh] = useState<number>(50);
  const simElecResult = (overrideData.epexSpot * overrideData.elecMultiplier) + overrideData.elecAdder;
  const simGasResult = (overrideData.ttfDam * overrideData.gasMultiplier) + overrideData.gasAdder;

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
                className="h-[clamp(1.25rem,6vw,2.25rem)] 2xl:h-[clamp(2.25rem,1.5vw,4rem)] opacity-80 grayscale object-contain"
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
                    <span className="relative z-10 flex items-center justify-center sm:justify-start gap-2 sm:gap-3 w-full px-2">
                      {tab.key === 'elindus' ? (
                        <img src="./elindus-grey.png" alt="Elindus" className={`h-4 sm:h-5 object-contain ${isActive ? 'grayscale-0 opacity-80' : 'grayscale opacity-40'} transition-all`} />
                      ) : tab.key === 'eneco' ? (
                        <img src="https://lksvpkoavcmlwfkonowc.supabase.co/storage/v1/object/public/images/logos/enecologozondericon.png" alt="Eneco" className={`h-4 sm:h-5 object-contain grayscale ${isActive ? 'opacity-80' : 'opacity-40'} transition-all`} />
                      ) : (
                        <>
                          <tab.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${tab.key === 'orders' ? (isActive ? 'text-blue-500' : 'text-blue-300') : (isActive ? 'text-slate-600' : 'text-slate-400')}`} />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </>
                      )}
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
          <div className={`flex-1 w-full mx-auto px-4 sm:px-[clamp(1.5rem,3vw,3.5rem)] py-[clamp(1.5rem,4vh,4rem)] relative z-20 ${activeTab === 'users' ? '' : 'max-w-[clamp(50rem,130vh,85rem)] min-[2000px]:max-w-[clamp(75rem,150vh,110rem)]'}`}>

            {syncError && (
              <div className="mb-6 bg-rose-50 border border-rose-200 p-5 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -translate-y-16 translate-x-16 pointer-events-none" />
                <div className="p-3 bg-white rounded-xl shadow-sm border border-rose-100 shrink-0 relative z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-rose-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
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

              {/* ELINDUS TAB */}
              {activeTab === 'elindus' && (
                <motion.div key="elindus" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  {/* Action bar */}
                  <div className="flex flex-col items-center w-full mb-10 mt-4 relative">
                    <img src="./elindus-grey.png" alt="Elindus" className="h-16 object-contain opacity-70 mb-8" />

                    <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4 border-b border-slate-100 pb-4">
                      <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-black text-slate-500 mb-1">Marktprijzen</h2>
                        <p className="text-sm text-slate-400">
                          Laatst bijgewerkt: {marketData.lastUpdated ? formatDate(marketData.lastUpdated) : 'Nooit'}
                          {marketData.updatedBy && (
                            <span className="inline-flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                              door: 
                              {marketData.updatedByAvatar ? (
                                <img src={marketData.updatedByAvatar} alt={marketData.updatedBy} className="w-6 h-6 rounded-full object-cover inline-block ring-2 ring-slate-200 shadow-sm" />
                              ) : null}
                              <span className="text-slate-500 font-bold">{marketData.updatedBy}</span>
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasChanges && (
                          <button onClick={() => { setOverrideData(marketData); setInputStrings({}); }} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 bg-white hover:bg-slate-50 transition-all border border-slate-200 shadow-sm">
                            Annuleren
                          </button>
                        )}
                        <button onClick={handleSave} disabled={isSaving || !hasChanges} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${saveSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-[#E74B4D] text-white hover:bg-[#c73a3c] shadow-[#E74B4D]/20'} disabled:opacity-50`}>
                          {saveSuccess ? '✓ Opgeslagen' : isSaving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mb-12 relative">
                    <div className="hidden lg:flex absolute -left-[4.5rem] top-0 w-12 h-12 rounded-full bg-slate-100 items-center justify-center font-black text-2xl text-slate-400 shadow-sm border border-slate-200 z-10">1</div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-lg font-black text-slate-500 mb-4 flex items-center gap-3 w-full">
                        <span className="lg:hidden w-8 h-8 rounded-full bg-slate-100 flex flex-shrink-0 items-center justify-center font-black text-base text-slate-400">1</span>
                        Huidige Marktprijzen (automatisch via API)
                      </h3>
                      {/* Market Price Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                        {priceFields.map(field => (
                          <div key={field.key} className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm transition-all ${field.color === 'bg-amber-500' ? 'hover:shadow-amber-500/20 hover:shadow-lg' : 'hover:shadow-rose-500/20 hover:shadow-lg'}`}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${field.color} shadow-sm`}>
                                {field.desc.includes('Elek') ? <Zap className="w-4 h-4 text-white" /> : <Flame className="w-4 h-4 text-white" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-black text-slate-600 truncate">{field.label}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Variabel</p>
                              </div>
                            </div>
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
                              className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 font-bold text-slate-600 text-base sm:text-lg focus:ring-2 outline-none transition-all ${field.color === 'bg-amber-500' ? 'focus:ring-amber-500/50' : 'focus:ring-rose-500/50'}`}
                            />
                            <p className="text-[10px] text-slate-300 mt-2 text-right">€/MWh</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Elindus Pricing Formula */}
                  <div className="mb-12 pt-6 border-t border-slate-100 relative">
                    <div className="hidden lg:flex absolute -left-[4.5rem] top-6 w-12 h-12 rounded-full bg-slate-100 items-center justify-center font-black text-2xl text-slate-400 shadow-sm border border-slate-200 z-10">2</div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-lg font-black text-slate-500 mb-2 flex items-center gap-3">
                        <span className="lg:hidden w-8 h-8 rounded-full bg-slate-100 flex flex-shrink-0 items-center justify-center font-black text-base text-slate-400">2</span>
                        Prijsformules (25 – 99 MWh)
                      </h3>
                      <p className="text-xs text-slate-400 mb-5">De verkoopprijs in de wizard wordt berekend als: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Marktprijs × Multiplier + Marge</span></p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* Elektriciteit Formula Card */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-500 shadow-sm">
                              <Zap className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-600">Elektriciteit (EPEX SPOT)</p>
                              <p className="text-[10px] font-mono text-slate-400">EPEX × {overrideData.elecMultiplier} + €{overrideData.elecAdder}/MWh</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 truncate">EPEX</p>
                              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-1 py-2 font-bold text-slate-500 text-sm text-center truncate">
                                {overrideData.epexSpot.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-slate-300 font-black mt-4">×</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 text-center truncate">Multi</p>
                              <input type="number" step="0.01"
                                value={inputStrings['elecMultiplier'] ?? String(overrideData.elecMultiplier)}
                                onChange={e => setInputStrings(prev => ({ ...prev, elecMultiplier: e.target.value }))}
                                onBlur={e => { const v = parseFloat(e.target.value) || 1; setOverrideData(p => ({ ...p, elecMultiplier: v })); setInputStrings(p => ({ ...p, elecMultiplier: String(v) })); }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1 py-2 font-bold text-slate-600 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition-all text-center" />
                            </div>
                            <div className="flex-shrink-0 text-slate-300 font-black mt-4">+</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 text-right truncate">Marge</p>
                              <input type="number" step="0.5"
                                value={inputStrings['elecAdder'] ?? String(overrideData.elecAdder)}
                                onChange={e => setInputStrings(prev => ({ ...prev, elecAdder: e.target.value }))}
                                onBlur={e => { const v = parseFloat(e.target.value) || 0; setOverrideData(p => ({ ...p, elecAdder: v })); setInputStrings(p => ({ ...p, elecAdder: String(v) })); }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1 py-2 font-bold text-slate-600 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition-all text-center" />
                            </div>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Resultaat</p>
                            <p className="font-black text-slate-700 text-lg">{simElecResult.toFixed(2)} <span className="text-xs text-slate-500">€/MWh</span></p>
                          </div>
                        </div>

                        {/* Gas Formula Card */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-rose-500 shadow-sm">
                              <Flame className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-600">Aardgas (TTF DAM)</p>
                              <p className="text-[10px] font-mono text-slate-400">TTF × {overrideData.gasMultiplier} + €{overrideData.gasAdder}/MWh</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 truncate">TTF</p>
                              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-1 py-2 font-bold text-slate-500 text-sm text-center truncate">
                                {overrideData.ttfDam.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-slate-300 font-black mt-4">×</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 text-center truncate">Multi</p>
                              <input type="number" step="0.01"
                                value={inputStrings['gasMultiplier'] ?? String(overrideData.gasMultiplier)}
                                onChange={e => setInputStrings(prev => ({ ...prev, gasMultiplier: e.target.value }))}
                                onBlur={e => { const v = parseFloat(e.target.value) || 1; setOverrideData(p => ({ ...p, gasMultiplier: v })); setInputStrings(p => ({ ...p, gasMultiplier: String(v) })); }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1 py-2 font-bold text-slate-600 text-sm focus:ring-2 focus:ring-rose-500/50 outline-none transition-all text-center" />
                            </div>
                            <div className="flex-shrink-0 text-slate-300 font-black mt-4">+</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 text-right truncate">Marge</p>
                              <input type="number" step="0.5"
                                value={inputStrings['gasAdder'] ?? String(overrideData.gasAdder)}
                                onChange={e => setInputStrings(prev => ({ ...prev, gasAdder: e.target.value }))}
                                onBlur={e => { const v = parseFloat(e.target.value) || 0; setOverrideData(p => ({ ...p, gasAdder: v })); setInputStrings(p => ({ ...p, gasAdder: String(v) })); }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1 py-2 font-bold text-slate-600 text-sm focus:ring-2 focus:ring-rose-500/50 outline-none transition-all text-center" />
                            </div>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Resultaat</p>
                            <p className="font-black text-slate-700 text-lg">{simGasResult.toFixed(2)} <span className="text-xs text-slate-500">€/MWh</span></p>
                          </div>
                        </div>

                        {/* Injectie Formula Card (Elindus) */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500 shadow-sm">
                              <Zap className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-600">Injectie (EPEX SPOT)</p>
                              <p className="text-[10px] font-mono text-slate-400">EPEX × {overrideData.injMultiplier} + €{overrideData.injAdder}/MWh</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 truncate">EPEX</p>
                              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-1 py-2 font-bold text-slate-500 text-sm text-center truncate">
                                {overrideData.epexSpot.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-slate-300 font-black mt-4">×</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 text-center truncate">Multi</p>
                              <input type="number" step="0.01" value={inputStrings['injMultiplier'] ?? String(overrideData.injMultiplier)} onChange={e => setInputStrings(prev => ({ ...prev, injMultiplier: e.target.value }))} onBlur={e => { const v = parseFloat(e.target.value) || 1; setOverrideData(p => ({ ...p, injMultiplier: v })); setInputStrings(p => ({ ...p, injMultiplier: String(v) })); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1 py-2 font-bold text-slate-600 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all text-center" />
                            </div>
                            <div className="flex-shrink-0 text-slate-300 font-black mt-4">+</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 text-right truncate">Marge</p>
                              <input type="number" step="0.5" value={inputStrings['injAdder'] ?? String(overrideData.injAdder)} onChange={e => setInputStrings(prev => ({ ...prev, injAdder: e.target.value }))} onBlur={e => { const v = parseFloat(e.target.value) || 0; setOverrideData(p => ({ ...p, injAdder: v })); setInputStrings(p => ({ ...p, injAdder: String(v) })); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-1 py-2 font-bold text-slate-600 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all text-center" />
                            </div>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Resultaat</p>
                            <p className="font-black text-slate-700 text-lg">{((overrideData.epexSpot || 0) * (overrideData.injMultiplier ?? 0.9) + (overrideData.injAdder ?? 15)).toFixed(2)} <span className="text-xs text-slate-500">€/MWh</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Elindus Vaste Vergoedingen */}
                  <h3 className="text-lg font-black text-slate-500 mb-2 pt-6 border-t border-slate-100">Vaste Vergoedingen</h3>
                  <p className="text-xs text-slate-400 mb-5">Vaste jaarlijkse kost (in €, per jaar) afhankelijk van het type verbruik.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[{ key: 'elindusVvElec', label: 'Elektriciteit', icon: 'elec', color: 'bg-amber-500', focusRing: 'focus:ring-amber-500/50', hoverShadow: 'hover:shadow-md' }, { key: 'elindusVvGas', label: 'Aardgas', icon: 'gas', color: 'bg-rose-500', focusRing: 'focus:ring-rose-500/50', hoverShadow: 'hover:shadow-md' }, { key: 'elindusVvInj', label: 'Injectie (Zonnepanelen)', icon: 'inj', color: 'bg-emerald-500', focusRing: 'focus:ring-emerald-500/50', hoverShadow: 'hover:shadow-md' }].map(f => (
                      <div key={f.key} className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm transition-all ${f.hoverShadow}`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.color} shadow-sm`}>
                            {f.icon === 'elec' ? <Zap className="w-4 h-4 text-white" /> : f.icon === 'gas' ? <Flame className="w-4 h-4 text-white" /> : <Zap className="w-4 h-4 text-white" />}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase">{f.label}</p>
                            <p className="text-[10px] font-bold tracking-wider text-slate-400">Vaste Vergoeding</p>
                          </div>
                        </div>
                        <input type="number" step="0.5" value={inputStrings[f.key] ?? String(overrideData[f.key as keyof MarketData] ?? '')} onChange={e => setInputStrings(prev => ({ ...prev, [f.key]: e.target.value }))} onBlur={e => { const val = parseFloat(e.target.value) || 0; setOverrideData(p => ({ ...p, [f.key]: val })); setInputStrings(p => ({ ...p, [f.key]: String(val) })); }} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-600 focus:ring-2 ${f.focusRing} outline-none transition-all`} />
                        <p className="text-[10px] text-slate-300 mt-2 text-right">€/jaar</p>
                      </div>
                    ))}
                  </div>

                  {/* Simulation Calculator */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-4">
                    <h4 className="text-sm font-black text-slate-500 mb-4">Simulatie Calculator</h4>
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Verbruik (MWh/jaar)</p>
                      <input type="number" step="1" min="25" max="99"
                        value={simMwh}
                        onChange={e => setSimMwh(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full max-w-[200px] bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-600 text-lg focus:ring-2 focus:ring-[#E74B4D]/50 outline-none transition-all" />
                      {simMwh >= 100 && <p className="text-xs text-rose-500 font-bold mt-1">⚠ Vanaf 100 MWh → contact team coach (geen prijs getoond in wizard)</p>}
                      {simMwh < 25 && simMwh > 0 && <p className="text-xs text-amber-500 font-bold mt-1">⚠ Onder 25 MWh wordt enkel Eneco getoond</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center"><Zap className="w-3 h-3 text-white" /></div>
                          <p className="text-xs font-bold text-slate-500">Elektriciteit</p>
                        </div>
                        <p className="text-2xl font-black text-amber-600">{simElecResult.toFixed(2)} <span className="text-xs text-slate-400">€/MWh</span></p>
                        <p className="text-xs text-slate-400 mt-1">Jaarlijks: <span className="font-bold text-slate-600">{(simElecResult * simMwh).toFixed(0)} €</span> ({simMwh} MWh)</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-rose-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-md bg-rose-500 flex items-center justify-center"><Flame className="w-3 h-3 text-white" /></div>
                          <p className="text-xs font-bold text-slate-500">Aardgas</p>
                        </div>
                        <p className="text-2xl font-black text-rose-600">{simGasResult.toFixed(2)} <span className="text-xs text-slate-400">€/MWh</span></p>
                        <p className="text-xs text-slate-400 mt-1">Jaarlijks: <span className="font-bold text-slate-600">{(simGasResult * simMwh).toFixed(0)} €</span> ({simMwh} MWh)</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-200 relative z-20">
                    <h3 className="text-lg font-black text-slate-500 mb-2">Automatische Market Scan</h3>
                    <div className="bg-white rounded-xl p-4 border border-slate-100 mb-4 shadow-sm">
                      <p className="text-xs text-slate-500 leading-relaxed mb-2 font-bold">
                        De scanner haalt automatisch prijzen op via de Elindus API met volgende voorwaarden:
                      </p>
                      <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-1.5 ml-1">
                        <li>Toont van elke marktprijs het <span className="font-bold text-slate-500">gemiddelde van dagprijzen</span> (niet uur of maand)</li>
                        <li>Maakt het gemiddelde vanaf de <span className="font-bold text-slate-500">1ste van de huidige maand</span> tot aan de meest recente datum</li>
                        <li>Update automatisch elke maand mee voor de indicatoren <span className="font-bold text-slate-500">EPEX SPOT</span> en <span className="font-bold text-slate-500">TTF DAM</span></li>
                        <li>Automatische scan op ingestelde tijdstippen, óf manueel via de <span className="font-bold text-slate-500">Start Market Scan</span> knop hieronder</li>
                      </ul>
                    </div>
                    <LiveSyncTerminal onSyncComplete={fetchMarketData} />
                  </div>
                </motion.div>
              )}

              {/* ENECO TAB */}
              {activeTab === 'eneco' && (
                <motion.div key="eneco" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <div className="flex flex-col items-center w-full mb-10 mt-4 relative">
                    <img src="./eneco-grey.png" alt="Eneco" className="h-20 object-contain opacity-70 mb-8" />

                    <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4 border-b border-slate-100 pb-4">
                      <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-black text-slate-500 mb-1">Tarieven</h2>
                        <p className="text-sm text-slate-400">
                          Laatst bijgewerkt: {marketData.lastUpdated ? formatDate(marketData.lastUpdated) : 'Nooit'}
                          {marketData.updatedBy && (
                            <span className="inline-flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                              door: 
                              {marketData.updatedByAvatar ? (
                                <img src={marketData.updatedByAvatar} alt={marketData.updatedBy} className="w-6 h-6 rounded-full object-cover inline-block ring-2 ring-slate-200 shadow-sm" />
                              ) : null}
                              <span className="text-slate-500 font-bold">{marketData.updatedBy}</span>
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasChanges && (
                          <button onClick={() => { setOverrideData(marketData); setInputStrings({}); }} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 bg-white hover:bg-slate-50 transition-all border border-slate-200 shadow-sm">
                            Annuleren
                          </button>
                        )}
                        <button onClick={handleSave} disabled={isSaving || !hasChanges} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${saveSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-[#E74B4D] text-white hover:bg-[#c73a3c] shadow-[#E74B4D]/20'} disabled:opacity-50`}>
                          {saveSuccess ? '✓ Opgeslagen' : isSaving ? 'Opslaan...' : 'Wijzigingen Opslaan'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {enecoPriceFields.map(group => (
                    <div key={group.group} className="mb-8">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">{group.group}</p>
                      {group.subGroups.map(sub => (
                        <div key={sub.subLabel} className="mb-5">
                          <p className="text-xs font-bold text-slate-400 mb-2 pl-1">{sub.subLabel}</p>
                          <div className={`grid gap-3 sm:gap-4 ${sub.fields.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'}`}>
                            {sub.fields.map(field => (
                              <div key={field.key} className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md`}>
                                <div className="flex items-center gap-3 mb-4">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${field.icon === 'elec' ? 'bg-amber-500' : 'bg-rose-500'} shadow-sm`}>
                                    {field.icon === 'elec' ? <Zap className="w-4 h-4 text-white" /> : <Flame className="w-4 h-4 text-white" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-black text-slate-500 truncate">{field.type}</p>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${field.label.includes('Vast') ? 'text-emerald-500' : field.label.includes('Nacht') ? 'text-indigo-500' : 'text-blue-500'}`}>{field.label}</p>
                                  </div>
                                </div>
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
                                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 font-bold text-slate-600 text-base sm:text-lg focus:ring-2 outline-none transition-all ${field.icon === 'elec' ? 'focus:ring-amber-500/50' : 'focus:ring-rose-500/50'}`}
                                />
                                <p className="text-[10px] text-slate-300 mt-2 text-right">€cent/kWh</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Eneco - Injectie Tarieven */}
                  <h3 className="text-lg font-black text-slate-500 mb-2 pt-6 border-t border-slate-100">Injectie Tarieven (Zonnepanelen)</h3>
                  <p className="text-xs text-slate-400 mb-5">Vergoeding per MWh voor geïnjecteerde stroom. Eén vast injectietarief per klanttype (geen dag/nacht).</p>
                  {[{ group: 'Particulier', fields: [
                    { key: 'enecoResElecInj', label: 'Injectietarief' },
                  ]}, { group: 'SOHO', fields: [
                    { key: 'enecoSohoElecInj', label: 'Injectietarief' },
                  ]}].map(g => (
                    <div key={g.group} className="mb-6">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{g.group}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {g.fields.map(f => (
                          <div key={f.key} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500 shadow-sm">
                                <Zap className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-500 uppercase">{f.label}</p>
                                <p className="text-[10px] font-bold tracking-wider text-emerald-500">Injectie</p>
                              </div>
                            </div>
                            <input type="number" step="0.01" value={inputStrings[`${f.key}_ctkwh`] ?? String(Number(((overrideData[f.key as keyof MarketData] as number) || 0) / 10).toFixed(2))} onChange={e => setInputStrings(prev => ({ ...prev, [`${f.key}_ctkwh`]: e.target.value }))} onBlur={e => { const centKwh = parseFloat(e.target.value) || 0; const mwhVal = centKwh * 10; setOverrideData(p => ({ ...p, [f.key]: mwhVal })); setInputStrings(p => ({ ...p, [`${f.key}_ctkwh`]: String(centKwh), [f.key]: String(mwhVal) })); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all" />
                            <p className="text-[10px] text-slate-300 mt-2 text-right">€cent/kWh</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Eneco - Vaste Vergoedingen */}
                  <h3 className="text-lg font-black text-slate-500 mb-2 pt-6 border-t border-slate-100">Vaste Vergoedingen</h3>
                  <p className="text-xs text-slate-400 mb-5">Vaste jaarlijkse kost (in €, per jaar) per doelgroep.</p>
                  {[{ group: 'Particulier', type: 'Res' }, { group: 'SOHO', type: 'Soho' }].map(g => (
                    <div key={g.group} className="mb-6">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{g.group}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[{ key: `eneco${g.type}VvElec`, label: 'Elektriciteit', color: 'bg-amber-500', focusRing: 'focus:ring-amber-500/50', hoverShadow: 'hover:shadow-md' }, { key: `eneco${g.type}VvGas`, label: 'Aardgas', color: 'bg-rose-500', focusRing: 'focus:ring-rose-500/50', hoverShadow: 'hover:shadow-md' }, { key: `eneco${g.type}VvInj`, label: 'Injectie', color: 'bg-emerald-500', focusRing: 'focus:ring-emerald-500/50', hoverShadow: 'hover:shadow-md' }].map(f => (
                          <div key={f.key} className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm transition-all ${f.hoverShadow}`}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.color} shadow-sm`}>
                                <span className="text-white font-bold text-xs">VV</span>
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-500 uppercase">{f.label}</p>
                                <p className="text-[10px] font-bold tracking-wider text-slate-400">Vaste Vergoeding</p>
                              </div>
                            </div>
                            <input type="number" step="0.5" value={inputStrings[f.key] ?? String(overrideData[f.key as keyof MarketData] ?? '')} onChange={e => setInputStrings(prev => ({ ...prev, [f.key]: e.target.value }))} onBlur={e => { const val = parseFloat(e.target.value) || 0; setOverrideData(p => ({ ...p, [f.key]: val })); setInputStrings(p => ({ ...p, [f.key]: String(val) })); }} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-600 focus:ring-2 ${f.focusRing} outline-none transition-all`} />
                            <p className="text-[10px] text-slate-300 mt-2 text-right">€/jaar</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Eneco - Commerciële Promoties */}
                  <h3 className="text-lg font-black text-slate-500 mb-2 pt-6 border-t border-slate-100">Commerciële Promoties (Eneco Variabel)</h3>
                  <p className="text-xs text-slate-400 mb-5">Vaste korting die verkopers optioneel kunnen toekennen om een verkoop te pushen.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {[{ key: 'promoElec', label: 'Elektriciteit Promo', color: 'bg-amber-500', focusRing: 'focus:ring-amber-500/50', hoverShadow: 'hover:shadow-md' }, { key: 'promoGas', label: 'Aardgas Promo', color: 'bg-rose-500', focusRing: 'focus:ring-rose-500/50', hoverShadow: 'hover:shadow-md' }].map(f => (
                      <div key={f.key} className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm transition-all ${f.hoverShadow}`}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.color} shadow-sm`}>
                            <span className="text-white font-black text-[10px]">PROMO</span>
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase">{f.label}</p>
                            <p className="text-[10px] font-bold tracking-wider text-slate-400">Optionele Korting</p>
                          </div>
                        </div>
                        <input type="number" step="1" value={inputStrings[f.key] ?? String(overrideData[f.key as keyof MarketData] ?? '')} onChange={e => setInputStrings(prev => ({ ...prev, [f.key]: e.target.value }))} onBlur={e => { const val = parseFloat(e.target.value) || 0; setOverrideData(p => ({ ...p, [f.key]: val })); setInputStrings(p => ({ ...p, [f.key]: String(val) })); }} className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-600 focus:ring-2 ${f.focusRing} outline-none transition-all`} />
                        <p className="text-[10px] text-slate-300 mt-2 text-right">€/jaar</p>
                      </div>
                    ))}
                  </div>

                </motion.div>
              )}

              {/* BONNEN (ORDERS) TAB */}
              {activeTab === 'orders' && (
                <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-500">Pendings</h2>
                      <p className="text-sm text-slate-400 mt-1">{orders.length} opgeslagen pendings</p>
                    </div>
                    <button onClick={fetchOrders} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg transition-all shadow-sm">
                      <RefreshCw className="w-4 h-4" /> Vernieuwen
                    </button>
                  </div>
                  
                  {ordersLoading ? (
                    <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" /></div>
                  ) : orders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                      <FileTextIcon className="w-12 h-12 text-blue-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-400">Nog geen pendings opgeslagen</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => {
                        const isExpanded = expandedOrder === order.id;
                        return (
                        <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                          <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full border border-slate-200 shadow-sm overflow-hidden shrink-0 bg-slate-100 relative">
                                {order.profiles?.avatar_id ? (
                                  <img src={order.profiles.avatar_id} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center text-white font-bold text-sm uppercase ${order.energy_type === 'ELEC' ? 'bg-blue-500' : order.energy_type === 'GAS' ? 'bg-blue-400' : 'bg-blue-600'}`}>
                                    {(order.profiles?.first_name || order.user_email || '?').charAt(0)}
                                  </div>
                                )}
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-white ${order.energy_type === 'ELEC' ? 'bg-amber-400' : order.energy_type === 'GAS' ? 'bg-rose-400' : 'bg-emerald-400'}`} title={order.energy_type} />
                              </div>
                              <div>
                                <p className="font-black text-slate-600">{order.first_name} {order.last_name}</p>
                                <p className="text-xs text-slate-400">{order.email} · {order.customer_type} · {order.energy_type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100">{order.commission_code}</span>
                              <span className="text-[10px] text-slate-400">{order.user_email}</span>
                              <span className="text-xs text-slate-400">{order.created_at ? formatDate(order.created_at) : ''}</span>
                              <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" /></svg>
                            </div>
                          </button>
                          {isExpanded && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-5 border-t border-slate-100">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4 text-xs">
                                <div><span className="text-slate-400 font-medium block">Energie Type</span><p className="font-bold text-slate-600">{order.energy_type}</p></div>
                                <div><span className="text-slate-400 font-medium block">Klant Type</span><p className="font-bold text-slate-600">{order.customer_type}</p></div>
                                <div><span className="text-slate-400 font-medium block">Meter Type</span><p className="font-bold text-slate-600">{order.meter_type || '—'}</p></div>
                                <div><span className="text-slate-400 font-medium block">Zonnepanelen</span><p className="font-bold text-slate-600">{order.has_solar ? 'Ja' : 'Nee'}</p></div>
                                {order.company_name && <div><span className="text-slate-400 font-medium block">Bedrijfsnaam</span><p className="font-bold text-slate-600">{order.company_name}</p></div>}
                                {order.vat_number && <div><span className="text-slate-400 font-medium block">BTW Nummer</span><p className="font-bold text-slate-600">{order.vat_number}</p></div>}
                                <div><span className="text-slate-400 font-medium block">Geboortedatum</span><p className="font-bold text-slate-600">{order.birth_date || '—'}</p></div>
                                <div><span className="text-slate-400 font-medium block">Telefoon</span><p className="font-bold text-slate-600">{order.phone || '—'}</p></div>
                                <div><span className="text-slate-400 font-medium block">Email</span><p className="font-bold text-slate-600">{order.email}</p></div>
                                {order.elec_consumption_mwh > 0 && <div><span className="text-slate-400 font-medium block">Elec Verbruik</span><p className="font-bold text-slate-600">{order.elec_consumption_mwh} MWh</p></div>}
                                {order.elec_dag_mwh > 0 && <div><span className="text-slate-400 font-medium block">Elec Dag</span><p className="font-bold text-slate-600">{order.elec_dag_mwh} MWh</p></div>}
                                {order.elec_nacht_mwh > 0 && <div><span className="text-slate-400 font-medium block">Elec Nacht</span><p className="font-bold text-slate-600">{order.elec_nacht_mwh} MWh</p></div>}
                                {order.gas_consumption_mwh > 0 && <div><span className="text-slate-400 font-medium block">Gas Verbruik</span><p className="font-bold text-slate-600">{order.gas_consumption_mwh} MWh</p></div>}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Aansluitingsadres</p>
                                  <p className="font-bold text-slate-600">{order.connection_street} {order.connection_house_number}{order.connection_bus ? ` bus ${order.connection_bus}` : ''}</p>
                                  <p className="text-slate-500">{order.connection_postal_code} {order.connection_city}</p>
                                </div>
                                {!order.billing_same && (
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Facturatieadres</p>
                                    <p className="font-bold text-slate-600">{order.billing_street} {order.billing_house_number}{order.billing_bus ? ` bus ${order.billing_bus}` : ''}</p>
                                    <p className="text-slate-500">{order.billing_postal_code} {order.billing_city}</p>
                                  </div>
                                )}
                              </div>
                              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                Aangemaakt door: <span className="font-bold text-slate-500">{order.user_email}</span>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  )}
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
                                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${log.action === 'ORDER_CREATED' || log.action === 'ENERGY_ORDER' ? 'bg-gradient-to-r from-[#E5394C] to-[#c73a3c] text-white shadow-sm' :
                                    log.action === 'CALCULATION' ? 'bg-slate-100 text-blue-600' :
                                    log.action === 'LOGIN' ? 'bg-emerald-50 text-emerald-600' :
                                      'bg-slate-50 text-slate-500'
                                    }`}>{log.action === 'ORDER_CREATED' || log.action === 'ENERGY_ORDER' ? 'BON OPGESLAGEN' : log.action === 'CALCULATION' ? 'BEREKENING' : log.action}</span>
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
