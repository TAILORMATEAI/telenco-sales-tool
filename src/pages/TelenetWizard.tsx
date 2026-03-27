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
          {options.find((o: any) => o.value === value)?.img && <img src={options.find((o: any) => o.value === value)?.img} className="w-5 h-5 rounded-full object-cover shadow-sm" alt="flag" />}
          <span className="font-bold inline-block min-w-[30px]">{options.find((o: any) => o.value === value)?.label || ''}</span>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 bottom-full left-0 mb-2 w-max min-w-[120px] bg-white border border-slate-200 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden max-h-60 overflow-y-auto">
            {options.map((o: any) => (
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

const CustomDatePicker = ({ value, onChange, minDate }: { value: string; onChange: (val: string) => void; minDate?: string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(value ? value.split('-').reverse().join('/') : '');

  const current = value ? new Date(value) : null;
  const minDateObj = minDate ? new Date(minDate) : null;
  const [month, setMonth] = useState((current || new Date()).getMonth());
  const [year, setYear] = useState((current || new Date()).getFullYear());

  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setMonth(parseInt(parts[1]) - 1);
        setYear(parseInt(parts[0]));
        const newVal = `${parts[2]}/${parts[1]}/${parts[0]}`;
        if (inputValue !== newVal) setInputValue(newVal);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClick = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on blur (Tab / Shift+Tab navigation)
  const handleBlur = () => {
    requestAnimationFrame(() => {
      if (ref.current && !ref.current.contains(document.activeElement)) setOpen(false);
    });
  };

  const handleInputChange = (e: any) => {
    let val = e.target.value.replace(/[^0-9/]/g, '');
    if (val.length === 2 && !val.includes('/')) val += '/';
    if (val.length === 5 && val.split('/').length === 2) val += '/';
    if (val.length > 10) val = val.substring(0, 10);
    setInputValue(val);

    const parts = val.split('/');
    if (parts.length >= 2 && parts[1].length === 2) {
      const m = parseInt(parts[1]);
      if (m > 0 && m <= 12) setMonth(m - 1);
    }
    if (parts.length === 3 && parts[2].length === 4) {
      const y = parseInt(parts[2]);
      if (y > 1900) setYear(y);
    }

    if (val.length === 10) {
      if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        if (d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1900) {
          onChange(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        } else {
          onChange('');
        }
      } else {
        onChange('');
      }
    } else {
      onChange('');
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
    <div ref={ref} className="relative w-full" onBlur={handleBlur}>
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 bottom-full left-0 mb-2 w-full min-w-[300px] bg-white border border-slate-200 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-4">
            <div className="flex justify-between items-center mb-4">
              <button type="button" tabIndex={-1} onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
              <div className="flex gap-2 text-sm">
                <select value={month} tabIndex={-1} onChange={e => setMonth(parseInt(e.target.value))} className="font-bold text-slate-600 bg-transparent outline-none cursor-pointer appearance-none text-center hover:text-[#FFC421] transition-colors">
                  {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select value={year} tabIndex={-1} onChange={e => setYear(parseInt(e.target.value))} className="font-bold text-slate-600 bg-transparent outline-none cursor-pointer appearance-none text-center hover:text-[#FFC421] transition-colors">
                  {Array.from({ length: 100 }).map((_, i) => <option key={i} value={new Date().getFullYear() - i + 10}>{new Date().getFullYear() - i + 10}</option>)}
                </select>
              </div>
              <button type="button" tabIndex={-1} onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(d => <div key={d} className="text-[10px] font-black uppercase text-slate-400">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const isSelected = current && current.getDate() === d && current.getMonth() === month && current.getFullYear() === year;
                const dayDate = new Date(year, month, d);
                const isDisabled = minDateObj ? dayDate < new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate()) : false;
                return (
                  <button
                    key={d}
                    type="button"
                    tabIndex={-1}
                    disabled={isDisabled}
                    onClick={() => !isDisabled && handleDayClick(d)}
                    className={`h-9 rounded-lg text-sm font-bold transition-all ${isDisabled ? 'text-slate-200 cursor-not-allowed' : isSelected ? 'bg-[#FFC421] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
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
  const totalSteps = 6;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Step 1: Customer Data
  const [customerData, setCustomerData] = useState({
    companyName: '', vatNumber: 'BE', vatPending: false, firstName: '', lastName: '',
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
  // Step 3: Product & Aansluiting
  const [productChoice, setProductChoice] = useState<'KLIK_UPGRADE' | 'KLIK_NEW' | 'APART' | null>(null);
  // KLIK UPGRADE sub-states
  const [upgradeSystem, setUpgradeSystem] = useState<'CAFE' | 'ORIGIN' | null>(null);
  const [upgradeCustomerNumber, setUpgradeCustomerNumber] = useState('');
  const [upgradeSegment, setUpgradeSegment] = useState<'RESIDENTIAL' | 'BUSINESS' | null>(null);
  const [upgradeSameOwner, setUpgradeSameOwner] = useState<boolean | null>(null);
  // Catsap sub-states (used by KLIK NEW + APART/BFN)
  const [catsapStatus, setCatsapStatus] = useState<'CATSAP1' | 'CATSAP2' | 'CATSAP3' | 'UNKNOWN' | 'OTHER' | null>(null);
  const [catsapConfirmed, setCatsapConfirmed] = useState<boolean | null>(null);
  const [catsapOverride, setCatsapOverride] = useState<'CATSAP1' | 'CATSAP2' | 'CATSAP3' | 'UNKNOWN' | null>(null);
  const [catsap3Type, setCatsap3Type] = useState<'KA' | 'CONNECTIVITY' | null>(null);
  const [kaDate, setKaDate] = useState('');
  const [otherCatsapNote, setOtherCatsapNote] = useState('');
  // ALLES APART sub-states
  const [apartChoice, setApartChoice] = useState<'BFN_500' | 'BFN_150' | 'MOBILE' | null>(null);

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
  const typedStreetRef = useRef('');
  const typedBillingStreetRef = useRef('');

  const t: Record<string, any> = {
    NL: {
      backToHome: 'Terug naar overzicht', back: 'Vorige', next: 'Volgende', submit: 'Verzenden',
      step1Title: 'Klantgegevens', step2Title: 'Adres', step3Title: 'Product & Aansluiting',
      step4Title: 'KLIK Details', step5Title: 'Mobiele Nummers', step6Title: 'Documentatie',
      companyName: 'Bedrijfsnaam', vatNumber: 'BTW Nummer', firstName: 'Voornaam', lastName: 'Achternaam',
      birthDate: 'Geboortedatum', langLabel: 'Taal Klant', phone: 'Contactnummer',
      email: 'E-mailadres', billingEmailToggle: 'Zelfde facturatie e-mail?', billingEmail: 'Facturatie E-mail',
      connectionAddress: 'Aansluitingsadres', billingAddress: 'Facturatieadres',
      street: 'Straat', houseNr: 'Huis Nr', bus: 'Bus', postalCode: 'Postcode', city: 'Gemeente',
      addressHint: 'Tip: Typ "5A" voor een huisnummer-toevoeging. Voor een busnummer gebruik je "5/A", "5/1" of "5/001".',
      sameAddress: 'Is aansluitingsadres gelijk aan facturatieadres?',
      jaSimple: 'Ja', neeSimple: 'Nee',
      inAanvraag: 'In aanvraag',
      // Step 3: Product & Aansluiting
      productTypeLabel: 'Type Product',
      klikUpgrade: 'KLIK Upgrade', klikUpgradeDesc: 'Bestaand Telenet internet upgraden naar KLIK bundel',
      klikNew: 'KLIK New', klikNewDesc: 'Nieuwe KLIK aansluiting aanvragen',
      apartLabel: 'Alles Apart', apartDesc: 'BFN en/of Mobiel los afnemen',
      // KLIK UPGRADE
      upgradeSystemLabel: 'Staat het huidige Telenet-internet momenteel in C@fe of Origin?',
      cafe: 'C@fe', origin: 'Origin',
      cafeNumber: 'Huidig C@fe klantennummer', originNumber: 'Huidig Origin klantennummer',
      upgradeSegmentLabel: 'Staat het huidige Telenet-internet momenteel residentieel of business?',
      residential: 'Residentieel', business: 'Business',
      residentialOwnerQ: 'Staan deze residentiële producten op de privé naam van de zaakvoerder van het bedrijf dat dit KLIK abonnement aanvraagt?',
      businessOwnerQ: 'Staan deze producten actief op hetzelfde bedrijf dat dit KLIK abonnement aanvraagt?',
      takeoverWarning: '⚠️ Opgelet: je hebt een overnamedocument nodig dat moet ondertekend worden door beide partijen!',
      // CATSAP
      catsapLabel: 'Wat is volgens C@fe de Catsap Status op dit adres?',
      catsap1: 'Catsap 1', catsap1Desc: 'Aangesloten op ons netwerk, actieve klant',
      catsap2: 'Catsap 2', catsap2Desc: 'Aangesloten op ons netwerk, geen actieve klant',
      catsap3: 'Catsap 3', catsap3Desc: 'Niet aangesloten op ons netwerk',
      catsapUnknown: 'Onbekend', catsapUnknownDesc: 'Connectivity Check aanvragen',
      catsapOther: 'Andere', catsapOtherPlaceholder: 'Noteer de catsap status...',
      catsap1Info: 'Kijk na of de klant effectief actieve producten heeft bij ons. Kijk na of er binnen een coax-aansluiting is daar waar er één zou moeten zijn.',
      catsap2Info: 'Vraag na of er geen (renovatie)werken gebeurd zijn en of de kabel die geconnecteerd is/was met ons netwerk er nog steeds ligt. Kijk na of er binnen een coax-aansluiting is daar waar er één zou moeten zijn.',
      catsapConfirmLabel: 'Ben je ervan overtuigd dat deze status correct is?',
      catsapOverrideLabel: 'Wat is volgens jou de Catsap Status op dit adres?',
      // CATSAP 3
      catsap3TypeLabel: 'Type installatie',
      ka: 'KA', kaDesc: 'Klant legt zelf de kabel aan', kaFotoInfo: 'Foto van TAP + GEVEL verplicht',
      kaDateLabel: 'Klant legt de kabel ZELF aan voor deze datum:',
      connectivity: 'Connectivity', connectivityDesc: 'Connectivity Check aanvragen', connectivityFotoInfo: 'Foto technische ruimte + TAP verplicht',
      neonInfoTitle: 'NEON Installatie Info',
      neonInfoText: 'NEON is een installatietype om nieuwe businessklanten op ons netwerk aan te sluiten, end-to-end en volledig gratis, op voorwaarde dat de afstand tussen het dichtstbijzijnde aftakpunt (tap) en de klant (technische ruimte) max 80m bedraagt en alle werken mogelijk zijn.',
      neonHighlight: 'Indien de Connectivity Check positief is en de NEON een "GO" krijgt: 12 tot 20 weken (3 à 5 maand)',
      // ALLES APART
      apartChoiceLabel: 'Wat wil de klant?',
      bfn500: 'BFN 500', bfn500Desc: '500/30 Mbps', bfn500Price: '€65/m',
      bfnS: 'BFN S', bfnSDesc: '150/15 Mbps', bfnSPrice: '€39/m',
      mobile: 'Mobiel', mobileDesc: 'Mobiele plannen overlopen',
      // KLIK Details (step 4)
      klikTypeLabel: 'Type KLIK bundel', simCountLabel: 'Aantal SIM-kaarten',
      // SIM
      transferType: 'Transfer Type', simType: 'SIM Type', newSim: 'Nieuw', portSim: 'Porteren',
      esim: 'eSIM', physical: 'Fysiek', provider: 'Provider', subscription: 'Abonnement', profile: 'Profiel',
      choose: 'Kies...', data: 'Data', price: 'Prijs',
      noMobileNeeded: 'Geen mobiele nummers nodig voor BFN.', goNext: 'Ga door naar de volgende stap.',
      // Docs
      uploadPhotos: 'Upload de verplichte foto\'s:', tapLabel: 'TAP Rooilijn', facadeLabel: 'Gevel', techLabel: 'Technische Ruimte',
      noDocsNeeded: 'Geen extra documenten nodig', alreadyConnected: 'Klant is reeds aangesloten. Klik op verzenden.',
      submitting: 'Verzenden...', sendCoach: '📧 Verzenden naar Coach',
      fillAll: 'Vul alle verplichte velden in.'
    },
    FR: {
      backToHome: 'Retour', back: 'Précédent', next: 'Suivant', submit: 'Envoyer',
      step1Title: 'Données Client', step2Title: 'Adresse', step3Title: 'Produit & Connexion',
      step4Title: 'Détails KLIK', step5Title: 'Numéros Mobiles', step6Title: 'Documentation',
      companyName: 'Nom de l\'entreprise', vatNumber: 'Numéro TVA', firstName: 'Prénom', lastName: 'Nom',
      birthDate: 'Date de naissance', langLabel: 'Langue Client', phone: 'Numéro de contact',
      email: 'Adresse e-mail', billingEmailToggle: 'Même e-mail de facturation ?', billingEmail: 'E-mail de facturation',
      connectionAddress: 'Adresse de connexion', billingAddress: 'Adresse de facturation',
      street: 'Rue', houseNr: 'N°', bus: 'Boîte', postalCode: 'Code postal', city: 'Commune',
      addressHint: 'Astuce : Tapez "5A" pour une extension. Pour une boîte, utilisez "5/A", "5/1" ou "5/001".',
      sameAddress: 'L\'adresse de connexion est-elle identique à l\'adresse de facturation ?',
      jaSimple: 'Oui', neeSimple: 'Non',
      inAanvraag: 'En demande',
      productTypeLabel: 'Type de Produit',
      klikUpgrade: 'KLIK Upgrade', klikUpgradeDesc: 'Mettre à niveau l\'internet Telenet existant vers un forfait KLIK',
      klikNew: 'KLIK New', klikNewDesc: 'Demander une nouvelle connexion KLIK',
      apartLabel: 'Tout Séparément', apartDesc: 'BFN et/ou Mobile séparément',
      upgradeSystemLabel: 'L\'internet Telenet actuel est-il dans C@fe ou Origin ?',
      cafe: 'C@fe', origin: 'Origin',
      cafeNumber: 'Numéro client C@fe actuel', originNumber: 'Numéro client Origin actuel',
      upgradeSegmentLabel: 'L\'internet Telenet actuel est-il résidentiel ou business ?',
      residential: 'Résidentiel', business: 'Business',
      residentialOwnerQ: 'Ces produits résidentiels sont-ils au nom privé du gérant de l\'entreprise qui demande cet abonnement KLIK ?',
      businessOwnerQ: 'Ces produits sont-ils actifs sur la même entreprise qui demande cet abonnement KLIK ?',
      takeoverWarning: '⚠️ Attention : vous avez besoin d\'un document de reprise signé par les deux parties !',
      catsapLabel: 'Quel est le statut Catsap selon C@fe pour cette adresse ?',
      catsap1: 'Catsap 1', catsap1Desc: 'Connecté à notre réseau, client actif',
      catsap2: 'Catsap 2', catsap2Desc: 'Connecté à notre réseau, pas de client actif',
      catsap3: 'Catsap 3', catsap3Desc: 'Non connecté à notre réseau',
      catsapUnknown: 'Inconnu', catsapUnknownDesc: 'Demander un Connectivity Check',
      catsapOther: 'Autre', catsapOtherPlaceholder: 'Notez le statut catsap...',
      catsap1Info: 'Vérifiez si le client a effectivement des produits actifs chez nous. Vérifiez s\'il y a une prise coax à l\'intérieur.',
      catsap2Info: 'Demandez s\'il n\'y a pas eu de travaux de rénovation et si le câble connecté à notre réseau est toujours en place. Vérifiez la prise coax.',
      catsapConfirmLabel: 'Êtes-vous convaincu que ce statut est correct ?',
      catsapOverrideLabel: 'Quel est selon vous le statut Catsap pour cette adresse ?',
      catsap3TypeLabel: 'Type d\'installation',
      ka: 'KA', kaDesc: 'Le client pose le câble lui-même', kaFotoInfo: 'Photo TAP + FAÇADE obligatoire',
      kaDateLabel: 'Le client pose le câble lui-même avant cette date :',
      connectivity: 'Connectivity', connectivityDesc: 'Demander un Connectivity Check', connectivityFotoInfo: 'Photo local technique + TAP obligatoire',
      neonInfoTitle: 'Info Installation NEON',
      neonInfoText: 'NEON est un type d\'installation pour connecter de nouveaux clients business à notre réseau, de bout en bout et entièrement gratuit, à condition que la distance entre le point de raccordement (tap) et le client (local technique) soit de max 80m.',
      neonHighlight: 'Si le Connectivity Check est positif et le NEON obtient un "GO" : 12 à 20 semaines (3 à 5 mois)',
      apartChoiceLabel: 'Que souhaite le client ?',
      bfn500: 'BFN 500', bfn500Desc: '500/30 Mbps', bfn500Price: '€65/m',
      bfnS: 'BFN S', bfnSDesc: '150/15 Mbps', bfnSPrice: '€39/m',
      mobile: 'Mobile', mobileDesc: 'Consulter les forfaits mobiles',
      klikTypeLabel: 'Type de forfait KLIK', simCountLabel: 'Nombre de cartes SIM',
      transferType: 'Type de transfert', simType: 'Type SIM', newSim: 'Nouveau', portSim: 'Portabilité',
      esim: 'eSIM', physical: 'Physique', provider: 'Opérateur', subscription: 'Abonnement', profile: 'Profil',
      choose: 'Choisir...', data: 'Données', price: 'Prix',
      noMobileNeeded: 'Pas de numéros mobiles nécessaires pour BFN.', goNext: 'Passez à l\'étape suivante.',
      uploadPhotos: 'Téléchargez les photos obligatoires :', tapLabel: 'TAP Limite', facadeLabel: 'Façade', techLabel: 'Local Technique',
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
      ac.addListener('place_changed', () => handlePlace(ac, setConnectionAddress, false));
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
      ac3.addListener('place_changed', () => handlePlace(ac3, setBillingAddress, true));
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

  const handlePlace = (ac: any, setter: React.Dispatch<React.SetStateAction<any>>, isBilling: boolean = false) => {
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

    const rawTyped = isBilling ? typedBillingStreetRef.current : typedStreetRef.current;
    let cleanPlaceName = (place.name || '') + ' ' + rawTyped;

    const busRegex = /(?:bus|box|busnummer|b\.)\s*([a-zA-Z0-9]+)\b/i;
    const busRegex2 = /\b[bB]\s*(\d+[a-zA-Z]*)\b/;
    const busRegex3 = /\/\s*([a-zA-Z0-9]+)\b/;

    // Always check for explicit bus indicators to override Google's potentially bad subpremise
    if (cleanPlaceName) {
      const busMatch = cleanPlaceName.match(busRegex) || cleanPlaceName.match(busRegex2) || cleanPlaceName.match(busRegex3);
      if (busMatch) {
        bus = busMatch[1];
        cleanPlaceName = cleanPlaceName.replace(busMatch[0], '').trim();
      } else if (bus && !cleanPlaceName.toLowerCase().includes(bus.toLowerCase())) {
        // Drop Google's hallucinated bus numbers (like '005') if they literally aren't in the typed string
        bus = '';
      }
    }

    if (cleanPlaceName) {
      if (number) {
        const regex = new RegExp(`(?:^|\\s)(${number}(?:[a-zA-Z]+|\\s+(?:[a-zA-Z]|bis|ter)\\b)?)`, 'ig');
        const matches = [...cleanPlaceName.matchAll(regex)];
        if (matches.length > 0) {
          const bestMatch = matches.reduce((longest, current) => current[1].length > longest[1].length ? current : longest);
          number = bestMatch[1].trim();
        }
      } else {
        const regex = new RegExp(`(\\d+(?:[a-zA-Z]+|\\s+(?:[a-zA-Z]|bis|ter)\\b)?)`, 'ig');
        const matches = [...cleanPlaceName.matchAll(regex)];
        if (matches.length > 0) {
          const bestMatch = matches.reduce((longest, current) => current[1].length > longest[1].length ? current : longest);
          number = bestMatch[1].trim();
        }
      }
    }

    if (number) {
      number = number.replace(/\s*(?:bus|box|b\.).*$/i, '').replace(/\s*\/.*$/, '').trim();
      if (street) {
        number = number.replace(new RegExp(street, 'i'), '').trim();
      }
      // Final brute-force safety: remove any trailing word that is >= 4 characters long (keeps 'bis'/'ter' safe)
      number = number.replace(/\s+[a-zA-Z]{4,}$/, '').trim();
    }

    setter(prev => ({
      ...prev,
      street: street || '',
      houseNumber: number || '',
      busNumber: bus || '',
      postalCode: postal || '',
      city: city || ''
    }));
  };

  const formatVatNumber = (val: string) => {
    // Keep 'BE', then only allow digits
    let digits = val.replace(/^BE/i, '').replace(/\D/g, '');
    if (digits.length > 10) digits = digits.substring(0, 10);
    return 'BE' + digits;
  };

  const isVatValid = customerData.vatPending || (customerData.vatNumber.length === 12 && customerData.vatNumber.startsWith('BE'));
  const isPhoneValid = customerData.phoneCountry === '+32' ? customerData.phone.replace(/\D/g, '').length >= 9 && customerData.phone.replace(/\D/g, '').length <= 10 : customerData.phone.length > 5;

  // Helper: get today's date as YYYY-MM-DD for min date
  const todayStr = new Date().toISOString().split('T')[0];

  // Reusable Catsap Flow
  const renderCatsapFlow = () => {
    const effectiveCatsap = catsapConfirmed === false ? catsapOverride : catsapStatus;

    const renderCatsap3Options = (status: string | null) => {
      if (status !== 'CATSAP3') return null;
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <label className={labelCls}>{text.catsap3TypeLabel}</label>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setCatsap3Type('KA')} className={`p-4 rounded-2xl border-2 text-left transition-all ${catsap3Type === 'KA' ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>
              <div className={`font-bold ${catsap3Type === 'KA' ? 'text-white' : 'text-slate-600'}`}>{text.ka}</div>
              <div className={`text-xs mt-1 ${catsap3Type === 'KA' ? 'text-white/70' : 'text-slate-400'}`}>{text.kaDesc}</div>
              <div className={`text-[10px] mt-1 font-semibold ${catsap3Type === 'KA' ? 'text-white/60' : 'text-orange-500'}`}>{text.kaFotoInfo}</div>
            </button>
            <button onClick={() => setCatsap3Type('CONNECTIVITY')} className={`p-4 rounded-2xl border-2 text-left transition-all ${catsap3Type === 'CONNECTIVITY' ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>
              <div className={`font-bold ${catsap3Type === 'CONNECTIVITY' ? 'text-white' : 'text-slate-600'}`}>{text.connectivity}</div>
              <div className={`text-xs mt-1 ${catsap3Type === 'CONNECTIVITY' ? 'text-white/70' : 'text-slate-400'}`}>{text.connectivityDesc}</div>
              <div className={`text-[10px] mt-1 font-semibold ${catsap3Type === 'CONNECTIVITY' ? 'text-white/60' : 'text-orange-500'}`}>{text.connectivityFotoInfo}</div>
            </button>
          </div>
          {catsap3Type === 'KA' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <label className={labelCls}>{text.kaDateLabel}</label>
              <CustomDatePicker value={kaDate} onChange={(val: string) => setKaDate(val)} minDate={todayStr} />
            </motion.div>
          )}
        </motion.div>
      );
    };

    const renderNeonInfo = (status: string | null) => {
      if (status !== 'CATSAP3' && status !== 'UNKNOWN') return null;
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3 shadow-sm">
          <h3 className="font-black text-orange-600">{text.neonInfoTitle}</h3>
          <p className="text-sm text-orange-600/80">{text.neonInfoText}</p>
          <p className="text-sm font-bold text-orange-700 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">{text.neonHighlight}</p>
        </motion.div>
      );
    };

    return (
      <>
        {/* Catsap Status Selection */}
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
          <label className={labelCls}>{text.catsapLabel}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              { key: 'CATSAP1' as const, label: text.catsap1, desc: text.catsap1Desc, active: 'bg-emerald-500 border-emerald-500 text-white' },
              { key: 'CATSAP2' as const, label: text.catsap2, desc: text.catsap2Desc, active: 'bg-sky-500 border-sky-500 text-white' },
              { key: 'CATSAP3' as const, label: text.catsap3, desc: text.catsap3Desc, active: 'bg-orange-500 border-orange-500 text-white' },
              { key: 'UNKNOWN' as const, label: text.catsapUnknown, desc: text.catsapUnknownDesc, active: 'bg-slate-600 border-slate-600 text-white' },
              { key: 'OTHER' as const, label: text.catsapOther, desc: '', active: 'bg-slate-600 border-slate-600 text-white' },
            ]).map(opt => (
              <button key={opt.key} onClick={() => { setCatsapStatus(opt.key); setCatsapConfirmed(null); setCatsapOverride(null); setCatsap3Type(null); setKaDate(''); setOtherCatsapNote(''); }} className={`p-4 rounded-2xl border-2 text-left transition-all ${catsapStatus === opt.key ? opt.active : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <div className={`font-bold text-sm ${catsapStatus === opt.key ? 'text-white' : 'text-slate-600'}`}>{opt.label}</div>
                {opt.desc && <div className={`text-[10px] mt-1 ${catsapStatus === opt.key ? 'text-white/70' : 'text-slate-400'}`}>{opt.desc}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Other note input */}
        {catsapStatus === 'OTHER' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <label className={labelCls}>{text.catsapOther}</label>
            <textarea className={`${inputCls} min-h-[80px]`} value={otherCatsapNote} onChange={e => setOtherCatsapNote(e.target.value)} placeholder={text.catsapOtherPlaceholder} />
          </motion.div>
        )}

        {/* Info block for Catsap 1 or 2 */}
        {(catsapStatus === 'CATSAP1' || catsapStatus === 'CATSAP2') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-sm text-sky-800 font-medium">
            {catsapStatus === 'CATSAP1' ? text.catsap1Info : text.catsap2Info}
          </motion.div>
        )}

        {/* NEON info for Catsap 3 initial selection */}
        {catsapStatus && catsapStatus !== 'OTHER' && renderNeonInfo(catsapStatus)}

        {/* Catsap 3 options for initial selection */}
        {catsapStatus === 'CATSAP3' && renderCatsap3Options(catsapStatus)}

        {/* Confirmation question — always shown (except OTHER) */}
        {catsapStatus && catsapStatus !== 'OTHER' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
            <label className={labelCls}>{text.catsapConfirmLabel}</label>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setCatsapConfirmed(true); setCatsapOverride(null); }} className={`p-4 rounded-2xl border-2 font-bold transition-all ${catsapConfirmed === true ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200'}`}>{text.jaSimple}</button>
              <button onClick={() => { setCatsapConfirmed(false); setCatsapOverride(null); setCatsap3Type(null); }} className={`p-4 rounded-2xl border-2 font-bold transition-all ${catsapConfirmed === false ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-200'}`}>{text.neeSimple}</button>
            </div>

            {/* Override selection */}
            {catsapConfirmed === false && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-2">
                <label className={labelCls}>{text.catsapOverrideLabel}</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'CATSAP1' as const, label: text.catsap1 },
                    { key: 'CATSAP2' as const, label: text.catsap2 },
                    { key: 'CATSAP3' as const, label: text.catsap3 },
                    { key: 'UNKNOWN' as const, label: text.catsapUnknown },
                  ]).map(opt => (
                    <button key={opt.key} onClick={() => { setCatsapOverride(opt.key); setCatsap3Type(null); setKaDate(''); }} className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${catsapOverride === opt.key ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>{opt.label}</button>
                  ))}
                </div>

                {/* NEON info for override */}
                {catsapOverride && renderNeonInfo(catsapOverride)}

                {/* Catsap 3 options for override */}
                {catsapOverride === 'CATSAP3' && renderCatsap3Options(catsapOverride)}
              </motion.div>
            )}
          </motion.div>
        )}
      </>
    );
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!customerData.companyName || !isVatValid || !customerData.firstName || !customerData.lastName || !customerData.birthDate || !isPhoneValid || !customerData.email) return false;
      if (!customerData.billingEmailSame && !customerData.billingEmail) return false;
    }
    if (currentStep === 2) {
      if (!connectionAddress.street || !connectionAddress.houseNumber || !connectionAddress.postalCode || !connectionAddress.city) return false;
      if (!billingAddressSame && (!billingAddress.street || !billingAddress.houseNumber || !billingAddress.postalCode || !billingAddress.city)) return false;
    }
    if (currentStep === 3) {
      if (!productChoice) return false;
      if (productChoice === 'KLIK_UPGRADE') {
        if (!upgradeSystem || !upgradeCustomerNumber || !upgradeSegment || upgradeSameOwner === null) return false;
      }
      if (productChoice === 'KLIK_NEW') {
        if (!catsapStatus) return false;
        if (catsapStatus === 'OTHER' && !otherCatsapNote) return false;
        if (catsapStatus !== 'OTHER' && catsapConfirmed === null) return false;
        if (catsapConfirmed === false && !catsapOverride) return false;
        const effectiveCatsap = catsapConfirmed === false ? catsapOverride : catsapStatus;
        if (effectiveCatsap === 'CATSAP3' && !catsap3Type) return false;
        if (effectiveCatsap === 'CATSAP3' && catsap3Type === 'KA' && !kaDate) return false;
      }
      if (productChoice === 'APART') {
        if (!apartChoice) return false;
        if (apartChoice !== 'MOBILE') {
          if (!catsapStatus) return false;
          if (catsapStatus === 'OTHER' && !otherCatsapNote) return false;
          if (catsapStatus !== 'OTHER' && catsapConfirmed === null) return false;
          if (catsapConfirmed === false && !catsapOverride) return false;
          const effectiveCatsap = catsapConfirmed === false ? catsapOverride : catsapStatus;
          if (effectiveCatsap === 'CATSAP3' && !catsap3Type) return false;
          if (effectiveCatsap === 'CATSAP3' && catsap3Type === 'KA' && !kaDate) return false;
        }
      }
    }
    if (currentStep === 4) {
      // KLIK details — only shown for KLIK products
      if (productChoice === 'KLIK_UPGRADE' || productChoice === 'KLIK_NEW') {
        // klikType and simCount always have defaults, so valid
      }
    }
    if (currentStep === 5) {
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
    if (currentStep === 6) {
      const effectiveCatsap = catsapConfirmed === false ? catsapOverride : catsapStatus;
      if (effectiveCatsap === 'CATSAP3') {
        if (!photos.tap || !photos.gevel || !photos.tech) return false;
      }
    }
    return true;
  };

  const [isTranslating, setIsTranslating] = useState(false);
  const nextStep = () => {
    if (isTranslating) return;
    if (!validateStep()) return;
    if (currentStep < totalSteps) {
      setIsTranslating(true);
      setDirection(1);
      setCurrentStep(p => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setIsTranslating(false), 800);
    }
  };
  const prevStep = () => {
    if (isTranslating) return;
    if (currentStep > 1) {
      setIsTranslating(true);
      setDirection(-1);
      setCurrentStep(p => p - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      const effectiveCatsap = catsapConfirmed === false ? catsapOverride : catsapStatus;
      let tapUrl = null, gevelUrl = null, techUrl = null;
      if (effectiveCatsap === 'CATSAP3') {
        tapUrl = await uploadPhoto(photos.tap, 'TAP');
        gevelUrl = await uploadPhoto(photos.gevel, 'GEVEL');
        techUrl = await uploadPhoto(photos.tech, 'TECH');
      }
      if (user) {
        await supabase.from('activity_logs').insert({ user_id: user.id, user_email: user.email, action: 'TELENET_WIZARD', energy_type: 'NA', commission_code: customerData.companyName, consumption_mwh: 0 });
      }

      const emailFull = customerData.email;
      const fEmailFull = customerData.billingEmailSame ? emailFull : customerData.billingEmail;

      let body = `Beste Coach,\n\nNieuwe Telenet Business aanvraag:\n\n-- KLANTGEGEVENS --\nBedrijf: ${customerData.companyName}\nBTW: ${customerData.vatPending ? 'In aanvraag' : customerData.vatNumber}\nNaam: ${customerData.firstName} ${customerData.lastName}\nGeboortedatum: ${customerData.birthDate}\nE-mail: ${emailFull}\nFacturatie E-mail: ${fEmailFull}\nTelefoon: ${customerData.phoneCountry} ${customerData.phone}\nTaal: ${customerData.language}\n`;

      body += `\n-- ADRESGEGEVENS --\nAansluitingsadres:\n${connectionAddress.street} ${connectionAddress.houseNumber}${connectionAddress.busNumber ? ' Bus ' + connectionAddress.busNumber : ''}\n${connectionAddress.postalCode} ${connectionAddress.city}\n`;
      if (!billingAddressSame) {
        body += `\nFacturatieadres:\n${billingAddress.street} ${billingAddress.houseNumber}${billingAddress.busNumber ? ' Bus ' + billingAddress.busNumber : ''}\n${billingAddress.postalCode} ${billingAddress.city}\n`;
      } else {
        body += `\nFacturatieadres: Zelfde als Aansluitingsadres\n`;
      }

      // Product & Aansluiting
      body += `\n-- PRODUCT & AANSLUITING --\nProduct: ${productChoice}\n`;
      if (productChoice === 'KLIK_UPGRADE') {
        body += `Systeem: ${upgradeSystem}\nKlantennummer: ${upgradeCustomerNumber}\nSegment: ${upgradeSegment}\nZelfde eigenaar: ${upgradeSameOwner ? 'Ja' : 'Nee'}\n`;
        if (!upgradeSameOwner) body += `⚠️ OVERNAMEDOCUMENT VEREIST\n`;
      }
      if (productChoice === 'KLIK_NEW' || (productChoice === 'APART' && apartChoice !== 'MOBILE')) {
        body += `Catsap Status: ${effectiveCatsap}${catsapConfirmed === false ? ' (override van ' + catsapStatus + ')' : ''}\n`;
        if (effectiveCatsap === 'CATSAP3') {
          body += `Type: ${catsap3Type}\n`;
          if (catsap3Type === 'KA') body += `KA Datum: ${kaDate}\n`;
        }
        if (catsapStatus === 'OTHER') body += `Notitie: ${otherCatsapNote}\n`;
      }
      if (productChoice === 'APART') {
        body += `Apart Product: ${apartChoice}\n`;
      }
      // KLIK details
      if (productChoice === 'KLIK_UPGRADE' || productChoice === 'KLIK_NEW') {
        body += `\n-- KLIK DETAILS --\nKLIK Type: ${klikType}\nAantal SIMs: ${simCount}\n`;
      }
      body += `\n-- MOBIELE NUMMERS --\n`;
      if (productChoice === 'KLIK_UPGRADE' || productChoice === 'KLIK_NEW' || (productChoice === 'APART' && apartChoice === 'MOBILE')) {
        for (let i = 1; i <= simCount; i++) {
          const s = simData[i];
          if (s) body += `\nSIM ${i}:\nTransfer: ${s.transferType}\nSIM Type: ${s.simType}\nProvider: ${s.currentProvider || 'N/A'}\nAbonnement: ${s.subscriptionType || 'N/A'}\nProfiel: ${s.customerProfile || 'N/A'}\n`;
        }
      }
      if (effectiveCatsap === 'CATSAP3') {
        body += `\n-- FOTO'S --\n`;
        if (tapUrl) body += `TAP: ${tapUrl}\n`;
        if (gevelUrl) body += `Gevel: ${gevelUrl}\n`;
        if (techUrl) body += `Tech: ${techUrl}\n`;
      }
      setIsSuccess(true);
      setTimeout(() => {
        const subject = encodeURIComponent(`Nieuwe Telenet Aanvraag: ${customerData.companyName}`);
        window.location.href = `mailto:coach@telenco.be?subject=${subject}&body=${encodeURIComponent(body)}`;
        setIsSuccess(false);
        navigate('/');
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
    <div className="flex items-center justify-between mb-[clamp(1rem,3vh,2rem)]">
      <h2 className="text-[clamp(1.25rem,3vh,2.5rem)] font-black text-slate-500 tracking-tight">{title}</h2>
      <img src="https://tailormate.ai/telencotool/images/logos/telenetlogo.webp" alt="Telenet Business" className="h-[clamp(2.5rem,5vh,4rem)] object-contain" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="min-h-screen bg-slate-50 text-slate-500 font-sans overflow-x-hidden relative flex flex-col">
      <div className="absolute top-0 left-0 w-full h-[70vh] bg-gradient-to-br from-[#FFD34D] via-[#FFC421] to-[#E5B01E] z-0 overflow-hidden pointer-events-none">
        <svg className="absolute bottom-0 w-full min-w-[1200px]" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ transform: 'translateY(2px)' }}>
          <path fill="rgba(255,255,255,0.05)" d="M0,192L48,192C96,192,192,192,288,208C384,224,480,256,576,261.3C672,267,768,245,864,213.3C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="rgba(255,255,255,0.15)" d="M0,160L48,170.7C96,181,192,203,288,186.7C384,171,480,117,576,112C672,107,768,149,864,176C960,203,1056,213,1152,192C1248,171,1344,117,1392,85.3L1440,53.3L1440,320L0,320Z"></path>
          <path fill="#f8fafc" d="M0,256L48,256C96,256,192,256,288,240C384,224,480,192,576,197.3C672,203,768,245,864,250.7C960,256,1056,224,1152,192C1248,160,1344,128,1392,112L1440,96L1440,320L0,320Z"></path>
        </svg>
      </div>

      {/* Foreground grouped into zoom layout */}
      <div className="flex-1 flex flex-col w-full z-10" style={{ zoom: 0.8 }}>

        <Header actionButton={
          <button onClick={() => navigate('/')} className="p-2 rounded-full transition-colors bg-white border border-white/80 text-slate-400 hover:text-[#FFC421] shadow-sm" title={text.backToHome}>
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
          <motion.main key={lang} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="relative z-10 w-full max-w-5xl min-[2000px]:max-w-7xl mx-auto px-4 sm:px-6 flex-1 flex flex-col justify-center items-center py-[clamp(1rem,3vh,3rem)] pb-[clamp(2rem,6vh,6rem)]">
            <div className="w-full relative flex items-center justify-center min-h-[clamp(300px,50vh,600px)]">
              <AnimatePresence initial={false} custom={direction} mode="wait">

                {/* STEP 1: Klantgegevens */}
                {currentStep === 1 && (
                  <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                    <div className="bg-white rounded-[clamp(1.5rem,3vh,2.5rem)] p-[clamp(1.25rem,3vh,2rem)] sm:p-[clamp(1.5rem,4vh,2.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-visible">
                      <StepHeader title={text.step1Title} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {/* Bedrijf en BTW */}
                        <div>
                          <label className={labelCls}>{text.companyName} *</label>
                          <input className={inputCls} value={customerData.companyName} onChange={e => setCustomerData(p => ({ ...p, companyName: e.target.value }))} />
                        </div>
                        <div className="relative flex flex-col justify-end">
                          <div className="flex flex-row justify-between items-center mb-2">
                            <label className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                              {text.vatNumber} * {isVatValid && <span className="text-emerald-500 ml-1">✓</span>}
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group leading-none">
                              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors uppercase tracking-widest">{text.inAanvraag}</span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${customerData.vatPending ? 'bg-[#FFC421] border-[#FFC421]' : 'bg-white border-slate-300 group-hover:border-[#FFC421]'}`}>
                                {customerData.vatPending && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <input type="checkbox" className="hidden" checked={customerData.vatPending} onChange={(e) => {
                                setCustomerData(p => ({ ...p, vatPending: e.target.checked }));
                              }} />
                            </label>
                          </div>
                          <input className={`${inputCls} ${customerData.vatPending ? 'opacity-50 cursor-not-allowed bg-slate-100 placeholder-slate-400' : ''}`} value={customerData.vatPending ? text.inAanvraag : customerData.vatNumber} onChange={e => { if (!customerData.vatPending) setCustomerData(p => ({ ...p, vatNumber: formatVatNumber(e.target.value) })) }} placeholder="BE0123456789" autoComplete="new-password" name="vat-company-number" disabled={customerData.vatPending} />
                        </div>

                        {/* Info Persoon */}
                        <div><label className={labelCls}>{text.firstName} *</label><input className={inputCls} value={customerData.firstName} onChange={e => setCustomerData(p => ({ ...p, firstName: e.target.value }))} /></div>
                        <div><label className={labelCls}>{text.lastName} *</label><input className={inputCls} value={customerData.lastName} onChange={e => setCustomerData(p => ({ ...p, lastName: e.target.value }))} /></div>
                        <div><label className={labelCls}>{text.birthDate} *</label><CustomDatePicker value={customerData.birthDate} onChange={(val: string) => setCustomerData(p => ({ ...p, birthDate: val }))} /></div>
                        <div>
                          <label className={labelCls}>{text.langLabel}</label>
                          <div className="flex gap-2 h-[46px]">
                            {['NL', 'FR', 'EN'].map(l => (
                              <button key={l} tabIndex={-1} onClick={() => setCustomerData(p => ({ ...p, language: l }))} className={`flex-1 rounded-xl border-2 text-sm font-bold transition-all ${customerData.language === l ? 'bg-[#FFC421] border-[#FFC421] text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{l}</button>
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
                    <div className="bg-white rounded-[clamp(1.5rem,3vh,2.5rem)] p-[clamp(1.25rem,3vh,2rem)] sm:p-[clamp(1.5rem,4vh,2.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
                      <StepHeader title={text.step2Title} />
                      <div className="space-y-6">

                        {/* Connection Address */}
                        <div className="border border-slate-100 bg-slate-50/50 p-6 rounded-3xl space-y-4">
                          <h3 className="font-black text-slate-600 uppercase tracking-widest text-sm">{text.connectionAddress}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2"><label className={labelCls}>{text.street} *</label><input ref={streetRef} className={inputCls} value={connectionAddress.street} onChange={e => { typedStreetRef.current = e.target.value; setConnectionAddress(p => ({ ...p, street: e.target.value })); }} /><div className="mt-1.5 text-[11px] font-medium text-slate-400/80 italic px-2">{text.addressHint}</div></div>
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
                                <div className="sm:col-span-2"><label className={labelCls}>{text.street} *</label><input ref={billingStreetRef} className={inputCls} value={billingAddress.street} onChange={e => { typedBillingStreetRef.current = e.target.value; setBillingAddress(p => ({ ...p, street: e.target.value })); }} /><div className="mt-1.5 text-[11px] font-medium text-slate-400/80 italic px-2">{text.addressHint}</div></div>
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
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Product & Aansluiting */}
                {currentStep === 3 && (
                  <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                    <div className="bg-white rounded-[clamp(1.5rem,3vh,2.5rem)] p-[clamp(1.25rem,3vh,2rem)] sm:p-[clamp(1.5rem,4vh,2.5rem)] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
                      <StepHeader title={text.step3Title} />
                      <div className="space-y-6">

                        {/* Product Type Cards */}
                        <div>
                          <label className={labelCls}>{text.productTypeLabel}</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {([
                              { key: 'KLIK_UPGRADE' as const, label: text.klikUpgrade, desc: text.klikUpgradeDesc },
                              { key: 'KLIK_NEW' as const, label: text.klikNew, desc: text.klikNewDesc },
                              { key: 'APART' as const, label: text.apartLabel, desc: text.apartDesc },
                            ]).map(opt => (
                              <button key={opt.key} onClick={() => { setProductChoice(opt.key); setCatsapStatus(null); setCatsapConfirmed(null); setCatsapOverride(null); setCatsap3Type(null); setApartChoice(null); setUpgradeSystem(null); setUpgradeSegment(null); setUpgradeSameOwner(null); setUpgradeCustomerNumber(''); }} className={`p-[clamp(1rem,3vh,1.5rem)] rounded-[clamp(1rem,3vh,1.5rem)] border-2 text-left transition-all relative overflow-hidden group ${productChoice === opt.key ? 'bg-[#FFC421] border-[#FFC421] shadow-lg shadow-[#FFC421]/20' : 'bg-white border-slate-200 hover:border-[#FFC421]/50'}`}>
                                <div className={`text-[clamp(1rem,2vh,1.125rem)] leading-tight font-black mb-1 ${productChoice === opt.key ? 'text-white' : 'text-slate-600'}`}>{opt.label}</div>
                                <div className={`text-[clamp(10px,1.5vh,12px)] leading-tight font-medium ${productChoice === opt.key ? 'text-white/80' : 'text-slate-500'}`}>{opt.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ═══ KLIK UPGRADE FLOW ═══ */}
                        <AnimatePresence mode="wait">
                          {productChoice === 'KLIK_UPGRADE' && (
                            <motion.div key="upgrade" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-6 overflow-hidden">
                              {/* Q1: C@fe or Origin? */}
                              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                                <label className={labelCls}>{text.upgradeSystemLabel}</label>
                                <div className="grid grid-cols-2 gap-4">
                                  <button onClick={() => { setUpgradeSystem('CAFE'); setUpgradeCustomerNumber(''); }} className={`p-4 rounded-2xl border-2 font-bold transition-all ${upgradeSystem === 'CAFE' ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>{text.cafe}</button>
                                  <button onClick={() => { setUpgradeSystem('ORIGIN'); setUpgradeCustomerNumber(''); }} className={`p-4 rounded-2xl border-2 font-bold transition-all ${upgradeSystem === 'ORIGIN' ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>{text.origin}</button>
                                </div>
                                {upgradeSystem && (
                                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <label className={labelCls}>{upgradeSystem === 'CAFE' ? text.cafeNumber : text.originNumber}</label>
                                    <input className={inputCls} value={upgradeCustomerNumber} onChange={e => setUpgradeCustomerNumber(e.target.value)} />
                                  </motion.div>
                                )}
                              </div>

                              {/* Q2: Residential or Business? */}
                              {upgradeSystem && upgradeCustomerNumber && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                                  <label className={labelCls}>{text.upgradeSegmentLabel}</label>
                                  <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => { setUpgradeSegment('RESIDENTIAL'); setUpgradeSameOwner(null); }} className={`p-4 rounded-2xl border-2 font-bold transition-all ${upgradeSegment === 'RESIDENTIAL' ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>{text.residential}</button>
                                    <button onClick={() => { setUpgradeSegment('BUSINESS'); setUpgradeSameOwner(null); }} className={`p-4 rounded-2xl border-2 font-bold transition-all ${upgradeSegment === 'BUSINESS' ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>{text.business}</button>
                                  </div>

                                  {/* Owner question */}
                                  {upgradeSegment && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2">
                                      <label className={`${labelCls} normal-case tracking-normal`}>{upgradeSegment === 'RESIDENTIAL' ? text.residentialOwnerQ : text.businessOwnerQ}</label>
                                      <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setUpgradeSameOwner(true)} className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${upgradeSameOwner === true ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200'}`}>{text.jaSimple}</button>
                                        <button onClick={() => setUpgradeSameOwner(false)} className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${upgradeSameOwner === false ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-200'}`}>{text.neeSimple}</button>
                                      </div>
                                      {upgradeSameOwner === false && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-slate-200 rounded-2xl p-4 text-orange-600 font-medium text-sm shadow-sm">{text.takeoverWarning}</motion.div>
                                      )}
                                    </motion.div>
                                  )}
                                </motion.div>
                              )}
                            </motion.div>
                          )}

                          {/* ═══ KLIK NEW FLOW (Catsap) ═══ */}
                          {productChoice === 'KLIK_NEW' && (
                            <motion.div key="new" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-6 overflow-hidden">
                              {renderCatsapFlow()}
                            </motion.div>
                          )}

                          {/* ═══ ALLES APART FLOW ═══ */}
                          {productChoice === 'APART' && (
                            <motion.div key="apart" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-6 overflow-hidden">
                              <div>
                                <label className={labelCls}>{text.apartChoiceLabel}</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  {([
                                    { key: 'BFN_500' as const, label: text.bfn500, desc: text.bfn500Desc, price: text.bfn500Price },
                                    { key: 'BFN_150' as const, label: text.bfnS, desc: text.bfnSDesc, price: text.bfnSPrice },
                                    { key: 'MOBILE' as const, label: text.mobile, desc: text.mobileDesc, price: '' },
                                  ]).map(opt => (
                                    <button key={opt.key} onClick={() => { setApartChoice(opt.key); setCatsapStatus(null); setCatsapConfirmed(null); setCatsapOverride(null); setCatsap3Type(null); }} className={`p-5 rounded-2xl border-2 text-left transition-all ${apartChoice === opt.key ? 'bg-[#FFC421] border-[#FFC421] text-white shadow-lg' : 'bg-white border-slate-200 hover:border-[#FFC421]/50'}`}>
                                      <div className={`font-black text-lg ${apartChoice === opt.key ? 'text-white' : 'text-slate-600'}`}>{opt.label}</div>
                                      <div className={`text-xs mt-1 ${apartChoice === opt.key ? 'text-white/70' : 'text-slate-400'}`}>{opt.desc}</div>
                                      {opt.price && <div className={`text-lg font-black mt-2 ${apartChoice === opt.key ? 'text-white' : 'text-[#FFC421]'}`}>{opt.price}</div>}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* BFN selected → show Catsap flow */}
                              {(apartChoice === 'BFN_500' || apartChoice === 'BFN_150') && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                  {renderCatsapFlow()}
                                </motion.div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: KLIK Details (only for KLIK products) */}
                {currentStep === 4 && (
                  <motion.div key="step4" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                    <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
                      <StepHeader title={text.step4Title} />
                      {(productChoice === 'KLIK_UPGRADE' || productChoice === 'KLIK_NEW') ? (
                        <div className="space-y-6">
                          <div>
                            <label className={labelCls}>{text.klikTypeLabel}</label>
                            <div className="grid grid-cols-2 gap-4">
                              <button onClick={() => { setKlikType('LIMITED'); setSimCount(Math.min(simCount, 10)); }} className={`p-4 rounded-2xl border-2 font-bold transition-all ${klikType === 'LIMITED' ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>Limited</button>
                              <button onClick={() => { setKlikType('UNLIMITED'); setSimCount(Math.min(simCount, 5)); }} className={`p-4 rounded-2xl border-2 font-bold transition-all ${klikType === 'UNLIMITED' ? 'bg-[#FFC421] border-[#FFC421] text-white' : 'bg-white border-slate-200'}`}>Unlimited</button>
                            </div>
                          </div>
                          <div className="mt-4">
                            <LiquidGlassSlider min={1} max={klikType === 'LIMITED' ? 10 : 5} value={simCount} onChange={(val) => setSimCount(val)} color="#FFC421" className="w-full py-6" />
                            <div className="mt-4 bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-0 items-center justify-between text-center sm:text-left">
                              <div className="w-full sm:w-auto">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{text.simCountLabel}</span>
                                <p className="text-3xl font-black text-slate-700 mt-1">{simCount} <span className="text-lg text-slate-400 font-bold">SIMs</span></p>
                              </div>
                              <div className="hidden sm:block w-px h-12 bg-slate-200 mx-2"></div>
                              <div className="block sm:hidden w-full h-px bg-slate-200 my-1"></div>
                              <div className="w-full sm:w-auto">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{text.data}</span>
                                <p className="text-3xl font-black text-slate-700 mt-1">{getKlikPricing().gb}</p>
                              </div>
                              <div className="hidden sm:block w-px h-12 bg-slate-200 mx-2"></div>
                              <div className="block sm:hidden w-full h-px bg-slate-200 my-1"></div>
                              <div className="w-full sm:w-auto sm:text-right">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{text.price}</span>
                                <p className="text-3xl font-black text-[#FFC421] mt-1">€{getKlikPricing().price}<span className="text-lg text-[#FFC421]/80 font-bold">/m</span></p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-400">
                          <p className="font-bold text-lg">{text.goNext}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 5: Mobile Numbers */}
                {currentStep === 5 && (
                  <motion.div key="step5" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                    <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
                      <StepHeader title={text.step5Title} />
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

                {/* STEP 6: Photos / Submit */}
                {currentStep === 6 && (
                  <motion.div key="step6" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                    <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100">
                      <StepHeader title={text.step6Title} />
                      {(() => { const ec = catsapConfirmed === false ? catsapOverride : catsapStatus; return ec === 'CATSAP3'; })() ? (
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
                <motion.div key={`nav-${currentStep}`} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="relative w-full max-w-3xl mx-auto px-0 sm:px-6 z-10">
                  <div className="bg-white/80 backdrop-blur-xl border border-white shadow-sm p-4 sm:p-6 rounded-[2rem] flex justify-between items-center">
                    <button onClick={prevStep} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:bg-slate-100'}`}><ChevronLeft className="w-5 h-5" /><span className="hidden sm:inline">{text.back}</span></button>
                    <div className="flex gap-2 sm:gap-3">{[...Array(totalSteps)].map((_, i) => (<div key={i} className={`h-2.5 rounded-full transition-all duration-300 ${currentStep === i + 1 ? 'bg-[#FFC421] w-8' : 'bg-slate-200 w-2.5'}`} />))}</div>
                    {currentStep < totalSteps ? (
                      <button onClick={nextStep} className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all ${validateStep() ? 'text-white bg-[#FFC421] hover:bg-[#E5B01E]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}><span>{text.next}</span></button>
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
        <div className="w-full mt-auto pb-[clamp(1rem,4vw,2rem)] sm:pb-8 pt-4 z-40 flex justify-center items-center pointer-events-none">
          <div className="flex items-center gap-[clamp(0.25rem,1vw,0.375rem)] text-[clamp(8px,2.5vw,11px)] sm:text-xs font-bold text-slate-400/80">
            © 2026 Telenco <span className="mx-[clamp(0.125rem,0.5vw,0.25rem)] opacity-40">·</span> Powered by
            <a href="https://tailormate.ai" target="_blank" rel="noopener noreferrer" className="pointer-events-auto group flex items-center">
              <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-[clamp(9px,2.75vw,11px)] sm:h-3 opacity-50 group-hover:opacity-100 ml-[clamp(0.125rem,0.5vw,0.25rem)] object-contain transition-all grayscale brightness-0 group-hover:grayscale-0 group-hover:brightness-100" />
            </a>
          </div>
        </div>
      </div>{/* End zoom wrapper */}
    </motion.div>
  );
}
