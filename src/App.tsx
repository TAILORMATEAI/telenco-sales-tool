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
type CustomerType = 'PARTICULIER' | 'SOHO' | null;

interface MarketData {
  epexSpot: number;
  ttfDam: number;
  elecMultiplier?: number;
  elecAdder?: number;
  gasMultiplier?: number;
  gasAdder?: number;
  enecoResElecVast?: number;
  enecoResElecVar?: number;
  enecoResGasVast?: number;
  enecoResGasVar?: number;
  enecoSohoElecVast?: number;
  enecoSohoElecVar?: number;
  enecoSohoGasVast?: number;
  enecoSohoGasVar?: number;
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
  const [customerType, setCustomerType] = useState<CustomerType>(null);

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

  // Fixed fee state
  const [elecCurrentFixedFee, setElecCurrentFixedFee] = useState<number>(100);
  const [gasCurrentFixedFee, setGasCurrentFixedFee] = useState<number>(100);
  const [includeFixedFeeSavings, setIncludeFixedFeeSavings] = useState<boolean>(false);
  const [comparisonView, setComparisonView] = useState<'ENECO' | 'ELINDUS'>('ENECO');
  const [globalCalcOpen, setGlobalCalcOpen] = useState<'ENECO' | 'ELINDUS' | null>(null);
  const [showLinksModal, setShowLinksModal] = useState<boolean>(false);

  // Fixed fee constants
  const ENECO_FIXED_FEE = customerType === 'PARTICULIER' ? { ELEC: 65, GAS: 65 } : { ELEC: 90, GAS: 90 };
  const ELINDUS_FIXED_FEE = { ELEC: 60, GAS: 60 };

  // Universal Commission
  const [elindusMargin, setElindusMargin] = useState<number>(15);
  const [elindusFixedFee, setElindusFixedFee] = useState<number>(100);

