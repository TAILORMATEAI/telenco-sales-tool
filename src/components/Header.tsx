import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDownIcon,
  LogoutIcon as LogOutIcon,
  UserIcon as UserCircleIcon,
  KeyIcon,
  SettingsIcon,
  ClockIcon,
  TrophyIcon,
} from '../components/Icons';

interface HeaderProps {
  hideProfileMenuContext?: boolean;
  actionButton?: React.ReactNode;
}

export default function Header({ hideProfileMenuContext = false, actionButton }: HeaderProps) {
  const { user, profile, isAdmin, signOut, lang, setLang } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isTelenet = location.pathname.includes('telenet');
  const isHome = location.pathname.includes('home') || location.pathname === '/';
  const themeBgClass = isTelenet ? 'bg-[#FFC421]' : 'bg-eneco-gradient';

  const getDisplayName = () => {
    let first = '';
    let last = '';

    if (profile?.first_name) first = profile.first_name;
    else if (user?.user_metadata?.first_name) first = user.user_metadata.first_name;

    if (profile?.last_name) last = profile.last_name;
    else if (user?.user_metadata?.last_name) last = user.user_metadata.last_name;

    if (first || last) {
      return `${first} ${last}`.trim();
    }

    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;

    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase();
    }
    return '';
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <motion.header
      initial={{ opacity: 0, filter: 'blur(4px)', y: -5 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ duration: 0.6, delay: 0.05, ease: 'easeOut' }}
      className="w-full max-w-5xl min-[2000px]:max-w-[70vw] min-[3000px]:max-w-[65vw] mx-auto px-[clamp(1rem,5vw,1.5rem)] sm:px-6 lg:px-8 py-[clamp(0.75rem,2.5vh,1.25rem)] flex justify-between items-center relative z-40 mt-[clamp(0.5rem,1.5vh,0.75rem)]"
    >
      <div className="flex items-center">
        <img
          src="https://odqxwaggjgrjpeeqcznk.supabase.co/storage/v1/object/public/images/logos/telencologo.png"
          alt="Telenco Logo"
          className={`h-[clamp(1.25rem,6vw,2.25rem)] 2xl:h-[clamp(2.25rem,1.5vw,4rem)] object-contain transition-all cursor-pointer ${isHome ? 'opacity-40 hover:opacity-75' : 'opacity-90 hover:opacity-100'}`}
          style={isHome ? { filter: 'grayscale(1) brightness(0)' } : { filter: 'brightness(0) invert(1)' }}
          onClick={() => navigate('/')}
        />
      </div>

      {!hideProfileMenuContext && (
        <div className="flex items-center gap-2 sm:gap-3">
          {actionButton}
          {getDisplayName() && (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`group flex items-center gap-1 2xl:gap-3 p-[4px] 2xl:p-1.5 pr-4 sm:pr-5 2xl:pr-7 bg-white ${isHome ? 'border border-slate-200 shadow-sm hover:bg-slate-50' : 'border border-white/80'} rounded-full hover:shadow-md cursor-pointer transition-all`}
              >
                {/* Avatar with padding around it */}
                <div className={`w-[clamp(1.75rem,7vw,2.5rem)] h-[clamp(1.75rem,7vw,2.5rem)] 2xl:w-[clamp(2.5rem,1.5vw,4rem)] 2xl:h-[clamp(2.5rem,1.5vw,4rem)] rounded-[100px] 2xl:rounded-full overflow-hidden shrink-0 ${themeBgClass} flex items-center justify-center`} >
                  {profile?.avatar_id ? (
                    <img src={profile.avatar_id} alt={getDisplayName()} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-[clamp(11px,1.5vh,15px)] 2xl:text-[clamp(15px,0.8vw,19px)] font-bold flex items-center leading-none mt-0.5">{getDisplayName().charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="hidden sm:inline text-[clamp(13px,1.7vh,17px)] 2xl:text-[clamp(17px,0.8vw,19px)] font-bold text-slate-500 tracking-tight pl-2 pr-2 2xl:px-3">
                  {getDisplayName().split(' ')[0]}
                </span>
                <ChevronDownIcon className={`w-[clamp(0.875rem,1.5vh,1.25rem)] h-[clamp(0.875rem,1.5vh,1.25rem)] 2xl:w-[clamp(1.25rem,1vw,2rem)] 2xl:h-[clamp(1.25rem,1vw,2rem)] transition-transform duration-300 ml-1 sm:ml-0 shrink-0 ${isProfileMenuOpen ? (isTelenet ? 'rotate-180 text-[#FFC421]' : 'rotate-180 text-[#E5394C]') : `text-slate-500 ${isTelenet ? 'group-hover:text-[#FFC421]' : 'group-hover:text-[#E5394C]'}`}`} />
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-[calc(100%+0.5rem)] w-[clamp(15rem,22vw,18rem)] bg-white rounded-[clamp(1rem,2vh,1.5rem)] shadow-xl border border-slate-100 overflow-hidden z-50 flex flex-col py-[clamp(4px,0.5vh,6px)]"
                  >
                    <div className="px-[clamp(0.75rem,2vh,1rem)] py-[clamp(0.5rem,1.5vh,0.75rem)] border-b border-slate-50 mb-[clamp(2px,0.5vh,4px)] flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-[clamp(0.25rem,0.5vw,0.5rem)]">
                        <p className="text-[clamp(8px,1vh,10px)] font-bold text-slate-400 uppercase tracking-widest leading-none">Ingelogd als</p>
                        <p className="text-[clamp(12px,1.5vh,14px)] font-bold text-slate-600 mt-[clamp(4px,0.5vh,6px)] truncate">{getDisplayName()}</p>
                      </div>
                      <div className="flex bg-slate-100 p-0.5 rounded-full border border-slate-200 shrink-0">
                        {['NL', 'FR'].map((l) => (
                          <button
                            key={l}
                            onClick={() => { setLang(l as 'NL' | 'FR'); setIsProfileMenuOpen(false); }}
                            className={`px-[clamp(0.5rem,1vw,0.75rem)] py-[clamp(2px,0.5vh,4px)] text-[clamp(8px,1vh,10px)] font-bold rounded-full transition-colors ${lang === l ? `${themeBgClass} text-white shadow-sm` : 'text-slate-500 hover:text-slate-600'}`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => { setIsProfileMenuOpen(false); /* open modal */ }}
                      className="flex items-center gap-[clamp(0.5rem,1vh,0.75rem)] px-[clamp(0.75rem,2vh,1rem)] py-[clamp(0.5rem,1.5vh,0.75rem)] text-[clamp(12px,1.5vh,14px)] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-500 transition-colors text-left w-full"
                    >
                      <ClockIcon className="w-[clamp(14px,1.5vh,16px)] h-[clamp(14px,1.5vh,16px)] text-slate-400" /> Recente activiteit
                    </button>
                    <button
                      onClick={() => { setIsProfileMenuOpen(false); navigate('/top-sellers'); }}
                      className="flex items-center gap-[clamp(0.5rem,1vh,0.75rem)] px-[clamp(0.75rem,2vh,1rem)] py-[clamp(0.5rem,1.5vh,0.75rem)] text-[clamp(12px,1.5vh,14px)] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-500 transition-colors text-left w-full"
                    >
                      <TrophyIcon className="w-[clamp(14px,1.5vh,16px)] h-[clamp(14px,1.5vh,16px)] text-slate-400" /> Top Verkopers
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => { setIsProfileMenuOpen(false); navigate('/admin'); }}
                        className="flex items-center gap-[clamp(0.5rem,1vh,0.75rem)] px-[clamp(0.75rem,2vh,1rem)] py-[clamp(0.5rem,1.5vh,0.75rem)] text-[clamp(12px,1.5vh,14px)] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-500 transition-colors text-left w-full"
                      >
                        <SettingsIcon className="w-[clamp(14px,1.5vh,16px)] h-[clamp(14px,1.5vh,16px)] text-slate-400" /> Admin Dashboard
                      </button>
                    )}

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-[clamp(0.5rem,1vh,0.75rem)] px-[clamp(0.75rem,2vh,1rem)] py-[clamp(0.5rem,1.5vh,0.75rem)] text-[clamp(12px,1.5vh,14px)] font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left w-full border-t border-slate-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[clamp(14px,1.5vh,16px)] h-[clamp(14px,1.5vh,16px)] text-rose-400"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      Uitloggen
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

    </motion.header>
  );
}
