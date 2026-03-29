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
import CustomerForm from './components/CustomerForm';

type EnergyType = 'ELEC' | 'GAS' | 'BOTH' | null;
type CustomerType = 'PARTICULIER' | 'SOHO' | null;

interface MarketData {
  epexSpot: number;
  ttfDam: number;
  elecMultiplier?: number;
  elecAdder?: number;
  gasMultiplier?: number;
  gasAdder?: number;
  injMultiplier?: number;
  injAdder?: number;
  enecoResElecVast?: number;
  enecoResElecVar?: number;
  enecoResGasVast?: number;
  enecoResGasVar?: number;
  enecoSohoElecVast?: number;
  enecoSohoElecVar?: number;
  enecoSohoGasVast?: number;
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
  // Dag/Nacht Eneco Injectie
  enecoResInjElecDag?: number;
  enecoResInjElecNacht?: number;
  enecoSohoInjElecDag?: number;
  enecoSohoInjElecNacht?: number;
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

/* ─── Price Input Field (Preserves Decimals/Zeroes) ─── */
const PriceInputField = ({ value, onChange, showInMWh, className, step = "0.01" }: { value: number, onChange: (v: number) => void, showInMWh: boolean, className: string, step?: string }) => {
  const [localVal, setLocalVal] = useState<string>(() => {
    if (value === 0) return '';
    return showInMWh ? value.toString() : (value / 1000).toString();
  });

  useEffect(() => {
    const expectedNum = showInMWh ? value : value / 1000;
    const localNum = Number(localVal);
    // Only overwrite user input if the actual numerical value diverges
    if (localNum !== expectedNum) {
      setLocalVal(expectedNum === 0 ? '' : expectedNum.toString());
    }
  }, [value, showInMWh]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalVal(raw);
    const num = Number(raw);
    if (!isNaN(num)) {
      onChange(showInMWh ? num : num * 1000);
    }
  };

  return (
    <input
      type="number"
      step={step}
      value={localVal}
      onChange={handleChange}
      className={className}
    />
  );
};

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
  const [hasSolarPanels, setHasSolarPanels] = useState<boolean | null>(null);
  const [elecMeterType, setElecMeterType] = useState<'ENKEL' | 'TWEEVOUDIG' | null>(null);
  const [elecKnowsConsumption, setElecKnowsConsumption] = useState<boolean | null>(null);
  const [elecConsumptionMWh, setElecConsumptionMWh] = useState<number>(50); // Total
  const [elecDagMWh, setElecDagMWh] = useState<number>(25);
  const [elecNachtMWh, setElecNachtMWh] = useState<number>(25);
  const [elecIsOver30MWh, setElecIsOver30MWh] = useState<boolean | null>(null);
  const [elecCurrentPriceMWh, setElecCurrentPriceMWh] = useState<number>(120); // Single current price
  const [elecCurrentPriceDagMWh, setElecCurrentPriceDagMWh] = useState<number>(130);
  const [elecCurrentPriceNachtMWh, setElecCurrentPriceNachtMWh] = useState<number>(110);
  const [elecEnecoOfferPriceMWh, setElecEnecoOfferPriceMWh] = useState<number>(85); // Note: Offer calculation will be split
  const [elecTariff, setElecTariff] = useState<'VAST' | 'VARIABEL'>('VARIABEL');

  // Gas State
  const [gasKnowsConsumption, setGasKnowsConsumption] = useState<boolean | null>(null);
  const [gasConsumptionMWh, setGasConsumptionMWh] = useState<number>(50);
  const [gasIsOver30MWh, setGasIsOver30MWh] = useState<boolean | null>(null);
  const [gasCurrentPriceMWh, setGasCurrentPriceMWh] = useState<number>(120);
  const [gasEnecoOfferPriceMWh, setGasEnecoOfferPriceMWh] = useState<number>(85);
  const [gasTariff, setGasTariff] = useState<'VAST' | 'VARIABEL'>('VARIABEL');

  const [showInMWh, setShowInMWh] = useState<boolean>(true);
  const [inputUnit, setInputUnit] = useState<'MWh' | 'kWh'>('MWh');

  // Fixed fee state
  const [elecCurrentFixedFee, setElecCurrentFixedFee] = useState<number>(100);
  const [gasCurrentFixedFee, setGasCurrentFixedFee] = useState<number>(100);
  const [includeFixedFeeSavings, setIncludeFixedFeeSavings] = useState<boolean>(false);
  const [comparisonView, setComparisonView] = useState<'ENECO' | 'ELINDUS'>('ENECO');
  const [globalCalcOpen, setGlobalCalcOpen] = useState<'ENECO' | 'ELINDUS' | null>(null);
  const [showLinksModal, setShowLinksModal] = useState<boolean>(false);



  // Universal Commission
  const [elindusMargin, setElindusMargin] = useState<number>(15);
  const [elindusFixedFee, setElindusFixedFee] = useState<number>(100);

