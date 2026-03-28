import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import LoginBackgroundWaves, { DEFAULT_WAVES } from '../components/LoginBackgroundWaves';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInvite, setIsInvite] = useState(false);

  useEffect(() => {
    // Detect invite link
    if (window.location.hash.includes('type=invite') || localStorage.getItem('isInviteMode') === 'true') {
      setIsInvite(true);
      localStorage.setItem('isInviteMode', 'true');
    }
  }, []);

  useEffect(() => {
    // We luisteren of er specifiek een wachtwoordherstel event gebeurt vanuit the Supabase flow
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // Gebruiker is correct binnengekomen via de email link.
          console.log("Wachtwoord herstel geverifieerd.");
          // Zet de security lock aan zodat ze niet zomaar de applicatie in kunnen swipen zonder nieuw wachtwoord
          localStorage.setItem('mustChangePassword', 'true');
        }
      }
    );

    // Controleer of de URL een geldige recovery token bevat
    // (die wordt meegegeven in de link vanuit de e-mail of door de state)
    if (!window.location.hash.includes('type=recovery') && !window.location.hash.includes('type=invite') && localStorage.getItem('mustChangePassword') !== 'true' && localStorage.getItem('isInviteMode') !== 'true') {
      // Geen token? Dan heb je hier niets te zoeken -> Terug naar login
      navigate('/login', { replace: true });
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // ADHD Check: Staan ze gelijk?
    if (password !== confirmPassword) {
      setError('Oeps! De wachtwoorden komen niet overeen.');
      return;
    }

    if (password.length < 6) {
      setError('Kies een wachtwoord van minima অন্তত 6 tekens.');
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
    } else {
      setSuccess(isInvite ? 'Yes! Je account is succesvol geactiveerd.' : 'Yes! Je wachtwoord is succesvol gewijzigd.');
      // Verwijder de security locks
      localStorage.removeItem('mustChangePassword');
      localStorage.removeItem('isInviteMode');
      // Na 2 seconden naar inlogscherm
      setTimeout(() => {
        navigate('/login', { replace: true });
        // Uitloggen zodat ze fris kunnen inloggen als check
        supabase.auth.signOut();
      }, 2500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
      className="min-h-screen bg-slate-50 flex flex-col p-4 relative overflow-hidden"
    >
      <div className="absolute inset-0 z-0 translate-y-8 sm:translate-y-0">
        <LoginBackgroundWaves config={DEFAULT_WAVES} />
        <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: 'blur(0.5px)' }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', bounce: 0, duration: 1.0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="flex flex-col items-center justify-center mb-8">
            <img src="https://odqxwaggjgrjpeeqcznk.supabase.co/storage/v1/object/public/images/logos/telencologo.png" alt="Telenco Logo" className="w-[180px] object-contain mb-3" style={{ filter: 'grayscale(1) brightness(0) opacity(0.5)' }} />
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-slate-400">
              {isInvite ? 'Welkom bij Telenco' : 'Nieuw Wachtwoord'}
            </h2>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 sm:p-10 border border-slate-100/50 relative overflow-hidden">
            {isInvite && (
              <div className="mb-6 bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl">
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Welkom bij de Telenco Sales Tool! Stel hieronder een veilig, persoonlijk wachtwoord in om je account definitief te activeren en toegang te krijgen.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nieuw Wachtwoord</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-600 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bevestig Wachtwoord</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-600 font-medium placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800/20 focus:border-slate-800 transition-all"
                  placeholder="••••••••"
                />
              </div>

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
                disabled={isLoading || !!success}
                className="group relative w-full bg-white text-slate-500 font-semibold py-4 rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-100/80"
              >
                <div className="relative w-full h-[24px] overflow-hidden flex items-center justify-center">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin transition-colors" />
                  ) : (
                    <>
                      <span className="absolute inset-0 flex items-center justify-center gap-2.5 transition-transform duration-[600ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-[150%]">
                        Opslaan
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center gap-2.5 text-slate-500 translate-y-[150%] transition-transform duration-[600ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0">
                        Opslaan
                      </span>
                    </>
                  )}
                </div>
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      <div className="w-full pb-4 pt-8 z-10 flex flex-col items-center justify-center">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 opacity-30 px-4">
          <img src="https://tailormate.ai/telencotool/images/logos/telenetlogo.webp" alt="Telenet" className="h-4 sm:h-6 object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Eneco_logo.svg/1280px-Eneco_logo.svg.png" alt="Eneco" className="h-5 sm:h-7 object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
          <img src="https://klant.elindus.be/file-asset/Elindus_Logo_Wordmark_RGB_Red1" alt="Elindus" className="h-2.5 sm:h-4 object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
          <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-2.5 sm:h-4 object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.6)' }} />
        </div>
        <div className="w-full mt-auto pb-[clamp(1rem,4vw,2rem)] sm:pb-8 pt-4 z-40 flex justify-center items-center pointer-events-none">
          <div className="flex items-center justify-center gap-[clamp(0.25rem,1vw,0.375rem)] text-[clamp(8px,2.5vw,11px)] sm:text-xs font-bold text-slate-400/80">
            © 2026 Telenco <span className="mx-[clamp(0.125rem,0.5vw,0.25rem)] opacity-40">·</span> Powered by
            <a href="https://tailormate.ai" target="_blank" rel="noopener noreferrer" className="pointer-events-auto group flex items-center">
              <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-[clamp(10px,3vw,12px)] sm:h-3.5 opacity-50 group-hover:opacity-100 ml-[clamp(0.125rem,0.5vw,0.25rem)] object-contain transition-all grayscale brightness-0 group-hover:grayscale-0 group-hover:brightness-100" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
