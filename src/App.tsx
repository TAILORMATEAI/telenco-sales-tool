import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import {
  DualEnergyIcon as Calculator,
  SettingsIcon as Settings,
  SendIcon as Send,
  ZapIcon as Zap,
  FlameIcon as Flame,
  InfoIcon as Info,
  CheckIcon as CheckCircle2,
  TrendingDownIcon as TrendingDown,
  RefreshCwIcon as Loader2,
  SaveIcon as Save,
  RefreshCwIcon as RefreshCw,
  ChevronRightIcon as ChevronRight,
  ChevronLeftIcon as ChevronLeft
} from './components/Icons';
import LiquidGlassSlider from './components/LiquidGlassSlider';
import axios from 'axios';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { supabase } from './supabase';
import Header from './components/Header';

type EnergyType = 'ELEC' | 'GAS' | 'BOTH' | null;

interface MarketData {
  epexSpot: number;
  endex: number;
  ttfEndex: number;
  ttfDam: number;
  margin30to80?: number;
  margin80to100?: number;
  lastUpdated?: string;
}

function CountUp({ value, isCurrency = false }: { value: number, isCurrency?: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) =>
    isCurrency ? `€${latest.toFixed(0)}` : latest.toFixed(1)
  );

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
}

export default function App() {
  const { user, isAdmin, signOut, lang, setLang } = useAuth();
  const navigate = useNavigate();
  const [energyType, setEnergyType] = useState<EnergyType>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // Electricity State
  const [elecKnowsConsumption, setElecKnowsConsumption] = useState<boolean | null>(null);
  const [elecConsumptionMWh, setElecConsumptionMWh] = useState<number>(50);
  const [elecIsOver30MWh, setElecIsOver30MWh] = useState<boolean | null>(null);
  const [elecCurrentPriceMWh, setElecCurrentPriceMWh] = useState<number>(120);
  const [elecEnecoOfferPriceMWh, setElecEnecoOfferPriceMWh] = useState<number>(85);
  const [elecTariff, setElecTariff] = useState<'VAST' | 'VARIABEL' | null>(null);

  // Gas State
  const [gasKnowsConsumption, setGasKnowsConsumption] = useState<boolean | null>(null);
  const [gasConsumptionMWh, setGasConsumptionMWh] = useState<number>(50);
  const [gasIsOver30MWh, setGasIsOver30MWh] = useState<boolean | null>(null);
  const [gasCurrentPriceMWh, setGasCurrentPriceMWh] = useState<number>(120);
  const [gasEnecoOfferPriceMWh, setGasEnecoOfferPriceMWh] = useState<number>(85);
  const [gasTariff, setGasTariff] = useState<'VAST' | 'VARIABEL' | null>(null);

  const [showInMWh, setShowInMWh] = useState<boolean>(true);
  const [inputUnit, setInputUnit] = useState<'MWh' | 'kWh'>('MWh');

  // Universal Commission
  const [elindusMargin, setElindusMargin] = useState<number>(15);
  const [elindusFixedFee, setElindusFixedFee] = useState<number>(100);

  // Wizard State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;
  const [direction, setDirection] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // UI State
  const [showAdminSettings, setShowAdminSettings] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Market Data
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [overrideData, setOverrideData] = useState<MarketData>({
    epexSpot: 65.40,
    endex: 72.10,
    ttfEndex: 35.20,
    ttfDam: 32.50,
    margin30to80: 15,
    margin80to100: 15
  });
  const [isSavingOverride, setIsSavingOverride] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchMarketData = async () => {
    setIsLoading(true);
    try {
      const { data: existingPrices, error } = await supabase.from('market_prices').select('*');
      if (!error && existingPrices && existingPrices.length > 0) {
        const fetchedData = {
          epexSpot: existingPrices.find(p => p.indicator_name === 'EPEX_SPOT')?.value || 65.40,
          endex: existingPrices.find(p => p.indicator_name === 'ENDEX')?.value || 72.10,
          ttfEndex: existingPrices.find(p => p.indicator_name === 'TTF_ENDEX')?.value || 35.20,
          ttfDam: existingPrices.find(p => p.indicator_name === 'TTF_DAM')?.value || 32.50,
          margin30to80: existingPrices.find(p => p.indicator_name === 'MARGIN_30_80')?.value || 15,
          margin80to100: existingPrices.find(p => p.indicator_name === 'MARGIN_80_100')?.value || 15,
          lastUpdated: existingPrices[0].last_updated
        };
        setMarketData(fetchedData);
        setOverrideData(fetchedData);
      }
    } catch (error) {
      console.error('Failed to fetch', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMarketData(); }, []);

  const handleSaveOverride = async () => {
    setIsSavingOverride(true);
    const nowIso = new Date().toISOString();
    const updates = [
      { indicator_name: 'EPEX_SPOT', value: overrideData.epexSpot, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'ENDEX', value: overrideData.endex, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'TTF_ENDEX', value: overrideData.ttfEndex, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'TTF_DAM', value: overrideData.ttfDam, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'MARGIN_30_80', value: overrideData.margin30to80, unit: '€/MWh', last_updated: nowIso },
      { indicator_name: 'MARGIN_80_100', value: overrideData.margin80to100, unit: '€/MWh', last_updated: nowIso }
    ];
    try {
      await supabase.from('market_prices').upsert(updates, { onConflict: 'indicator_name' });
      await fetchMarketData();
    } catch (err) { console.error('Failed to save', err); }
    finally { setIsSavingOverride(false); }
  };

  const handleSyncPrices = async () => {
    setIsSyncing(true);
    try {
      await axios.post('/api/sync-prices');
      await fetchMarketData();
      alert('✅ Succes! De Elindus prijzen zijn geüpdatet met de scraper.');
    } catch (error: any) {
      console.error('Failed to sync', error);
      alert('❌ Scraper Fout:\n' + (error?.response?.data?.error || error.message || 'Server onbereikbaar.'));
    }
    finally { setIsSyncing(false); }
  };

  // Helper getters maps
  const getActualConsumption = (type: 'ELEC' | 'GAS') => {
    if (type === 'ELEC') return elecKnowsConsumption === true ? elecConsumptionMWh : (elecIsOver30MWh === true ? 50 : 15);
    return gasKnowsConsumption === true ? gasConsumptionMWh : (gasIsOver30MWh === true ? 50 : 15);
  };

  const getRequiredTypes = (): ('ELEC' | 'GAS')[] => {
    if (!energyType) return [];
    if (energyType === 'BOTH') return ['ELEC', 'GAS'];
    return [energyType];
  };

  const totalConsumption = getRequiredTypes().reduce((sum, type) => sum + getActualConsumption(type), 0);

  const t = {
    NL: {
      title: 'Telenco Energy',
      elec: 'Elektriciteit',
      gas: 'Aardgas',
      both: 'Beide',
      knowsConsumption: 'Kent de klant zijn verbruik?',
      yes: 'Ja',
      no: 'Nee',
      tariffType: 'Tarief Type',
      vast: 'Vast',
      variabel: 'Variabel',
      consumption: 'Verbruik',
      over30: 'Verbruik > 30 MWh?',
      currentPrice: 'Huidige Prijs',
      enecoOffer: 'Eneco Voorstel',
      elindusOffer: 'Elindus Voorstel',
      margin: 'Marge (€/MWh)',
      fixedFee: 'Vaste Vergoeding (€)',
      savings: 'Besparing per jaar',
      commission: 'Jouw Commissie',
      send: 'Verstuur naar Coach',
      unitToggle: 'Toon in',
      marketPrices: 'Marktprijzen (Elindus)',
      adminSettings: 'Admin Instellingen',
      manualOverride: 'Handmatige Prijzen',
      savePrices: 'Opslaan',
      lastUpdated: 'Laatst',
      success: 'Succesvol verzonden!',
      loading: 'Marktgegevens laden...',
      statusFresh: 'Recent',
      statusStale: 'Verouderd',
      statusMissing: 'Geen Data',
      syncNow: 'Sync',
      basedOn: 'Gebaseerd op in totaal',
      generatedCode: 'Gegenereerde Code',
      notAvailable: 'Niet beschikbaar voor dit volume',
      next: 'Volgende',
      back: 'Terug',
      step1Title: 'Kies Energie',
      step2Title: 'Verbruiksgegevens',
      step3Title: 'Huidige Situatie',
      step4Title: 'Vergelijking',
      step5Title: 'Commissie & Afronden',
      step1Desc: 'Selecteer het energietype voor de module.',
      step5Desc: 'Configureer de globale commissie over',
      savingWord: 'Besparing:',
      totalSaving: 'Totaal Elindus Besparing',
      marginLocked: 'Marge is vastgezet op',
      backToHome: 'Terug naar overzicht',
      na: 'NVT',
      imbalance: 'Onbalans'
    },
    FR: {
      title: "Telenco Energy",
      elec: 'Électricité',
      gas: 'Gaz',
      both: 'Les Deux',
      knowsConsumption: 'Connaît-il sa consommation?',
      yes: 'Oui',
      no: 'Non',
      tariffType: 'Type de Tarif',
      vast: 'Fixe',
      variabel: 'Variable',
      consumption: 'Consommation',
      over30: 'Consommation > 30 MWh?',
      currentPrice: 'Prix Actuel',
      enecoOffer: 'Offre Eneco',
      elindusOffer: 'Offre Elindus',
      margin: 'Marge (€/MWh)',
      fixedFee: 'Frais Fixes (€)',
      savings: 'Économies annuelles',
      commission: 'Votre Commission',
      send: 'Envoyer au Coach',
      unitToggle: 'Afficher en',
      marketPrices: 'Prix du Marché',
      adminSettings: 'Admin',
      manualOverride: 'Surcharge',
      savePrices: 'Enregistrer',
      lastUpdated: 'Mis à jour',
      success: 'Envoyé avec succès!',
      loading: 'Chargement...',
      statusFresh: 'Récent',
      statusStale: 'Obsolète',
      statusMissing: 'Aucune',
      syncNow: 'Sync',
      basedOn: 'Basé sur un total de',
      generatedCode: 'Code Généré',
      notAvailable: 'Non disponible pour ce volume',
      next: 'Suivant',
      back: 'Retour',
      step1Title: 'Énergie',
      step2Title: 'Consommation',
      step3Title: 'Situation Actuelle',
      step4Title: 'Comparaison',
      step5Title: 'Commission & Fin',
      step1Desc: 'Sélectionnez le type d\'énergie pour le module.',
      step5Desc: 'Configurez la commission globale sur',
      savingWord: 'Économie:',
      totalSaving: 'Économie Totale Elindus',
      marginLocked: 'Marge fixée à',
      backToHome: 'Retour',
      na: 'N/A',
      imbalance: 'Déséquilibre'
    }
  };

  const text = t[lang];

  let dataStatusColor = 'bg-rose-500';
  let dataStatusText = text.statusMissing;

  if (marketData?.lastUpdated) {
    const lastUpdatedDate = new Date(marketData.lastUpdated);
    const now = new Date();
    if (Math.abs(now.getTime() - lastUpdatedDate.getTime()) / 36e5 < 24) {
      dataStatusColor = 'bg-emerald-500';
      dataStatusText = text.statusFresh;
    } else {
      dataStatusColor = 'bg-orange-500';
      dataStatusText = text.statusStale;
    }
  }

  // Savings Logic helper per type
  const calculateTypeOutcome = (type: 'ELEC' | 'GAS') => {
    const cons = getActualConsumption(type);
    const currPrice = type === 'ELEC' ? elecCurrentPriceMWh : gasCurrentPriceMWh;

    // Eneco
    const enecoPrice = type === 'ELEC' ? elecEnecoOfferPriceMWh : gasEnecoOfferPriceMWh;
    const enecoSavingsVal = currPrice - enecoPrice;
    const enecoSavingsPercentage = currPrice > 0 ? (enecoSavingsVal / currPrice) * 100 : 0;

    // Elindus
    const baseMarkt = type === 'GAS'
      ? (gasTariff === 'VAST' ? (marketData?.ttfEndex || 0) : (marketData?.ttfDam || 0))
      : (elecTariff === 'VAST' ? (marketData?.endex || 0) : (marketData?.epexSpot || 0));

    let effectiveElindusMargin = elindusMargin;
    if (totalConsumption <= 80) effectiveElindusMargin = marketData?.margin30to80 ?? 15;
    else if (totalConsumption <= 100) effectiveElindusMargin = marketData?.margin80to100 ?? 15;

    const elinEstimatedPrice = baseMarkt + effectiveElindusMargin;
    const elindusSavingsVal = currPrice - elinEstimatedPrice;

    return {
      type,
      cons,
      currPrice,
      enecoPrice,
      enecoSavingsPercentage,
      enecoSavingsTotal: enecoSavingsVal * cons,
      elindusEsimatedPrice: elinEstimatedPrice,
      elindusSavingsTotal: elindusSavingsVal * cons,
      showEneco: cons <= 100,
      showElindus: cons >= 30,
    };
  };

  const outcomes = getRequiredTypes().map(calculateTypeOutcome);

  const totalEnecoSavings = outcomes.reduce((sum, o) => sum + (o.showEneco ? o.enecoSavingsTotal : 0), 0);
  const totalElindusSavings = outcomes.reduce((sum, o) => sum + (o.showElindus ? o.elindusSavingsTotal : 0), 0);

  let effectiveElindusMargin = elindusMargin;
  if (totalConsumption <= 80) effectiveElindusMargin = marketData?.margin30to80 ?? 15;
  else if (totalConsumption <= 100) effectiveElindusMargin = marketData?.margin80to100 ?? 15;

  const effectiveElindusFixedFee = totalConsumption <= 100 ? Math.max(50, elindusFixedFee) : elindusFixedFee;
  const extraMargin = Math.max(0, effectiveElindusMargin - 6);
  const commission = (effectiveElindusFixedFee / 2) + (extraMargin * totalConsumption);

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(2)}`;
  const commissionCode = `#ELI${Math.round(commission)}/${dateStr}`;

  const formatPrice = (valMWh: number) => {
    if (showInMWh) return `€${valMWh.toFixed(2)} / MWh`;
    return `€${(valMWh / 1000).toFixed(4)} / kWh`;
  };

  useEffect(() => { setValidationError(null); }, [elecConsumptionMWh, gasConsumptionMWh, elecCurrentPriceMWh, gasCurrentPriceMWh, energyType, currentStep]);

  const isStepValid = () => {
    const req = getRequiredTypes();
    if (currentStep === 2) {
      // Must have answered all sub-questions
      if (req.includes('ELEC')) {
        if (elecKnowsConsumption === null || elecTariff === null) return false;
        if (elecKnowsConsumption === true && elecConsumptionMWh <= 0) return false;
        if (elecKnowsConsumption === false && elecIsOver30MWh === null) return false;
      }
      if (req.includes('GAS')) {
        if (gasKnowsConsumption === null || gasTariff === null) return false;
        if (gasKnowsConsumption === true && gasConsumptionMWh <= 0) return false;
        if (gasKnowsConsumption === false && gasIsOver30MWh === null) return false;
      }
    }
    if (currentStep === 3) {
      if (req.includes('ELEC') && elecCurrentPriceMWh <= 0) return false;
      if (req.includes('GAS') && gasCurrentPriceMWh <= 0) return false;
    }
    return true;
  };

  const validateStep = () => {
    const req = getRequiredTypes();
    if (currentStep === 2) {
      if (req.includes('ELEC')) {
        if (elecKnowsConsumption === null) { setValidationError(lang === 'NL' ? 'Beantwoord eerst alle vragen voor Elektriciteit.' : 'Répondez d\'abord à toutes les questions.'); return false; }
        if (elecTariff === null) { setValidationError(lang === 'NL' ? 'Selecteer een tarief type voor Elektriciteit.' : 'Sélectionnez un type de tarif.'); return false; }
        if (elecKnowsConsumption === true && elecConsumptionMWh <= 0) { setValidationError(lang === 'NL' ? 'Vul een geldig Elektriciteitsverbruik in (> 0).' : 'Veuillez entrer une conso Elec valide (> 0).'); return false; }
        if (elecKnowsConsumption === false && elecIsOver30MWh === null) { setValidationError(lang === 'NL' ? 'Beantwoord de verbruiksvraag voor Elektriciteit.' : 'Répondez à la question de consommation.'); return false; }
      }
      if (req.includes('GAS')) {
        if (gasKnowsConsumption === null) { setValidationError(lang === 'NL' ? 'Beantwoord eerst alle vragen voor Aardgas.' : 'Répondez d\'abord à toutes les questions.'); return false; }
        if (gasTariff === null) { setValidationError(lang === 'NL' ? 'Selecteer een tarief type voor Aardgas.' : 'Sélectionnez un type de tarif.'); return false; }
        if (gasKnowsConsumption === true && gasConsumptionMWh <= 0) { setValidationError(lang === 'NL' ? 'Vul een geldig aardgasverbruik in (> 0).' : 'Veuillez entrer une conso Gaz valide (> 0).'); return false; }
        if (gasKnowsConsumption === false && gasIsOver30MWh === null) { setValidationError(lang === 'NL' ? 'Beantwoord de verbruiksvraag voor Aardgas.' : 'Répondez à la question de consommation.'); return false; }
      }
    }
    if (currentStep === 3) {
      if (req.includes('ELEC') && elecCurrentPriceMWh <= 0) { setValidationError(lang === 'NL' ? 'Vul een geldige Elec prijs in (> 0).' : 'Veuillez entrer un prix Elec valide (> 0).'); return false; }
      if (req.includes('GAS') && gasCurrentPriceMWh <= 0) { setValidationError(lang === 'NL' ? 'Vul een geldige Gaz prijs in (> 0).' : 'Veuillez entrer un prix Gaz valide (> 0).'); return false; }
    }
    setValidationError(null);
    return true;
  };

  const [isTranslating, setIsTranslating] = useState(false);

  const nextStep = () => {
    if (isTranslating) return;
    if (!validateStep()) return;
    if (currentStep < totalSteps) {
      setIsTranslating(true);
      setDirection(1);
      setCurrentStep(prev => prev + 1);
      setTimeout(() => setIsTranslating(false), 800);
    }
  };

  const prevStep = () => {
    if (isTranslating) return;
    if (currentStep > 1) {
      setIsTranslating(true);
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
      setTimeout(() => setIsTranslating(false), 800);
    }
  };

  const variants = {
    enter: { opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } },
    center: { zIndex: 1, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
    exit: { zIndex: 0, opacity: 0, transition: { duration: 0.45, ease: 'easeIn' } }
  };

  const handleSendEmail = async () => {
    setIsSubmitting(true);
    try {
      await supabase.from('sales_logs').insert({
        commission_code: commissionCode,
        energy_type: energyType,
        consumption_mwh: totalConsumption,
        margin_chosen: elindusMargin,
        fixed_fee_chosen: elindusFixedFee,
        commission_calculated: commission
      });
      // Log activity
      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          user_email: user.email,
          action: 'CALCULATION',
          energy_type: energyType,
          consumption_mwh: totalConsumption,
          commission_code: commissionCode
        });
      }
      setIsSuccess(true);
      const subject = encodeURIComponent(`Nieuwe Elindus Commissie Code: ${commissionCode}`);
      const body = encodeURIComponent(`Beste coach,\n\nHierbij de nieuwe commissie code voor de klant:\nCode: ${commissionCode}\nVerbruik: ${totalConsumption} MWh\n\nMet vriendelijke groet.`);
      window.location.href = `mailto:coach@telenco.be?subject=${subject}&body=${body}`;
      setTimeout(() => { setIsSuccess(false); }, 3000);
    } catch (err) {
      console.error('Failed to log sale', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-[#E74B4D] mb-4" />
        <p className="font-medium animate-pulse">{text.loading}</p>
      </div>
    );
  }

  // UI Components
  const renderConsumptionInput = (type: 'ELEC' | 'GAS') => {
    const isElec = type === 'ELEC';
    const label = isElec ? text.elec : text.gas;
    const knows = isElec ? elecKnowsConsumption : gasKnowsConsumption;
    const setKnows = isElec ? setElecKnowsConsumption : setGasKnowsConsumption;
    const consMWh = isElec ? elecConsumptionMWh : gasConsumptionMWh;
    const setConsMWh = isElec ? setElecConsumptionMWh : setGasConsumptionMWh;
    const over30 = isElec ? elecIsOver30MWh : gasIsOver30MWh;
    const setOver30 = isElec ? setElecIsOver30MWh : setGasIsOver30MWh;
    const tariff = isElec ? elecTariff : gasTariff;
    const setTariff = isElec ? setElecTariff : setGasTariff;
    const Icon = isElec ? Zap : Flame;

    return (
      <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 space-y-0 flex-1">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-8">
          <Icon className="w-6 h-6 text-[#E74B4D]" />
          <h3 className="text-xl font-bold text-slate-600">{label}</h3>
        </div>

        {/* Question 1: Knows consumption? */}
        <div>
          <label className="block text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest text-center">{text.knowsConsumption}</label>
          <div className="flex justify-center flex-wrap sm:flex-nowrap gap-4">
            <button onClick={() => setKnows(true)} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-bold transition-all ${knows === true ? 'bg-[#E74B4D] text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.yes}</button>
            <button onClick={() => setKnows(false)} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-bold transition-all ${knows === false ? 'bg-[#E74B4D] text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.no}</button>
          </div>
        </div>

        {/* Question 2: Tariff type — only after answering Q1 */}
        <AnimatePresence>
          {knows !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="overflow-clip"
            >
              <div className="mt-8 pt-8 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest text-center">{text.tariffType}</label>
                <div className="flex justify-center flex-wrap sm:flex-nowrap gap-4">
                  <button onClick={() => setTariff('VAST')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-bold transition-all ${tariff === 'VAST' ? 'bg-[#E74B4D] text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.vast}</button>
                  <button onClick={() => setTariff('VARIABEL')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-bold transition-all ${tariff === 'VARIABEL' ? 'bg-[#E74B4D] text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.variabel}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question 3: Consumption details — only after answering Q2 */}
        <AnimatePresence mode="wait">
          {tariff !== null && knows === true && (
            <motion.div
              key="slider"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-8 pt-8 mt-8 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-100 pb-4">
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">{text.consumption}</label>
                  <div className="flex bg-slate-100 p-1 rounded-full">
                    <button onClick={() => setInputUnit('kWh')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${inputUnit === 'kWh' ? 'bg-white text-[#E74B4D] shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>kWh</button>
                    <button onClick={() => setInputUnit('MWh')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${inputUnit === 'MWh' ? 'bg-white text-[#E74B4D] shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>MWh</button>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-[200px] group">
                      <input type="number" step="0.01" value={inputUnit === 'kWh' ? (consMWh === 0 ? '' : Math.round(consMWh * 1000)) : (consMWh === 0 ? '' : consMWh)} onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') { setConsMWh(0); return; }
                        const val = Number(raw);
                        setConsMWh(inputUnit === 'kWh' ? val / 1000 : val);
                      }} className="block w-full pr-16 py-4 text-3xl font-black text-center bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-[#E74B4D]/5 focus:ring-4 focus:ring-[#E74B4D]/10 focus:border-[#E74B4D] transition-all text-[#E74B4D] outline-none" />
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#E74B4D]/50 font-bold text-lg pointer-events-none">{inputUnit}</span>
                    </div>
                  </div>
                  {inputUnit === 'MWh' && (
                    <LiquidGlassSlider min={1} max={250} value={consMWh} onChange={(val) => setConsMWh(val)} color="#E74B4D" className="w-full mb-2" />
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {tariff !== null && knows === false && (
            <motion.div
              key="toggle"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="pt-8 mt-8 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest text-center">{text.over30}</label>
                <div className="flex justify-center flex-wrap sm:flex-nowrap gap-4">
                  <button onClick={() => setOver30(true)} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-bold transition-all ${over30 === true ? 'bg-[#E74B4D] text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.yes}</button>
                  <button onClick={() => setOver30(false)} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-bold transition-all ${over30 === false ? 'bg-[#E74B4D] text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.no}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderCurrentPriceInput = (type: 'ELEC' | 'GAS') => {
    const isElec = type === 'ELEC';
    const label = isElec ? text.elec : text.gas;
    const cons = isElec ? elecCurrentPriceMWh : gasCurrentPriceMWh;
    const setCons = isElec ? setElecCurrentPriceMWh : setGasCurrentPriceMWh;
    const Icon = isElec ? Zap : Flame;

    return (
      <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 space-y-8 flex-1">
        <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-[#E74B4D]" />
            <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">{label}</label>
          </div>
          <button onClick={() => setShowInMWh(!showInMWh)} className="text-xs font-bold text-[#E74B4D] bg-[#E74B4D]/5 px-4 py-2 rounded-full border border-[#E74B4D]/10">
            {text.unitToggle} {showInMWh ? 'kWh' : 'MWh'}
          </button>
        </div>

        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-6 flex items-center text-slate-400 font-bold text-3xl">€</span>
          <input
            type="number"
            step="0.01"
            value={showInMWh ? (cons === 0 ? '' : cons) : (cons === 0 ? '' : cons / 1000)}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') { setCons(0); return; }
              const val = Number(raw);
              setCons(showInMWh ? val : val * 1000);
            }}
            className="block w-full pl-16 pr-24 py-8 text-4xl font-black text-center bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:bg-[#E74B4D]/5 focus:ring-4 focus:ring-[#E74B4D]/10 focus:border-[#E74B4D] transition-all text-slate-600 outline-none"
          />
          <span className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-400 font-bold text-xl hidden sm:flex">{showInMWh ? '/ MWh' : '/ kWh'}</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-slate-50 text-slate-500 font-sans overflow-x-hidden relative flex flex-col"
    >
      <div className="fixed top-0 left-0 w-full h-1.5 bg-white/20 z-50 overflow-hidden">
        <motion.div className="h-full bg-white" initial={{ width: '0%' }} animate={{ width: `${(currentStep / totalSteps) * 100}%` }} transition={{ duration: 0.3, ease: 'easeInOut' }} />
      </div>

      <div className="absolute top-0 left-0 w-full h-[70vh] bg-gradient-to-br from-[#E5384C] via-[#E74B4D] to-[#EA704F] z-0 overflow-hidden pointer-events-none">
        <svg className="absolute bottom-0 w-full min-w-[1200px]" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ transform: 'translateY(2px)' }}>
          <path fill="rgba(255,255,255,0.05)" d="M0,192L48,192C96,192,192,192,288,208C384,224,480,256,576,261.3C672,267,768,245,864,213.3C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="rgba(255,255,255,0.15)" d="M0,160L48,170.7C96,181,192,203,288,186.7C384,171,480,117,576,112C672,107,768,149,864,176C960,203,1056,213,1152,192C1248,171,1344,117,1392,85.3L1440,53.3L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="#f8fafc" d="M0,256L48,256C96,256,192,256,288,240C384,224,480,192,576,197.3C672,203,768,245,864,250.7C960,256,1056,224,1152,192C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <Header 
        actionButton={
          <button onClick={() => navigate('/home')} className="p-2 rounded-full transition-colors bg-white/20 border border-white/30 text-white hover:bg-white hover:text-[#E74B4D]" title={text.backToHome}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        }
      />


      <AnimatePresence mode="wait">
        <motion.main
          key={lang}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 flex-1 flex flex-col justify-center items-center py-12 pb-24"
        >
          <div className="w-full relative flex items-center justify-center min-h-[400px]">
            <AnimatePresence initial={false} custom={direction} mode="wait">

              {/* STEP 1 */}
              {currentStep === 1 && (
                <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col sm:flex-row gap-4">
                    {(['ELEC', 'GAS', 'BOTH'] as const).map((type) => {
                      const isSelected = energyType === type;
                      const label = type === 'ELEC' ? text.elec : type === 'GAS' ? text.gas : text.both;
                      const Icon = type === 'ELEC' ? Zap : type === 'GAS' ? Flame : Calculator;
                      return (
                        <button key={type} onClick={() => { setEnergyType(type); nextStep(); }} className={`flex-1 flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border-2 transition-all ${isSelected ? 'bg-[#E74B4D]/5 border-[#E74B4D] text-[#E74B4D]' : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}>
                          <Icon className={`h-10 ${type === 'BOTH' ? 'w-auto' : 'w-10'}`} />
                          <span className="font-bold text-lg">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* STEP 2 */}
              {currentStep === 2 && (
                <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="flex flex-col md:flex-row gap-6 w-full">
                    {getRequiredTypes().map(type => (
                      <React.Fragment key={type}>{renderConsumptionInput(type)}</React.Fragment>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 3 */}
              {currentStep === 3 && (
                <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="flex flex-col md:flex-row gap-6 w-full">
                    {getRequiredTypes().map(type => (
                      <React.Fragment key={type}>{renderCurrentPriceInput(type)}</React.Fragment>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Marge & Vergoeding (was step 5) */}
              {currentStep === 4 && (
                <motion.div key="step4" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 space-y-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-end mb-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{text.margin}</label>
                        <div className="text-2xl font-black text-[#E74B4D]">€{effectiveElindusMargin}</div>
                      </div>
                      {totalConsumption <= 100 ? (
                        <div className="text-xs font-bold text-[#E74B4D] bg-[#E74B4D]/10 px-3 py-2 rounded-lg text-center">{text.marginLocked} €{effectiveElindusMargin}.</div>
                      ) : (
                        <LiquidGlassSlider min={10} max={31} step={0.5} value={elindusMargin} onChange={(val) => setElindusMargin(val)} color="#E74B4D" className="w-full" />
                      )}
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-end mb-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{text.fixedFee}</label>
                        <div className="text-2xl font-black text-[#E74B4D]">€{totalConsumption <= 100 ? Math.max(50, elindusFixedFee) : elindusFixedFee}</div>
                      </div>
                      <LiquidGlassSlider min={totalConsumption <= 100 ? 50 : 0} max={250} step={10} value={elindusFixedFee} onChange={(val) => setElindusFixedFee(val)} color="#E74B4D" className="w-full" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: Vergelijking & Afronden (was step 4) */}
              {currentStep === 5 && (
                <motion.div key="step5" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col gap-6">
                    {outcomes.map(({ type, cons, showEneco, showElindus, currPrice, enecoPrice, elindusEsimatedPrice, enecoSavingsTotal, elindusSavingsTotal, enecoSavingsPercentage }) => (
                      <div key={type} className="border border-slate-100 rounded-3xl p-6 bg-slate-50 relative">
                        <div className="absolute top-0 left-0 w-2 h-full bg-slate-300" />
                        <h4 className="font-bold text-slate-600 mb-4 pl-4 uppercase tracking-widest border-b border-slate-200 pb-2">{type === 'ELEC' ? text.elec : text.gas} ({cons} MWh)</h4>

                        <div className="grid md:grid-cols-2 gap-4 pl-4">
                          {/* Eneco */}
                          <div className={`p-4 rounded-xl border-2 ${showEneco ? 'border-slate-200 bg-white' : 'border-slate-100 bg-white opacity-50'}`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-slate-500">Eneco</span>
                              {!showEneco && <span className="text-[10px] uppercase font-bold text-slate-400">&gt; 100 MWh</span>}
                            </div>
                            {showEneco ? (
                              <>
                                <input type="number" step="0.01" value={showInMWh ? (enecoPrice === 0 ? '' : enecoPrice) : (enecoPrice === 0 ? '' : enecoPrice / 1000)} onChange={(e) => { const raw = e.target.value; const val = raw === '' ? 0 : Number(raw); type === 'ELEC' ? setElecEnecoOfferPriceMWh(showInMWh ? val : val * 1000) : setGasEnecoOfferPriceMWh(showInMWh ? val : val * 1000); }} className="w-full bg-slate-50 focus:bg-[#E74B4D]/5 border border-slate-200 rounded-lg py-2 px-3 focus:ring-2 focus:ring-[#E74B4D]/30 focus:border-[#E74B4D] font-bold mb-2 text-sm outline-none" />
                                <div className="text-right flex items-center justify-end gap-2 mt-2">
                                  <span className="text-xs text-slate-400 font-bold">{text.savingWord}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${enecoSavingsPercentage > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{enecoSavingsPercentage > 0 ? '+' : ''}{enecoSavingsPercentage.toFixed(2)}%</span>
                                  <span className={`block font-black text-lg ${enecoSavingsTotal > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{enecoSavingsTotal > 0 ? '+' : ''}€{enecoSavingsTotal.toFixed(2)}</span>
                                </div>
                              </>
                            ) : <div className="text-xs font-bold text-slate-400 mt-2">{text.na}</div>}
                          </div>

                          {/* Elindus */}
                          <div className={`p-4 rounded-xl border-2 ${showElindus ? 'border-slate-200 bg-white' : 'border-slate-100 bg-white opacity-50'}`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-slate-500">Elindus</span>
                              {!showElindus && <span className="text-[10px] uppercase font-bold text-slate-400">&lt; 30 MWh</span>}
                            </div>
                            {showElindus ? (
                              <>
                                <div className="w-full bg-white border border-[#E74B4D]/20 rounded-lg py-2 px-3 font-bold mb-2 text-sm text-slate-600 flex justify-between items-center">
                                  <span>{formatPrice(elindusEsimatedPrice)}</span>
                                  <a href="https://klant.elindus.be/s/marktinformatie" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#E74B4D] hover:underline flex items-center gap-0.5 bg-[#E74B4D]/10 px-1.5 py-0.5 rounded"><Info className="w-3 h-3" /> {text.imbalance}</a>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-slate-400 font-bold">{text.savingWord}</span>
                                  <span className={`block font-black text-lg ${elindusSavingsTotal > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{elindusSavingsTotal > 0 ? '+' : ''}€{elindusSavingsTotal.toFixed(2)}</span>
                                </div>
                              </>
                            ) : <div className="text-xs font-bold text-slate-400 mt-2">{text.na}</div>}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Totale besparing + Commissie */}
                    <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-slate-100">
                      <div className="text-center sm:text-left">
                        <span className="block text-xs uppercase tracking-widest font-bold text-slate-400 mb-1">{text.totalSaving}</span>
                        <span className={`text-4xl font-black ${totalElindusSavings > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{totalElindusSavings > 0 ? '+' : ''}€{totalElindusSavings.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col items-center sm:items-end gap-2">
                        <span className="text-xs uppercase tracking-widest font-bold text-slate-400">{text.commission}</span>
                        <span className="text-3xl font-black text-emerald-500">€{commission.toFixed(2)}</span>
                        <div className="bg-slate-100 px-4 py-2 rounded-xl font-mono font-bold text-sm text-[#E74B4D] tracking-tight">{commissionCode}</div>
                      </div>
                    </div>

                    {/* Verstuur knop */}
                    <button onClick={handleSendEmail} disabled={isSubmitting || isSuccess} className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex justify-center items-center gap-2 ${isSuccess ? 'bg-emerald-500 text-white' : 'bg-[#E74B4D] text-white hover:bg-[#E5384C]'}`}>
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isSuccess ? <><CheckCircle2 className="w-5 h-5" /> Verzonden</> : <><Send className="w-5 h-5" /> {text.send}</>}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="w-full relative flex items-center justify-center mt-8">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              {currentStep === 1 ? (
                <motion.div key="nav-1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="opacity-0 pointer-events-none h-0" />
              ) : (
                <motion.div key={`nav-${currentStep}`} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="relative w-full max-w-3xl mx-auto px-0 sm:px-6 z-50">
                  <div className="bg-white/80 backdrop-blur-xl border border-white shadow-sm p-4 sm:p-6 rounded-[2rem] flex justify-between items-center">
                    <button onClick={prevStep} className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all text-slate-500 hover:bg-slate-100"><ChevronLeft className="w-5 h-5" /><span className="hidden sm:inline">{text.back}</span></button>
                    <div className="flex gap-2 sm:gap-3">{[...Array(totalSteps)].map((_, i) => (<div key={i} className={`h-2.5 rounded-full transition-all duration-300 ${currentStep === i + 1 ? 'bg-[#E74B4D] w-8' : 'bg-slate-200 w-2.5'}`} />))}</div>
                    <div className="flex flex-col items-end relative">
                      <AnimatePresence>
                        {validationError && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full mb-4 right-0 bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-rose-100 whitespace-nowrap">{validationError}</motion.div>)}
                      </AnimatePresence>
                      <button onClick={nextStep} className={`flex items-center gap-2 px-6 sm:px-8 py-3 rounded-2xl font-bold transition-all ${currentStep === totalSteps ? 'opacity-0 pointer-events-none' : (!isStepValid() ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#E74B4D] text-white hover:bg-[#E5384C]')}`}><span className="hidden sm:inline">{text.next}</span><ChevronRight className="w-5 h-5" /></button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.main>
      </AnimatePresence>



      {/* Copyright Footer */}
      <div className="w-full mt-auto pb-8 sm:pb-10 pt-4 z-40 flex justify-center items-center pointer-events-none">
        <p className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-400/80">
          © 2026 Telenco <span className="mx-0.5 opacity-40">·</span> Powered by
          <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-3 sm:h-3.5 opacity-50 ml-0.5 object-contain" style={{ filter: 'grayscale(1) brightness(0)' }} />
        </p>
      </div>
    </motion.div>
  );
}
