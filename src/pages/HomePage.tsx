import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cog6ToothIcon as Settings,
  BoltIcon as Zap,
  GlobeAltIcon,
  SignalIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { GREY_WAVES } from '../components/LoginBackgroundWaves';
import Header from '../components/Header';

// Lightweight mini wave canvas for dashboard widgets (same style as login, smaller canvas)
const MiniWaves = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 600;
    const H = 150;
    canvas.width = W;
    canvas.height = H;

    let raf: number;
    const waves = GREY_WAVES;

    const render = () => {
      const t = Date.now();
      ctx.clearRect(0, 0, W, H);
      const cy = H / 2;

      waves.forEach(wave => {
        if (wave.visible === false) return;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 4) {
          const env = Math.sin((x / W) * Math.PI);
          const y = cy + wave.verticalOffset * 0.5 +
            (Math.sin(x * wave.frequency1 * 1.5 + t * wave.speed1 + wave.phase) * wave.amplitude1 * 0.4 +
              Math.sin(x * wave.frequency2 * 1.5 + t * wave.speed2) * wave.amplitude2 * 0.4) * env;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      raf = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

export default function HomePage() {
  const { user, profile, isAdmin, signOut, lang, setLang } = useAuth();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Activity Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLogsLoading(true);
      const [ { data: lData }, { data: oData } ] = await Promise.all([
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('pendings').select('*').order('created_at', { ascending: false }).limit(20)
      ]);
      
      const combinedLogs = [];

      if (lData) {
        combinedLogs.push(...lData.map(l => ({ ...l, type: 'activity', actionDate: l.created_at })));
      }
      if (oData) {
        combinedLogs.push(...oData.map(o => ({
           id: `order_${o.id}`,
           user_id: o.user_id,
           user_email: o.user_email,
           action: 'ORDER_CREATED',
           energy_type: o.energy_type,
           customer_type: o.customer_type,
           created_at: o.created_at,
           actionDate: o.created_at,
           commission_code: o.commission_code,
           type: 'order'
        })));
      }
      
      // Remove redundant ORDER_CREATED from activity_logs 
      const filteredLogs = combinedLogs.filter(l => !(l.type === 'activity' && (l.action === 'ORDER_CREATED' || l.action === 'ENERGY_ORDER')));
      const sortedLogs = filteredLogs.sort((a,b) => new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime()).slice(0, 15);

      if (sortedLogs.length > 0) {
        const uids = Array.from(new Set(sortedLogs.map(l => l.user_id).filter(Boolean)));
        const { data: pData } = await supabase.from('profiles').select('id, first_name, last_name, avatar_id').in('id', uids);
        const logsWithProfiles = sortedLogs.map(l => ({
          ...l,
          profiles: pData?.find(p => p.id === l.user_id) || null
        }));
        setLogs(logsWithProfiles);
      } else {
        setLogs([]);
      }
      setLogsLoading(false);
    };
    fetchLogs();
  }, []);


  const translations = {
    NL: {
      welcome: 'Hey',
      subtitle: 'Kies een tool om te starten',
      soon: 'Binnenkort',
      open: 'Openen',
      titleTelenet: 'Telenet Business',
      titleEnergie: 'Energie',
      titleWebdesign: 'Webdesign',
      titleTelencoins: 'Telencoins',
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
      titleTelencoins: 'Telencoins',
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
      available: true,
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
      gradient: 'from-[#E5394C] to-[#c73a3c]',
      shadow: 'shadow-[#E5394C]/20',
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
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 relative overflow-hidden flex flex-col">      {/* Premium White/Slate Header Banner with Depth */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-white via-slate-100/70 to-slate-50 z-0 overflow-hidden pointer-events-none">
        <svg className="absolute bottom-0 w-full min-w-[1200px]" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ transform: 'translateY(2px)' }}>
          <defs>
            {/* Premium Depth Filters */}
            <filter id="waveShadow1" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="-5" stdDeviation="14" floodOpacity="0.07" floodColor="#0f172a" />
            </filter>
            <filter id="waveShadow2" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="-10" stdDeviation="20" floodOpacity="0.06" floodColor="#0f172a" />
            </filter>
            <filter id="waveShadow3" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="-14" stdDeviation="26" floodOpacity="0.04" floodColor="#0f172a" />
            </filter>

            {/* Fade background waves softly into slate-50 */}
            <linearGradient id="waveFade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="60%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>

            <linearGradient id="rainbowLine" x1="0%" y1="0%" x2="100%" y2="0%">
              {/* Links: Telenet Geel */}
              <stop offset="0%" stopColor="#FFC628" />
              <stop offset="35%" stopColor="#FFC628" />

              {/* Midden: Eneco Roos */}
              <stop offset="45%" stopColor="#E6394C" />
              <stop offset="50%" stopColor="#E8554E" />
              <stop offset="55%" stopColor="#EA704F" />

              {/* Rechts: Webdesign Blauw & Telenco Groen */}
              <stop offset="75%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#92C848" />
            </linearGradient>

          </defs>
          <path filter="url(#waveShadow1)" fill="url(#waveFade)" fillOpacity="0.6" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,149.3C672,149,768,203,864,224C960,245,1056,235,1152,213.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path filter="url(#waveShadow2)" fill="url(#waveFade)" fillOpacity="0.85" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,186.7C672,171,768,117,864,117.3C960,117,1056,171,1152,192C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path filter="url(#waveShadow3)" fill="url(#waveFade)" fillOpacity="1" d="M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,229.3C672,224,768,192,864,192C960,192,1056,224,1152,240C1248,256,1344,256,1392,256L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>

          {/* Rainbow Stroke tracing the lowest wave edge */}
          <path
            d="M0,288L48,272C96,256,192,224,288,218.7C384,213,480,235,576,229.3C672,224,768,192,864,192C960,192,1056,224,1152,240C1248,256,1344,256,1392,256L1440,256"
            fill="none"
            stroke="url(#rainbowLine)"
            strokeWidth="5"
            style={{ transform: 'translateY(1.5px)' }}
          />
        </svg>
      </div>

      {/* Content wrapper scaled to 80% — backgrounds stay full-size */}
      <div className="flex-1 flex flex-col w-full z-10" style={{ zoom: 0.8 }}>
        <Header />

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center w-full relative z-10 pb-4 sm:pb-10 lg:pb-20">
          <motion.div
            key={lang}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="w-full max-w-5xl min-[2000px]:max-w-7xl mx-auto px-[clamp(1rem,5vw,1.5rem)] sm:px-6 lg:px-8 py-[clamp(0.5rem,2vh,2rem)]"
          >

            {/* Tool Cards */}
            <div className="flex flex-col items-center md:grid md:grid-cols-3 gap-[clamp(1rem,4vw,1.5rem)] sm:gap-4 lg:gap-[clamp(1rem,2vh,2.5rem)] w-full">
              {tools.map((tool, i) => (
                <button
                  key={tool.id}
                  onClick={() => tool.available && navigate(tool.route)}
                  disabled={!tool.available}
                  className={`group flex flex-col relative bg-white border border-slate-100/80 rounded-[clamp(1.25rem,6vw,2rem)] sm:rounded-[clamp(1.5rem,3vh,3rem)] overflow-hidden shadow-sm text-left transition-all isolate w-[clamp(16rem,85vw,22rem)] md:w-full md:max-w-none ${tool.available
                    ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-[0.98]'
                    : 'opacity-80 cursor-not-allowed grayscale-[0.2]'
                    }`}
                >
                  {/* Main Card Content (Logos) */}
                  <div className="p-[clamp(1rem,5vw,1.5rem)] sm:p-[clamp(1rem,2.5vh,2.5rem)] min-h-[clamp(5rem,25vw,7.5rem)] sm:min-h-[110px] lg:min-h-[clamp(130px,18vh,280px)] flex flex-col items-center justify-center flex-1 w-full relative">
                    {/* Status badge */}
                    {!tool.available && (
                      <div className="absolute top-[clamp(0.5rem,2.5vw,1rem)] right-[clamp(0.5rem,2.5vw,1rem)] sm:top-[clamp(0.75rem,1.5vh,2rem)] sm:right-[clamp(0.75rem,1.5vw,2rem)]">
                        <span className="px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.125rem,1vw,0.25rem)] sm:px-[clamp(0.75rem,1vw,1.5rem)] sm:py-[clamp(0.25rem,0.5vh,0.75rem)] rounded-full bg-slate-200 text-slate-500 text-[clamp(8px,2.5vw,12px)] sm:text-[clamp(10px,1.2vh,14px)] font-bold uppercase tracking-wider shadow-sm">{t.soon}</span>
                      </div>
                    )}

                    {/* Logos */}
                    <div className="flex flex-col items-center justify-center gap-[clamp(0.75rem,3vw,1.25rem)] sm:gap-[clamp(0.75rem,2.5vh,3rem)] w-full mt-[clamp(0.25rem,1vw,0.5rem)] sm:mt-2">
                      {tool.logos?.map((logo: string, idx: number) => (
                        <img key={idx} src={logo} alt="Partner Logo" className={`${idx === 1 && tool.id === 'energie' ? 'h-[clamp(0.75rem,3vw,1.25rem)] sm:h-[clamp(1.25rem,2.5vh,3rem)] opacity-90' : tool.id === 'telenet' ? 'h-[clamp(2.6rem,10.5vw,3.7rem)] sm:h-[clamp(3.15rem,7.5vh,8.9rem)]' : tool.id === 'webdesign' ? 'h-[clamp(1.6rem,6.5vw,2.4rem)] sm:h-[clamp(2rem,4vh,5.7rem)]' : 'h-[clamp(2rem,8vw,3rem)] sm:h-[clamp(2.5rem,5.5vh,7rem)]'} object-contain object-center transition-transform group-hover:scale-110 origin-center`} />
                      ))}
                    </div>
                  </div>

                  {/* Card Footer (Title + Extension) separated by color */}
                  <div className={`w-full py-[clamp(0.5rem,2vw,0.75rem)] px-[clamp(1rem,4vw,1.5rem)] h-[clamp(2.5rem,10vw,3.5rem)] sm:h-14 lg:h-[clamp(3.5rem,7vh,8rem)] bg-gradient-to-r ${tool.gradient} flex items-center justify-center`}>
                    <h3 className={`text-[clamp(12px,4vw,16px)] sm:text-[clamp(14px,1.8vh,24px)] font-black tracking-wide text-white whitespace-nowrap`}>{tool.title}</h3>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </main>



        {/* Copyright Footer */}
        <div className="w-full mt-auto pb-[clamp(1rem,4vw,2rem)] sm:pb-8 pt-4 z-40 flex justify-center items-center pointer-events-none">
          <div className="flex items-center gap-[clamp(0.25rem,1vw,0.375rem)] text-[clamp(8px,2.5vw,11px)] sm:text-xs font-bold text-slate-400/80">
            © 2026 Telenco <span className="mx-[clamp(0.125rem,0.5vw,0.25rem)] opacity-40">·</span> Powered by
            <a href="https://tailormate.ai" target="_blank" rel="noopener noreferrer" className="pointer-events-auto group flex items-center">
              <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-[clamp(9px,2.75vw,11px)] sm:h-3 opacity-50 group-hover:opacity-100 ml-[clamp(0.125rem,0.5vw,0.25rem)] object-contain transition-all grayscale brightness-0 group-hover:grayscale-0 group-hover:brightness-100" />
            </a>
          </div>
        </div>
      </div>{/* end scaled content wrapper */}
    </div>
  );
}
