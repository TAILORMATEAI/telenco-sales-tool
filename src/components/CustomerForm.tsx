import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface CustomerData {
  companyName: string; vatNumber: string; vatPending: boolean; firstName: string; lastName: string;
  birthDate: string; phoneCountry: string; phone: string;
  email: string; billingEmailSame: boolean; billingEmail: string; language: string;
}

export interface AddressData {
  street: string; houseNumber: string; busNumber: string; postalCode: string; city: string;
}

/* ─── Custom Date Picker (Eneco-themed) ─── */
const CustomDatePicker = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
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

    if (val.length === 10 && parts.length === 3) {
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const y = parseInt(parts[2]);
      if (d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1900) {
        onChange(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      } else { onChange(''); }
    } else { onChange(''); }
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

  const handleDayClick = (d: number) => {
    onChange(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    setOpen(false);
  };

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-[clamp(0.75rem,2vh,1rem)] px-[clamp(0.75rem,2vh,1rem)] py-[clamp(0.625rem,1.5vh,0.875rem)] font-bold text-slate-600 text-[clamp(13px,1.5vh,16px)] focus:ring-2 focus:ring-[#E5394C]/50 outline-none transition-all";

  return (
    <div ref={ref} className="relative w-full" onBlur={handleBlur}>
      <div className="relative">
        <input type="text" autoComplete="off" className={inputCls} placeholder="DD/MM/YYYY" value={inputValue} onChange={handleInputChange} onClick={() => setOpen(true)} onFocus={() => setOpen(true)} />
        <svg onClick={() => setOpen(!open)} className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E5394C] cursor-pointer hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 bottom-full left-0 mb-2 w-full min-w-[300px] bg-white border border-slate-200 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-4">
            <div className="flex justify-between items-center mb-4">
              <button type="button" tabIndex={-1} onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
              <div className="flex gap-2 text-sm">
                <select value={month} tabIndex={-1} onChange={e => setMonth(parseInt(e.target.value))} className="font-bold text-slate-600 bg-transparent outline-none cursor-pointer appearance-none text-center hover:text-[#E5394C] transition-colors">
                  {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select value={year} tabIndex={-1} onChange={e => setYear(parseInt(e.target.value))} className="font-bold text-slate-600 bg-transparent outline-none cursor-pointer appearance-none text-center hover:text-[#E5394C] transition-colors">
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
                return (
                  <button key={d} type="button" tabIndex={-1} onClick={() => handleDayClick(d)}
                    className={`h-9 rounded-lg text-sm font-bold transition-all ${isSelected ? 'bg-[#E5394C] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                  >{d}</button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Main Component ─── */
interface CustomerFormProps {
  customerData: CustomerData;
  setCustomerData: React.Dispatch<React.SetStateAction<CustomerData>>;
  connectionAddress: AddressData;
  setConnectionAddress: React.Dispatch<React.SetStateAction<AddressData>>;
  billingAddressSame: boolean;
  setBillingAddressSame: React.Dispatch<React.SetStateAction<boolean>>;
  billingAddress: AddressData;
  setBillingAddress: React.Dispatch<React.SetStateAction<AddressData>>;
  streetRef: React.RefObject<HTMLInputElement>;
  cityRef: React.RefObject<HTMLInputElement>;
  billingStreetRef: React.RefObject<HTMLInputElement>;
  billingCityRef: React.RefObject<HTMLInputElement>;
  typedStreetRef: React.MutableRefObject<string>;
  typedBillingStreetRef: React.MutableRefObject<string>;
  text: any;
  customerType?: 'PARTICULIER' | 'SOHO' | null;
}

export default function CustomerForm({
  customerData, setCustomerData, connectionAddress, setConnectionAddress,
  billingAddressSame, setBillingAddressSame, billingAddress, setBillingAddress,
  streetRef, cityRef, billingStreetRef, billingCityRef, typedStreetRef, typedBillingStreetRef, text,
  customerType
}: CustomerFormProps) {
  
  const labelCls = "block text-[11px] sm:text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-[clamp(4px,1vh,8px)]";
  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-[clamp(0.75rem,2vh,1rem)] px-[clamp(0.75rem,2vh,1rem)] py-[clamp(0.625rem,1.5vh,0.875rem)] font-bold text-slate-600 text-[clamp(13px,1.5vh,16px)] focus:ring-2 focus:ring-[#E5394C]/50 outline-none transition-all";

  const isSoho = customerType === 'SOHO';

  const formatVatNumber = (val: string) => {
    let digits = val.replace(/^BE/i, '').replace(/\D/g, '');
    if (digits.length > 10) digits = digits.substring(0, 10);
    return 'BE' + digits;
  };

  const isVatValid = customerData.vatPending || (customerData.vatNumber.length === 12 && customerData.vatNumber.startsWith('BE'));

  return (
    <div className="space-y-[clamp(1.25rem,3vh,2rem)]">
      {/* SECTION 1: Company (only SOHO) + Personal Info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50 border border-slate-200 rounded-[clamp(1rem,3vh,1.5rem)] p-[clamp(1rem,3vh,1.5rem)]">

        {/* Company fields — only for SOHO */}
        {isSoho && (
          <>
            <h3 className="font-bold text-slate-600 mb-6 border-b border-slate-200 pb-2">Bedrijfsgegevens</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(1rem,2vh,1.25rem)] mb-6">
              <div>
                <label className={labelCls}>{text.companyName} *</label>
                <input type="text" autoComplete="organization" className={inputCls} placeholder="Bedrijfsnaam BV" value={customerData.companyName} onChange={e => setCustomerData(prev => ({ ...prev, companyName: e.target.value }))} />
              </div>
              <div>
                <div className="flex justify-between">
                  <label className={labelCls}>{text.vatNumber} *</label>
                  <label className="text-[10px] sm:text-xs font-bold text-slate-400 flex items-center gap-1.5 cursor-pointer hover:text-slate-600">
                    <input type="checkbox" checked={customerData.vatPending} onChange={e => setCustomerData(prev => ({ ...prev, vatPending: e.target.checked, vatNumber: e.target.checked ? 'IN AANVRAAG' : 'BE' }))} className="w-3.5 h-3.5 rounded text-[#E5394C] focus:ring-[#E5394C]" />
                    {text.inAanvraag}
                  </label>
                </div>
                <input type="text" autoComplete="off" disabled={customerData.vatPending} className={`${inputCls} uppercase ${!isVatValid && !customerData.vatPending && customerData.vatNumber.length > 2 ? 'ring-2 ring-rose-400 border-rose-400' : ''}`} value={customerData.vatNumber} onChange={e => setCustomerData(prev => ({ ...prev, vatNumber: formatVatNumber(e.target.value) }))} />
              </div>
            </div>
          </>
        )}

        <h3 className="font-bold text-slate-600 mb-4 border-b border-slate-200 pb-2">Persoonsgegevens</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(1rem,2vh,1.25rem)]">
          <div><label className={labelCls}>{text.firstName} *</label><input type="text" autoComplete="given-name" className={inputCls} value={customerData.firstName} onChange={e => setCustomerData(prev => ({ ...prev, firstName: e.target.value }))} /></div>
          <div><label className={labelCls}>{text.lastName} *</label><input type="text" autoComplete="family-name" className={inputCls} value={customerData.lastName} onChange={e => setCustomerData(prev => ({ ...prev, lastName: e.target.value }))} /></div>
          <div>
            <label className={labelCls}>{text.birthDate} *</label>
            <CustomDatePicker value={customerData.birthDate} onChange={(val: string) => setCustomerData(prev => ({ ...prev, birthDate: val }))} />
          </div>
          <div>
            <label className={labelCls}>{text.phone} *</label>
            <div className="flex gap-2">
              <input type="text" autoComplete="off" value={customerData.phoneCountry} onChange={e => setCustomerData(prev => ({ ...prev, phoneCountry: e.target.value }))} className={`${inputCls} w-20 text-center px-1`} />
              <input type="tel" autoComplete="tel" className={`${inputCls} flex-1`} placeholder="4XX XX XX XX" value={customerData.phone} onChange={e => {
                let raw = e.target.value.replace(/[^0-9 ]/g, '');
                setCustomerData(prev => ({ ...prev, phone: raw }));
              }} />
            </div>
          </div>
        </div>

        <h3 className="font-bold text-slate-600 mt-6 mb-4 border-b border-slate-200 pb-2">Communicatie</h3>
        <div className="grid grid-cols-1 gap-[clamp(1rem,2vh,1.25rem)]">
          <div><label className={labelCls}>{text.email} *</label><input type="email" autoComplete="email" className={inputCls} value={customerData.email} onChange={e => setCustomerData(prev => ({ ...prev, email: e.target.value }))} /></div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={customerData.billingEmailSame} onChange={e => setCustomerData(prev => ({ ...prev, billingEmailSame: e.target.checked }))} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E5394C]"></div>
            </label>
            <span className="text-[11px] sm:text-[13px] font-bold text-slate-400 uppercase tracking-widest">{text.billingEmailToggle}</span>
          </div>
          {!customerData.billingEmailSame && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
              <label className={labelCls}>{text.billingEmail} *</label>
              <input type="email" autoComplete="email" className={inputCls} value={customerData.billingEmail} onChange={e => setCustomerData(prev => ({ ...prev, billingEmail: e.target.value }))} />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* SECTION 2: Address Data */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50 border border-slate-200 rounded-[clamp(1rem,3vh,1.5rem)] p-[clamp(1rem,3vh,1.5rem)]">
        <h3 className="font-bold text-slate-600 mb-6 border-b border-slate-200 pb-2">{text.connectionAddress}</h3>
        <p className="text-xs text-sky-600 mb-4 bg-sky-50 p-3 rounded-xl border border-sky-100 font-medium leading-relaxed">{text.addressHint}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-[clamp(0.75rem,1.5vh,1rem)] mb-[clamp(1rem,2vh,1.25rem)]">
          <div className="md:col-span-8">
            <label className={labelCls}>{text.street} *</label>
            <input ref={streetRef} type="text" autoComplete="off" className={inputCls} placeholder="Typ straat..." value={connectionAddress.street} onChange={e => { typedStreetRef.current = e.target.value; setConnectionAddress(prev => ({ ...prev, street: e.target.value })); }} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>{text.houseNr} *</label>
            <input type="text" autoComplete="off" className={inputCls} value={connectionAddress.houseNumber} onChange={e => setConnectionAddress(prev => ({ ...prev, houseNumber: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>{text.bus}</label>
            <input type="text" autoComplete="off" className={inputCls} value={connectionAddress.busNumber} onChange={e => setConnectionAddress(prev => ({ ...prev, busNumber: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-[clamp(0.75rem,1.5vh,1rem)]">
          <div className="md:col-span-4"><label className={labelCls}>{text.postalCode} *</label><input type="text" autoComplete="off" className={inputCls} value={connectionAddress.postalCode} onChange={e => setConnectionAddress(prev => ({ ...prev, postalCode: e.target.value }))} /></div>
          <div className="md:col-span-8"><label className={labelCls}>{text.city} *</label><input ref={cityRef} type="text" autoComplete="off" className={inputCls} value={connectionAddress.city} onChange={e => setConnectionAddress(prev => ({ ...prev, city: e.target.value }))} /></div>
        </div>

        <div className="mt-8 mb-6 border-t border-slate-200 pt-6">
          <label className={labelCls}>{text.sameAddress}</label>
          <div className="flex gap-[clamp(0.5rem,1vh,0.75rem)] mt-3">
            <button onClick={() => setBillingAddressSame(true)} className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 text-[clamp(12px,1.5vh,14px)] ${billingAddressSame ? 'border-[#E5394C] bg-[#E5394C] text-white shadow-md shadow-[#E5394C]/20' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100'}`}>{text.jaSimple}</button>
            <button onClick={() => setBillingAddressSame(false)} className={`flex-1 py-3 rounded-xl font-bold transition-all border-2 text-[clamp(12px,1.5vh,14px)] ${!billingAddressSame ? 'border-[#E5394C] bg-[#E5394C] text-white shadow-md shadow-[#E5394C]/20' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100'}`}>{text.neeSimple}</button>
          </div>
        </div>

        {!billingAddressSame && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
            <h3 className="font-bold text-slate-600 mb-6 border-b border-slate-200 pb-2">{text.billingAddress}</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-[clamp(0.75rem,1.5vh,1rem)] mb-[clamp(1rem,2vh,1.25rem)]">
              <div className="md:col-span-8">
                <label className={labelCls}>{text.street} *</label>
                <input ref={billingStreetRef} type="text" autoComplete="off" className={inputCls} placeholder="Typ straat..." value={billingAddress.street} onChange={e => { typedBillingStreetRef.current = e.target.value; setBillingAddress(prev => ({ ...prev, street: e.target.value })); }} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>{text.houseNr} *</label>
                <input type="text" autoComplete="off" className={inputCls} value={billingAddress.houseNumber} onChange={e => setBillingAddress(prev => ({ ...prev, houseNumber: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>{text.bus}</label>
                <input type="text" autoComplete="off" className={inputCls} value={billingAddress.busNumber} onChange={e => setBillingAddress(prev => ({ ...prev, busNumber: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-[clamp(0.75rem,1.5vh,1rem)]">
              <div className="md:col-span-4"><label className={labelCls}>{text.postalCode} *</label><input type="text" autoComplete="off" className={inputCls} value={billingAddress.postalCode} onChange={e => setBillingAddress(prev => ({ ...prev, postalCode: e.target.value }))} /></div>
              <div className="md:col-span-8"><label className={labelCls}>{text.city} *</label><input ref={billingCityRef} type="text" autoComplete="off" className={inputCls} value={billingAddress.city} onChange={e => setBillingAddress(prev => ({ ...prev, city: e.target.value }))} /></div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
