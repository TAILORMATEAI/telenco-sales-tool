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
            <img src="https://odqxwaggjgrjpeeqcznk.supabase.co/storage/v1/object/public/images/logos/telencologo.png" alt="Telenco Logo" className="w-[180px] object-contain mb-3" style={{ filter: 'grayscale(1) brightness(0) opacity(0.2)' }} />
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(0,0,0,0.2)' }}>Sales tool</h2>
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
                    className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium"
                  >
                    {error}
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
