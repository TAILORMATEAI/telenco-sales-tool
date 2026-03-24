import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cog6ToothIcon as Settings,
  BoltIcon as Zap,
  GlobeAltIcon,
  SignalIcon
} from '@heroicons/react/24/outline';
import LoginBackgroundWaves, { GREY_WAVES } from '../components/LoginBackgroundWaves';
import Header from '../components/Header';

export default function HomePage() {
  const { user, profile, isAdmin, signOut, lang, setLang } = useAuth();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const translations = {
    NL: {
      welcome: 'Hey',
      subtitle: 'Kies een tool om te starten',
      soon: 'Binnenkort',
      open: 'Openen',
      titleTelenet: 'Telenet Business',
      titleEnergie: 'Energie',
      titleWebdesign: 'Webdesign',
      recentActivity: 'Recente Activiteit',
      viewAll: 'Bekijk alles',
      energyCalc: 'Energie Berekening',
      today: 'Vandaag',
      yesterday: 'Gisteren',
      offerConfig: 'Offerte Config',
      topSellers: 'Top Verkopers',
      sales: 'Verkopen'
    },
    FR: {
      welcome: 'Bienvenue',
      subtitle: 'Choisissez un outil pour commencer',
      soon: 'Bientôt',
      open: 'Ouvrir',
      titleTelenet: 'Telenet Business',
      titleEnergie: 'Énergie',
      titleWebdesign: 'Webdesign',
      recentActivity: 'Activité Récente',
      viewAll: 'Voir tout',
      energyCalc: 'Calcul d\'Énergie',
      today: 'Aujourd\'hui',
      yesterday: 'Hier',
      offerConfig: 'Config Offre',
      topSellers: 'Meilleurs Vendeurs',
      sales: 'Ventes'
    }
  };
  const t = translations[lang];

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

  const tools = [
    {
      id: 'telenet',
      title: t.titleTelenet,
      description: '',
      logos: ['https://tailormate.ai/telencotool/images/logos/telenetlogo.webp'],
      icon: SignalIcon,
      gradient: 'from-[#FFC421] to-[#FFC421]',
      shadow: 'shadow-[#FFC421]/20',
      route: '/telenet',
      available: false,
      mode: 'titleAndLogo'
    },
    {
      id: 'energie',
      title: t.titleEnergie,
      description: '',
      logos: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Eneco_logo.svg/1280px-Eneco_logo.svg.png',
        'https://klant.elindus.be/file-asset/Elindus_Logo_Wordmark_RGB_Red1'
      ],
      icon: Zap,
      gradient: 'from-[#E74B4D] to-[#c73a3c]',
      shadow: 'shadow-[#E74B4D]/20',
      route: '/calculator',
      available: true,
      mode: 'titleAndLogo'
    },
    {
      id: 'webdesign',
      title: t.titleWebdesign,
      description: '',
      logos: ['https://tailormate.ai/highresotailormatelogo.webp'],
      icon: GlobeAltIcon,
      gradient: 'from-[#0ea5e9] to-[#0284c7]',
      shadow: 'shadow-[#0ea5e9]/20',
      route: '/webdesign',
      available: false,
      mode: 'titleAndLogo'
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 relative overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-br from-[#E5384C] via-[#E74B4D] to-[#EA704F] z-0 overflow-hidden pointer-events-none">
        <svg className="absolute bottom-0 w-full min-w-[1200px]" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ transform: 'translateY(2px)' }}>
          <path fill="#91C848" fillOpacity="1" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,149.3C672,149,768,203,864,224C960,245,1056,235,1152,213.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="#FFC421" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,186.7C672,171,768,117,864,117.3C960,117,1056,171,1152,192C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="#f8fafc" d="M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,229.3C672,224,768,192,864,192C960,192,1056,224,1152,240C1248,256,1344,256,1392,256L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center w-full relative z-10 pb-20">
          <motion.div
            key={lang}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8"
          >


            {/* Tool Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              {tools.map((tool, i) => (
                <button
                  key={tool.id}
                  onClick={() => tool.available && navigate(tool.route)}
                  disabled={!tool.available}
                  className={`group flex flex-col relative bg-white rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-sm text-left transition-all isolate ${tool.available
                    ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-[0.98]'
                    : 'opacity-80 cursor-not-allowed grayscale-[0.2]'
                    } ${tool.id === 'webdesign' ? 'col-span-2 md:col-span-1' : 'col-span-1'}`}
                >
                  {/* Main Card Content (Logos) */}
                  <div className="p-4 pb-6 sm:p-8 sm:pb-10 min-h-[120px] sm:min-h-[180px] flex flex-col items-center justify-center flex-1 w-full relative">
                    {/* Status badge */}
                    {!tool.available && (
                      <div className="absolute top-3 right-3 sm:top-6 sm:right-6">
                        <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-slate-200 text-slate-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider shadow-sm">{t.soon}</span>
                      </div>
                    )}

                    {/* Logos */}
                    <div className="flex flex-col items-center justify-center gap-4 sm:gap-8 w-full mt-2">
                      {tool.logos?.map((logo: string, idx: number) => (
                        <img key={idx} src={logo} alt="Partner Logo" className={`${idx === 1 && tool.id === 'energie' ? 'h-3 sm:h-6 opacity-90' : 'h-8 sm:h-14'} object-contain object-center transition-transform group-hover:scale-110 origin-center`} />
                      ))}
                    </div>
                  </div>

                  {/* Card Footer (Title + Extension) separated by color */}
                  <div className={`w-full py-3 px-4 sm:py-5 sm:px-8 h-16 sm:h-24 bg-gradient-to-r ${tool.gradient} flex items-center justify-center`}>
                    <h3 className={`text-[13px] sm:text-base md:text-lg font-black tracking-wide text-white whitespace-nowrap`}>{tool.title}</h3>
                  </div>
                </button>
              ))}
            </div>

            {/* Dashboard Widgets */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Widget 1: Top Verkopers (Leaderboard) */}
              <div
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group"
              >
                {/* Luxury Fluid Background (Greyscale for unified aesthetic) */}
                <div className="absolute top-0 left-[-50vw] w-[200vw] h-full z-0 opacity-25 pointer-events-none scale-125 origin-center translate-y-4 group-hover:scale-[1.3] transition-transform duration-[1.5s] ease-out">
                  <LoginBackgroundWaves config={GREY_WAVES} />
                </div>

                <div className="relative z-10 mb-6 flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t.topSellers}</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-center divide-y divide-slate-100">
                  {/* Rank 1 */}
                  <div className="group/item flex items-center justify-between py-3 px-1 hover:pl-3 transition-all cursor-pointer">
                    <div className="flex items-center gap-5">
                      <span className="text-2xl font-black text-[#FFC421] w-4 text-center">1</span>
                      <div>
                        <p className="text-base font-bold text-slate-800 group-hover/item:text-[#FFC421] transition-colors">Sarah Dubois</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-800">14</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none m-0">{t.sales}</p>
                    </div>
                  </div>

                  {/* Rank 2 */}
                  <div className="group/item flex items-center justify-between py-3 px-1 hover:pl-3 transition-all cursor-pointer">
                    <div className="flex items-center gap-5">
                      <span className="text-2xl font-black text-slate-400 w-4 text-center opacity-80">2</span>
                      <div>
                        <p className="text-base font-bold text-slate-800 group-hover/item:text-slate-500 transition-colors">Jan Peeters</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-800">9</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none m-0">{t.sales}</p>
                    </div>
                  </div>

                  {/* Rank 3 */}
                  <div className="group/item flex items-center justify-between py-3 px-1 hover:pl-3 transition-all cursor-pointer">
                    <div className="flex items-center gap-5">
                      <span className="text-2xl font-black text-slate-300 w-4 text-center opacity-60">3</span>
                      <div>
                        <p className="text-base font-bold text-slate-800 group-hover/item:text-slate-400 transition-colors">Jens V.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-800">5</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none m-0">{t.sales}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Widget 2: Recente Activiteit */}
              <div
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group"
              >
                {/* Luxury Fluid Background (Greyscale for unified aesthetic) */}
                <div className="absolute top-0 left-[-50vw] w-[200vw] h-full z-0 opacity-25 pointer-events-none scale-125 origin-center translate-y-4 group-hover:scale-[1.3] transition-transform duration-[1.5s] ease-out">
                  <LoginBackgroundWaves config={GREY_WAVES} />
                </div>

                <div className="relative z-10 mb-6 flex items-center gap-4">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t.recentActivity}</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                  <span className="text-[10px] font-bold text-slate-400 hover:text-[#E74B4D] uppercase tracking-wider cursor-pointer transition-colors">{t.viewAll}</span>
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-center divide-y divide-slate-100">
                  <div className="group/item py-3 px-1 hover:pl-3 transition-all cursor-pointer">
                    <div className="flex items-end justify-between mb-1">
                      <p className="text-base font-bold text-slate-800 group-hover/item:text-[#91C848] transition-colors">{t.energyCalc}</p>
                      <p className="text-base font-black text-[#91C848]">15 MWh</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">{t.today}, 10:42 <span className="mx-2 opacity-30">•</span> Sarah Dubois</p>
                  </div>

                  <div className="group/item py-3 px-1 hover:pl-3 transition-all cursor-pointer">
                    <div className="flex items-end justify-between mb-1">
                      <p className="text-base font-bold text-slate-800 group-hover/item:text-[#FFC421] transition-colors">{t.titleTelenet}</p>
                      <p className="text-base font-black text-[#FFC421]">AFA Config</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">{t.yesterday}, 14:15 <span className="mx-2 opacity-30">•</span> Jan Peeters</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
      </main>

      {/* Partner Logos */}
      <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-30 flex items-end justify-end gap-5 sm:gap-8 pointer-events-none">
        <img src="https://tailormate.ai/telencotool/images/logos/telenetlogo.webp" alt="Telenet" className="h-7 sm:h-8 object-contain mb-0.5 scale-[1.02] origin-bottom" style={{ filter: 'grayscale(1) brightness(0) opacity(0.4)' }} />
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Eneco_logo.svg/1280px-Eneco_logo.svg.png" alt="Eneco" className="h-8 sm:h-10 object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.4)' }} />
        <img src="https://klant.elindus.be/file-asset/Elindus_Logo_Wordmark_RGB_Red1" alt="Elindus" className="h-3.5 sm:h-4 object-contain mb-2" style={{ filter: 'grayscale(1) brightness(0) opacity(0.4)' }} />
        <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-4 sm:h-5 object-contain mb-1.5" style={{ filter: 'grayscale(1) brightness(0) opacity(0.4)' }} />
      </div>
    </div>
  );
}
