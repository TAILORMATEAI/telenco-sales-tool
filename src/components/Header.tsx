import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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
    <header className="px-6 py-5 flex justify-between items-center max-w-7xl mx-auto w-full relative z-40 mt-3">
      <div className="flex items-center">
        <img 
          src="https://odqxwaggjgrjpeeqcznk.supabase.co/storage/v1/object/public/images/logos/telencologo.png" 
          alt="Telenco Logo" 
          className="h-7 sm:h-8 object-contain opacity-90 transition-opacity hover:opacity-100 cursor-pointer" 
          style={{ filter: 'brightness(0) invert(1)' }}
          onClick={() => navigate('/home')}
        />
      </div>
      
      {!hideProfileMenuContext && (
        <div className="flex items-center gap-3">
          {actionButton}
          {getDisplayName() && (
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-0 bg-slate-200/50 border border-slate-300/50 backdrop-blur-md rounded-full shadow-sm mr-1 hover:bg-slate-300/50 cursor-pointer transition-all overflow-hidden pr-2.5 sm:pr-0"
              >
                {/* Avatar fills the full button height */}
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-[#E74B4D] flex items-center justify-center">
                  {profile?.avatar_id ? (
                    <img src={profile.avatar_id} alt={getDisplayName()} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs font-bold">{getDisplayName().charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="hidden sm:inline text-sm font-bold text-white tracking-tight pl-2 pr-3">
                  {getDisplayName().split(' ')[0]}
                </span>
                <ChevronDownIcon className={`w-3.5 h-3.5 text-white/80 transition-transform duration-300 ml-2 mr-4 sm:ml-0 sm:mr-2.5 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-[calc(100%+0.5rem)] w-72 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 flex flex-col py-1.5"
                  >
                    <div className="px-4 py-3 border-b border-slate-50 mb-1 flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Ingelogd als</p>
                        <p className="text-sm font-bold text-slate-800 mt-1.5 truncate">{getDisplayName()}</p>
                      </div>
                      <div className="flex bg-slate-100 p-0.5 rounded-full border border-slate-200 shrink-0">
                        {['NL', 'FR'].map((l) => (
                          <button
                            key={l}
                            onClick={() => { setLang(l as 'NL' | 'FR'); setIsProfileMenuOpen(false); }}
                            className={`px-3 py-1 text-[10px] font-bold rounded-full transition-colors ${lang === l ? 'bg-[#E74B4D] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => { setIsProfileMenuOpen(false); /* open modal */ }} 
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left w-full"
                    >
                      <ClockIcon className="w-4 h-4 text-slate-400" /> Recente activiteit
                    </button>
                    <button 
                      onClick={() => { setIsProfileMenuOpen(false); navigate('/top-sellers'); }} 
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left w-full"
                    >
                      <TrophyIcon className="w-4 h-4 text-slate-400" /> Top Verkopers
                    </button>

                    {isAdmin && (
                      <button 
                        onClick={() => { setIsProfileMenuOpen(false); navigate('/admin'); }} 
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left w-full"
                      >
                        <SettingsIcon className="w-4 h-4 text-slate-400" /> Admin Dashboard
                      </button>
                    )}

                    <button 
                      onClick={handleSignOut} 
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left w-full border-t border-slate-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-rose-400"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      Uitloggen
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
