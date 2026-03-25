import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import Header from '../components/Header';
import LiquidGlassSlider from '../components/LiquidGlassSlider';
import { ChevronLeftIcon as ChevronLeft } from '../components/Icons';

declare global {
  interface Window { google: any; }
}

interface SimCardData {
  transferType: 'NEW' | 'PORT' | '';
  simType: 'ESIM' | 'PHYSICAL' | '';
  currentProvider: string;
  subscriptionType: string;
  customerProfile: string;
}

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-medium text-slate-600 focus:bg-[#FFC421]/5 focus:ring-2 focus:ring-[#FFC421]/50 focus:border-[#FFC421] transition-all text-sm outline-none";
const labelCls = "block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest";

const phoneOptions = [
  { value: '+32', label: '+32', img: 'https://flagcdn.com/w40/be.png' },
  { value: '+31', label: '+31', img: 'https://flagcdn.com/w40/nl.png' },
  { value: '+33', label: '+33', img: 'https://flagcdn.com/w40/fr.png' },
  { value: '+49', label: '+49', img: 'https://flagcdn.com/w40/de.png' },
  { value: '+352', label: '+352', img: 'https://flagcdn.com/w40/lu.png' },
  { value: '+44', label: '+44', img: 'https://flagcdn.com/w40/gb.png' }
];

const CustomSelect = ({ value, onChange, options, className = '' }: any) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(!open)} className={`${inputCls} flex items-center justify-between w-full h-[46px] text-left pr-4`}>
        <div className="flex items-center gap-2">
          {options.find((o:any) => o.value === value)?.img && <img src={options.find((o:any) => o.value === value)?.img} className="w-5 h-5 rounded-full object-cover shadow-sm" alt="flag" />}
          <span className="font-bold inline-block min-w-[30px]">{options.find((o:any) => o.value === value)?.label || ''}</span>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>
      <AnimatePresence>
        {open && (
           <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-50 top-full left-0 mt-2 w-max min-w-[120px] bg-white border border-slate-200 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden max-h-60 overflow-y-auto">
             {options.map((o:any) => (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-50 ${value === o.value ? 'bg-[#FFC421]/10 text-[#FFC421] font-black' : 'text-slate-500 font-bold'}`}>
                  {o.img && <img src={o.img} className="w-5 h-5 rounded-full object-cover shadow-sm" alt="flag" />}
                  {o.label}
                </button>
             ))}
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CustomDatePicker = ({ value, onChange }: any) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(value ? value.split('-').reverse().join('/') : '');

  const current = value ? new Date(value) : null;
  const [month, setMonth] = useState((current || new Date()).getMonth());
  const [year, setYear] = useState((current || new Date()).getFullYear());

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setMonth(parseInt(parts[1]) - 1);
        setYear(parseInt(parts[0]));
        setInputValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClick = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInputChange = (e: any) => {
    let val = e.target.value.replace(/[^0-9/]/g, '');
    if (val.length === 2 && !val.includes('/')) val += '/';
    if (val.length === 5 && val.split('/').length === 2) val += '/';
    if (val.length > 10) val = val.substring(0, 10);
    setInputValue(val);

    if (val.length === 10) {
      const parts = val.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        if (d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1900) {
          onChange(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
          setMonth(m - 1);
          setYear(y);
        }
      }
    }
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const handleDayClick = (d: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
    setOpen(false);
  };

  const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <input 
          type="text" 
          className={inputCls} 
          placeholder="DD/MM/YYYY"
          value={inputValue}
          onChange={handleInputChange}
          onClick={() => setOpen(true)}
          onFocus={() => setOpen(true)}
        />
        <svg onClick={() => setOpen(!open)} className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FFC421] cursor-pointer hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </div>

      <AnimatePresence>
        {open && (
           <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-50 top-full left-0 mt-2 w-full min-w-[300px] bg-white border border-slate-200 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-4 overflow-hidden">
             <div className="flex justify-between items-center mb-4">
               <button type="button" onClick={() => { if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
               <div className="flex gap-2 text-sm">
                 <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="font-bold text-slate-600 bg-transparent outline-none cursor-pointer appearance-none text-center hover:text-[#FFC421] transition-colors">
                   {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                 </select>
                 <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="font-bold text-slate-600 bg-transparent outline-none cursor-pointer appearance-none text-center hover:text-[#FFC421] transition-colors">
                   {Array.from({length: 100}).map((_, i) => <option key={i} value={new Date().getFullYear() - i + 10}>{new Date().getFullYear() - i + 10}</option>)}
                 </select>
               </div>
               <button type="button" onClick={() => { if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
             </div>

             <div className="grid grid-cols-7 gap-1 text-center mb-2">
               {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(d => <div key={d} className="text-[10px] font-black uppercase text-slate-400">{d}</div>)}
             </div>

             <div className="grid grid-cols-7 gap-1">
               {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}
               {Array.from({ length: daysInMonth }).map((_, i) => {
                 const d = i + 1;
                 const isSelected = current && current.getDate() === d && current.getMonth() === month && current.getFullYear() === year;
                 return (
                   <button 
                     key={d} 
                     type="button"
                     onClick={() => handleDayClick(d)}
                     className={`h-9 rounded-lg text-sm font-bold transition-all ${isSelected ? 'bg-[#FFC421] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                   >
                     {d}
                   </button>
                 );
               })}
             </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



export default function TelenetWizard() {
  const { user, lang } = useAuth();
  const navigate = useNavigate();
  const GOOGLE_API_KEY = (import.meta as any).env.VITE_GOOGLE_PLACES_API_KEY || '';

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const totalSteps = 5;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Step 1: Customer Data
  const [customerData, setCustomerData] = useState({
    companyName: '', vatNumber: 'BE', firstName: '', lastName: '',
    birthDate: '', phoneCountry: '+32', phone: '',
    email: '',
    billingEmailSame: true, billingEmail: '',
    language: 'NL'
  });

  // Step 2: Connection & Address
  const [connectionAddress, setConnectionAddress] = useState({
    street: '', houseNumber: '', busNumber: '', postalCode: '', city: ''
  });
  const [billingAddressSame, setBillingAddressSame] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    street: '', houseNumber: '', busNumber: '', postalCode: '', city: ''
  });
  const [customerType, setCustomerType] = useState<'NEW' | 'EXISTING' | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'CATSAP1' | 'CATSAP3' | null>(null);
  const [neonAgreed, setNeonAgreed] = useState<boolean | null>(null);
  const [takeoverRequired, setTakeoverRequired] = useState<boolean | null>(null);

  // Step 3: Product
  const [productType, setProductType] = useState<'STANDALONE_BFN' | 'KLIK' | null>(null);
  const [klikType, setKlikType] = useState<'LIMITED' | 'UNLIMITED'>('LIMITED');
  const [simCount, setSimCount] = useState(1);
  const [bfnType, setBfnType] = useState<'BFN_500' | 'BFN_150' | ''>('');

  // Step 4: SIM data
  const [simData, setSimData] = useState<Record<number, SimCardData>>({});

  // Step 5: NEON photos
  const [photos, setPhotos] = useState<{ tap: File | null; gevel: File | null; tech: File | null }>({ tap: null, gevel: null, tech: null });

  const streetRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const billingStreetRef = useRef<HTMLInputElement>(null);
  const billingCityRef = useRef<HTMLInputElement>(null);

  const t: Record<string, any> = {
    NL: {
      backToHome: 'Terug naar overzicht', back: 'Vorige', next: 'Volgende', submit: 'Verzenden',
      step1Title: 'Klantgegevens', step2Title: 'Aansluiting', step3Title: 'Product',
      step4Title: 'Mobiele Nummers', step5Title: 'Documentatie',
      companyName: 'Bedrijfsnaam', vatNumber: 'BTW Nummer', firstName: 'Voornaam', lastName: 'Achternaam',
      birthDate: 'Geboortedatum', langLabel: 'Taal Klant', phone: 'Contactnummer',
      email: 'E-mailadres', billingEmailToggle: 'Zelfde facturatie e-mail?', billingEmail: 'Facturatie E-mail',
      connectionAddress: 'Aansluitingsadres', billingAddress: 'Facturatieadres',
      street: 'Straat', houseNr: 'Huis Nr', bus: 'Bus', postalCode: 'Postcode', city: 'Gemeente',
      sameAddress: 'Is aansluitingsadres gelijk aan facturatieadres?',
      customerType: 'Type klant', networkStatus: 'Netwerk status',
      newCustomer: 'Nieuwe Klant', existingCustomer: 'Bestaande Klant',
      connected: 'Aangesloten (CAT/SAP1)', notConnected: 'Niet Aangesloten (CAT/SAP3)',
      unknown: 'Onbekend',
      neonWarningTitle: 'NEON Installatie Vereist',
      neonWarningDesc: 'De klant is niet aangesloten. NEON installatie is gratis maar duurt 12 tot 20 weken. Max 80m van de TAP.',
      neonAgree: 'Klant gaat akkoord met NEON', neonDisagree: 'Klant weigert',
      takeoverLabel: 'Staan de huidige producten op privé naam?',
      yes: 'Ja (Overname nodig)', no: 'Nee', jaSimple: 'Ja', neeSimple: 'Nee',
      takeoverWarning: 'Let op: Een overname document getekend door beide partijen is vereist!',
      productTypeLabel: 'Welk product wenst de klant?',
      klikDesc: 'Internet + Mobiel (Meest gekozen)', bfnDesc: 'Alleen Internet',
      klikTypeLabel: 'Type KLIK bundel', simCountLabel: 'Aantal SIM-kaarten', bfnTypeLabel: 'BFN Snelheid',
      transferType: 'Transfer Type', simType: 'SIM Type', newSim: 'Nieuw', portSim: 'Porteren',
      esim: 'eSIM', physical: 'Fysiek', provider: 'Provider', subscription: 'Abonnement', profile: 'Profiel',
      choose: 'Kies...', data: 'Data', price: 'Prijs',
      noMobileNeeded: 'Geen mobiele nummers nodig voor BFN.', goNext: 'Ga door naar de volgende stap.',
      uploadPhotos: 'Upload de 3 verplichte NEON foto\'s:', tapLabel: 'TAP Rooilijn', facadeLabel: 'Gevel', techLabel: 'Technische Ruimte',
      noDocsNeeded: 'Geen extra documenten nodig', alreadyConnected: 'Klant is reeds aangesloten. Klik op verzenden.',
      submitting: 'Verzenden...', sendCoach: '📧 Verzenden naar Coach',
      fillAll: 'Vul alle verplichte velden in.'
    },
    FR: {
      backToHome: 'Retour', back: 'Précédent', next: 'Suivant', submit: 'Envoyer',
      step1Title: 'Données Client', step2Title: 'Connexion', step3Title: 'Produit',
      step4Title: 'Numéros Mobiles', step5Title: 'Documentation',
      companyName: 'Nom de l\'entreprise', vatNumber: 'Numéro TVA', firstName: 'Prénom', lastName: 'Nom',
      birthDate: 'Date de naissance', langLabel: 'Langue Client', phone: 'Numéro de contact',
      email: 'Adresse e-mail', billingEmailToggle: 'Même e-mail de facturation ?', billingEmail: 'E-mail de facturation',
      connectionAddress: 'Adresse de connexion', billingAddress: 'Adresse de facturation',
      street: 'Rue', houseNr: 'N°', bus: 'Boîte', postalCode: 'Code postal', city: 'Commune',
      sameAddress: 'L\'adresse de connexion est-elle identique à l\'adresse de facturation ?',
      customerType: 'Type de client', networkStatus: 'Statut réseau',
      newCustomer: 'Nouveau Client', existingCustomer: 'Client Existant',
      connected: 'Connecté (CAT/SAP1)', notConnected: 'Non Connecté (CAT/SAP3)',
      unknown: 'Inconnu',
      neonWarningTitle: 'Installation NEON Requise',
      neonWarningDesc: 'Le client n\'est pas connecté. L\'installation NEON est gratuite mais prend 12 à 20 semaines. Max 80m du TAP.',
      neonAgree: 'Le client accepte NEON', neonDisagree: 'Le client refuse',
      takeoverLabel: 'Les produits actuels sont-ils au nom privé ?',
      yes: 'Oui (Reprise nécessaire)', no: 'Non', jaSimple: 'Oui', neeSimple: 'Non',
      takeoverWarning: 'Attention : Un document de reprise signé par les deux parties est requis !',
      productTypeLabel: 'Quel produit le client souhaite-t-il ?',
      klikDesc: 'Internet + Mobile (Le plus choisi)', bfnDesc: 'Internet Uniquement',
      klikTypeLabel: 'Type de forfait KLIK', simCountLabel: 'Nombre de cartes SIM', bfnTypeLabel: 'Vitesse BFN',
      transferType: 'Type de transfert', simType: 'Type SIM', newSim: 'Nouveau', portSim: 'Portabilité',
      esim: 'eSIM', physical: 'Physique', provider: 'Opérateur', subscription: 'Abonnement', profile: 'Profil',
      choose: 'Choisir...', data: 'Données', price: 'Prix',
      noMobileNeeded: 'Pas de numéros mobiles nécessaires pour BFN.', goNext: 'Passez à l\'étape suivante.',
      uploadPhotos: 'Téléchargez les 3 photos NEON obligatoires :', tapLabel: 'TAP Limite', facadeLabel: 'Façade', techLabel: 'Local Technique',
      noDocsNeeded: 'Aucun document supplémentaire nécessaire', alreadyConnected: 'Le client est déjà connecté. Cliquez sur envoyer.',
      submitting: 'Envoi...', sendCoach: '📧 Envoyer au Coach',
      fillAll: 'Veuillez remplir tous les champs obligatoires.'
    }
  };
  const text = t[lang];

  const getKlikPricing = () => {
    if (klikType === 'LIMITED') {
      const prices: Record<number, { gb: string; price: number }> = {
        1: { gb: '30GB', price: 81 }, 2: { gb: '60GB', price: 98 }, 3: { gb: '90GB', price: 113 },
        4: { gb: '120GB', price: 129 }, 5: { gb: '150GB', price: 145 }, 6: { gb: '180GB', price: 174 },
        7: { gb: '210GB', price: 203 }, 8: { gb: '240GB', price: 232 }, 9: { gb: '270GB', price: 261 },
        10: { gb: '300GB', price: 290 }
      };
      return prices[simCount] || prices[10];
    } else {
      const prices: Record<number, { gb: string; price: number }> = {
        1: { gb: '300GB', price: 92 }, 2: { gb: '600GB', price: 110 }, 3: { gb: '900GB', price: 129 },
        4: { gb: '1200GB', price: 149 }, 5: { gb: '1500GB', price: 170 }
      };
      return prices[simCount] || prices[5];
    }
  };

  // Google Places Autocomplete (Now active on Step 2)
  useEffect(() => {
    if (!GOOGLE_API_KEY) return;
    
    let timer: any;
    const tryInit = () => {
      if (currentStep === 2) {
        if (!streetRef.current || (!billingAddressSame && !billingStreetRef.current)) {
          timer = setTimeout(tryInit, 100);
          return;
        }
      }
      initAutocomplete();
    };

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      tryInit();
      return () => clearTimeout(timer);
    }
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => tryInit();
    document.head.appendChild(script);
    
    return () => clearTimeout(timer);
  }, [currentStep, billingAddressSame]);

  const initAutocomplete = () => {
    if (!window.google) return;
    const opts = { types: ['address'], componentRestrictions: { country: 'be' } };

    // Connection Autocomplete
    if (streetRef.current && !streetRef.current.dataset.autocomplete) {
      const ac = new window.google.maps.places.Autocomplete(streetRef.current, opts);
      streetRef.current.dataset.autocomplete = 'true';
      setTimeout(() => streetRef.current && (streetRef.current.placeholder = ''), 10);
      ac.addListener('place_changed', () => handlePlace(ac, setConnectionAddress));
    }
    if (cityRef.current && !cityRef.current.dataset.autocomplete) {
      const ac2 = new window.google.maps.places.Autocomplete(cityRef.current, { types: ['(cities)'], componentRestrictions: { country: 'be' } });
      cityRef.current.dataset.autocomplete = 'true';
      setTimeout(() => cityRef.current && (cityRef.current.placeholder = ''), 10);
      ac2.addListener('place_changed', () => {
        const p = ac2.getPlace();
        if (p?.address_components) {
          const city = p.address_components.find((c: any) => c.types.includes('locality'));
          const postal = p.address_components.find((c: any) => c.types.includes('postal_code'));
          setConnectionAddress(prev => ({ ...prev, city: city?.long_name || prev.city, postalCode: postal?.long_name || prev.postalCode }));
        }
      });
    }

    // Billing Autocomplete
    if (!billingAddressSame && billingStreetRef.current && !billingStreetRef.current.dataset.autocomplete) {
      const ac3 = new window.google.maps.places.Autocomplete(billingStreetRef.current, opts);
      billingStreetRef.current.dataset.autocomplete = 'true';
      setTimeout(() => billingStreetRef.current && (billingStreetRef.current.placeholder = ''), 10);
      ac3.addListener('place_changed', () => handlePlace(ac3, setBillingAddress));
    }
    if (!billingAddressSame && billingCityRef.current && !billingCityRef.current.dataset.autocomplete) {
      const ac4 = new window.google.maps.places.Autocomplete(billingCityRef.current, { types: ['(cities)'], componentRestrictions: { country: 'be' } });
      billingCityRef.current.dataset.autocomplete = 'true';
      setTimeout(() => billingCityRef.current && (billingCityRef.current.placeholder = ''), 10);
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

  const handlePlace = (ac: any, setter: React.Dispatch<React.SetStateAction<any>>) => {
    const place = ac.getPlace();
    if (!place?.address_components) return;
    let street = '', number = '', postal = '', city = '';
    for (const comp of place.address_components) {
      if (comp.types.includes('route')) street = comp.long_name;
      if (comp.types.includes('street_number')) number = comp.long_name;
      if (comp.types.includes('postal_code')) postal = comp.long_name;
      if (comp.types.includes('locality')) city = comp.long_name;
    }
    if (!number && place.name) {
      const match = place.name.match(/(\d+\w*)/);
      if (match) number = match[1];
    }
    setter(prev => ({ ...prev, street: street || prev.street, houseNumber: number || prev.houseNumber, postalCode: postal || prev.postalCode, city: city || prev.city }));
  };

  const formatVatNumber = (val: string) => {
    // Keep 'BE', then only allow digits
    let digits = val.replace(/^BE/i, '').replace(/\D/g, '');
    if (digits.length > 10) digits = digits.substring(0, 10);
    return 'BE' + digits;
  };

  const isVatValid = customerData.vatNumber.length === 12 && customerData.vatNumber.startsWith('BE');
  const isPhoneValid = customerData.phoneCountry === '+32' ? customerData.phone.replace(/\D/g, '').length >= 9 && customerData.phone.replace(/\D/g, '').length <= 10 : customerData.phone.length > 5;

  const validateStep = () => {
    if (currentStep === 1) {
      if (!customerData.companyName || !isVatValid || !customerData.firstName || !customerData.lastName || !customerData.birthDate || !isPhoneValid || !customerData.email) return false;
      if (!customerData.billingEmailSame && !customerData.billingEmail) return false;
    }
    if (currentStep === 2) {
      if (!connectionAddress.street || !connectionAddress.houseNumber || !connectionAddress.postalCode || !connectionAddress.city) return false;
      if (!billingAddressSame && (!billingAddress.street || !billingAddress.houseNumber || !billingAddress.postalCode || !billingAddress.city)) return false;
      if (!customerType || !networkStatus) return false;
      if (networkStatus === 'CATSAP3' && neonAgreed !== true) return false;
      if (customerType === 'EXISTING' && takeoverRequired === null) return false;
    }
    if (currentStep === 3) {
      if (!productType) return false;
      if (productType === 'STANDALONE_BFN' && !bfnType) return false;
    }
    if (currentStep === 4) {
      if (productType === 'KLIK') {
        for (let i = 1; i <= simCount; i++) {
          const s = simData[i] || {} as SimCardData;
          if (!s.transferType || !s.simType) return false;
          if (s.transferType === 'PORT') {
            if (!s.currentProvider || !s.subscriptionType || !s.customerProfile) return false;
          }
        }
      }
    }
    if (currentStep === 5) {
      if (networkStatus === 'CATSAP3') {
        if (!photos.tap || !photos.gevel || !photos.tech) return false;
      }
    }
    return true;
  };

  const [isTranslating, setIsTranslating] = useState(false);
  const nextStep = () => { 
    if (isTranslating) return;
    if (currentStep < totalSteps) { 
      setIsTranslating(true);
      setDirection(1); 
      setCurrentStep(p => p + 1); 
      setTimeout(() => setIsTranslating(false), 800);
    } 
  };
  const prevStep = () => { 
    if (isTranslating) return;
    if (currentStep > 1) { 
      setIsTranslating(true);
      setDirection(-1); 
      setCurrentStep(p => p - 1); 
      setTimeout(() => setIsTranslating(false), 800);
    } 
  };

  const handleFinalSubmit = async () => {
    if (!validateStep()) { alert(lang === 'NL' ? 'Vul alle verplichte velden in.' : 'Veuillez remplir tous les champs.'); return; }
    setIsSubmitting(true);
    try {
      const folderName = `${customerData.companyName.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`;
      const uploadPhoto = async (file: File | null, label: string) => {
        if (!file) return null;
        const ext = file.name.split('.').pop();
        const path = `${folderName}/${label}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('telenet_documents').upload(path, file);
        if (error) { console.error(`Upload ${label} failed`, error); return null; }
        return supabase.storage.from('telenet_documents').getPublicUrl(path).data.publicUrl;
      };
      let tapUrl = null, gevelUrl = null, techUrl = null;
      if (networkStatus === 'CATSAP3') {
        tapUrl = await uploadPhoto(photos.tap, 'TAP');
        gevelUrl = await uploadPhoto(photos.gevel, 'GEVEL');
        techUrl = await uploadPhoto(photos.tech, 'TECH');
      }
      if (user) {
        await supabase.from('activity_logs').insert({ user_id: user.id, user_email: user.email, action: 'TELENET_WIZARD', energy_type: 'NA', commission_code: customerData.companyName, consumption_mwh: 0 });
      }

      const emailFull = customerData.email;
      const fEmailFull = customerData.billingEmailSame ? emailFull : customerData.billingEmail;

      let body = `Beste Coach,\n\nNieuwe Telenet Business aanvraag:\n\n-- KLANTGEGEVENS --\nBedrijf: ${customerData.companyName}\nBTW: ${customerData.vatNumber}\nNaam: ${customerData.firstName} ${customerData.lastName}\nGeboortedatum: ${customerData.birthDate}\nE-mail: ${emailFull}\nFacturatie E-mail: ${fEmailFull}\nTelefoon: ${customerData.phoneCountry} ${customerData.phone}\nTaal: ${customerData.language}\n`;

      body += `\n-- ADRESGEGEVENS --\nAansluitingsadres:\n${connectionAddress.street} ${connectionAddress.houseNumber}${connectionAddress.busNumber ? ' Bus ' + connectionAddress.busNumber : ''}\n${connectionAddress.postalCode} ${connectionAddress.city}\n`;
      if (!billingAddressSame) {
        body += `\nFacturatieadres:\n${billingAddress.street} ${billingAddress.houseNumber}${billingAddress.busNumber ? ' Bus ' + billingAddress.busNumber : ''}\n${billingAddress.postalCode} ${billingAddress.city}\n`;
      } else {
        body += `\nFacturatieadres: Zelfde als Aansluitingsadres\n`;
      }

      body += `\n-- AANSLUITING --\nType Klant: ${customerType}\nNetwerk Status: ${networkStatus}\n${takeoverRequired ? '⚠️ OVERNAME VEREIST' : ''}\n${networkStatus === 'CATSAP3' ? 'NEON: Klant akkoord (12-20 weken).' : ''}\n\n-- PRODUCT --\nProduct: ${productType === 'KLIK' ? 'KLIK' : 'Standalone BFN'}\n${productType === 'KLIK' ? `KLIK Type: ${klikType}\nAantal SIMs: ${simCount}` : `Snelheid: ${bfnType}`}\n\n-- MOBIELE NUMMERS --\n`;
      if (productType === 'KLIK') {
        for (let i = 1; i <= simCount; i++) {
          const s = simData[i];
          if (s) body += `\nSIM ${i}:\nTransfer: ${s.transferType}\nSIM Type: ${s.simType}\nProvider: ${s.currentProvider || 'N/A'}\nAbonnement: ${s.subscriptionType || 'N/A'}\nProfiel: ${s.customerProfile || 'N/A'}\n`;
        }
      }
      if (networkStatus === 'CATSAP3') {
        body += `\n-- NEON FOTO'S --\n`;
        if (tapUrl) body += `TAP: ${tapUrl}\n`;
        if (gevelUrl) body += `Gevel: ${gevelUrl}\n`;
        if (techUrl) body += `Tech: ${techUrl}\n`;
      }
      setIsSuccess(true);
      setTimeout(() => {
        const subject = encodeURIComponent(`Nieuwe Telenet Aanvraag: ${customerData.companyName}`);
        window.location.href = `mailto:coach@telenco.be?subject=${subject}&body=${encodeURIComponent(body)}`;
        setIsSuccess(false);
        navigate('/home');
      }, 1500);
    } catch (e) {
      console.error(e);
      alert('Er ging iets mis.');
    } finally { setIsSubmitting(false); }
  };

  const updateSim = (idx: number, field: keyof SimCardData, val: string) => {
    setSimData(prev => ({ ...prev, [idx]: { ...(prev[idx] || { transferType: '', simType: '', currentProvider: '', subscriptionType: '', customerProfile: '' }), [field]: val } }));
  };

  const variants = {
    enter: { opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } },
    center: { zIndex: 1, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
    exit: { zIndex: 0, opacity: 0, transition: { duration: 0.45, ease: 'easeIn' } }
  };

  const StepHeader = ({ title }: { title: string }) => (
    <div className="flex items-center justify-between mb-8">
      <h2 className="text-2xl sm:text-3xl font-black text-slate-500 tracking-tight">{title}</h2>
      <img src="https://tailormate.ai/telencotool/images/logos/telenetlogo.webp" alt="Telenet Business" className="h-10 sm:h-12 object-contain" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="min-h-screen bg-slate-50 text-slate-500 font-sans overflow-x-hidden relative flex flex-col">
      <div className="fixed top-0 left-0 w-full h-1.5 bg-white/20 z-50 overflow-hidden">
        <motion.div className="h-full bg-white" initial={{ width: '0%' }} animate={{ width: `${(currentStep / totalSteps) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>

      <div className="absolute top-0 left-0 w-full h-[70vh] bg-gradient-to-br from-[#FFD34D] via-[#FFC421] to-[#E5B01E] z-0 overflow-hidden pointer-events-none">
        <svg className="absolute bottom-0 w-full min-w-[1200px]" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ transform: 'translateY(2px)' }}>
          <path fill="rgba(255,255,255,0.05)" d="M0,192L48,192C96,192,192,192,288,208C384,224,480,256,576,261.3C672,267,768,245,864,213.3C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="rgba(255,255,255,0.15)" d="M0,160L48,170.7C96,181,192,203,288,186.7C384,171,480,117,576,112C672,107,768,149,864,176C960,203,1056,213,1152,192C1248,171,1344,117,1392,85.3L1440,53.3L1440,320L0,320Z"></path>
          <path fill="#f8fafc" d="M0,256L48,256C96,256,192,256,288,240C384,224,480,192,576,197.3C672,203,768,245,864,250.7C960,256,1056,224,1152,192C1248,160,1344,128,1392,112L1440,96L1440,320L0,320Z"></path>
        </svg>
      </div>

      <Header actionButton={
        <button onClick={() => navigate('/home')} className="p-2 rounded-full transition-colors bg-white/20 border border-white/30 text-white hover:bg-white hover:text-white" title={text.backToHome}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6" /></svg>
        </button>
      } />

      <AnimatePresence>
        {isSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-emerald-500 flex items-center justify-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.4 }}>
              <svg className="w-24 h-24 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.main key={lang} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 flex-1 flex flex-col justify-center items-center py-12 pb-24">
          <div className="w-full relative flex items-center justify-center min-h-[400px]">
            <AnimatePresence initial={false} custom={direction} mode="wait">

              {/* STEP 1: Klantgegevens */}
              {currentStep === 1 && (
                <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
                    <StepHeader title={text.step1Title} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Bedrijf en BTW */}
                      <div><label className={labelCls}>{text.companyName} *</label><input className={inputCls} value={customerData.companyName} onChange={e => setCustomerData(p => ({ ...p, companyName: e.target.value }))} /></div>
                      <div className="relative">
                        <label className={labelCls}>{text.vatNumber} * {isVatValid ? <span className="text-emerald-500 ml-1">✓</span> : ''}</label>
                        <input className={inputCls} value={customerData.vatNumber} onChange={e => setCustomerData(p => ({ ...p, vatNumber: formatVatNumber(e.target.value) }))} placeholder="BE0123456789" />
                      </div>

                      {/* Info Persoon */}
                      <div><label className={labelCls}>{text.firstName} *</label><input className={inputCls} value={customerData.firstName} onChange={e => setCustomerData(p => ({ ...p, firstName: e.target.value }))} /></div>
                      <div><label className={labelCls}>{text.lastName} *</label><input className={inputCls} value={customerData.lastName} onChange={e => setCustomerData(p => ({ ...p, lastName: e.target.value }))} /></div>
                      <div><label className={labelCls}>{text.birthDate} *</label><CustomDatePicker value={customerData.birthDate} onChange={(val: string) => setCustomerData(p => ({ ...p, birthDate: val }))} /></div>
                      <div>
                        <label className={labelCls}>{text.langLabel}</label>
                        <div className="flex gap-2 h-[46px]">
                          {['NL', 'FR', 'EN'].map(l => (
                            <button key={l} onClick={() => setCustomerData(p => ({ ...p, language: l }))} className={`flex-1 rounded-xl border-2 text-sm font-bold transition-all ${customerData.language === l ? 'bg-[#FFC421] border-[#FFC421] text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{l}</button>
                          ))}
                        </div>
                      </div>

                      {/* Telefoon */}
                      <div className="sm:col-span-2 relative">
                        <label className={labelCls}>{text.phone} * {isPhoneValid ? <span className="text-emerald-500 ml-1">✓</span> : ''}</label>
                        <div className="flex gap-2">
                          <CustomSelect 
                            className="w-1/3 sm:w-1/4 font-bold" 
                            value={customerData.phoneCountry} 
                            onChange={(val: string) => setCustomerData(p => ({ ...p, phoneCountry: val }))} 
                            options={phoneOptions} 
                          />
                          <input type="tel" className={`${inputCls} flex-1`} value={customerData.phone} onChange={e => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (customerData.phoneCountry === '+32' && val.length > 10) val = val.slice(0, 10);
                            setCustomerData(p => ({ ...p, phone: val }));
                          }} placeholder={customerData.phoneCountry === '+32' ? '412 34 56 78' : ''} />
                        </div>
                      </div>

                      {/* E-mail and Billing Email Toggle */}
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Standaard E-mail */}
                        <div>
                          <label className={labelCls}>{text.email} *</label>
                          <input type="email" className={inputCls} value={customerData.email} onChange={e => setCustomerData(p => ({ ...p, email: e.target.value.replace(/\s/g, '').toLowerCase() }))} placeholder="naam@bedrijf.be" />
                        </div>

                        {/* Facturatie Email Toggle */}
                        <div>
                          <label className={labelCls}>{text.billingEmailToggle}</label>
                          <div className="flex gap-2 h-[46px]">
                            <button onClick={() => setCustomerData(p => ({ ...p, billingEmailSame: true }))} className={`flex-1 rounded-xl border-2 text-sm font-bold transition-all ${customerData.billingEmailSame ? 'bg-[#FFC421] border-[#FFC421] text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>{text.jaSimple}</button>
                            <button onClick={() => setCustomerData(p => ({ ...p, billingEmailSame: false }))} className={`flex-1 rounded-xl border-2 text-sm font-bold transition-all ${!customerData.billingEmailSame ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>{text.neeSimple}</button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {!customerData.billingEmailSame && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="sm:col-span-2">
                              <div className="pt-2">
                                <label className={labelCls}>{text.billingEmail} *</label>
                                <input type="email" className={inputCls} value={customerData.billingEmail} onChange={e => setCustomerData(p => ({ ...p, billingEmail: e.target.value.replace(/\s/g, '').toLowerCase() }))} placeholder="boekhouding@bedrijf.be" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Aansluiting */}
              {currentStep === 2 && (
                <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
                    <StepHeader title={text.step2Title} />
                    <div className="space-y-6">

                      {/* Connection Address */}
                      <div className="border border-slate-100 bg-slate-50/50 p-6 rounded-3xl space-y-4">
                        <h3 className="font-black text-slate-600 uppercase tracking-widest text-sm">{text.connectionAddress}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2"><label className={labelCls}>{text.street} *</label><input ref={streetRef} className={inputCls} value={connectionAddress.street} onChange={e => setConnectionAddress(p => ({ ...p, street: e.target.value }))} /></div>
                          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                            <div><label className={labelCls}>{text.houseNr} *</label><input className={inputCls} value={connectionAddress.houseNumber} onChange={e => setConnectionAddress(p => ({ ...p, houseNumber: e.target.value }))} /></div>
                            <div><label className={labelCls}>{text.bus}</label><input className={inputCls} value={connectionAddress.busNumber} onChange={e => setConnectionAddress(p => ({ ...p, busNumber: e.target.value }))} /></div>
                          </div>
                          <div><label className={labelCls}>{text.postalCode} *</label><input className={inputCls} value={connectionAddress.postalCode} onChange={e => setConnectionAddress(p => ({ ...p, postalCode: e.target.value }))} /></div>
                          <div><label className={labelCls}>{text.city} *</label><input ref={cityRef} className={inputCls} value={connectionAddress.city} onChange={e => setConnectionAddress(p => ({ ...p, city: e.target.value }))} /></div>
                        </div>
                      </div>

                      {/* Billing Address Toggle */}
                      <div>
                        <label className={labelCls}>{text.sameAddress}</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setBillingAddressSame(true)} className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${billingAddressSame ? 'bg-[#FFC421] border-[#FFC421] text-white shadow-lg' : 'bg-white border-slate-200'}`}>{text.jaSimple}</button>
                          <button onClick={() => setBillingAddressSame(false)} className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${!billingAddressSame ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200'}`}>{text.neeSimple}</button>
                        </div>
                      </div>

                      {/* Billing Address (Conditional) */}
                      <AnimatePresence>
                        {!billingAddressSame && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border border-slate-100 bg-slate-50/50 p-6 rounded-3xl space-y-4">
                            <h3 className="font-black text-slate-600 uppercase tracking-widest text-sm">{text.billingAddress}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="sm:col-span-2"><label className={labelCls}>{text.street} *</label><input ref={billingStreetRef} className={inputCls} value={billingAddress.street} onChange={e => setBillingAddress(p => ({ ...p, street: e.target.value }))} /></div>
                              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                                <div><label className={labelCls}>{text.houseNr} *</label><input className={inputCls} value={billingAddress.houseNumber} onChange={e => setBillingAddress(p => ({ ...p, houseNumber: e.target.value }))} /></div>
                                <div><label className={labelCls}>{text.bus}</label><input className={inputCls} value={billingAddress.busNumber} onChange={e => setBillingAddress(p => ({ ...p, busNumber: e.target.value }))} /></div>
                              </div>
                              <div><label className={labelCls}>{text.postalCode} *</label><input className={inputCls} value={billingAddress.postalCode} onChange={e => setBillingAddress(p => ({ ...p, postalCode: e.target.value }))} /></div>
                              <div><label className={labelCls}>{text.city} *</label><input ref={billingCityRef} className={inputCls} value={billingAddress.city} onChange={e => setBillingAddress(p => ({ ...p, city: e.target.value }))} /></div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <hr className="border-slate-100" />

                      {/* Connection Details (Existing Step 2 logic) */}
                      <div>
                        <label className={labelCls}>{text.customerType}</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setCustomerType('NEW')} className={`p-5 rounded-2xl border-2 text-left transition-all ${customerType === 'NEW' ? 'bg-[#FFC421] border-[#FFC421] text-white shadow-lg' : 'bg-white border-slate-200 hover:border-[#FFC421]/50'}`}>
                            <div className={`font-bold ${customerType === 'NEW' ? 'text-white' : 'text-slate-600'}`}>{text.newCustomer}</div>
                          </button>
                          <button onClick={() => setCustomerType('EXISTING')} className={`p-5 rounded-2xl border-2 text-left transition-all ${customerType === 'EXISTING' ? 'bg-[#FFC421] border-[#FFC421] text-white shadow-lg' : 'bg-white border-slate-200 hover:border-[#FFC421]/50'}`}>
                            <div className={`font-bold ${customerType === 'EXISTING' ? 'text-white' : 'text-slate-600'}`}>{text.existingCustomer}</div>
                          </button>
                        </div>
                      </div>

                      {customerType === 'EXISTING' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                          <label className={labelCls}>{text.takeoverLabel}</label>
                          <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setTakeoverRequired(true)} className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${takeoverRequired === true ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200'}`}>{text.yes}</button>
                            <button onClick={() => setTakeoverRequired(false)} className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${takeoverRequired === false ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200'}`}>{text.no}</button>
                          </div>
                          {takeoverRequired && <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700 font-medium">{text.takeoverWarning}</div>}
                        </motion.div>
                      )}

                      <div>
                        <label className={labelCls}>{text.networkStatus}</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => { setNetworkStatus('CATSAP1'); setNeonAgreed(null); }} className={`p-5 rounded-2xl border-2 text-left transition-all ${networkStatus === 'CATSAP1' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-white border-slate-200'}`}>
                            <div className={`font-bold text-sm ${networkStatus === 'CATSAP1' ? 'text-white' : 'text-slate-600'}`}>{text.connected}</div>
                          </button>
                          <button onClick={() => setNetworkStatus('CATSAP3')} className={`p-5 rounded-2xl border-2 text-left transition-all ${networkStatus === 'CATSAP3' ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white border-slate-200'}`}>
                            <div className={`font-bold text-sm ${networkStatus === 'CATSAP3' ? 'text-white' : 'text-slate-600'}`}>{text.notConnected}</div>
                          </button>
                        </div>
                      </div>

                      {networkStatus === 'CATSAP3' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-orange-50 border border-orange-200 rounded-3xl p-6 space-y-4">
                          <h3 className="font-black text-orange-800">{text.neonWarningTitle}</h3>
                          <p className="text-sm text-orange-700">{text.neonWarningDesc}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setNeonAgreed(true)} className={`p-3 rounded-xl text-sm font-bold transition-all ${neonAgreed === true ? 'bg-emerald-500 text-white' : 'bg-white border border-orange-200 text-orange-700'}`}>{text.neonAgree}</button>
                            <button onClick={() => setNeonAgreed(false)} className={`p-3 rounded-xl text-sm font-bold transition-all ${neonAgreed === false ? 'bg-rose-500 text-white' : 'bg-white border border-orange-200 text-orange-700'}`}>{text.neonDisagree}</button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Product */}
              {currentStep === 3 && (
                <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
                    <StepHeader title={text.step3Title} />
                    <div className="space-y-6">
                      <div>
                        <label className={labelCls}>{text.productTypeLabel}</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button onClick={() => setProductType('KLIK')} className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${productType === 'KLIK' ? 'bg-[#FFC421] border-[#FFC421] shadow-lg shadow-[#FFC421]/20' : 'bg-white border-slate-200 hover:border-[#FFC421]/50'}`}>
                            <div className={`text-2xl font-black mb-1 ${productType === 'KLIK' ? 'text-white' : 'text-slate-600'}`}>KLIK</div>
                            <div className={`text-sm font-medium ${productType === 'KLIK' ? 'text-white/80' : 'text-slate-500'}`}>{text.klikDesc}</div>
                            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transform translate-x-8 -translate-y-8 transition-transform group-hover:scale-150 ${productType === 'KLIK' ? 'bg-white/10' : 'bg-[#FFC421]/10'}`}></div>
                          </button>
                          <button onClick={() => setProductType('STANDALONE_BFN')} className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${productType === 'STANDALONE_BFN' ? 'bg-[#FFC421] border-[#FFC421] shadow-lg shadow-[#FFC421]/20' : 'bg-white border-slate-200 hover:border-[#FFC421]/50'}`}>
                            <div className={`text-2xl font-black mb-1 ${productType === 'STANDALONE_BFN' ? 'text-white' : 'text-slate-600'}`}>BFN</div>
                            <div className={`text-sm font-medium ${productType === 'STANDALONE_BFN' ? 'text-white/80' : 'text-slate-500'}`}>{text.bfnDesc}</div>
                          </button>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {productType === 'STANDALONE_BFN' && (
                          <motion.div key="bfn" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                            <label className={labelCls}>{text.bfnTypeLabel}</label>
                            <div className="grid grid-cols-2 gap-4">
                              {[{ key: 'BFN_500', label: 'BFN 500', speed: '500 Mbps ↓ / 30 Mbps ↑', price: 65 }, { key: 'BFN_150', label: 'BFN S', speed: '150 Mbps ↓ / 15 Mbps ↑', price: 39 }].map(opt => (
                                <button key={opt.key} onClick={() => setBfnType(opt.key as any)} className={`p-5 rounded-2xl border-2 text-left transition-all ${bfnType === opt.key ? 'bg-[#FFC421] border-[#FFC421] text-white shadow-lg' : 'bg-white border-slate-200 hover:border-[#FFC421]/50'}`}>
                                  <div className={`font-black text-lg ${bfnType === opt.key ? 'text-white' : 'text-slate-600'}`}>{opt.label}</div>
                                  <div className={`text-xs mt-1 ${bfnType === opt.key ? 'text-white/70' : 'text-slate-400'}`}>{opt.speed}</div>
                                  <div className={`text-lg font-black mt-2 ${bfnType === opt.key ? 'text-white' : 'text-[#FFC421]'}`}>€{opt.price}/m</div>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                        {productType === 'KLIK' && (
                          <motion.div key="klik" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-6">
                            <div>
                              <label className={labelCls}>{text.klikTypeLabel}</label>
                              <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => { setKlikType('LIMITED'); setSimCount(Math.min(simCount, 10)); }} className={`p-4 rounded-2xl border-2 font-bold transition-all ${klikType === 'LIMITED' ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>Limited</button>
                                <button onClick={() => { setKlikType('UNLIMITED'); setSimCount(Math.min(simCount, 5)); }} className={`p-4 rounded-2xl border-2 font-bold transition-all ${klikType === 'UNLIMITED' ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>Unlimited</button>
                              </div>
                            </div>
                            <div>
                              <label className={labelCls}>{text.simCountLabel}: {simCount}</label>
                              <LiquidGlassSlider min={1} max={klikType === 'LIMITED' ? 10 : 5} value={simCount} onChange={(val) => setSimCount(val)} color="#FFC421" className="w-full py-6" />
                              <div className="mt-4 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <div className="flex justify-between items-center">
                                  <div><span className="text-sm text-slate-400">{text.data}</span><p className="text-xl font-black text-slate-600">{getKlikPricing().gb}</p></div>
                                  <div className="text-right"><span className="text-sm text-slate-400">{text.price}</span><p className="text-xl font-black text-[#FFC421]">€{getKlikPricing().price}/m</p></div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Mobile Numbers */}
              {currentStep === 4 && (
                <motion.div key="step4" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
                    <StepHeader title={text.step4Title} />
                    {productType === 'KLIK' ? (
                      <div className="space-y-6">
                        {Array.from({ length: simCount }, (_, i) => i + 1).map(idx => {
                          const s = simData[idx] || { transferType: '', simType: '', currentProvider: '', subscriptionType: '', customerProfile: '' };
                          return (
                            <div key={idx} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                              <h3 className="font-black text-slate-600">SIM {idx}</h3>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={labelCls}>{text.transferType}</label>
                                  <div className="flex gap-2">
                                    {['NEW', 'PORT'].map(tt => (<button key={tt} onClick={() => updateSim(idx, 'transferType', tt)} className={`flex-1 p-3 rounded-xl text-sm font-bold transition-all ${s.transferType === tt ? 'bg-[#FFC421] text-white' : 'bg-white border border-slate-200'}`}>{tt === 'NEW' ? text.newSim : text.portSim}</button>))}
                                  </div>
                                </div>
                                <div>
                                  <label className={labelCls}>{text.simType}</label>
                                  <div className="flex gap-2">
                                    {['ESIM', 'PHYSICAL'].map(tt => (<button key={tt} onClick={() => updateSim(idx, 'simType', tt)} className={`flex-1 p-3 rounded-xl text-sm font-bold transition-all ${s.simType === tt ? 'bg-[#FFC421] text-white' : 'bg-white border border-slate-200'}`}>{tt === 'ESIM' ? text.esim : text.physical}</button>))}
                                  </div>
                                </div>
                              </div>
                              {s.transferType === 'PORT' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div><label className={labelCls}>{text.provider}</label>
                                    <select className={inputCls} value={s.currentProvider} onChange={e => updateSim(idx, 'currentProvider', e.target.value)}>
                                      <option value="">{text.choose}</option>
                                      {['PROXIMUS', 'ORANGE', 'BASE', 'ANDERE'].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                  </div>
                                  <div><label className={labelCls}>{text.subscription}</label>
                                    <select className={inputCls} value={s.subscriptionType} onChange={e => updateSim(idx, 'subscriptionType', e.target.value)}>
                                      <option value="">{text.choose}</option>
                                      {['ABONNEMENT', 'HERLAADKAART'].map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                  </div>
                                  <div><label className={labelCls}>{text.profile}</label>
                                    <select className={inputCls} value={s.customerProfile} onChange={e => updateSim(idx, 'customerProfile', e.target.value)}>
                                      <option value="">{text.choose}</option>
                                      {['PARTICULIER', 'ZAKELIJK'].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        <p className="font-bold text-lg">{text.noMobileNeeded}</p>
                        <p className="text-sm mt-2">{text.goNext}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 5: Photos / Submit */}
              {currentStep === 5 && (
                <motion.div key="step5" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
                    <StepHeader title={text.step5Title} />
                    {networkStatus === 'CATSAP3' ? (
                      <div className="space-y-5">
                        <p className="text-sm text-slate-500 font-medium">{text.uploadPhotos}</p>
                        {[{ key: 'tap' as const, label: text.tapLabel }, { key: 'gevel' as const, label: text.facadeLabel }, { key: 'tech' as const, label: text.techLabel }].map(item => (
                          <div key={item.key} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                            <label className={labelCls}>{item.label} *</label>
                            <input type="file" accept="image/*" capture="environment" onChange={e => setPhotos(p => ({ ...p, [item.key]: e.target.files?.[0] || null }))} className="text-sm text-slate-600" />
                            {photos[item.key] && <p className="text-xs text-emerald-600 mt-2 font-bold">✓ {photos[item.key]!.name}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <p className="font-bold text-slate-600 text-lg">{text.noDocsNeeded}</p>
                        <p className="text-sm text-slate-400 mt-2">{text.alreadyConnected}</p>
                      </div>
                    )}
                    <button onClick={handleFinalSubmit} disabled={isSubmitting} className="w-full mt-8 py-4 rounded-2xl bg-[#FFC421] hover:bg-[#E5B01E] text-white font-black text-lg transition-all disabled:opacity-50 shadow-lg shadow-[#FFC421]/20">
                      {isSubmitting ? text.submitting : text.sendCoach}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="w-full relative flex items-center justify-center mt-8">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div key={`nav-${currentStep}`} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="relative w-full max-w-3xl mx-auto px-0 sm:px-6 z-50">
                <div className="bg-white/80 backdrop-blur-xl border border-white shadow-sm p-4 sm:p-6 rounded-[2rem] flex justify-between items-center">
                  <button onClick={prevStep} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:bg-slate-100'}`}><ChevronLeft className="w-5 h-5" /><span className="hidden sm:inline">{text.back}</span></button>
                  <div className="flex gap-2 sm:gap-3">{[...Array(totalSteps)].map((_, i) => (<div key={i} className={`h-2.5 rounded-full transition-all duration-300 ${currentStep === i + 1 ? 'bg-[#FFC421] w-8' : 'bg-slate-200 w-2.5'}`} />))}</div>
                  {currentStep < totalSteps ? (
                    <button onClick={nextStep} className="flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all text-white bg-[#FFC421] hover:bg-[#E5B01E]"><span>{text.next}</span></button>
                  ) : (
                    <div className="w-24" />
                  )}
                </div>
              </motion.div>
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
