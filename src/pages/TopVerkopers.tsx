import React from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { GREY_WAVES } from '../components/LoginBackgroundWaves';
import LoginBackgroundWaves from '../components/LoginBackgroundWaves';
import { useNavigate } from 'react-router-dom';

export default function TopVerkopers() {
  const { lang, t } = useAuth();
  const navigate = useNavigate();

  const backButton = (
    <button onClick={() => navigate('/')} className="flex shrink-0 items-center justify-center w-[clamp(1.5rem,4vw,2rem)] h-[clamp(1.5rem,4vw,2rem)] 2xl:w-[clamp(2rem,1.5vw,2.5rem)] 2xl:h-[clamp(2rem,1.5vw,2.5rem)] bg-white rounded-full shadow-sm hover:shadow-md hover:scale-[1.05] active:scale-[0.95] transition-all border border-slate-200">
      <svg className="w-[clamp(0.875rem,2vw,1.125rem)] h-[clamp(0.875rem,2vw,1.125rem)] 2xl:w-[clamp(1rem,1vw,1.25rem)] 2xl:h-[clamp(1rem,1vw,1.25rem)] text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
    </button>
  );

  return (
    <div className="relative min-h-[100dvh] bg-slate-50 overflow-hidden flex flex-col font-outfit">
      <div className="absolute inset-0 z-0 opacity-50 pointer-events-none">
        <LoginBackgroundWaves config={GREY_WAVES} useGradient={false} />
      </div>
      <div className="flex-1 flex flex-col w-full z-10" style={{ zoom: 0.8 }}>
        <Header actionButton={backButton} />
        <main className="relative z-10 flex-1 w-full flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl min-[2000px]:max-w-5xl mx-auto px-[clamp(1rem,4vw,1.5rem)] py-[clamp(0.5rem,2vh,2rem)]">
            <div className="bg-white rounded-[clamp(1rem,4vw,2rem)] sm:rounded-[clamp(1rem,2vh,2rem)] shadow-sm border border-slate-100 p-[clamp(1.5rem,4vw,3rem)] w-full text-center">
              <h1 className="text-[clamp(1.25rem,3.5vw,2rem)] font-black text-slate-700 mb-[clamp(0.5rem,1.5vw,1rem)]">Top Verkopers</h1>
              <p className="text-slate-400 font-bold text-[clamp(0.875rem,2.5vw,1.25rem)]">{t?.noDataYet || 'Nog geen data beschikbaar'}</p>
              <p className="text-slate-400 mt-2 text-[clamp(0.75rem,1.5vw,1rem)]">{t?.startSelling || 'Begin met verkopen om het scoreboard te vullen.'}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
