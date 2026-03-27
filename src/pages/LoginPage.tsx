import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightIcon as ArrowRight } from '../components/Icons';
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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('telenco-remember') !== 'false');

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      if (localStorage.getItem('mustChangePassword') === 'true') {
        navigate('/wachtwoord#type=recovery', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

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

      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);

      if (password.length < 6 || !hasUpperCase || !hasLowerCase || !hasNumbers) {
        setError('Wachtwoord moet minimaal 6 tekens, 1 hoofdletter, 1 kleine letter en 1 cijfer bevatten.');
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
            full_name: `${firstName.trim()} ${lastName.trim()}`,
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
        const msg = authError.message;
        const translated = msg === 'Invalid login credentials'
          ? 'Ongeldige inloggegevens. Probeer opnieuw.'
          : msg === 'Email not confirmed'
            ? 'Je e-mail is nog niet bevestigd. Controleer je inbox en klik op de bevestigingslink.'
            : msg;
        setError(translated);
        setIsLoading(false);
      }
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setError('Vul eerst je e-mailadres in om een reset aan te vragen.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const currentPath = window.location.pathname;
    const basePath = currentPath.endsWith('/login') ? currentPath.replace('/login', '') : currentPath;
    const resetUrl = `${window.location.origin}${basePath}/wachtwoord`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });

    if (resetError) {
      setError(resetError.message === 'Over rate limit' ? 'Wacht even voordat je opnieuw een e-mail aanvraagt.' : resetError.message);
    } else {
      setSuccess('Check je mailbox! We hebben een link verstuurd om je wachtwoord te herstellen.');
    }
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
      className="min-h-screen bg-slate-50 flex flex-col p-4 relative overflow-hidden"
    >
      {/* Animated Telenco wave lines — the base layer */}
      <div className="absolute inset-0 z-0 translate-y-8 sm:translate-y-0">
        <LoginBackgroundWaves config={DEFAULT_WAVES} useGradient={true} />

        {/* Full-screen frosted glass filter over the waves (Extremely Subtle) */}
        <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: 'blur(0.5px)' }} />
      </div>

      {/* Scaled foreground content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full z-10" style={{ zoom: 0.8 }}>
        {/* Main Login Card Wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', bounce: 0, duration: 1.0 }}
          className="w-full max-w-[400px] relative z-10"
        >
          <div className="flex flex-col items-center justify-center mb-[clamp(1.25rem,3.5vh,1.75rem)]">
            <img src="https://odqxwaggjgrjpeeqcznk.supabase.co/storage/v1/object/public/images/logos/telencologo.png" alt="Telenco Logo" className="w-[clamp(120px,25vw,150px)] object-contain mb-[clamp(0.25rem,1vh,0.5rem)]" style={{ filter: 'grayscale(1) brightness(0) opacity(0.5)' }} />
            <h2 className="text-[clamp(10px,2vw,12px)] font-bold tracking-[0.25em] uppercase text-slate-400">Sales tool</h2>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-100/50 relative overflow-hidden">
            <form onSubmit={isForgotPassword ? handleResetPassword : handleSubmit} className="space-y-5">
              {/* Name fields - only for registration */}
              {isSignUp && !isForgotPassword && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Voornaam</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-600 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 transition-all"
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
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-600 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 transition-all"
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
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-600 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 transition-all"
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

              {!isForgotPassword && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wachtwoord</label>
                  <input
                    type="password"
                    required
                    minLength={isSignUp ? 6 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-600 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 transition-all"
                    placeholder="••••••••"
                  />
                  <AnimatePresence>
                    {isSignUp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-slate-400 font-medium px-2 flex items-start overflow-hidden"
                      >
                        <div className="pt-1.5 pb-0.5">
                          Minimaal <strong className="text-slate-500 font-bold">6 tekens</strong>, <strong className="text-slate-500 font-bold">1 hoofdletter</strong>, <strong className="text-slate-500 font-bold">1 kleine letter</strong> en <strong className="text-slate-500 font-bold">1 cijfer</strong>.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {!isSignUp && !isForgotPassword && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-200 bg-slate-50 text-slate-600 focus:ring-slate-800/50 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-slate-400 group-hover:text-slate-600 font-medium transition-colors">Login onthouden</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(null); setSuccess(null); }}
                    className="text-sm text-slate-400 hover:text-slate-600 font-semibold transition-colors focus:outline-none"
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>
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
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.88-.653-1.473-1.46-1.646-1.757-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
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
                        {isForgotPassword ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                              <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
                              <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" />
                            </svg>
                            Reset link aanvragen
                          </>
                        ) : isSignUp ? (
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
                      <span className="absolute inset-0 flex items-center justify-center gap-2.5 text-slate-500 translate-y-[150%] transition-transform duration-[600ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0">
                        {isForgotPassword ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                              <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
                              <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" />
                            </svg>
                            Reset link aanvragen
                          </>
                        ) : isSignUp ? (
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

            {/* Toggle between Sign In / Sign Up / Forgot Password */}
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(null); setSuccess(null); }}
                  className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                  Terug naar <span className="text-slate-600 font-bold">Inloggen</span>
                </button>
              ) : (
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }}
                  className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                  {isSignUp ? (
                    <>Al een account? <span className="text-slate-600 font-bold">Inloggen</span></>
                  ) : (
                    <>Nog geen account? <span className="text-slate-600 font-bold">Registreren</span></>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Partner Logos - Aligned with the Card */}
          <div className="flex items-center justify-between w-full opacity-40 px-5 mt-[clamp(2rem,4vh,3rem)]">
            <img src="https://tailormate.ai/telencotool/images/logos/telenetlogo.webp" alt="Telenet" className="h-[clamp(12px,1.5vh,16px)] object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Eneco_logo.svg/1280px-Eneco_logo.svg.png" alt="Eneco" className="h-[clamp(16px,2vh,22px)] object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
            <img src="https://klant.elindus.be/file-asset/Elindus_Logo_Wordmark_RGB_Red1" alt="Elindus" className="h-[clamp(10px,1.2vh,12px)] object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
            <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-[clamp(10px,1.2vh,12px)] object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
          </div>

          {/* Footer Anchored within Card Layout for perfect alignment */}
          <div className="w-full mt-auto pb-[clamp(1rem,4vw,2rem)] sm:pb-8 pt-4 z-40 flex justify-center items-center pointer-events-none">
            <div className="flex items-center justify-center gap-[clamp(0.25rem,1vw,0.375rem)] text-[clamp(8px,2.5vw,11px)] sm:text-xs font-bold text-slate-400/80">
              © 2026 Telenco <span className="mx-[clamp(0.125rem,0.5vw,0.25rem)] opacity-40">·</span> Powered by
              <a href="https://tailormate.ai" target="_blank" rel="noopener noreferrer" className="pointer-events-auto group flex items-center">
                <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-[clamp(10px,3vw,12px)] sm:h-3.5 opacity-50 group-hover:opacity-100 ml-[clamp(0.125rem,0.5vw,0.25rem)] object-contain transition-all grayscale brightness-0 group-hover:grayscale-0 group-hover:brightness-100" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