  // Wizard State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;
  const [direction, setDirection] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Step 5: Customer Data & Address
  const [customerData, setCustomerData] = useState({
    companyName: '', vatNumber: 'BE', vatPending: false, firstName: '', lastName: '',
    birthDate: '', phoneCountry: '+32', phone: '',
    email: '',
    billingEmailSame: true, billingEmail: '',
    language: 'NL'
  });
  const [connectionAddress, setConnectionAddress] = useState({
    street: '', houseNumber: '', busNumber: '', postalCode: '', city: ''
  });
  const [billingAddressSame, setBillingAddressSame] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    street: '', houseNumber: '', busNumber: '', postalCode: '', city: ''
  });

  const streetRef = React.useRef<HTMLInputElement>(null);
  const cityRef = React.useRef<HTMLInputElement>(null);
  const billingStreetRef = React.useRef<HTMLInputElement>(null);
  const billingCityRef = React.useRef<HTMLInputElement>(null);
  const typedStreetRef = React.useRef('');
  const typedBillingStreetRef = React.useRef('');

  const [showAdminSettings, setShowAdminSettings] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [dossierCode, setDossierCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Market Data
  const [marketData, setMarketData] = useState<MarketData | null>(null);

  // Fixed fee Constants - Overridden dynamically if fetched!
  const ENECO_FIXED_FEE = marketData && customerType === 'PARTICULIER'
    ? { ELEC: marketData.enecoResVvElec ?? 65, GAS: marketData.enecoResVvGas ?? 65, INJ: marketData.enecoResVvInj ?? 0 }
    : marketData && customerType === 'SOHO'
    ? { ELEC: marketData.enecoSohoVvElec ?? 90, GAS: marketData.enecoSohoVvGas ?? 90, INJ: marketData.enecoSohoVvInj ?? 0 }
    : (customerType === 'PARTICULIER' ? { ELEC: 65, GAS: 65, INJ: 0 } : { ELEC: 90, GAS: 90, INJ: 0 });

  const ELINDUS_FIXED_FEE = marketData
    ? { ELEC: marketData.elindusVvElec ?? 60, GAS: marketData.elindusVvGas ?? 60, INJ: marketData.elindusVvInj ?? 0 }
    : { ELEC: 60, GAS: 60, INJ: 0 };

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
          injMultiplier: find('INJ_MULTIPLIER')?.value || 0.9,
          injAdder: find('INJ_ADDER')?.value || 15,
          enecoResElecVast: find('ENECO_RES_ELEC_VAST')?.value || 0,
          enecoResElecVar: find('ENECO_RES_ELEC_VARIABEL')?.value || 0,
          enecoResGasVast: find('ENECO_RES_GAS_VAST')?.value || 0,
          enecoResGasVar: find('ENECO_RES_GAS_VARIABEL')?.value || 0,
          enecoSohoElecVast: find('ENECO_SOHO_ELEC_VAST')?.value || 0,
          enecoSohoElecVar: find('ENECO_SOHO_ELEC_VARIABEL')?.value || 0,
          enecoSohoGasVast: find('ENECO_SOHO_GAS_VAST')?.value || 0,
          enecoSohoGasVar: find('ENECO_SOHO_GAS_VARIABEL')?.value || 0,
          enecoResElecInj: find('ENECO_RES_INJ_ELEC')?.value || 0,
          enecoSohoElecInj: find('ENECO_SOHO_INJ_ELEC')?.value || 0,
          enecoResElecDagVast: find('ENECO_RES_ELEC_DAG_VAST')?.value || 0,
          enecoResElecNachtVast: find('ENECO_RES_ELEC_NACHT_VAST')?.value || 0,
          enecoResElecDagVar: find('ENECO_RES_ELEC_DAG_VAR')?.value || 0,
          enecoResElecNachtVar: find('ENECO_RES_ELEC_NACHT_VAR')?.value || 0,
          enecoSohoElecDagVast: find('ENECO_SOHO_ELEC_DAG_VAST')?.value || 0,
          enecoSohoElecNachtVast: find('ENECO_SOHO_ELEC_NACHT_VAST')?.value || 0,
          enecoSohoElecDagVar: find('ENECO_SOHO_ELEC_DAG_VAR')?.value || 0,
          enecoSohoElecNachtVar: find('ENECO_SOHO_ELEC_NACHT_VAR')?.value || 0,
          enecoResInjElecDag: find('ENECO_RES_INJ_ELEC_DAG')?.value || 0,
          enecoResInjElecNacht: find('ENECO_RES_INJ_ELEC_NACHT')?.value || 0,
          enecoSohoInjElecDag: find('ENECO_SOHO_INJ_ELEC_DAG')?.value || 0,
          enecoSohoInjElecNacht: find('ENECO_SOHO_INJ_ELEC_NACHT')?.value || 0,
          enecoResVvElec: find('ENECO_RES_VV_ELEC')?.value || 65,
          enecoResVvGas: find('ENECO_RES_VV_GAS')?.value || 65,
          enecoSohoVvElec: find('ENECO_SOHO_VV_ELEC')?.value || 90,
          enecoSohoVvGas: find('ENECO_SOHO_VV_GAS')?.value || 90,
          enecoResVvInj: find('ENECO_RES_VV_INJ')?.value || 0,
          enecoSohoVvInj: find('ENECO_SOHO_VV_INJ')?.value || 0,
          elindusVvElec: find('ELINDUS_VV_ELEC')?.value || 60,
          elindusVvGas: find('ELINDUS_VV_GAS')?.value || 60,
          elindusVvInj: find('ELINDUS_VV_INJ')?.value || 0,
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

  const GOOGLE_API_KEY = (import.meta as any).env.VITE_GOOGLE_PLACES_API_KEY || '';
  
  const handlePlace = (ac: any, setter: React.Dispatch<React.SetStateAction<any>>, typedVal: string = '') => {
    const place = ac.getPlace();
    if (!place?.address_components) return;
    let street = '', number = '', postal = '', city = '', bus = '';

    for (const comp of place.address_components) {
      if (comp.types.includes('route')) street = comp.long_name;
      if (comp.types.includes('street_number')) number = comp.long_name;
      if (comp.types.includes('postal_code')) postal = comp.long_name;
      if (comp.types.includes('locality')) city = comp.long_name;
      if (comp.types.includes('subpremise') || comp.types.includes('room')) bus = comp.long_name;
    }

    if (number.includes('/')) {
      const parts = number.split('/');
      number = parts[0];
      if (!bus) bus = parts.slice(1).join('/');
    }

    if (!bus && typedVal.includes('/')) {
      bus = typedVal.split('/').slice(1).join('/').trim();
    }

    setter(prev => ({ ...prev, street, houseNumber: number, busNumber: bus, postalCode: postal, city }));
  };

  useEffect(() => {
    if (currentStep !== 5) return;
    if (!GOOGLE_API_KEY) return;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;

    const tryInit = () => {
      attempts++;
      if (attempts > 50) return; // give up after 5 seconds
      if (!(window as any).google?.maps?.places) {
        timer = setTimeout(tryInit, 100);
        return;
      }
      // Wait for street ref to be available in the DOM
      if (!streetRef.current) {
        timer = setTimeout(tryInit, 100);
        return;
      }
      initAutocomplete();
    };

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      timer = setTimeout(tryInit, 200); // small delay for DOM to mount
      return () => clearTimeout(timer);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => { timer = setTimeout(tryInit, 200); };
    document.head.appendChild(script);

    return () => clearTimeout(timer);
  }, [currentStep, billingAddressSame]);

  const initAutocomplete = () => {
    if (!(window as any).google?.maps?.places) return;
    const opts = { types: ['address'], componentRestrictions: { country: 'be' } };

    if (streetRef.current && !streetRef.current.dataset.acInit) {
      const ac = new (window as any).google.maps.places.Autocomplete(streetRef.current, opts);
      streetRef.current.dataset.acInit = 'true';
      ac.addListener('place_changed', () => handlePlace(ac, setConnectionAddress, typedStreetRef.current));
    }
    if (cityRef.current && !cityRef.current.dataset.acInit) {
      const ac2 = new (window as any).google.maps.places.Autocomplete(cityRef.current, { types: ['(cities)'], componentRestrictions: { country: 'be' } });
      cityRef.current.dataset.acInit = 'true';
      ac2.addListener('place_changed', () => {
        const p = ac2.getPlace();
        if (p?.address_components) {
          const city = p.address_components.find((c: any) => c.types.includes('locality'));
          const postal = p.address_components.find((c: any) => c.types.includes('postal_code'));
          setConnectionAddress(prev => ({ ...prev, city: city?.long_name || prev.city, postalCode: postal?.long_name || prev.postalCode }));
        }
      });
    }

    if (!billingAddressSame && billingStreetRef.current && !billingStreetRef.current.dataset.acInit) {
      const ac3 = new (window as any).google.maps.places.Autocomplete(billingStreetRef.current, opts);
      billingStreetRef.current.dataset.acInit = 'true';
      ac3.addListener('place_changed', () => handlePlace(ac3, setBillingAddress, typedBillingStreetRef.current));
    }
    if (!billingAddressSame && billingCityRef.current && !billingCityRef.current.dataset.acInit) {
      const ac4 = new (window as any).google.maps.places.Autocomplete(billingCityRef.current, { types: ['(cities)'], componentRestrictions: { country: 'be' } });
      billingCityRef.current.dataset.acInit = 'true';
      ac4.addListener('place_changed', () => {
        const p = ac4.getPlace();
        if (p?.address_components) {
          const city = p.address_components.find((c: any) => c.types.includes('locality'));
          const postal = p.address_components.find((c: any) => c.types.includes('postal_code'));
          setBillingAddress(prev => ({ ...prev, city: city?.long_name || prev.city, postalCode: postal?.long_name || prev.postalCode }));
        }
      });
    }
  };


  // Auto-fill Eneco offer prices from admin-set values
  useEffect(() => {
    if (!marketData || !customerType) return;
    const isSoho = customerType === 'SOHO';

    const getElecPrice = () => {
      if (elecMeterType === 'TWEEVOUDIG') {
        const total = elecDagMWh + elecNachtMWh;
        if (total === 0) return 0;
        let dagPrice = 0;
        let nachtPrice = 0;

        if (hasSolarPanels) {
          dagPrice = isSoho ? (marketData.enecoSohoInjElecDag || 0) : (marketData.enecoResInjElecDag || 0);
          nachtPrice = isSoho ? (marketData.enecoSohoInjElecNacht || 0) : (marketData.enecoResInjElecNacht || 0);
        } else if (elecTariff === 'VAST') {
          dagPrice = isSoho ? (marketData.enecoSohoElecDagVast || 0) : (marketData.enecoResElecDagVast || 0);
          nachtPrice = isSoho ? (marketData.enecoSohoElecNachtVast || 0) : (marketData.enecoResElecNachtVast || 0);
        } else {
          dagPrice = isSoho ? (marketData.enecoSohoElecDagVar || 0) : (marketData.enecoResElecDagVar || 0);
          nachtPrice = isSoho ? (marketData.enecoSohoElecNachtVar || 0) : (marketData.enecoResElecNachtVar || 0);
        }
        
        return ((dagPrice * elecDagMWh) + (nachtPrice * elecNachtMWh)) / total;
      }

      if (hasSolarPanels) {
        return isSoho ? (marketData.enecoSohoElecInj || 0) : (marketData.enecoResElecInj || 0);
      }
      if (elecTariff === 'VAST') {
        return isSoho ? (marketData.enecoSohoElecVast || 0) : (marketData.enecoResElecVast || 0);
      }
      return isSoho ? (marketData.enecoSohoElecVar || 0) : (marketData.enecoResElecVar || 0);
    };

    const getGasPrice = () => {
      if (gasTariff === 'VAST') return isSoho ? (marketData.enecoSohoGasVast || 0) : (marketData.enecoResGasVast || 0);
      return isSoho ? (marketData.enecoSohoGasVar || 0) : (marketData.enecoResGasVar || 0);
    };

    const elecPrice = getElecPrice();
    const gasPrice = getGasPrice();
    
    if (elecPrice > 0) setElecEnecoOfferPriceMWh(elecPrice);
    if (gasPrice > 0) setGasEnecoOfferPriceMWh(gasPrice);
  }, [customerType, elecTariff, gasTariff, marketData, hasSolarPanels, elecMeterType, elecDagMWh, elecNachtMWh]);

  const handleSaveOverride = async () => {
    setIsSavingOverride(true);
    const nowIso = new Date().toISOString();
    const updates = [
      { indicator_name: 'EPEX_SPOT', value: overrideData.epexSpot, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'TTF_DAM', value: overrideData.ttfDam, unit: 'MWh', last_updated: nowIso },
      { indicator_name: 'ELEC_MULTIPLIER', value: overrideData.elecMultiplier ?? 1.1, unit: 'x', last_updated: nowIso },
      { indicator_name: 'ELEC_ADDER', value: overrideData.elecAdder ?? 18, unit: '€/MWh', last_updated: nowIso },
      { indicator_name: 'GAS_MULTIPLIER', value: overrideData.gasMultiplier ?? 1.05, unit: 'x', last_updated: nowIso },
      { indicator_name: 'GAS_ADDER', value: overrideData.gasAdder ?? 14, unit: '€/MWh', last_updated: nowIso },
      { indicator_name: 'INJ_MULTIPLIER', value: overrideData.injMultiplier ?? 0.9, unit: 'x', last_updated: nowIso },
      { indicator_name: 'INJ_ADDER', value: overrideData.injAdder ?? 15, unit: '€/MWh', last_updated: nowIso }
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
      imbalance: 'Onbalans',
      step7Title: 'Klantgegevens & Opslaan',
      companyName: 'Bedrijfsnaam', vatNumber: 'BTW Nummer', firstName: 'Voornaam', lastName: 'Familienaam',
      birthDate: 'Geboortedatum', phone: 'Contactnummer', email: 'E-mailadres', billingEmailToggle: 'Hetzelfde facturatie e-mailadres?', billingEmail: 'Facturatie e-mailadres',
      connectionAddress: 'Aansluitingsadres', billingAddress: 'Facturatieadres',
      street: 'Straat', houseNr: 'Nr', bus: 'Bus', postalCode: 'Postcode', city: 'Gemeente',
      addressHint: 'Tip: Typ "5A" voor extensie. Voor bus, gebruik "5/A", "5/1" of "5/001".',
      sameAddress: 'Is het aansluitingsadres gelijk aan het facturatieadres?',
      jaSimple: 'Ja', neeSimple: 'Nee', inAanvraag: 'In aanvraag', saveOrder: 'Opslaan Bon',
      meterType: 'Type Meter', enkelvoudig: 'Enkelvoudig', tweevoudig: 'Tweevoudig',
      verbruikTotaal: 'Verbruik Totaal', verdelingVerbruik: 'Verdeling Verbruik',
      dagVerbruik: 'Dag Verbruik', nachtVerbruik: 'Nacht Verbruik',
      hasSolar: 'Heeft de klant zonnepanelen?',
      detailCalculation: 'Detail Berekening',
      huidigePrijsTwee: 'Huidige Prijs (Tweevoudig)', dagTarief: 'Dag Tarief', nachtTarief: 'Nacht Tarief',
      dag: 'Dag', nacht: 'Nacht', totaalHuidig: 'Totaal Huidig',
      gewogenGem: 'Gewogen Gem. Prijs', kosten: 'Kosten',
      viaEneco: 'via Eneco', vasteVergoedingVV: 'Vaste Vergoeding (VV)',
      besparingEnkel: 'Besparing', meerkost: 'Meerkost',
      elek: 'Elek', totaal: 'Totaal'
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
      imbalance: 'Déséquilibre',
      step7Title: 'Données Client',
      companyName: 'Nom de l\'entreprise', vatNumber: 'Numéro TVA', firstName: 'Prénom', lastName: 'Nom',
      birthDate: 'Date de naissance', phone: 'Numéro de contact', email: 'Adresse e-mail', billingEmailToggle: 'Même e-mail de facturation ?', billingEmail: 'E-mail de facturation',
      connectionAddress: 'Adresse de connexion', billingAddress: 'Adresse de facturation',
      street: 'Rue', houseNr: 'N°', bus: 'Boîte', postalCode: 'Code postal', city: 'Commune',
      addressHint: 'Astuce : Tapez "5A" pour une extension. Pour une boîte, utilisez "5/A", "5/1" ou "5/001".',
      sameAddress: 'L\'adresse de connexion est-elle identique à l\'adresse de facturation ?',
      jaSimple: 'Oui', neeSimple: 'Non', inAanvraag: 'En demande', saveOrder: 'Enregistrer',
      meterType: 'Type de Compteur', enkelvoudig: 'Simple', tweevoudig: 'Bihoraire',
      verbruikTotaal: 'Consommation Totale', verdelingVerbruik: 'Répartition de la Consommation',
      dagVerbruik: 'Consommation Jour', nachtVerbruik: 'Consommation Nuit',
      hasSolar: 'Le client a-t-il des panneaux solaires ?',
      detailCalculation: 'Calcul Détaillé',
      huidigePrijsTwee: 'Prix Actuel (Bihoraire)', dagTarief: 'Tarif Jour', nachtTarief: 'Tarif Nuit',
      dag: 'Jour', nacht: 'Nuit', totaalHuidig: 'Total Actuel',
      gewogenGem: 'Prix Moyen Pondéré', kosten: 'Coûts',
      viaEneco: 'via Eneco', vasteVergoedingVV: 'Frais Fixes (FF)',
      besparingEnkel: 'Économie', meerkost: 'Surcoût',
      elek: 'Élec', totaal: 'Total'
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
    let currPrice = type === 'ELEC' ? elecCurrentPriceMWh : gasCurrentPriceMWh;
    if (type === 'ELEC' && elecMeterType === 'TWEEVOUDIG') {
      const total = elecDagMWh + elecNachtMWh;
      currPrice = total > 0 ? ((elecCurrentPriceDagMWh * elecDagMWh) + (elecCurrentPriceNachtMWh * elecNachtMWh)) / total : 0;
    }

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
      : (hasSolarPanels ? (marketData?.injMultiplier ?? 0.9) : (marketData?.elecMultiplier ?? 1.1));
    const adder = type === 'GAS'
      ? (marketData?.gasAdder ?? 14)
      : (hasSolarPanels ? (marketData?.injAdder ?? 15) : (marketData?.elecAdder ?? 18));

    const elinEstimatedPrice = (baseMarkt * multiplier) + adder;
    const elindusSavingsVal = currPrice - elinEstimatedPrice;
    const elindusSavingsPercentage = currPrice > 0 ? (elindusSavingsVal / currPrice) * 100 : 0;

    // Fixed fee savings logic
    const fixedFeeKey = (type === 'ELEC' && hasSolarPanels) ? 'INJ' : type;
    const enecoFixedFee = ENECO_FIXED_FEE[fixedFeeKey];
    const elindusFixedFee = ELINDUS_FIXED_FEE[fixedFeeKey];

    const currentFixedFee = type === 'ELEC' ? elecCurrentFixedFee : gasCurrentFixedFee;
    const enecoFixedFeeSaving = currentFixedFee - enecoFixedFee;
    const elindusFixedFeeSaving = currentFixedFee - elindusFixedFee;

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
      enecoFixedFee,
      elindusFixedFee,
      currentFixedFee,
      enecoFixedFeeSaving,
      elindusFixedFeeSaving,
    };
  };

  const outcomes = getRequiredTypes().map(calculateTypeOutcome);

  const totalEnecoSavings = outcomes.reduce((sum, o) => sum + (o.showEneco ? o.enecoSavingsTotal : 0), 0);
  // For Elindus total: include Elindus savings for types where showElindus=true,
  // PLUS Eneco savings for types where showElindus=false but showEneco=true
  // (e.g. gas <25 MWh gets Eneco pricing, but should still count toward Elindus package total)
  const hasAnyElindus = outcomes.some(o => o.showElindus);
  const totalElindusSavings = outcomes.reduce((sum, o) => {
    if (o.showElindus) return sum + o.elindusSavingsTotal;
    if (hasAnyElindus && o.showEneco) return sum + o.enecoSavingsTotal;
    return sum;
  }, 0);

  // Commission calculation based on the new formula
  const commissionElecPrice = ((marketData?.epexSpot || 0) * (hasSolarPanels ? (marketData?.injMultiplier ?? 0.9) : (marketData?.elecMultiplier ?? 1.1))) + (hasSolarPanels ? (marketData?.injAdder ?? 15) : (marketData?.elecAdder ?? 18));
  const commissionGasPrice = ((marketData?.ttfDam || 0) * (marketData?.gasMultiplier ?? 1.05)) + (marketData?.gasAdder ?? 14);
  const avgFormulaPrice = (commissionElecPrice + commissionGasPrice) / 2;

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
        if (elecKnowsConsumption === true && elecMeterType === null) return false;
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
    
    if (currentStep === 4) {
      return true; // Just viewing
    }
    if (currentStep === 5) {
      if (!customerData.firstName || !customerData.lastName || !customerData.birthDate || !customerData.email) return false;
      if (customerType === 'SOHO' && !customerData.companyName) return false;
      if (!customerData.billingEmailSame && !customerData.billingEmail) return false;
      if (!connectionAddress.street || !connectionAddress.houseNumber || !connectionAddress.postalCode || !connectionAddress.city) return false;
      if (!billingAddressSame && (!billingAddress.street || !billingAddress.houseNumber || !billingAddress.postalCode || !billingAddress.city)) return false;
    }
    return true;
  };


  // validateStep is now just isStepValid — no popups
  const validateStep = () => isStepValid();


  const [isTranslating, setIsTranslating] = useState(false);
  const isTranslatingRef = React.useRef(false);

  // For Particulier: steps are 1(type),2(energy),3(consumption),4(price),5(comparison) — skip margin
  // For SOHO: steps are 1(type),2(energy),3(consumption),4(price),5(margin),6(comparison)
  const nextStep = () => {
    if (isTranslatingRef.current) return;
    if (!validateStep()) return;
    if (currentStep < totalSteps) {
      isTranslatingRef.current = true;
      setIsTranslating(true);
      setDirection(1);
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => { isTranslatingRef.current = false; setIsTranslating(false); }, 800);
    }
  };

  const prevStep = () => {
    if (isTranslatingRef.current) return;
    if (currentStep > 1) {
      isTranslatingRef.current = true;
      setIsTranslating(true);
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => { isTranslatingRef.current = false; setIsTranslating(false); }, 800);
    }
  };

  const variants = {
    enter: { opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } },
    center: { zIndex: 1, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
    exit: { zIndex: 0, opacity: 0, transition: { duration: 0.45, ease: 'easeIn' } }
  };

  
  const generateDossierCode = () => {
    const prefix = energyType === 'ELEC' ? 'EL' : energyType === 'GAS' ? 'GA' : 'EB';
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${dateStr}-${rand}`;
  };

  const handleSaveOrder = async () => {
    setIsSubmitting(true);
    const code = generateDossierCode();
    try {
      await supabase.from('sales_logs').insert({
        commission_code: commissionCode,
        energy_type: energyType,
        consumption_mwh: totalConsumption,
        margin_chosen: elindusMargin,
        fixed_fee_chosen: elindusFixedFee,
        commission_calculated: commission
      });
      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id, user_email: user.email, action: 'ENERGY_ORDER',
          energy_type: energyType, consumption_mwh: totalConsumption, commission_code: code
        });
        
        await supabase.from('energy_orders').insert({
          user_id: user.id,
          user_email: user.email,
          energy_type: energyType,
          customer_type: customerType,
          meter_type: elecMeterType,
          elec_consumption_mwh: elecConsumptionMWh,
          elec_dag_mwh: elecDagMWh,
          elec_nacht_mwh: elecNachtMWh,
          gas_consumption_mwh: gasConsumptionMWh,
          has_solar: hasSolarPanels,
          comparison_view: comparisonView,
          commission_code: code,
          company_name: customerData.companyName || null,
          vat_number: customerData.vatNumber || null,
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          birth_date: customerData.birthDate,
          phone: customerData.phoneCountry + ' ' + customerData.phone,
          email: customerData.email,
          connection_street: connectionAddress.street,
          connection_house_number: connectionAddress.houseNumber,
          connection_bus: connectionAddress.busNumber,
          connection_postal_code: connectionAddress.postalCode,
          connection_city: connectionAddress.city,
          billing_same: billingAddressSame,
          billing_street: billingAddress.street,
          billing_house_number: billingAddress.houseNumber,
          billing_bus: billingAddress.busNumber,
          billing_postal_code: billingAddress.postalCode,
          billing_city: billingAddress.city
        });
      }
      setDossierCode(code);
      setIsSuccess(true);
      // Move to final success step
      setDirection(1);
      setCurrentStep(totalSteps + 1);
    } catch (err) {
      console.error('Failed to save order', err);
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
        <div className={`expand-wrapper ${knows === true ? 'open' : ''}`}>
          <div className="expand-inner">
              <div className="space-y-8 pt-8 mt-8 border-t border-slate-100">
                {isElec ? (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-100 pb-4">
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">{text.meterType}</label>
                    </div>
                    <div className="flex justify-center flex-wrap sm:flex-nowrap gap-4 mb-6">
                      <button onClick={() => setElecMeterType('ENKEL')} className={`flex-1 min-w-[120px] py-3 rounded-2xl font-bold transition-all ${elecMeterType === 'ENKEL' ? 'bg-eneco-gradient text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{text.enkelvoudig}</button>
                      <button onClick={() => setElecMeterType('TWEEVOUDIG')} className={`flex-1 min-w-[120px] py-3 rounded-2xl font-bold transition-all ${elecMeterType === 'TWEEVOUDIG' ? 'bg-eneco-gradient text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{text.tweevoudig}</button>
                    </div>

                    <div className={`expand-wrapper ${elecMeterType ? 'open' : ''}`}>
                      <div className="expand-inner">
                    <AnimatePresence mode="wait">
                      {elecMeterType === 'ENKEL' && (
                        <motion.div key="enkel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                          <div className="flex justify-between items-end mb-4"><label className="block text-sm font-bold text-slate-400 uppercase">{text.verbruikTotaal}</label>
                            <div className="flex bg-slate-100 p-1 rounded-full"><button onClick={() => setInputUnit('kWh')} className={`px-4 py-1.5 text-xs font-bold rounded-full ${inputUnit === 'kWh' ? 'bg-white text-eneco-gradient' : 'text-slate-500'}`}>kWh</button><button onClick={() => setInputUnit('MWh')} className={`px-4 py-1.5 text-xs font-bold rounded-full ${inputUnit === 'MWh' ? 'bg-white text-eneco-gradient' : 'text-slate-500'}`}>MWh</button></div>
                          </div>
                          <div className="flex justify-center"><div className="relative w-full max-w-[200px]"><input type="number" value={inputUnit === 'kWh' ? (consMWh === 0 ? '' : Math.round(consMWh * 1000)) : (consMWh === 0 ? '' : consMWh)} onChange={(e) => { const v = Number(e.target.value); const m = inputUnit === 'kWh' ? v / 1000 : v; setConsMWh(m); if (m >= 25) setTariff('VARIABEL'); }} className="block w-full pr-16 py-3 text-2xl font-black text-center bg-slate-50 border-2 border-slate-100 rounded-xl text-eneco-gradient" /><span className="absolute inset-y-0 right-0 pr-4 flex items-center text-eneco-gradient/50">{inputUnit}</span></div></div>
                          {inputUnit === 'MWh' && <LiquidGlassSlider min={1} max={150} value={consMWh} onChange={(v) => { setConsMWh(v); if (v >= 25) setTariff('VARIABEL'); }} color="#E5394C" className="w-full" />}
                        </motion.div>
                      )}
                      {elecMeterType === 'TWEEVOUDIG' && (
                        <motion.div key="twee" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
                          <div className="flex justify-between items-end mb-4"><label className="block text-sm font-bold text-slate-400 uppercase">{text.verdelingVerbruik}</label>
                            <div className="flex bg-slate-100 p-1 rounded-full"><button onClick={() => setInputUnit('kWh')} className={`px-4 py-1.5 text-xs font-bold rounded-full ${inputUnit === 'kWh' ? 'bg-white text-eneco-gradient' : 'text-slate-500'}`}>kWh</button><button onClick={() => setInputUnit('MWh')} className={`px-4 py-1.5 text-xs font-bold rounded-full ${inputUnit === 'MWh' ? 'bg-white text-eneco-gradient' : 'text-slate-500'}`}>MWh</button></div>
                          </div>
                          
                          {/* Dag */}
                          <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Zap className="w-3 h-3"/> {text.dagVerbruik}</label>
                            <div className="flex items-center gap-4">
                              <div className="relative w-[150px] shrink-0"><input type="number" value={inputUnit === 'kWh' ? (elecDagMWh === 0 ? '' : Math.round(elecDagMWh * 1000)) : (elecDagMWh === 0 ? '' : elecDagMWh)} onChange={(e) => { const v = Number(e.target.value); const m = inputUnit === 'kWh' ? v / 1000 : v; setElecDagMWh(m); setConsMWh(m + elecNachtMWh); if ((m + elecNachtMWh) >= 25) setTariff('VARIABEL'); }} className="block w-full pr-12 py-2 text-xl font-black text-center bg-slate-50 border-2 border-slate-100 rounded-xl text-eneco-gradient" /><span className="absolute inset-y-0 right-0 pr-3 flex items-center text-eneco-gradient/50 text-sm">{inputUnit}</span></div>
                              {inputUnit === 'MWh' && <LiquidGlassSlider min={0} max={100} value={elecDagMWh} onChange={(v) => { setElecDagMWh(v); setConsMWh(v + elecNachtMWh); if ((v + elecNachtMWh) >= 25) setTariff('VARIABEL'); }} color="#E5394C" className="flex-1" />}
                            </div>
                          </div>

                          {/* Nacht */}
                          <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Zap className="w-3 h-3"/> {text.nachtVerbruik}</label>
                            <div className="flex items-center gap-4">
                              <div className="relative w-[150px] shrink-0"><input type="number" value={inputUnit === 'kWh' ? (elecNachtMWh === 0 ? '' : Math.round(elecNachtMWh * 1000)) : (elecNachtMWh === 0 ? '' : elecNachtMWh)} onChange={(e) => { const v = Number(e.target.value); const m = inputUnit === 'kWh' ? v / 1000 : v; setElecNachtMWh(m); setConsMWh(m + elecDagMWh); if ((m + elecDagMWh) >= 25) setTariff('VARIABEL'); }} className="block w-full pr-12 py-2 text-xl font-black text-center bg-slate-50 border-2 border-slate-100 rounded-xl text-eneco-gradient" /><span className="absolute inset-y-0 right-0 pr-3 flex items-center text-eneco-gradient/50 text-sm">{inputUnit}</span></div>
                              {inputUnit === 'MWh' && <LiquidGlassSlider min={0} max={100} value={elecNachtMWh} onChange={(v) => { setElecNachtMWh(v); setConsMWh(v + elecDagMWh); if ((v + elecDagMWh) >= 25) setTariff('VARIABEL'); }} color="#E5394C" className="flex-1" />}
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center text-sm font-bold text-slate-500 border border-slate-100">
                            <span>Totaal Berekend Verbruik:</span>
                            <span className="text-lg text-slate-700">{inputUnit === 'kWh' ? Math.round(consMWh * 1000) : consMWh.toFixed(2)} {inputUnit}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
                            setConsMWh(newMWh);
                          }} className="block w-full pr-16 py-[clamp(0.75rem,2.5vh,1rem)] text-[clamp(1.5rem,3vh,1.875rem)] font-black text-center bg-slate-50 border-2 border-slate-100 rounded-[clamp(1rem,2vh,1.5rem)] focus:bg-eneco-gradient/5 focus:ring-4 focus:ring-[#E5394C]/10 focus:border-[#E5394C] transition-all text-eneco-gradient outline-none" />
                          <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-eneco-gradient/50 font-bold text-[clamp(1rem,2vh,1.125rem)] pointer-events-none">{inputUnit}</span>
                        </div>
                      </div>
                      {inputUnit === 'MWh' && (
                        <LiquidGlassSlider min={1} max={150} value={consMWh} onChange={(val) => { setConsMWh(val); }} color="#E5394C" className="w-full mb-2" />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Question 3: Unknown consumption — over 30 MWh toggle */}
          <div className={`expand-wrapper ${knows === false ? 'open' : ''}`}>
            <div className="expand-inner">
              <div className="pt-[clamp(1rem,3vh,2rem)] mt-[clamp(1rem,3vh,2rem)] border-t border-slate-100">
                <label className="block text-sm sm:text-[clamp(12px,1.5vh,14px)] font-bold text-slate-400 mb-[clamp(1rem,2vh,1.5rem)] uppercase tracking-widest text-center">{text.over30}</label>
                <div className="flex justify-center flex-wrap sm:flex-nowrap gap-4">
                  <button onClick={() => { setOver30(true); setTariff('VARIABEL'); }} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${over30 === true ? 'bg-eneco-gradient text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.yes}</button>
                  <button onClick={() => { setOver30(false); setTariff(null); }} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${over30 === false ? 'bg-eneco-gradient text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}>{text.no}</button>
                </div>
              </div>
            </div>
          </div>
      </div>
    );
  };

  const renderCurrentPriceInput = (type: 'ELEC' | 'GAS') => {
    const isElec = type === 'ELEC';
    const label = isElec ? text.elec : text.gas;
    const cons = isElec ? elecCurrentPriceMWh : gasCurrentPriceMWh;
    const setCons = isElec ? setElecCurrentPriceMWh : setGasCurrentPriceMWh;
    const Icon = isElec ? Zap : Flame;
    const isTweevoudig = isElec && elecMeterType === 'TWEEVOUDIG';

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

        {isTweevoudig ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase flex items-center justify-center gap-2"><Zap className="w-3 h-3"/> Dag Tarief</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-6 flex items-center text-slate-400 font-bold text-2xl">€</span>
                <PriceInputField
                  value={elecCurrentPriceDagMWh}
                  showInMWh={showInMWh}
                  onChange={setElecCurrentPriceDagMWh}
                  className="block w-full pl-16 pr-24 py-4 text-2xl font-black text-center bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-eneco-gradient/5 focus:ring-4 focus:ring-[#E5394C]/10 focus:border-[#E5394C] transition-all text-slate-600 outline-none"
                />
                <span className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-400 font-bold text-sm hidden sm:flex">{showInMWh ? '/ MWh' : '/ kWh'}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase flex items-center justify-center gap-2"><Zap className="w-3 h-3"/> Nacht Tarief</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-6 flex items-center text-slate-400 font-bold text-2xl">€</span>
                <PriceInputField
                  value={elecCurrentPriceNachtMWh}
                  showInMWh={showInMWh}
                  onChange={setElecCurrentPriceNachtMWh}
                  className="block w-full pl-16 pr-24 py-4 text-2xl font-black text-center bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-eneco-gradient/5 focus:ring-4 focus:ring-[#E5394C]/10 focus:border-[#E5394C] transition-all text-slate-600 outline-none"
                />
                <span className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-400 font-bold text-sm hidden sm:flex">{showInMWh ? '/ MWh' : '/ kWh'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 pl-6 flex items-center text-slate-400 font-bold text-3xl">€</span>
            <PriceInputField
              value={cons}
              showInMWh={showInMWh}
              onChange={setCons}
              className="block w-full pl-16 pr-24 py-[clamp(1rem,4vh,2rem)] text-[clamp(1.5rem,4vh,2.25rem)] font-black text-center bg-slate-50 border-2 border-slate-100 rounded-[clamp(1.25rem,3vh,2rem)] focus:bg-eneco-gradient/5 focus:ring-4 focus:ring-[#E5394C]/10 focus:border-[#E5394C] transition-all text-slate-600 outline-none"
            />
            <span className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-400 font-bold text-[clamp(1rem,2vh,1.25rem)] hidden sm:flex">{showInMWh ? '/ MWh' : '/ kWh'}</span>
          </div>
        )}

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
                  <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: 'easeInOut' }} className="w-full max-w-3xl space-y-4">
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

                    {/* Energy Type — smooth expand after choosing customer type */}
                    <div className={`expand-wrapper ${customerType ? 'open' : ''}`}>
                      <div className="expand-inner">
                        <div className="bg-white rounded-[clamp(1.25rem,3vh,2.5rem)] p-[clamp(1rem,2vh,1.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col sm:flex-row gap-[clamp(0.75rem,1.5vh,1rem)] mt-4">
                          {(['ELEC', 'GAS', 'BOTH'] as const).map((type) => {
                            const isSelected = energyType === type;
                            const label = type === 'ELEC' ? text.elec : type === 'GAS' ? text.gas : text.both;
                            const Icon = type === 'ELEC' ? Zap : type === 'GAS' ? Flame : Calculator;
                            return (
                              <button key={type} onClick={() => { 
                                setEnergyType(type); 
                                if (type === 'GAS') {
                                  setHasSolarPanels(null);
                                  nextStep();
                                } else {
                                  setHasSolarPanels(null);
                                }
                              }} className={`flex-1 flex flex-col items-center justify-center gap-[clamp(0.5rem,1.5vh,1rem)] p-[clamp(1rem,3vh,2rem)] rounded-[clamp(1rem,3vh,1.5rem)] border-2 transition-all ${isSelected ? 'bg-[#E5394C]/5 border-[#E5394C] text-[#E5394C]' : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}>
                                <Icon className={`h-[clamp(1.5rem,4vh,2.5rem)] ${type === 'BOTH' ? 'w-auto' : 'w-[clamp(1.5rem,4vh,2.5rem)]'}`} />
                                <span className="font-bold text-[clamp(14px,1.8vh,1.125rem)]">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Solar Panels — smooth expand after choosing ELEC or BOTH */}
                    <div className={`expand-wrapper ${(energyType === 'ELEC' || energyType === 'BOTH') ? 'open' : ''}`}>
                      <div className="expand-inner">
                        <div className="bg-white mt-4 rounded-[clamp(1.25rem,3vh,2.5rem)] p-[clamp(1rem,2vh,1.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col items-center">
                          <label className="block text-sm sm:text-[clamp(12px,1.5vh,14px)] font-bold text-slate-400 mb-[clamp(1rem,2vh,1.5rem)] uppercase tracking-widest text-center">Heeft de klant zonnepanelen?</label>
                          <div className="flex justify-center w-full gap-[clamp(0.75rem,1.5vh,1rem)] sm:max-w-md mx-auto">
                            <button disabled={isTranslating} onClick={() => { if (isTranslatingRef.current) return; setHasSolarPanels(true); isTranslatingRef.current = true; setIsTranslating(true); setTimeout(() => { isTranslatingRef.current = false; nextStep(); }, 300); }} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${hasSolarPanels === true ? 'bg-eneco-gradient text-white shadow-[#E5394C]/20 shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600'} disabled:pointer-events-none`}>{text.yes}</button>
                            <button disabled={isTranslating} onClick={() => { if (isTranslatingRef.current) return; setHasSolarPanels(false); isTranslatingRef.current = true; setIsTranslating(true); setTimeout(() => { isTranslatingRef.current = false; nextStep(); }, 300); }} className={`flex-1 min-w-[120px] py-[clamp(0.75rem,2vh,1rem)] rounded-2xl font-bold transition-all ${hasSolarPanels === false ? 'bg-eneco-gradient text-white shadow-[#E5394C]/20 shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600'} disabled:pointer-events-none`}>{text.no}</button>
                          </div>
                        </div>
                      </div>
                    </div>


                    </motion.div>
                )}

                {/* STEP 2: Consumption */}
                {currentStep === 2 && (
                  <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: 'easeInOut' }} className="w-full max-w-3xl">
                    <div className="flex flex-col md:flex-row gap-[clamp(1rem,2vh,1.5rem)] w-full">
                      {getRequiredTypes().map(type => (
                        <React.Fragment key={type}>{renderConsumptionInput(type)}</React.Fragment>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Current Price */}
                {currentStep === 3 && (
                  <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: 'easeInOut' }} className="w-full max-w-3xl">
                    <div className="flex flex-col md:flex-row gap-[clamp(1rem,2vh,1.5rem)] w-full">
                      {getRequiredTypes().map(type => (
                        <React.Fragment key={type}>{renderCurrentPriceInput(type)}</React.Fragment>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Vergelijking & Afronden */}
                {currentStep === 4 && (
                  <motion.div key="step4" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: 'easeInOut' }} className="w-full max-w-3xl">
                    <div className="bg-white rounded-[clamp(1.5rem,3vh,2.5rem)] p-[clamp(1.25rem,3vh,2rem)] sm:p-[clamp(1.5rem,4vh,2.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col gap-[clamp(1rem,3vh,1.5rem)] relative overflow-hidden">

                      {/* Inner Slide Buttons (Eneco / Elindus) */}
                      {!outcomes.every(o => o.showCoachMessage) && (
                        <>
                          {/* Eneco slide btn */}
                          <button onClick={() => setGlobalCalcOpen(globalCalcOpen === 'ENECO' ? null : 'ENECO')} className="hidden md:flex absolute top-0 left-0 h-12 w-12 bg-white/80 backdrop-blur border-b border-r border-slate-200 rounded-br-2xl items-center justify-center z-40 transition-all shadow-sm hover:bg-slate-50 text-slate-400 group cursor-pointer hover:w-14 hover:h-14 px-2">
                            <img src="https://lksvpkoavcmlwfkonowc.supabase.co/storage/v1/object/public/images/logos/eneco-e.png" alt="Eneco" className="h-5 w-5 object-contain transition-all grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0 flex-shrink-0" />
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-slate-300 absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><path d="m9 18 6-6-6-6" /></svg>
                          </button>

                          {/* Elindus slide btn */}
                          {customerType === 'SOHO' && hasAnyElindus && (
                            <button onClick={() => setGlobalCalcOpen(globalCalcOpen === 'ELINDUS' ? null : 'ELINDUS')} className="hidden md:flex absolute top-0 right-0 h-12 w-12 bg-white/80 backdrop-blur border-b border-l border-slate-200 rounded-bl-2xl items-center justify-center z-40 transition-all shadow-sm hover:bg-slate-50 text-slate-400 group cursor-pointer hover:w-14 hover:h-14 px-2">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-slate-300 absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"><path d="m15 18-6-6 6-6" /></svg>
                              <img src="https://lksvpkoavcmlwfkonowc.supabase.co/storage/v1/object/public/images/logos/elindus-e.png" alt="Elindus" className="h-6 w-6 object-contain opacity-60 group-hover:opacity-100 transition-all grayscale opacity-50 group-hover:grayscale-0 flex-shrink-0" />
                            </button>
                          )}
                        </>
                      )}

                      {/* Vaste Vergoeding Toggle - Top Center */}
                      {!outcomes.every(o => o.showCoachMessage) && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-10 bg-white/80 backdrop-blur border-b border-x border-slate-200 rounded-b-2xl px-4 flex items-center justify-center gap-3 z-40 shadow-sm">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{lang === 'NL' ? 'Vaste vergoeding?' : 'Frais fixes?'}</span>
                          <button onClick={() => setIncludeFixedFeeSavings(!includeFixedFeeSavings)} className={`relative w-8 h-5 rounded-full transition-colors ${includeFixedFeeSavings ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includeFixedFeeSavings ? 'translate-x-3' : ''}`} />
                          </button>
                        </div>
                      )}

                      {!outcomes.every(o => o.showCoachMessage) && (
                        <div className={`expand-wrapper ${includeFixedFeeSavings ? 'open' : ''} mt-2 w-full mx-auto`}>
                          <div className="expand-inner">
                            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4 mb-4">
                                <div className="flex items-center gap-2 sm:gap-4 mb-4">
                                  <div className="flex-1 flex justify-end">
                                    <img src="./eneco-grey.png" alt="Eneco" className="h-5 sm:h-6 object-contain opacity-80" />
                                  </div>
                                  <div className="w-[100px] sm:w-[140px] shrink-0 text-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lang === 'NL' ? 'Huidig' : 'Actuel'}</span>
                                  </div>
                                  <div className="flex-1 flex justify-start">
                                    {customerType === 'SOHO' && hasAnyElindus && <img src="./elindus-grey.png" alt="Elindus" className="h-5 sm:h-6 object-contain opacity-80" />}
                                  </div>
                                </div>
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
                                      <div key={etype} className="flex items-center gap-2 sm:gap-4 relative">
                                        {/* Eneco Left */}
                                        <div className="flex-1 flex justify-end">
                                          <div className="text-xs font-bold px-2 sm:px-3 py-2 rounded-lg flex items-center justify-between gap-1.5 bg-white border border-slate-200 text-slate-600 shadow-sm w-full max-w-[160px]">
                                            <div className="flex items-center gap-1.5 w-full justify-between">
                                              <span className="text-slate-500">€{enecoFee}</span> <span className="text-[10px] text-slate-300 hidden sm:inline">→</span> {enecoSaving > 0 ? <span className="font-black text-emerald-500 bg-emerald-100/50 px-1.5 py-0.5 rounded ml-0.5">+€{enecoSaving}</span> : enecoSaving === 0 ? <span className="text-slate-400">{lang === 'NL' ? 'gelijk' : 'égal'}</span> : <span className="font-black text-rose-500 bg-rose-100/50 px-1.5 py-0.5 rounded ml-0.5">-€{Math.abs(enecoSaving)}</span>}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Center Input */}
                                        <div className="w-[100px] sm:w-[140px] shrink-0 bg-white border border-slate-200 rounded-xl p-2 shadow-sm flex flex-col items-center z-10">
                                          <div className="flex items-center gap-1.5 mb-1.5">
                                            {isElec ? <Zap className="w-3.5 h-3.5 text-[#E5394C]" /> : <Flame className="w-3.5 h-3.5 text-[#E5394C]" />}
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isElec ? text.elec : text.gas}</span>
                                          </div>
                                          <div className="relative w-full">
                                            <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-400 font-bold text-xs">€</span>
                                            <input type="number" step="5" value={currentFee === 0 ? '' : currentFee} onChange={(e) => setFee(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full pl-5 pr-1 py-1 text-sm font-bold bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-[#E5394C]/20 focus:border-[#E5394C] outline-none text-slate-600 text-center" />
                                          </div>
                                        </div>

                                        {/* Elindus Right */}
                                        <div className="flex-1 flex justify-start">
                                          {customerType === 'SOHO' && hasAnyElindus && (
                                            <div className="text-xs font-bold px-2 sm:px-3 py-2 rounded-lg flex items-center justify-between gap-1.5 bg-white border border-slate-200 text-slate-600 shadow-sm w-full max-w-[160px]">
                                              <div className="flex items-center gap-1.5 w-full justify-between">
                                                <span className="text-slate-500">€{elindusFee}</span> <span className="text-[10px] text-slate-300 hidden sm:inline">→</span> {elindusSaving > 0 ? <span className="font-black text-emerald-500 bg-emerald-100/50 px-1.5 py-0.5 rounded ml-0.5">+€{elindusSaving}</span> : elindusSaving === 0 ? <span className="text-slate-400">{lang === 'NL' ? 'gelijk' : 'égal'}</span> : <span className="font-black text-rose-500 bg-rose-100/50 px-1.5 py-0.5 rounded ml-0.5">-€{Math.abs(elindusSaving)}</span>}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
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
                                  <div className="flex justify-between items-center mb-2">
                                    <img src="./eneco-grey.png" alt="Eneco" className="h-[2.75rem] min-[2000px]:h-12 object-contain" />
                                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/80 shadow-inner w-[90px]">
                                      <button onClick={() => type === 'ELEC' ? setElecTariff('VAST') : setGasTariff('VAST')} className={`flex-1 py-1 text-[9px] font-black rounded-md transition-all ${type === 'ELEC' ? (elecTariff === 'VAST' ? 'bg-eneco-gradient text-white shadow-md' : 'text-slate-400 hover:text-slate-600') : (gasTariff === 'VAST' ? 'bg-eneco-gradient text-white shadow-md' : 'text-slate-400 hover:text-slate-600')}`}>VAST</button>
                                      <button onClick={() => type === 'ELEC' ? setElecTariff('VARIABEL') : setGasTariff('VARIABEL')} className={`flex-1 py-1 text-[9px] font-black rounded-md transition-all ${type === 'ELEC' ? (elecTariff === 'VARIABEL' ? 'bg-eneco-gradient text-white shadow-md' : 'text-slate-400 hover:text-slate-600') : (gasTariff === 'VARIABEL' ? 'bg-eneco-gradient text-white shadow-md' : 'text-slate-400 hover:text-slate-600')}`}>VAR</button>
                                    </div>
                                  </div>
                                  <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-bold mb-2 text-sm text-slate-600 flex justify-between items-center">
                                    <span>€{showInMWh ? enecoPrice.toFixed(2) : (enecoPrice / 1000).toFixed(4)}</span>
                                    <span className="text-[10px] text-slate-300">/{showInMWh ? 'MWh' : 'kWh'}</span>
                                  </div>
                                  <div className="mt-auto">
                                    <div className="text-right flex items-center justify-end gap-2 mt-2">
                                      <span className="text-xs text-slate-400 font-bold">{enecoSavingsTotal > 0 ? text.savingWord : (lang === 'nl' ? 'Meerkost:' : 'Surcoût:')}</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${enecoSavingsPercentage > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{enecoSavingsPercentage > 0 ? '+' : ''}{enecoSavingsPercentage.toFixed(2)}%</span>
                                      <span className={`block font-black text-lg ${enecoSavingsTotal > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{enecoSavingsTotal > 0 ? '+' : ''}€{enecoSavingsTotal.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Elindus — alleen voor SOHO */}
                              {showElindus && (
                                <div className="p-4 rounded-xl border-2 border-slate-200 bg-white relative flex flex-col h-full">
                                  <div className="flex justify-between items-center mb-2">
                                    <img src="./elindus-grey.png" alt="Elindus" className="h-8 object-contain" />
                                  </div>
                                  <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-bold mb-2 text-sm text-slate-600 flex justify-between items-center">
                                    <span>€{showInMWh ? elindusEsimatedPrice.toFixed(2) : (elindusEsimatedPrice / 1000).toFixed(4)}</span>
                                    <span className="text-[10px] text-slate-300">/{showInMWh ? 'MWh' : 'kWh'}</span>
                                  </div>
                                  <div className="mt-auto">
                                    <div className="text-right flex items-center justify-end gap-2 mt-2">
                                      <span className="text-xs text-slate-400 font-bold">{elindusSavingsTotal > 0 ? text.savingWord : (lang === 'nl' ? 'Meerkost:' : 'Surcoût:')}</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${elindusSavingsPercentage > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{elindusSavingsPercentage > 0 ? '+' : ''}{elindusSavingsPercentage.toFixed(2)}%</span>
                                      <span className={`block font-black text-lg ${elindusSavingsTotal > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{elindusSavingsTotal > 0 ? '+' : ''}€{elindusSavingsTotal.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Vergelijking Slider — Alleen voor SOHO als Elindus mogelijk is */}
                      {customerType === 'SOHO' && hasAnyElindus && !outcomes.every(o => o.showCoachMessage) && (
                        <div className={`pt-6 pb-2 border-t border-slate-100 flex flex-col items-center relative transition-all duration-500 ease-in-out gap-4 ${globalCalcOpen ? (globalCalcOpen === 'ENECO' ? 'w-[calc(50%-1.5rem)] mr-auto' : 'w-[calc(50%-1.5rem)] ml-auto') : 'w-full justify-center'}`}>
                          <div className={`bg-slate-100/50 rounded-2xl flex relative w-full shadow-inner border transition-all duration-500 ease-in-out ${globalCalcOpen ? 'max-h-0 min-h-0 p-0 m-0 opacity-0 overflow-hidden border-transparent flex-shrink-0' : 'max-w-sm p-1.5 border-slate-200/60 opacity-100 flex-shrink'}`}>
                            <div
                              className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300 ease-out z-0"
                              style={{ left: comparisonView === 'ENECO' ? '6px' : 'calc(50%)' }}
                            />
                            <button
                              onClick={() => setComparisonView('ENECO')}
                              className={`flex-1 py-3 z-10 transition-colors flex items-center justify-center whitespace-nowrap min-w-[50%] ${comparisonView === 'ENECO' ? '' : 'hover:opacity-80'}`}
                            >
                              <img src="./eneco-grey.png" alt="Eneco" className={`h-7 object-contain transition-all ${comparisonView === 'ENECO' ? 'opacity-100 grayscale-0' : 'opacity-40 grayscale'}`} />
                            </button>
                            <button
                              onClick={() => setComparisonView('ELINDUS')}
                              className={`flex-1 py-3 z-10 transition-colors flex items-center justify-center whitespace-nowrap min-w-[50%] ${comparisonView === 'ELINDUS' ? '' : 'hover:opacity-80'}`}
                            >
                              <img src="./elindus-grey.png" alt="Elindus" className={`h-5 object-contain transition-all ${comparisonView === 'ELINDUS' ? 'opacity-100 grayscale-0 flex items-center' : 'opacity-40 grayscale'}`} />
                            </button>
                          </div>
                          
                          <button onClick={() => setShowLinksModal(true)} className={`flex items-center justify-center h-[3.25rem] bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-[#E74B4D] hover:bg-slate-50 shadow-sm transition-all duration-500 flex-shrink-0 w-full max-w-sm gap-2 font-bold`}>
                            <Info className="w-5 h-5 flex-shrink-0" />
                            Handige Portaal Links
                          </button>
                        </div>
                      )}

                      {/* Info Button for Particulier OR SOHO without Elindus */}
                      {(customerType === 'PARTICULIER' || (customerType === 'SOHO' && !hasAnyElindus)) && !outcomes.every(o => o.showCoachMessage) && (
                        <div className={`pt-6 pb-2 border-t border-slate-100 flex items-center relative transition-all duration-500 ease-in-out ${globalCalcOpen ? (globalCalcOpen === 'ENECO' ? 'w-[calc(50%-1.5rem)] mr-auto justify-start' : 'w-[calc(50%-1.5rem)] ml-auto justify-end') : 'w-full justify-center'}`}>
                          <button onClick={() => setShowLinksModal(true)} className="flex items-center justify-center w-full max-w-sm gap-2 bg-white border border-slate-200 rounded-2xl h-[3.25rem] text-slate-500 font-bold hover:bg-slate-50 transition-all shadow-sm">
                            <Info className="w-5 h-5" />
                            Handige Portaal Links
                          </button>
                        </div>
                      )}

                      {/* Totale besparing + Commissie — hidden when all outcomes are coach messages */}
                      {!outcomes.every(o => o.showCoachMessage) && (
                        <div className={`flex flex-col items-center gap-4 transition-all duration-500 ease-in-out relative ${customerType !== 'SOHO' ? 'pt-4 border-t border-slate-100' : 'pt-2'} ${globalCalcOpen ? (globalCalcOpen === 'ENECO' ? 'w-[calc(50%-1.5rem)] mr-auto sm:items-center justify-center' : 'w-[calc(50%-1.5rem)] ml-auto sm:items-center justify-center') : 'w-full sm:items-center justify-center'}`}>
                          <div className={`transition-all duration-500 w-full sm:w-auto text-center`}>
                            <span className="block text-xs uppercase tracking-widest font-bold text-slate-400 mb-1">{customerType === 'SOHO' && hasAnyElindus ? `${text.totaal} ${comparisonView === 'ENECO' ? 'Eneco' : 'Elindus'} ${(comparisonView === 'ENECO' ? totalEnecoSavings : totalElindusSavings) > 0 ? text.besparingEnkel : text.meerkost}` : `${text.totaal} Eneco ${totalEnecoSavings > 0 ? text.besparingEnkel : text.meerkost}`}</span>
                            <span className={`text-[clamp(1.75rem,4vh,2.25rem)] font-black leading-none ${(customerType === 'SOHO' && hasAnyElindus ? (comparisonView === 'ENECO' ? totalEnecoSavings : totalElindusSavings) : totalEnecoSavings) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{(customerType === 'SOHO' && hasAnyElindus ? (comparisonView === 'ENECO' ? totalEnecoSavings : totalElindusSavings) : totalEnecoSavings) > 0 ? '+' : ''}€{Math.abs(customerType === 'SOHO' && hasAnyElindus ? (comparisonView === 'ENECO' ? totalEnecoSavings : totalElindusSavings) : totalEnecoSavings).toFixed(2)}</span>
                          </div>
                        </div>
                      )}



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
                              {text.detailCalculation}
                            </h3>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                              {outcomes.map(o => {
                                // For ENECO: show only if showEneco
                                if (globalCalcOpen === 'ENECO' && !o.showEneco) return null;
                                // For ELINDUS: show if showElindus, OR show gas-from-Eneco when gas <25 MWh
                                const isEnecoFallback = globalCalcOpen === 'ELINDUS' && !o.showElindus && o.showEneco;
                                if (globalCalcOpen === 'ELINDUS' && !o.showElindus && !isEnecoFallback) return null;

                                const useEnecoForThis = isEnecoFallback;
                                const newPrice = (globalCalcOpen === 'ENECO' || useEnecoForThis) ? (o.enecoPrice * o.cons) : (o.elindusEsimatedPrice * o.cons);
                                const savings = (globalCalcOpen === 'ENECO' || useEnecoForThis) ? o.enecoSavingsTotal : o.elindusSavingsTotal;
                                const newFixedFee = (globalCalcOpen === 'ENECO' || useEnecoForThis) ? o.enecoFixedFee : o.elindusFixedFee;
                                const displayProvider = useEnecoForThis ? 'Eneco' : (globalCalcOpen === 'ENECO' ? 'Eneco' : 'Elindus');

                                return (
                                  <div key={o.type} className={`p-4 rounded-xl border ${useEnecoForThis ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <h4 className="font-bold text-slate-500 mb-2 uppercase tracking-widest text-xs border-b border-slate-200 pb-2 flex items-center gap-2">
                                      {o.type === 'ELEC' ? <Zap className="w-4 h-4 text-[#E5394C]" /> : <Flame className="w-4 h-4 text-[#E5394C]" />}
                                      {o.type === 'ELEC' ? text.elec : text.gas} ({o.cons} MWh)
                                      {useEnecoForThis && <span className="text-[9px] font-bold bg-blue-100 text-blue-500 px-2 py-0.5 rounded-full ml-auto normal-case tracking-normal">{text.viaEneco}</span>}
                                    </h4>
                                    <div className="space-y-3 text-sm">
                                      {o.type === 'ELEC' && elecMeterType === 'TWEEVOUDIG' ? (
                                        <div className="flex flex-col gap-1">
                                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{text.huidigePrijsTwee}</div>
                                          <div className="flex justify-between text-slate-400"><span>{text.dagTarief}:</span><span className="font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs">€{(showInMWh ? elecCurrentPriceDagMWh : elecCurrentPriceDagMWh / 1000).toFixed(showInMWh ? 2 : 4)} / {showInMWh ? 'MWh' : 'kWh'}</span></div>
                                          <div className="flex justify-between text-slate-400 text-xs"><span>{text.dag} ({showInMWh ? elecDagMWh.toFixed(1) : Math.round(elecDagMWh * 1000)} {showInMWh ? 'MWh' : 'kWh'}):</span><span className="font-bold text-slate-500">€{(elecCurrentPriceDagMWh * elecDagMWh).toFixed(2)}</span></div>
                                          <div className="flex justify-between text-slate-400 mt-1"><span>{text.nachtTarief}:</span><span className="font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs">€{(showInMWh ? elecCurrentPriceNachtMWh : elecCurrentPriceNachtMWh / 1000).toFixed(showInMWh ? 2 : 4)} / {showInMWh ? 'MWh' : 'kWh'}</span></div>
                                          <div className="flex justify-between text-slate-400 text-xs"><span>{text.nacht} ({showInMWh ? elecNachtMWh.toFixed(1) : Math.round(elecNachtMWh * 1000)} {showInMWh ? 'MWh' : 'kWh'}):</span><span className="font-bold text-slate-500">€{(elecCurrentPriceNachtMWh * elecNachtMWh).toFixed(2)}</span></div>
                                          <div className="flex justify-between border-t border-slate-100 pt-1 mt-1"><span className="text-slate-400 text-xs">{text.totaalHuidig} ({o.cons} MWh):</span><span className="font-bold text-slate-500">€{(o.currPrice * o.cons).toFixed(2)}</span></div>
                                          <div className="flex justify-between text-slate-400 text-xs"><span>{text.gewogenGem}:</span><span className="font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs">€{(showInMWh ? o.currPrice : o.currPrice / 1000).toFixed(showInMWh ? 2 : 4)} / {showInMWh ? 'MWh' : 'kWh'}</span></div>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-1">
                                          <div className="flex justify-between text-slate-400"><span>{text.currentPrice}:</span><span className="font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs">€{(showInMWh ? o.currPrice : o.currPrice / 1000).toFixed(showInMWh ? 2 : 4)} / {showInMWh ? 'MWh' : 'kWh'}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-400 text-xs">{text.kosten} ({o.cons} MWh):</span><span className="font-bold text-slate-500">€{(o.currPrice * o.cons).toFixed(2)}</span></div>
                                        </div>
                                      )}

                                      <div className="flex flex-col gap-1 border-t border-slate-100 pt-2">
                                        <div className="flex justify-between text-slate-500 font-bold"><span>{displayProvider} Voorstel:</span><span className="font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-sm px-1.5 py-0.5 rounded text-xs">€{(((globalCalcOpen === 'ENECO' || useEnecoForThis) ? o.enecoPrice : o.elindusEsimatedPrice) / (showInMWh ? 1 : 1000)).toFixed(showInMWh ? 2 : 4)} / {showInMWh ? 'MWh' : 'kWh'}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-400 text-xs">{text.kosten} ({o.cons} MWh):</span><span className="font-bold text-slate-500">€{newPrice.toFixed(2)}</span></div>
                                      </div>

                                      {includeFixedFeeSavings && (
                                        <div className="flex justify-between items-center border-t border-slate-100 pt-2"><span className="text-slate-400 text-xs">{text.vasteVergoedingVV}:</span><span className="font-bold text-slate-500 text-[10px] uppercase bg-slate-100 px-1.5 py-0.5 rounded">€{o.currentFixedFee} → €{newFixedFee}</span></div>
                                      )}

                                      <div className={`flex justify-between items-center border-t border-dashed border-slate-200 pt-2 font-black ${savings > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        <span className="text-xs uppercase tracking-wider">{savings > 0 ? text.besparingEnkel : text.meerkost} ({o.type === 'ELEC' ? text.elek : text.gas}):</span>
                                        <span className="text-base">€{Math.abs(savings).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className={`mt-0 pt-4 border-t border-slate-200 ${globalCalcOpen === 'ENECO' ? (totalEnecoSavings > 0 ? 'text-emerald-500' : 'text-rose-500') : (totalElindusSavings > 0 ? 'text-emerald-500' : 'text-rose-500')} bg-transparent`}>
                              <div className="flex flex-col gap-1 font-black">
                                <span className="text-xs uppercase tracking-widest text-slate-400">{text.totaal} {(globalCalcOpen === 'ENECO' ? totalEnecoSavings : totalElindusSavings) > 0 ? text.besparingEnkel : text.meerkost}:</span>
                                <span className="text-2xl">€{Math.abs(globalCalcOpen === 'ENECO' ? totalEnecoSavings : totalElindusSavings).toFixed(2)}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* STEP 5: Customer Form & Save */}
                {currentStep === 5 && (
                  <motion.div key="step5customer" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: 'easeInOut' }} className="w-full max-w-3xl">
                    <div className="bg-white rounded-[clamp(1.5rem,3vh,2.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-visible">
                      <div className="p-[clamp(1.25rem,3vh,2rem)] sm:p-[clamp(1.5rem,4vh,2.5rem)]">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-[clamp(1rem,3vh,1.5rem)] mb-[clamp(1rem,3vh,2rem)]">
                          <Save className="w-6 h-6 text-eneco-gradient" />
                          <h3 className="text-xl font-bold text-slate-600">{text.step7Title}</h3>
                        </div>
                        <CustomerForm
                          customerData={customerData} setCustomerData={setCustomerData}
                          connectionAddress={connectionAddress} setConnectionAddress={setConnectionAddress}
                          billingAddressSame={billingAddressSame} setBillingAddressSame={setBillingAddressSame}
                          billingAddress={billingAddress} setBillingAddress={setBillingAddress}
                          streetRef={streetRef} cityRef={cityRef} billingStreetRef={billingStreetRef} billingCityRef={billingCityRef}
                          typedStreetRef={typedStreetRef} typedBillingStreetRef={typedBillingStreetRef}
                          text={text}
                          customerType={customerType}
                        />
                        <button
                          onClick={handleSaveOrder}
                          disabled={isSubmitting || !customerData.firstName || !customerData.lastName || !customerData.email || !connectionAddress.street || !connectionAddress.houseNumber || !connectionAddress.postalCode || !connectionAddress.city || (customerType === 'SOHO' && !customerData.companyName)}
                          className="w-full mt-8 py-4 rounded-[clamp(1rem,2vh,1.25rem)] bg-eneco-gradient text-white font-black text-[clamp(14px,2vh,18px)] transition-all hover:shadow-lg hover:shadow-[#E5394C]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> {lang === 'NL' ? 'Opslaan...' : 'Enregistrement...'}</> : <><Save className="w-5 h-5" /> {text.saveOrder || 'Opslaan Bon'}</>}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 6 (final): Success + Dossier Code */}
                {currentStep > totalSteps && isSuccess && (
                  <motion.div key="step-success" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }} className="w-full max-w-lg">
                    <div className="bg-white rounded-[clamp(2rem,4vh,3rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden text-center p-[clamp(2rem,5vh,3rem)]">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.4, delay: 0.2 }}>
                        <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                      </motion.div>
                      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-[clamp(1.5rem,4vh,2rem)] font-black text-slate-700 mb-2">
                        {lang === 'NL' ? 'Bon Opgeslagen!' : 'Bon Enregistré!'}
                      </motion.h2>
                      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="text-slate-400 font-medium mb-8">
                        {lang === 'NL' ? 'Het dossier is succesvol aangemaakt.' : 'Le dossier a été créé avec succès.'}
                      </motion.p>

                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 mb-8">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{lang === 'NL' ? 'Dossiernummer' : 'Numéro de dossier'}</p>
                        <p className="text-[clamp(1.5rem,4vh,2.5rem)] font-black text-eneco-gradient tracking-wider">{dossierCode}</p>
                      </motion.div>

                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="space-y-3">
                        <p className="text-sm text-slate-400 mb-4">
                          <span className="font-bold">{customerData.firstName} {customerData.lastName}</span>
                          {customerType === 'SOHO' && customerData.companyName && <><br/><span className="text-slate-500">{customerData.companyName}</span></>}
                          <br/><span className="text-slate-400">{connectionAddress.street} {connectionAddress.houseNumber}, {connectionAddress.postalCode} {connectionAddress.city}</span>
                        </p>
                        <button
                          onClick={() => { setIsSuccess(false); setDossierCode(''); setCurrentStep(1); setCustomerType(null); setEnergyType(null); }}
                          className="w-full py-4 rounded-2xl font-bold transition-all bg-eneco-gradient text-white hover:shadow-lg hover:shadow-[#E5394C]/20"
                        >
                          {lang === 'NL' ? 'Nieuw Dossier Starten' : 'Commencer un Nouveau Dossier'}
                        </button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="w-full relative flex items-center justify-center mt-8">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                {currentStep === 1 || currentStep > totalSteps ? (
                  <motion.div key="nav-hide" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="opacity-0 pointer-events-none h-0" />
                ) : (
                  <motion.div key={`nav-${currentStep}`} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="relative w-full max-w-3xl mx-auto px-0 sm:px-6 z-50">
                    <div className="bg-white/80 backdrop-blur-xl border border-white shadow-sm p-4 sm:p-6 rounded-[2rem] flex justify-between items-center">
                      <button disabled={isTranslating} onClick={prevStep} className={`group flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all text-slate-500 hover:bg-slate-100 ${isTranslating ? 'pointer-events-none opacity-50' : ''}`}><ChevronLeft className="w-5 h-5 transition-colors group-hover:text-[#E5394C]" /><span className="hidden sm:inline">{text.back}</span></button>
                      <div className="flex gap-2 sm:gap-3">{[...Array(totalSteps)].map((_, i) => (<div key={i} className={`h-2.5 rounded-full transition-all duration-300 ${currentStep === i + 1 ? 'bg-eneco-gradient w-8' : 'bg-slate-200 w-2.5'}`} />))}</div>
                      <div className="flex flex-col items-end relative">
                        <button onClick={nextStep} disabled={isTranslating || !isStepValid() || currentStep === totalSteps} className={`flex items-center gap-2 px-6 sm:px-8 py-3 rounded-2xl font-bold transition-all ${currentStep === totalSteps ? 'opacity-0 pointer-events-none' : (isTranslating || !isStepValid() ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-eneco-gradient text-white hover:bg-[#E5384C]')}`}><span className="hidden sm:inline">{text.next}</span><ChevronRight className="w-5 h-5" /></button>
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
