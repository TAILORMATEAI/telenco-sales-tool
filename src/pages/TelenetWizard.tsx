import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import Header from '../components/Header';
import { ChevronLeftIcon as ChevronLeft } from '../components/Icons';

export default function TelenetWizard() {
  const { lang } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const totalSteps = 4;

  const t = {
    NL: {
      backToHome: 'Terug naar overzicht',
      back: 'Vorige',
      next: 'Volgende',
      step1Title: 'Telenet Configuratie',
    },
    FR: {
      backToHome: 'Retour',
      back: 'Précédent',
      next: 'Suivant',
      step1Title: 'Configuration Telenet',
    }
  };

  const text = t[lang];

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const variants = {
    enter: { opacity: 0, y: -20, scale: 0.95, filter: "blur(4px)" },
    center: { zIndex: 1, opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: { zIndex: 0, opacity: 0, y: -20, scale: 0.95, filter: "blur(4px)" }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden relative flex flex-col"
    >
      <div className="fixed top-0 left-0 w-full h-1.5 bg-white/20 z-50 overflow-hidden">
        <motion.div className="h-full bg-white" initial={{ width: '0%' }} animate={{ width: `${(currentStep / totalSteps) * 100}%` }} transition={{ duration: 0.3, ease: 'easeInOut' }} />
      </div>

      <div className="absolute top-0 left-0 w-full h-[70vh] bg-gradient-to-br from-[#FFD34D] via-[#FFC421] to-[#E5B01E] z-0 overflow-hidden pointer-events-none">
        <svg className="absolute bottom-0 w-full min-w-[1200px]" viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ transform: 'translateY(2px)' }}>
          <path fill="rgba(255,255,255,0.05)" d="M0,192L48,192C96,192,192,192,288,208C384,224,480,256,576,261.3C672,267,768,245,864,213.3C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="rgba(255,255,255,0.15)" d="M0,160L48,170.7C96,181,192,203,288,186.7C384,171,480,117,576,112C672,107,768,149,864,176C960,203,1056,213,1152,192C1248,171,1344,117,1392,85.3L1440,53.3L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="#f8fafc" d="M0,256L48,256C96,256,192,256,288,240C384,224,480,192,576,197.3C672,203,768,245,864,250.7C960,256,1056,224,1152,192C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <Header 
        actionButton={
          <button onClick={() => navigate('/home')} className="p-2 rounded-full transition-colors bg-white/20 border border-white/30 text-white hover:bg-white hover:text-white" title={text.backToHome}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        }
      />

      <AnimatePresence mode="wait">
        <motion.main
          key={lang}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 flex-1 flex flex-col justify-center items-center py-12 pb-32"
        >
          <div className="w-full relative flex items-center justify-center min-h-[400px]">
            <AnimatePresence initial={false} custom={direction} mode="wait">

              {/* STEP 1 */}
              {currentStep === 1 && (
                <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", bounce: 0, duration: 0.6 }} className="w-full max-w-3xl">
                  <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border-2 border-slate-200 text-slate-400">
                      <span className="font-bold text-lg text-center">Telenet module in ontwikkeling...</span>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="fixed bottom-[5.5rem] sm:bottom-[6rem] left-0 right-0 w-full max-w-3xl mx-auto px-4 sm:px-6 z-50">
            <div className="bg-white/80 backdrop-blur-xl border border-white shadow-sm p-4 sm:p-6 rounded-[2rem] flex justify-between items-center">
              <button onClick={prevStep} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:bg-slate-100'}`}><ChevronLeft className="w-5 h-5" /><span className="hidden sm:inline">{text.back}</span></button>
              <div className="flex gap-2 sm:gap-3">{[...Array(totalSteps)].map((_, i) => (<div key={i} className={`h-2.5 rounded-full transition-all duration-300 ${currentStep === i + 1 ? 'bg-[#FFC421] w-8' : 'bg-slate-200 w-2.5'}`} />))}</div>
              <button 
                onClick={nextStep} 
                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all text-white bg-[#FFC421] hover:bg-[#E5B01E]`}
              >
                <span>{text.next}</span>
              </button>
            </div>
          </div>

          {/* Partner Logos */}
          <div className="absolute bottom-6 right-6 sm:bottom-0 sm:right-2 z-30 flex items-end justify-end gap-5 sm:gap-8 pointer-events-none pb-4">
            <img src="https://tailormate.ai/telencotool/images/logos/telenetlogo.webp" alt="Telenet" className="h-7 sm:h-8 object-contain mb-0.5 scale-[1.02] origin-bottom" style={{ filter: 'grayscale(1) brightness(0) opacity(0.4)' }} />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Eneco_logo.svg/1280px-Eneco_logo.svg.png" alt="Eneco" className="h-8 sm:h-10 object-contain" style={{ filter: 'grayscale(1) brightness(0) opacity(0.4)' }} />
            <img src="https://klant.elindus.be/file-asset/Elindus_Logo_Wordmark_RGB_Red1" alt="Elindus" className="h-3.5 sm:h-4 object-contain mb-2" style={{ filter: 'grayscale(1) brightness(0) opacity(0.4)' }} />
            <img src="https://tailormate.ai/highresotailormatelogo.webp" alt="Tailormate" className="h-4 sm:h-5 object-contain mb-1.5" style={{ filter: 'grayscale(1) brightness(0) opacity(0.4)' }} />
          </div>

        </motion.main>
      </AnimatePresence>
    </motion.div>
  );
}
