import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import LoginBackgroundWaves, { DEFAULT_WAVES } from '../components/LoginBackgroundWaves';

export default function LoginPage() {
  const { signIn, signUp, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(localStorage.getItem('telenco-email') || '');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('telenco-remember') !== 'false');

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) navigate(isAdmin ? '/admin' : '/home', { replace: true });
  }, [user, isAdmin, navigate]);

  const maskPassword = (pw: string) => {
    if (pw.length <= 2) return pw;
    return pw[0] + '*'.repeat(pw.length - 2) + pw[pw.length - 1];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (isSignUp) {
      if (!email.toLowerCase().endsWith('@telenco.be')) {
        setError('Oeps! Zelf registreren kan enkel met een @telenco.be e-mailadres. Werk je voor Telenco of ben je partner? Vraag dan hieronder snel je account aan!');
        setIsLoading(false);
        return;
      }
      if (!firstName.trim() || !lastName.trim()) {
        setError('Vul je voor- en achternaam in.');
        setIsLoading(false);
        return;
      }
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            masked_password: maskPassword(password)
          }
        }
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess('Account aangemaakt! Controleer je e-mail om te bevestigen.');
        setIsSignUp(false);
      }
      setIsLoading(false);
    } else {
      // Store remember-me preference and email
      if (rememberMe) {
        localStorage.setItem('telenco-remember', 'true');
        localStorage.setItem('telenco-email', email);
      } else {
        localStorage.setItem('telenco-remember', 'false');
        localStorage.removeItem('telenco-email');
      }
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Ongeldige inloggegevens. Probeer opnieuw.'
          : authError.message);
        setIsLoading(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
      className="min-h-screen bg-slate-50 flex flex-col p-4 relative overflow-hidden"
    >
      {/* Animated Telenco wave lines — the base layer */}
      <div className="absolute inset-0 z-0">
        <LoginBackgroundWaves config={DEFAULT_WAVES} />
        
        {/* Full-screen frosted glass filter over the waves (Extremely Subtle) */}
        <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: 'blur(0.5px)' }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
        {/* Main Login Card Wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', bounce: 0, duration: 1.0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="flex flex-col items-center justify-center mb-8">
            <img src="https://odqxwaggjgrjpeeqcznk.supabase.co/storage/v1/object/public/images/logos/telencologo.png" alt="Telenco Logo" className="w-[180px] object-contain mb-3" style={{ filter: 'grayscale(1) brightness(0) opacity(0.5)' }} />
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-slate-400">Sales tool</h2>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-100/50 relative overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name fields - only for registration */}
              {isSignUp && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Voornaam</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-800 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E74B4D]/30 focus:border-[#E74B4D] transition-all"
                      placeholder="Jan"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Achternaam</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-800 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E74B4D]/30 focus:border-[#E74B4D] transition-all"
                      placeholder="Peeters"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">E-mailadres</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-800 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E74B4D]/30 focus:border-[#E74B4D] transition-all"
                  placeholder="naam@telenco.be"
                />
                
                <AnimatePresence>
                  {isSignUp && email.includes('@') && email.split('@')[1].length > 0 && !email.toLowerCase().endsWith('@telenco.be') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-amber-500 text-xs font-medium px-2 flex items-start gap-1.5 overflow-hidden"
                    >
                      <div className="pt-1 flex gap-1.5 items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
                        <span>Zelf registreren is enkel mogelijk met een <strong>@telenco.be</strong> adres.</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wachtwoord</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-800 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E74B4D]/30 focus:border-[#E74B4D] transition-all"
                  placeholder="••••••••"
                />
              </div>

              {!isSignUp && (
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-200 bg-slate-50 text-[#E74B4D] focus:ring-[#E74B4D]/50 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-sm text-slate-400 group-hover:text-slate-600 font-medium transition-colors">Login onthouden</span>
                </label>
              )}

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium">
                      {error}
                    </div>
                    {isSignUp && error.includes('@telenco.be') && (
                      <a
                        href="https://wa.me/32476612473?text=Hallo%20Jens,%20ik%20wil%20graag%20een%20Telenco%20account%20aanvragen%20voor%20mijn%20e-mailadres."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 font-bold py-3 rounded-xl hover:bg-[#25D366]/20 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.88-.653-1.473-1.46-1.646-1.757-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        Aanvragen via WhatsApp
                      </a>
                    )}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl text-sm font-medium"
                  >
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full bg-white text-slate-500 font-semibold py-4 rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-100/80"
              >
                <div className="relative w-full h-[24px] overflow-hidden flex items-center justify-center">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin transition-colors" />
                  ) : (
                    <>
                      {/* Primary Visible State */}
                      <span className="absolute inset-0 flex items-center justify-center gap-2.5 transition-transform duration-[600ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-[150%]">
                        {isSignUp ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <line x1="19" y1="8" x2="19" y2="14" />
                              <line x1="22" y1="11" x2="16" y2="11" />
                            </svg>
                            Registreren
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                              <polyline points="10 17 15 12 10 7" />
                              <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                            Inloggen
                          </>
                        )}
                      </span>

                      {/* Hover State (Slides in from bottom) */}
                      <span className="absolute inset-0 flex items-center justify-center gap-2.5 text-slate-900 translate-y-[150%] transition-transform duration-[600ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0">
                        {isSignUp ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <line x1="19" y1="8" x2="19" y2="14" />
                              <line x1="22" y1="11" x2="16" y2="11" />
                            </svg>
                            Registreren
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                              <polyline points="10 17 15 12 10 7" />
                              <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                            Inloggen
                          </>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Toggle between Sign In / Sign Up */}
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <button
                onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }}
                className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
              >
                {isSignUp ? (
                  <>Al een account? <span className="text-[#E74B4D] font-bold">Inloggen</span></>
                ) : (
                  <>Nog geen account? <span className="text-[#E74B4D] font-bold">Registreren</span></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer Anchored to Bottom */}
      <div className="w-full pb-4 pt-8 z-10 flex flex-col items-center justify-center">
        {/* Partner Logos */}
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 opacity-30 px-4">
          <img src="https://tailormate.ai/telencotool/images/logos/telenetlogo.webp" alt="Telenet" className="h-5 sm:h-6 object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Eneco_logo.svg/1280px-Eneco_logo.svg.png" alt="Eneco" className="h-6 sm:h-7 object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
          <img src="https://klant.elindus.be/file-asset/Elindus_Logo_Wordmark_RGB_Red1" alt="Elindus" className="h-3.5 sm:h-4 object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
          <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-3.5 sm:h-4 object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
        </div>

        <p className="text-center text-slate-300 text-xs mt-4 font-medium uppercase tracking-wider">
          © {new Date().getFullYear()} Telenco Energy · Powered by Tailormate
        </p>
      </div>
    </motion.div>
  );
}
