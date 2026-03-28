import re

app_path = r"c:\Users\jensv\Downloads\TELENCO SALES TOOL\TELENCO SALES TOOL\src\App.tsx"

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add import
if "import CustomerForm" not in code:
    code = code.replace("import { supabase } from './lib/supabase';", "import { supabase } from './lib/supabase';\nimport CustomerForm, { CustomerData, AddressData } from './components/CustomerForm';")

# 2. Add validateStep case for 5
val_patch = """
    if (currentStep === 4) {
      return true; // Just viewing
    }
    if (currentStep === 5) {
      if (!customerData.companyName || !customerData.firstName || !customerData.lastName || !customerData.birthDate || !customerData.email) return false;
      if (!customerData.billingEmailSame && !customerData.billingEmail) return false;
      if (!connectionAddress.street || !connectionAddress.houseNumber || !connectionAddress.postalCode || !connectionAddress.city) return false;
      if (!billingAddressSame && (!billingAddress.street || !billingAddress.houseNumber || !billingAddress.postalCode || !billingAddress.city)) return false;
    }
    return true;
  };
"""
code = re.sub(r"if \(currentStep === 3\) \{[\s\S]*?return true;\s*\};", val_patch, code)
# Actually, wait, replacing validateStep with regex might break. Let's precise replace it.
code = re.sub(r"if \(currentStep === 3\) \{(.*?)\s*return true;\s*\}\s*return true;\s*\};", r"if (currentStep === 3) {\1return true;}\n" + val_patch, code, flags=re.DOTALL)

# 3. Handle Send Email -> Handle Save Order
save_order_func = """
  const handleSaveOrder = async () => {
    setIsSubmitting(true);
    try {
      // 1. Log to sales_logs / activity_logs
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
          user_id: user.id, user_email: user.email, action: 'CALCULATION',
          energy_type: energyType, consumption_mwh: totalConsumption, commission_code: commissionCode
        });
        
        // 2. Save pure bon to energy_orders
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
          commission_code: commissionCode,
          company_name: customerData.companyName,
          vat_number: customerData.vatNumber,
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
      setIsSuccess(true);
    } catch (err) {
      console.error('Failed to log sale', err);
    } finally {
      setIsSubmitting(false);
    }
  };
"""
code = code.replace("const handleSendEmail = async () => {", save_order_func + "\n  const handleSendEmail = async () => {")

# 4. Remove the old "Verstuur naar coach" block from Step 4
# Since this block is complex, I will replace the submit button part.
code = re.sub(
    r'<button\s*onClick=\{handleSendEmail\}\s*disabled=\{isSubmitting\}(.*?)>.*?</button>',
    '',
    code,
    flags=re.DOTALL
)

# 5. Add Step 5 rendering
step_5_render = """
                {/* STEP 5: Customer Form */}
                {currentStep === 5 && (
                  <motion.div key="step5" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                    <div className="bg-white rounded-[clamp(1.5rem,3vh,2.5rem)] overflow-hidden">
                      <div className="p-8">
                        <CustomerForm 
                          customerData={customerData} setCustomerData={setCustomerData}
                          connectionAddress={connectionAddress} setConnectionAddress={setConnectionAddress}
                          billingAddressSame={billingAddressSame} setBillingAddressSame={setBillingAddressSame}
                          billingAddress={billingAddress} setBillingAddress={setBillingAddress}
                          streetRef={streetRef} cityRef={cityRef} billingStreetRef={billingStreetRef} billingCityRef={billingCityRef}
                          typedStreetRef={typedStreetRef} typedBillingStreetRef={typedBillingStreetRef}
                          text={text}
                        />
                        <button onClick={handleSaveOrder} disabled={isSubmitting || !validateStep()} className="w-full mt-8 py-4 rounded-[1.25rem] bg-eneco-gradient text-white font-black text-[clamp(14px,2vh,18px)] transition-all hover:shadow-lg disabled:opacity-50">
                          {isSubmitting ? text.submitting : text.saveOrder}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
"""

if "customerData={customerData}" not in code:
    code = code.replace("</AnimatePresence>\n              </div>\n\n              {/* Navigation Controls */}", step_5_render + "\n              </AnimatePresence>\n              </div>\n\n              {/* Navigation Controls */}")


# 6. Google API useEffect
google_map_logic = """
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
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

    setter(prev => ({ ...prev, street, houseNumber: number, busNumber: bus, postalCode: postal, city }));
  };

  useEffect(() => {
    if (currentStep !== 5) return;
    const tryInit = () => { if (window.google) initAutocomplete(); else timer = setTimeout(tryInit, 100); };
    let timer = setTimeout(tryInit, 100);

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) { tryInit(); return () => clearTimeout(timer); }

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

    if (streetRef.current && !streetRef.current.dataset.autocomplete) {
      const ac = new window.google.maps.places.Autocomplete(streetRef.current, opts);
      streetRef.current.dataset.autocomplete = 'true';
      ac.addListener('place_changed', () => handlePlace(ac, setConnectionAddress, false));
    }
    if (cityRef.current && !cityRef.current.dataset.autocomplete) {
      const ac2 = new window.google.maps.places.Autocomplete(cityRef.current, { types: ['(cities)'], componentRestrictions: { country: 'be' } });
      cityRef.current.dataset.autocomplete = 'true';
      ac2.addListener('place_changed', () => {
        const p = ac2.getPlace();
        if (p?.address_components) {
          const city = p.address_components.find((c: any) => c.types.includes('locality'));
          const postal = p.address_components.find((c: any) => c.types.includes('postal_code'));
          setConnectionAddress(prev => ({ ...prev, city: city?.long_name || prev.city, postalCode: postal?.long_name || prev.postalCode }));
        }
      });
    }

    if (!billingAddressSame && billingStreetRef.current && !billingStreetRef.current.dataset.autocomplete) {
      const ac3 = new window.google.maps.places.Autocomplete(billingStreetRef.current, opts);
      billingStreetRef.current.dataset.autocomplete = 'true';
      ac3.addListener('place_changed', () => handlePlace(ac3, setBillingAddress, true));
    }
    if (!billingAddressSame && billingCityRef.current && !billingCityRef.current.dataset.autocomplete) {
      const ac4 = new window.google.maps.places.Autocomplete(billingCityRef.current, { types: ['(cities)'], componentRestrictions: { country: 'be' } });
      billingCityRef.current.dataset.autocomplete = 'true';
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
"""

if "const GOOGLE_API_KEY" not in code:
    code = code.replace("useEffect(() => { fetchMarketData(); }, []);", "useEffect(() => { fetchMarketData(); }, []);\n" + google_map_logic)
    
with open(app_path, "w", encoding="utf-8") as f:
    f.write(code)

print("App.tsx transformed.")