  // Wizard State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;
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
    elecMultiplier: 1.1,
    elecAdder: 18,
    gasMultiplier: 1.05,
    gasAdder: 14
  });
  const [isSavingOverride, setIsSavingOverride] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const fetchMarketData = async () => {
    setIsLoading(true);
    try {
      const { data: existingPrices, error } = await supabase.from('market_prices').select('*');
      if (!error && existingPrices && existingPrices.length > 0) {
        const find = (name: string) => existingPrices.find(p => p.indicator_name === name);
        const fetchedData = {
          epexSpot: find('EPEX_SPOT')?.value || 65.40,
          ttfDam: find('TTF_DAM')?.value || 32.50,
          elecMultiplier: find('ELEC_MULTIPLIER')?.value || 1.1,
          elecAdder: find('ELEC_ADDER')?.value || 18,
          gasMultiplier: find('GAS_MULTIPLIER')?.value || 1.05,
          gasAdder: find('GAS_ADDER')?.value || 14,
          enecoResElecVast: find('ENECO_RES_ELEC_VAST')?.value || 0,
          enecoResElecVar: find('ENECO_RES_ELEC_VARIABEL')?.value || 0,
          enecoResGasVast: find('ENECO_RES_GAS_VAST')?.value || 0,
          enecoResGasVar: find('ENECO_RES_GAS_VARIABEL')?.value || 0,
          enecoSohoElecVast: find('ENECO_SOHO_ELEC_VAST')?.value || 0,
          enecoSohoElecVar: find('ENECO_SOHO_ELEC_VARIABEL')?.value || 0,
          enecoSohoGasVast: find('ENECO_SOHO_GAS_VAST')?.value || 0,
          enecoSohoGasVar: find('ENECO_SOHO_GAS_VARIABEL')?.value || 0,
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

  // Auto-fill Eneco offer prices from admin-set values
  useEffect(() => {
    if (!marketData || !customerType) return;
    const isSoho = customerType === 'SOHO';
    const getPrice = (type: 'ELEC' | 'GAS', tariff: 'VAST' | 'VARIABEL' | null) => {
      if (tariff === 'VAST') return type === 'ELEC' ? (isSoho ? marketData.enecoSohoElecVast : marketData.enecoResElecVast) : (isSoho ? marketData.enecoSohoGasVast : marketData.enecoResGasVast);
      return type === 'ELEC' ? (isSoho ? marketData.enecoSohoElecVar : marketData.enecoResElecVar) : (isSoho ? marketData.enecoSohoGasVar : marketData.enecoResGasVar);
    };
    const elecPrice = getPrice('ELEC', elecTariff) || 0;
    const gasPrice = getPrice('GAS', gasTariff) || 0;
    if (elecPrice > 0) setElecEnecoOfferPriceMWh(elecPrice);
    if (gasPrice > 0) setGasEnecoOfferPriceMWh(gasPrice);
  }, [customerType, elecTariff, gasTariff, marketData]);

  const handleSaveOverride = async () => {
    setIsSavingOverride(true);
    const nowIso = new Date().toISOString();
    const updates = [
      { indicator_name: 'EPEX_SPOT', value: overrideData.epexSpot, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'TTF_DAM', value: overrideData.ttfDam, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'ELEC_MULTIPLIER', value: overrideData.elecMultiplier ?? 1.1, unit: 'x', last_updated: nowIso },
      { indicator_name: 'ELEC_ADDER', value: overrideData.elecAdder ?? 18, unit: '€/MWh', last_updated: nowIso },
      { indicator_name: 'GAS_MULTIPLIER', value: overrideData.gasMultiplier ?? 1.05, unit: 'x', last_updated: nowIso },
      { indicator_name: 'GAS_ADDER', value: overrideData.gasAdder ?? 14, unit: '€/MWh', last_updated: nowIso }
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
      over30: 'Meer dan 25.000 kWh per jaar?',
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
      step1Title: 'Klanttype',
      step2Title: 'Kies Energie',
      step3Title: 'Verbruiksgegevens',
      step4Title: 'Huidige Situatie',
      step5Title: 'Vergelijking',
      step6Title: 'Commissie & Afronden',
      step1Desc: 'Selecteer het type klant.',
      step5Desc: 'Configureer de globale commissie over',
      particulier: 'Particulier',
      soho: 'SOHO',
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
      over30: 'Plus de 25.000 kWh par an?',
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
      step1Title: 'Type Client',
      step2Title: 'Énergie',
      step3Title: 'Consommation',
      step4Title: 'Situation Actuelle',
      step5Title: 'Comparaison',
      step6Title: 'Commission & Fin',
      step1Desc: 'Sélectionnez le type de client.',
      step5Desc: 'Configurez la commission globale sur',
      particulier: 'Particulier',
      soho: 'SOHO',
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

    // Elindus formula: price × multiplier + adder
    const baseMarkt = type === 'GAS'
      ? (marketData?.ttfDam || 0)
      : (marketData?.epexSpot || 0);

    const multiplier = type === 'GAS'
      ? (marketData?.gasMultiplier ?? 1.05)
      : (marketData?.elecMultiplier ?? 1.1);
    const adder = type === 'GAS'
      ? (marketData?.gasAdder ?? 14)
      : (marketData?.elecAdder ?? 18);

    const elinEstimatedPrice = (baseMarkt * multiplier) + adder;
    const elindusSavingsVal = currPrice - elinEstimatedPrice;
    const elindusSavingsPercentage = currPrice > 0 ? (elindusSavingsVal / currPrice) * 100 : 0;

    // Fixed fee savings
    const currentFixedFee = type === 'ELEC' ? elecCurrentFixedFee : gasCurrentFixedFee;
    const enecoFixedFeeSaving = currentFixedFee - ENECO_FIXED_FEE[type];
    const elindusFixedFeeSaving = currentFixedFee - ELINDUS_FIXED_FEE[type];

    // Volume-based visibility rules:
    // 0-25: Eneco only | 25-100: Both (SOHO) or Eneco only (Particulier) | 100+: Coach message
    const showEneco = cons <= 100;
    const showElindus = cons >= 25 && cons <= 100 && customerType === 'SOHO';
    const showCoachMessage = cons > 100;

    return {
      type,
      cons,
      currPrice,
      enecoPrice,
      enecoSavingsPercentage,
      enecoSavingsTotal: (enecoSavingsVal * cons) + (includeFixedFeeSavings ? enecoFixedFeeSaving : 0),
      elindusEsimatedPrice: elinEstimatedPrice,
      elindusSavingsPercentage,
      elindusSavingsTotal: (elindusSavingsVal * cons) + (includeFixedFeeSavings ? elindusFixedFeeSaving : 0),
      showEneco,
      showElindus,
      showCoachMessage,
      enecoFixedFee: ENECO_FIXED_FEE[type],
      elindusFixedFee: ELINDUS_FIXED_FEE[type],
      currentFixedFee,
      enecoFixedFeeSaving,
      elindusFixedFeeSaving,
    };
  };

  const outcomes = getRequiredTypes().map(calculateTypeOutcome);

  const totalEnecoSavings = outcomes.reduce((sum, o) => sum + (o.showEneco ? o.enecoSavingsTotal : 0), 0);
  const totalElindusSavings = outcomes.reduce((sum, o) => sum + (o.showElindus ? o.elindusSavingsTotal : 0), 0);

  // Commission calculation based on the new formula
  const elecPrice = ((marketData?.epexSpot || 0) * (marketData?.elecMultiplier ?? 1.1)) + (marketData?.elecAdder ?? 18);
  const gasPrice = ((marketData?.ttfDam || 0) * (marketData?.gasMultiplier ?? 1.05)) + (marketData?.gasAdder ?? 14);
  const avgFormulaPrice = (elecPrice + gasPrice) / 2;

  const effectiveElindusFixedFee = totalConsumption <= 100 ? Math.max(50, elindusFixedFee) : elindusFixedFee;
  const extraMargin = Math.max(0, avgFormulaPrice - 6);
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
        if (elecKnowsConsumption === null) return false;
        if (elecKnowsConsumption === true && elecConsumptionMWh <= 0) return false;
        if (elecKnowsConsumption === true && elecConsumptionMWh < 25 && elecTariff === null) return false;
        if (elecKnowsConsumption === false && elecIsOver30MWh === null) return false;
        if (elecKnowsConsumption === false && elecIsOver30MWh === false && elecTariff === null) return false;
      }
      if (req.includes('GAS')) {
        if (gasKnowsConsumption === null) return false;
        if (gasKnowsConsumption === true && gasConsumptionMWh <= 0) return false;
        if (gasKnowsConsumption === true && gasConsumptionMWh < 25 && gasTariff === null) return false;
        if (gasKnowsConsumption === false && gasIsOver30MWh === null) return false;
        if (gasKnowsConsumption === false && gasIsOver30MWh === false && gasTariff === null) return false;
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
        if (elecKnowsConsumption === true && elecConsumptionMWh <= 0) { setValidationError(lang === 'NL' ? 'Vul een geldig Elektriciteitsverbruik in (> 0).' : 'Veuillez entrer une conso Elec valide (> 0).'); return false; }
        if (elecKnowsConsumption === true && elecConsumptionMWh < 25 && elecTariff === null) { setValidationError(lang === 'NL' ? 'Selecteer een tarief type voor Elektriciteit.' : 'Sélectionnez un type de tarif.'); return false; }
        if (elecKnowsConsumption === false && elecIsOver30MWh === null) { setValidationError(lang === 'NL' ? 'Beantwoord de verbruiksvraag voor Elektriciteit.' : 'Répondez à la question de consommation.'); return false; }
      }
      if (req.includes('GAS')) {
        if (gasKnowsConsumption === null) { setValidationError(lang === 'NL' ? 'Beantwoord eerst alle vragen voor Aardgas.' : 'Répondez d\'abord à toutes les questions.'); return false; }
        if (gasKnowsConsumption === true && gasConsumptionMWh <= 0) { setValidationError(lang === 'NL' ? 'Vul een geldig aardgasverbruik in (> 0).' : 'Veuillez entrer une conso Gaz valide (> 0).'); return false; }
        if (gasKnowsConsumption === true && gasConsumptionMWh < 25 && gasTariff === null) { setValidationError(lang === 'NL' ? 'Selecteer een tarief type voor Aardgas.' : 'Sélectionnez un type de tarif.'); return false; }
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

  // For Particulier: steps are 1(type),2(energy),3(consumption),4(price),5(comparison) — skip margin
  // For SOHO: steps are 1(type),2(energy),3(consumption),4(price),5(margin),6(comparison)
  const nextStep = () => {
    if (isTranslating) return;
    if (!validateStep()) return;
    if (currentStep < totalSteps) {
      setIsTranslating(true);
      setDirection(1);
      // Particulier: skip from step 4 (price) directly to step 5 (comparison, which is the last)
      // because there's no margin step for Particulier
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
        <Loader2 className="w-10 h-10 animate-spin text-eneco-gradient mb-4" />
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
      <div className="bg-white rounded-[clamp(1.5rem,3vh,2.5rem)] p-[clamp(1.25rem,3vh,2rem)] sm:p-[clamp(1.5rem,4vh,2.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 space-y-0 flex-1">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-[clamp(1rem,3vh,1.5rem)] mb-[clamp(1rem,3vh,2rem)]">
          <Icon className="w-6 h-6 text-eneco-gradient" />
          <h3 className="text-xl font-bold text-slate-600">{label}</h3>
        </div>

        {/* Question 1: Knows consumption? */}
        <div>
          <label className="block text-sm sm:text-[clamp(12px,1.5vh,14px)] font-bold text-slate-400 mb-[clamp(1rem,2vh,1.5rem)] uppercase tracking-widest text-center">{text.knowsConsumption}</label>
          <div className="flex justify-center flex-wrap sm:flex-nowrap gap-4">
            <button onClick={() => setKnows(true)} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${knows === true ? 'bg-eneco-gradient text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.yes}</button>
            <button onClick={() => setKnows(false)} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${knows === false ? 'bg-eneco-gradient text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.no}</button>
          </div>
        </div>

        {/* Question 2: Consumption input — only if knows === true */}
        <AnimatePresence mode="wait">
          {knows === true && (
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
                    <button onClick={() => setInputUnit('kWh')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${inputUnit === 'kWh' ? 'bg-white text-eneco-gradient shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>kWh</button>
                    <button onClick={() => setInputUnit('MWh')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${inputUnit === 'MWh' ? 'bg-white text-eneco-gradient shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>MWh</button>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="relative w-full max-w-[200px] group">
                      <input type="number" step="0.01" value={inputUnit === 'kWh' ? (consMWh === 0 ? '' : Math.round(consMWh * 1000)) : (consMWh === 0 ? '' : consMWh)} onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') { setConsMWh(0); return; }
                        const val = Number(raw);
                        const newMWh = inputUnit === 'kWh' ? val / 1000 : val;
                        setConsMWh(newMWh);
                        // Auto-set tariff to VARIABEL if >= 25 MWh
                        if (newMWh >= 25) { setTariff('VARIABEL'); }
                      }} className="block w-full pr-16 py-[clamp(0.75rem,2.5vh,1rem)] text-[clamp(1.5rem,3vh,1.875rem)] font-black text-center bg-slate-50 border-2 border-slate-100 rounded-[clamp(1rem,2vh,1.5rem)] focus:bg-eneco-gradient/5 focus:ring-4 focus:ring-[#E5394C]/10 focus:border-[#E5394C] transition-all text-eneco-gradient outline-none" />
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-eneco-gradient/50 font-bold text-[clamp(1rem,2vh,1.125rem)] pointer-events-none">{inputUnit}</span>
                    </div>
                  </div>
                  {inputUnit === 'MWh' && (
                    <LiquidGlassSlider min={1} max={150} value={consMWh} onChange={(val) => { setConsMWh(val); if (val >= 25) setTariff('VARIABEL'); }} color="#E5394C" className="w-full mb-2" />
                  )}
                </div>

                {/* Tariff type — only if consumption < 25 MWh */}
                <AnimatePresence>
                  {consMWh > 0 && consMWh < 25 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="overflow-clip"
                    >
                      <div className="pt-6 border-t border-slate-100">
                        <label className="block text-sm sm:text-[clamp(12px,1.5vh,14px)] font-bold text-slate-400 mb-[clamp(1rem,2vh,1.5rem)] uppercase tracking-widest text-center">{text.tariffType}</label>
                        <div className="flex justify-center flex-wrap sm:flex-nowrap gap-4">
                          <button onClick={() => setTariff('VAST')} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${tariff === 'VAST' ? 'bg-eneco-gradient text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.vast}</button>
                          <button onClick={() => setTariff('VARIABEL')} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${tariff === 'VARIABEL' ? 'bg-eneco-gradient text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.variabel}</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          )}

          {knows === false && (
            <motion.div
              key="toggle"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="pt-[clamp(1rem,3vh,2rem)] mt-[clamp(1rem,3vh,2rem)] border-t border-slate-100">
                <label className="block text-sm sm:text-[clamp(12px,1.5vh,14px)] font-bold text-slate-400 mb-[clamp(1rem,2vh,1.5rem)] uppercase tracking-widest text-center">{text.over30}</label>
                <div className="flex justify-center flex-wrap sm:flex-nowrap gap-4">
                  <button onClick={() => { setOver30(true); setTariff('VARIABEL'); }} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${over30 === true ? 'bg-eneco-gradient text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.yes}</button>
                  <button onClick={() => { setOver30(false); setTariff(null); }} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${over30 === false ? 'bg-eneco-gradient text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.no}</button>
                </div>
              </div>

              {/* Tariff choice for < 25 MWh when consumption is unknown */}
              <AnimatePresence>
                {over30 === false && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="overflow-clip"
                  >
                    <div className="pt-6 border-t border-slate-100 mt-6">
                      <label className="block text-sm sm:text-[clamp(12px,1.5vh,14px)] font-bold text-slate-400 mb-[clamp(1rem,2vh,1.5rem)] uppercase tracking-widest text-center">{text.tariffType}</label>
                      <div className="flex justify-center flex-wrap sm:flex-nowrap gap-4">
                        <button onClick={() => setTariff('VAST')} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${tariff === 'VAST' ? 'bg-eneco-gradient text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.vast}</button>
                        <button onClick={() => setTariff('VARIABEL')} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${tariff === 'VARIABEL' ? 'bg-eneco-gradient text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.variabel}</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
      <div className="bg-white rounded-[clamp(1.5rem,3vh,2.5rem)] p-[clamp(1.25rem,3vh,2rem)] sm:p-[clamp(1.5rem,4vh,2.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 space-y-8 flex-1">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-eneco-gradient" />
            <h3 className="text-xl font-bold text-slate-600">{label}</h3>
          </div>
          <button onClick={() => setShowInMWh(!showInMWh)} className="text-xs font-bold text-eneco-gradient bg-eneco-gradient/5 px-4 py-2 rounded-full border border-[#E5394C]/10">
            {text.unitToggle} {showInMWh ? 'kWh' : 'MWh'}
          </button>
        </div>

        <div>
          <label className="block text-sm sm:text-[clamp(12px,1.5vh,14px)] font-bold text-slate-400 mb-[clamp(1rem,2vh,1.5rem)] uppercase tracking-widest text-center">
            {lang === 'NL' ? 'Huidige prijs van de klant' : 'Prix actuel du client'}
          </label>
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
            className="block w-full pl-16 pr-24 py-[clamp(1rem,4vh,2rem)] text-[clamp(1.5rem,4vh,2.25rem)] font-black text-center bg-slate-50 border-2 border-slate-100 rounded-[clamp(1.25rem,3vh,2rem)] focus:bg-eneco-gradient/5 focus:ring-4 focus:ring-[#E5394C]/10 focus:border-[#E5394C] transition-all text-slate-600 outline-none"
          />
          <span className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-400 font-bold text-[clamp(1rem,2vh,1.25rem)] hidden sm:flex">{showInMWh ? '/ MWh' : '/ kWh'}</span>
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
      <div className="absolute top-0 left-0 w-full h-[70vh] bg-gradient-to-br from-[#E5384C] via-[#E5394C] to-[#EA704F] z-0 overflow-hidden pointer-events-none">
        <svg className="absolute bottom-0 w-full min-w-[1200px]" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ transform: 'translateY(2px)' }}>
          <path fill="rgba(255,255,255,0.05)" d="M0,192L48,192C96,192,192,192,288,208C384,224,480,256,576,261.3C672,267,768,245,864,213.3C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="rgba(255,255,255,0.15)" d="M0,160L48,170.7C96,181,192,203,288,186.7C384,171,480,117,576,112C672,107,768,149,864,176C960,203,1056,213,1152,192C1248,171,1344,117,1392,85.3L1440,53.3L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="#f8fafc" d="M0,256L48,256C96,256,192,256,288,240C384,224,480,192,576,197.3C672,203,768,245,864,250.7C960,256,1056,224,1152,192C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Foreground grouped into zoom layout */}
      <div className="flex-1 flex flex-col w-full z-10" style={{ zoom: 0.8 }}>

        <Header
          actionButton={
            <button onClick={() => navigate('/home')} className="p-2 rounded-full transition-colors bg-white border border-white/80 text-slate-400 hover:text-[#E5394C] shadow-sm" title={text.backToHome}>
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
            className="relative z-10 w-full max-w-5xl min-[2000px]:max-w-7xl mx-auto px-4 sm:px-6 flex-1 flex flex-col justify-center items-center py-[clamp(1rem,3vh,3rem)] pb-[clamp(2rem,6vh,6rem)]"
          >
            <div className="w-full relative flex items-center justify-center min-h-[clamp(300px,50vh,600px)]">
              <AnimatePresence initial={false} custom={direction} mode="wait">

                {/* STEP 1: Customer Type + Energy Type (combined) */}
                {currentStep === 1 && (
                  <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl space-y-4">
                    {/* Customer Type */}
                    <div className="bg-white rounded-[clamp(1.25rem,3vh,2.5rem)] p-[clamp(1rem,2vh,1.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col sm:flex-row gap-[clamp(0.75rem,1.5vh,1rem)]">
                      {(['PARTICULIER', 'SOHO'] as const).map((type) => {
                        const isSelected = customerType === type;
                        const label = type === 'PARTICULIER' ? text.particulier : text.soho;
                        return (
                          <button key={type} onClick={() => { setCustomerType(type); setEnergyType(null); }} className={`flex-1 flex flex-col items-center justify-center gap-[clamp(0.5rem,1.5vh,1rem)] p-[clamp(1rem,3vh,2rem)] rounded-[clamp(1rem,3vh,1.5rem)] border-2 transition-all ${isSelected ? 'bg-[#E5394C]/5 border-[#E5394C] text-[#E5394C]' : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-[clamp(1.5rem,4vh,2.5rem)] w-[clamp(1.5rem,4vh,2.5rem)]">
                              {type === 'PARTICULIER' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                              )}
                            </svg>
                            <span className="font-bold text-[clamp(14px,1.8vh,1.125rem)]">{label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Energy Type — appears after choosing customer type */}
                    <AnimatePresence>
                      {customerType && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
                          <div className="bg-white rounded-[clamp(1.25rem,3vh,2.5rem)] p-[clamp(1rem,2vh,1.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col sm:flex-row gap-[clamp(0.75rem,1.5vh,1rem)]">
                            {(['ELEC', 'GAS', 'BOTH'] as const).map((type) => {
                              const isSelected = energyType === type;
                              const label = type === 'ELEC' ? text.elec : type === 'GAS' ? text.gas : text.both;
                              const Icon = type === 'ELEC' ? Zap : type === 'GAS' ? Flame : Calculator;
                              return (
                                <button key={type} onClick={() => { setEnergyType(type); nextStep(); }} className={`flex-1 flex flex-col items-center justify-center gap-[clamp(0.5rem,1.5vh,1rem)] p-[clamp(1rem,3vh,2rem)] rounded-[clamp(1rem,3vh,1.5rem)] border-2 transition-all ${isSelected ? 'bg-[#E5394C]/5 border-[#E5394C] text-[#E5394C]' : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}>
                                  <Icon className={`h-[clamp(1.5rem,4vh,2.5rem)] ${type === 'BOTH' ? 'w-auto' : 'w-[clamp(1.5rem,4vh,2.5rem)]'}`} />
                                  <span className="font-bold text-[clamp(14px,1.8vh,1.125rem)]">{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* STEP 2: Consumption */}
                {currentStep === 2 && (
                  <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                    <div className="flex flex-col md:flex-row gap-[clamp(1rem,2vh,1.5rem)] w-full">
                      {getRequiredTypes().map(type => (
                        <React.Fragment key={type}>{renderConsumptionInput(type)}</React.Fragment>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Current Price */}
                {currentStep === 3 && (
                  <motion.div key="step4" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                    <div className="flex flex-col md:flex-row gap-[clamp(1rem,2vh,1.5rem)] w-full">
                      {getRequiredTypes().map(type => (
                        <React.Fragment key={type}>{renderCurrentPriceInput(type)}</React.Fragment>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* LAST STEP: Vergelijking & Afronden */}
                {currentStep === totalSteps && (
                  <motion.div key="stepFinal" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                    <div className="bg-white rounded-[clamp(1.5rem,3vh,2.5rem)] p-[clamp(1.25rem,3vh,2rem)] sm:p-[clamp(1.5rem,4vh,2.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col gap-[clamp(1rem,3vh,1.5rem)] relative overflow-hidden">

                      {/* Inner Slide Buttons (Eneco / Elindus) */}
                      {!outcomes.every(o => o.showCoachMessage) && (
                        <>
                          {/* Eneco slide btn */}
                          <button onClick={() => setGlobalCalcOpen(globalCalcOpen === 'ENECO' ? null : 'ENECO')} className="hidden md:flex absolute top-[40%] -translate-y-1/2 left-0 h-16 w-8 bg-slate-50 border-y border-r border-slate-200 rounded-r-xl items-center justify-center z-40 transition-colors shadow-sm hover:bg-slate-100 text-slate-400 group cursor-pointer hover:w-9 px-1">
                            <img src="./eneco-grey.png" alt="Eneco" className="h-4 object-contain opacity-60 group-hover:opacity-100 transition-opacity rotate-90 flex-shrink-0" />
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-slate-300 absolute right-1"><path d="m9 18 6-6-6-6" /></svg>
                          </button>

                          {/* Elindus slide btn */}
                          {customerType === 'SOHO' && (
                            <button onClick={() => setGlobalCalcOpen(globalCalcOpen === 'ELINDUS' ? null : 'ELINDUS')} className="hidden md:flex absolute top-[40%] -translate-y-1/2 right-0 h-16 w-8 bg-slate-50 border-y border-l border-slate-200 rounded-l-xl items-center justify-center z-40 transition-colors shadow-sm hover:bg-slate-100 text-slate-400 group cursor-pointer hover:w-9 px-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-slate-300 absolute left-1"><path d="m15 18-6-6 6-6" /></svg>
                              <img src="./elindus-grey.png" alt="Elindus" className="h-4 object-contain opacity-60 group-hover:opacity-100 transition-opacity -rotate-90 flex-shrink-0" />
                            </button>
                          )}
                        </>
                      )}

                      {/* Vaste Vergoeding sectie — alleen als er geen coach message is */}
                      {!outcomes.every(o => o.showCoachMessage) && (
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-500">{lang === 'NL' ? 'Vaste vergoeding?' : 'Frais fixes?'}</span>
                            <button onClick={() => setIncludeFixedFeeSavings(!includeFixedFeeSavings)} className={`relative w-12 h-7 rounded-full transition-colors ${includeFixedFeeSavings ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${includeFixedFeeSavings ? 'translate-x-5' : ''}`} />
                            </button>
                          </div>

                          <AnimatePresence>
                            {includeFixedFeeSavings && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                                <div className="space-y-3">
                                  {getRequiredTypes().map(etype => {
                                    const isElec = etype === 'ELEC';
                                    const currentFee = isElec ? elecCurrentFixedFee : gasCurrentFixedFee;
                                    const setFee = isElec ? setElecCurrentFixedFee : setGasCurrentFixedFee;
                                    const enecoFee = ENECO_FIXED_FEE[etype];
                                    const elindusFee = ELINDUS_FIXED_FEE[etype];
                                    const enecoSaving = currentFee - enecoFee;
                                    const elindusSaving = currentFee - elindusFee;
                                    return (
                                      <div key={etype} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                        <div className="flex items-center gap-2">
                                          {isElec ? <Zap className="w-4 h-4 text-[#E5394C]" /> : <Flame className="w-4 h-4 text-[#E5394C]" />}
                                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isElec ? text.elec : text.gas}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <label className="text-xs text-slate-400 font-bold whitespace-nowrap">{lang === 'NL' ? 'Huidig:' : 'Actuel:'}</label>
                                          <div className="relative flex-1">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">€</span>
                                            <input type="number" step="5" value={currentFee === 0 ? '' : currentFee} onChange={(e) => setFee(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full pl-8 pr-14 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#E5394C]/20 focus:border-[#E5394C] outline-none text-slate-600" />
                                            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 text-xs font-bold">/{lang === 'NL' ? 'jaar' : 'an'}</span>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          <div className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${enecoSaving > 0 ? 'bg-emerald-50 text-emerald-600' : enecoSaving === 0 ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-500'}`}>
                                            <img src="./eneco-grey.png" alt="Eneco" className="h-3.5 object-contain opacity-60" />
                                            €{enecoFee} → {enecoSaving > 0 ? `+€${enecoSaving}` : enecoSaving === 0 ? (lang === 'NL' ? 'gelijk' : 'égal') : `-€${Math.abs(enecoSaving)}`}
                                          </div>
                                          {customerType === 'SOHO' && (
                                            <div className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${elindusSaving > 0 ? 'bg-emerald-50 text-emerald-600' : elindusSaving === 0 ? 'bg-slate-100 text-slate-400' : 'bg-rose-50 text-rose-500'}`}>
                                              <img src="./elindus-grey.png" alt="Elindus" className="h-3.5 object-contain opacity-60" />
                                              €{elindusFee} → {elindusSaving > 0 ? `+€${elindusSaving}` : elindusSaving === 0 ? (lang === 'NL' ? 'gelijk' : 'égal') : `-€${Math.abs(elindusSaving)}`}
                                            </div>
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
                      )}

                      {outcomes.map(({ type, cons, showEneco, showElindus, showCoachMessage, currPrice, enecoPrice, elindusEsimatedPrice, enecoSavingsTotal, elindusSavingsTotal, enecoSavingsPercentage, elindusSavingsPercentage, enecoFixedFee, elindusFixedFee: elindusFeeVal, currentFixedFee, enecoFixedFeeSaving, elindusFixedFeeSaving }) => (
                        <div key={type} className="border border-slate-100 rounded-3xl p-6 bg-slate-50 relative overflow-hidden">
                          <h4 className="font-bold text-slate-600 mb-4 pl-0 uppercase tracking-widest border-b border-slate-200 pb-2">{type === 'ELEC' ? text.elec : text.gas} ({cons} MWh)</h4>

                          {showCoachMessage ? (
                            <div className="pl-4 py-6 text-center">
                              <div className="inline-flex items-center gap-3 bg-white text-[#E5394C] border border-[#E5394C]/20 px-6 py-4 rounded-2xl shadow-sm">
                                <Info className="w-5 h-5 flex-shrink-0" />
                                <span className="font-bold text-sm">{lang === 'NL' ? 'Berekening via Salesforce — contacteer coach' : 'Calcul via Salesforce — contactez le coach'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className={`grid ${showElindus ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4 relative`}>
                              {/* Eneco */}
                              {showEneco && (
                                <div className="pt-2 pb-4 px-4 rounded-xl border-2 border-slate-200 bg-white relative flex flex-col h-full">
                                  <div className="flex justify-between items-center mb-0">
                                    <img src="./eneco-grey.png" alt="Eneco" className="h-[2.75rem] min-[2000px]:h-12 object-contain" />
                                    <span className="text-[10px] font-bold text-slate-300 uppercase">VV: €{enecoFixedFee}</span>
                                  </div>
                                  <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-bold mb-2 text-sm text-slate-600 flex justify-between items-center">
                                    <span>€{showInMWh ? enecoPrice.toFixed(2) : (enecoPrice / 1000).toFixed(4)}</span>
                                    <span className="text-[10px] text-slate-300">/{showInMWh ? 'MWh' : 'kWh'}</span>
                                  </div>
                                  <div className="mt-auto">
                                    <div className="text-right flex items-center justify-end gap-2 mt-2">
                                      <span className="text-xs text-slate-400 font-bold">{text.savingWord}</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${enecoSavingsPercentage > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{enecoSavingsPercentage > 0 ? '+' : ''}{enecoSavingsPercentage.toFixed(2)}%</span>
                                      <span className={`block font-black text-lg ${enecoSavingsTotal > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{enecoSavingsTotal > 0 ? '+' : ''}€{enecoSavingsTotal.toFixed(2)}</span>
                                    </div>
                                    {includeFixedFeeSavings && (
                                      <div className={`text-right text-[10px] font-bold mt-1 h-[15px] ${enecoFixedFeeSaving > 0 ? 'text-emerald-500' : enecoFixedFeeSaving < 0 ? 'text-rose-400' : 'opacity-0 select-none'}`}>
                                        VV: {enecoFixedFeeSaving > 0 ? '+' : ''}€{enecoFixedFeeSaving}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Elindus — alleen voor SOHO */}
                              {showElindus && (
                                <div className="p-4 rounded-xl border-2 border-slate-200 bg-white relative flex flex-col h-full">
                                  <div className="flex justify-between items-center mb-2">
                                    <img src="./elindus-grey.png" alt="Elindus" className="h-8 object-contain" />
                                    <span className="text-[10px] font-bold text-slate-300 uppercase">VV: €{elindusFeeVal}</span>
                                  </div>
                                  <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-bold mb-2 text-sm text-slate-600 flex justify-between items-center">
                                    <span>€{showInMWh ? elindusEsimatedPrice.toFixed(2) : (elindusEsimatedPrice / 1000).toFixed(4)}</span>
                                    <span className="text-[10px] text-slate-300">/{showInMWh ? 'MWh' : 'kWh'}</span>
                                  </div>
                                  <div className="mt-auto">
                                    <div className="text-right flex items-center justify-end gap-2 mt-2">
                                      <span className="text-xs text-slate-400 font-bold">{text.savingWord}</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${elindusSavingsPercentage > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{elindusSavingsPercentage > 0 ? '+' : ''}{elindusSavingsPercentage.toFixed(2)}%</span>
                                      <span className={`block font-black text-lg ${elindusSavingsTotal > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{elindusSavingsTotal > 0 ? '+' : ''}€{elindusSavingsTotal.toFixed(2)}</span>
                                    </div>
                                    {includeFixedFeeSavings && (
                                      <div className={`text-right text-[10px] font-bold mt-1 h-[15px] ${elindusFixedFeeSaving > 0 ? 'text-emerald-500' : elindusFixedFeeSaving < 0 ? 'text-rose-400' : 'opacity-0 select-none'}`}>
                                        VV: {elindusFixedFeeSaving > 0 ? '+' : ''}€{elindusFixedFeeSaving}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Vergelijking Slider — Alleen voor SOHO */}
                      {customerType === 'SOHO' && !outcomes.every(o => o.showCoachMessage) && (
                        <div className="pt-6 pb-2 border-t border-slate-100 flex items-center justify-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                          <div className="bg-slate-100/50 p-1.5 rounded-2xl flex relative w-full max-w-sm shadow-inner border border-slate-200/60">
                            <div
                              className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300 ease-out z-0"
                              style={{ left: comparisonView === 'ENECO' ? '6px' : 'calc(50%)' }}
                            />
                            <button
                              onClick={() => setComparisonView('ENECO')}
                              className={`flex-1 py-3 z-10 transition-colors flex items-center justify-center ${comparisonView === 'ENECO' ? '' : 'hover:opacity-80'}`}
                            >
                              <img src="./eneco-grey.png" alt="Eneco" className={`h-7 object-contain transition-all ${comparisonView === 'ENECO' ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale'}`} />
                            </button>
                            <button
                              onClick={() => setComparisonView('ELINDUS')}
                              className={`flex-1 py-3 z-10 transition-colors flex items-center justify-center ${comparisonView === 'ELINDUS' ? '' : 'hover:opacity-80'}`}
                            >
                              <img src="./elindus-grey.png" alt="Elindus" className={`h-5 object-contain transition-all ${comparisonView === 'ELINDUS' ? 'opacity-100 grayscale-0 flex items-center' : 'opacity-40 grayscale'}`} />
                            </button>
                          </div>
                          
                          <button onClick={() => setShowLinksModal(true)} className="flex items-center justify-center w-14 h-[3.25rem] bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-[#E74B4D] hover:bg-slate-50 shadow-sm flex-shrink-0 transition-colors">
                            <Info className="w-6 h-6" />
                          </button>
                        </div>
                      )}

                      {/* Info Button for Particulier */}
                      {customerType === 'PARTICULIER' && !outcomes.every(o => o.showCoachMessage) && (
                        <div className="pt-6 pb-2 border-t border-slate-100 flex items-center justify-center">
                          <button onClick={() => setShowLinksModal(true)} className="flex items-center justify-center w-full max-w-sm gap-2 bg-white border border-slate-200 rounded-2xl h-[3.25rem] text-slate-500 font-bold hover:bg-slate-50 transition-all shadow-sm">
                            <Info className="w-5 h-5" />
                            Handige Portaal Links
                          </button>
                        </div>
                      )}

                      {/* Totale besparing + Commissie — hidden when all outcomes are coach messages */}
                      {!outcomes.every(o => o.showCoachMessage) && (
                        <div className={`flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 ${customerType !== 'SOHO' ? 'pt-4 border-t border-slate-100' : 'pt-2'}`}>
                          <div className="text-center sm:text-left w-full sm:w-auto mb-2 sm:mb-0">
                            {/* Diff removed according to feedback */}
                          </div>
                          <div className="text-center sm:text-right w-full sm:w-auto">
                            <span className="block text-xs uppercase tracking-widest font-bold text-slate-400 mb-1">{customerType === 'SOHO' ? `Totaal ${comparisonView === 'ENECO' ? 'Eneco' : 'Elindus'} ${(customerType === 'SOHO' ? (comparisonView === 'ENECO' ? totalEnecoSavings : totalElindusSavings) : totalEnecoSavings) > 0 ? 'Besparing' : 'Meerkost'}` : `Totaal Eneco ${totalEnecoSavings > 0 ? 'Besparing' : 'Meerkost'}`}</span>
                            <span className={`text-[clamp(1.75rem,4vh,2.25rem)] font-black leading-none ${(customerType === 'SOHO' ? (comparisonView === 'ENECO' ? totalEnecoSavings : totalElindusSavings) : totalEnecoSavings) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{(customerType === 'SOHO' ? (comparisonView === 'ENECO' ? totalEnecoSavings : totalElindusSavings) : totalEnecoSavings) > 0 ? '+' : ''}€{Math.abs(customerType === 'SOHO' ? (comparisonView === 'ENECO' ? totalEnecoSavings : totalElindusSavings) : totalEnecoSavings).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Verstuur knop */}
                      <div className={`flex relative z-40 transition-all duration-500 ease-in-out ${globalCalcOpen && customerType === 'SOHO' ? (globalCalcOpen === 'ENECO' ? 'w-[calc(50%-1.5rem)] mr-auto' : 'w-[calc(50%-1.5rem)] ml-auto') : 'w-full'}`}>
                        <button onClick={handleSendEmail} disabled={isSubmitting || isSuccess} className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex justify-center items-center gap-2 ${isSuccess ? 'bg-emerald-500 text-white' : 'bg-eneco-gradient text-white hover:bg-[#E5384C]'}`}>
                          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isSuccess ? <><CheckCircle2 className="w-5 h-5" /> Verzonden</> : <><Send className="w-5 h-5" /> {text.send}</>}
                        </button>
                      </div>

                      {/* GLOBAL CALCULATION OVERLAY */}
                      <AnimatePresence>
                        {globalCalcOpen && (
                          <motion.div
                            initial={{ x: globalCalcOpen === 'ENECO' ? '100%' : '-100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: globalCalcOpen === 'ENECO' ? '100%' : '-100%', opacity: 0 }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                            className={`absolute top-0 bottom-0 z-50 bg-white/95 backdrop-blur-md shadow-md flex flex-col p-6 sm:p-8 ${customerType === 'SOHO' ? 'w-1/2' : 'w-full'} ${globalCalcOpen === 'ENECO' ? 'right-0 border-l border-slate-200' : 'left-0 border-r border-slate-200'}`}
                          >
                            <button onClick={() => setGlobalCalcOpen(null)} className="absolute top-4 right-4 text-slate-400 hover:text-[#E74B4D] transition-colors bg-white rounded-full p-1.5 shadow-sm border border-slate-200">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>

                            <h3 className="font-black text-xl text-slate-700 mb-6 flex items-center gap-3">
                              <img src={`./${globalCalcOpen.toLowerCase()}-grey.png`} alt={globalCalcOpen} className="h-6 object-contain" />
                              <span className="opacity-30 font-medium">/</span>
                              Detail Berekening
                            </h3>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                              {outcomes.map(o => {
                                if (globalCalcOpen === 'ENECO' && !o.showEneco) return null;
                                if (globalCalcOpen === 'ELINDUS' && !o.showElindus) return null;

                                const newPrice = globalCalcOpen === 'ENECO' ? (o.enecoPrice * o.cons) : (o.elindusEsimatedPrice * o.cons);
                                const savings = globalCalcOpen === 'ENECO' ? o.enecoSavingsTotal : o.elindusSavingsTotal;
                                const newFixedFee = globalCalcOpen === 'ENECO' ? o.enecoFixedFee : o.elindusFixedFee;

                                return (
                                  <div key={o.type} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h4 className="font-bold text-slate-500 mb-2 uppercase tracking-widest text-xs border-b border-slate-200 pb-2 flex items-center gap-2">
                                      {o.type === 'ELEC' ? <Zap className="w-4 h-4 text-[#E5394C]" /> : <Flame className="w-4 h-4 text-[#E5394C]" />}
                                      {o.type === 'ELEC' ? text.elec : text.gas} ({o.cons} MWh)
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between"><span className="text-slate-400">Huidig (Energie):</span><span className="font-bold">€{(o.currPrice * o.cons).toFixed(2)}</span></div>
                                      <div className="flex justify-between"><span className="text-slate-400">{globalCalcOpen.toLowerCase().replace(/^\w/, c => c.toUpperCase())} (Energie):</span><span className="font-bold border-b border-slate-200 pb-1 border-dashed">€{newPrice.toFixed(2)}</span></div>

                                      {includeFixedFeeSavings && (
                                        <>
                                          <div className="flex justify-between mt-1"><span className="text-slate-400">Huidig VV:</span><span className="font-bold">€{o.currentFixedFee}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-400">{globalCalcOpen.toLowerCase().replace(/^\w/, c => c.toUpperCase())} VV:</span><span className="font-bold border-b border-slate-200 pb-1 border-dashed">€{newFixedFee}</span></div>
                                        </>
                                      )}
                                      <div className={`flex justify-between pt-1 font-bold ${savings > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        <span>{savings > 0 ? 'Besparing' : 'Meerkost'} ({o.type === 'ELEC' ? 'Elek' : 'Gas'}):</span>
                                        <span>€{Math.abs(savings).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className={`mt-4 p-4 rounded-xl border ${globalCalcOpen === 'ENECO' ? (totalEnecoSavings > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700') : (totalElindusSavings > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700')}`}>
                              <div className="flex flex-col gap-1 font-black">
                                <span className="text-xs uppercase tracking-widest">Totaal {(globalCalcOpen === 'ENECO' ? totalEnecoSavings : totalElindusSavings) > 0 ? 'Besparing' : 'Meerkost'}:</span>
                                <span className="text-2xl">€{Math.abs(globalCalcOpen === 'ENECO' ? totalEnecoSavings : totalElindusSavings).toFixed(2)}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                      <button onClick={prevStep} className="group flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all text-slate-500 hover:bg-slate-100"><ChevronLeft className="w-5 h-5 transition-colors group-hover:text-[#E5394C]" /><span className="hidden sm:inline">{text.back}</span></button>
                      <div className="flex gap-2 sm:gap-3">{[...Array(totalSteps)].map((_, i) => (<div key={i} className={`h-2.5 rounded-full transition-all duration-300 ${currentStep === i + 1 ? 'bg-eneco-gradient w-8' : 'bg-slate-200 w-2.5'}`} />))}</div>
                      <div className="flex flex-col items-end relative">
                        <AnimatePresence>
                          {validationError && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full mb-4 right-0 bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-rose-100 whitespace-nowrap">{validationError}</motion.div>)}
                        </AnimatePresence>
                        <button onClick={nextStep} className={`flex items-center gap-2 px-6 sm:px-8 py-3 rounded-2xl font-bold transition-all ${currentStep === totalSteps ? 'opacity-0 pointer-events-none' : (!isStepValid() ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-eneco-gradient text-white hover:bg-[#E5384C]')}`}><span className="hidden sm:inline">{text.next}</span><ChevronRight className="w-5 h-5" /></button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>
        </AnimatePresence>



        {/* Copyright Footer */}
        <div className="w-full mt-auto pb-[clamp(1rem,4vw,2rem)] sm:pb-8 pt-4 z-40 flex justify-center items-center pointer-events-none">
          <div className="flex items-center gap-[clamp(0.25rem,1vw,0.375rem)] text-[clamp(8px,2.5vw,11px)] sm:text-xs font-bold text-slate-400/80">
            © 2026 Telenco <span className="mx-[clamp(0.125rem,0.5vw,0.25rem)] opacity-40">·</span> Powered by
            <a href="https://tailormate.ai" target="_blank" rel="noopener noreferrer" className="pointer-events-auto group flex items-center">
              <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-[clamp(9px,2.75vw,11px)] sm:h-3 opacity-50 group-hover:opacity-100 ml-[clamp(0.125rem,0.5vw,0.25rem)] object-contain transition-all grayscale brightness-0 group-hover:grayscale-0 group-hover:brightness-100" />
            </a>
          </div>
        </div>
      </div>{/* End zoom wrapper */}

      {/* PORTAAL LINKS MODAL */}
      <AnimatePresence>
        {showLinksModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowLinksModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative border border-slate-100">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-600">Handige Portaal Links</h3>
                  <button onClick={() => setShowLinksModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <a href="https://elindus.lightning.force.com/lightning/page/home" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#E74B4D]/30 shadow-sm transition-all text-left">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <img src="./elindus-grey.png" alt="Elindus" className="h-6 object-contain opacity-70 group-hover:opacity-100 group-hover:grayscale-0 grayscale transition-all" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-600 text-sm group-hover:text-[#E74B4D] transition-colors truncate">Nieuwe klant aanmaken</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">Onder Elindus voorstel</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-300 group-hover:text-[#E74B4D] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </a>

                  <a href="https://sales.eneco.be/sf/initiation" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#E74B4D]/30 shadow-sm transition-all text-left">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <img src="./eneco-grey.png" alt="Eneco" className="h-6 object-contain opacity-70 group-hover:opacity-100 group-hover:grayscale-0 grayscale transition-all" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-600 text-sm group-hover:text-[#E74B4D] transition-colors truncate">Nieuwe klant aanmaken</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">Onder Eneco voorstel</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-300 group-hover:text-[#E74B4D] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </a>

                  <div className="h-[2px] bg-slate-100 my-4 w-full"></div>

                  <a href="https://klant.elindus.be/s/marktinformatie/epex-spot?language=nl_NL" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all text-left">
                    <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                      <img src="./elindus-grey.png" alt="Elindus" className="h-4 object-contain opacity-50 group-hover:opacity-80 transition-opacity" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-500 text-xs">Tariefkaarten Elindus</p>
                      <p className="text-[10px] text-slate-400 truncate">Bekijk de Elindus marktinformatie</p>
                    </div>
                  </a>

                  <a href="https://eneco.be/nl/" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all text-left">
                    <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                      <img src="./eneco-grey.png" alt="Eneco" className="h-4 object-contain opacity-50 group-hover:opacity-80 transition-opacity" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-500 text-xs">Tariefkaarten Eneco</p>
                      <p className="text-[10px] text-slate-400 truncate">Bekijk de website van Eneco</p>
                    </div>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
