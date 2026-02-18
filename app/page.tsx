"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FloatingStats } from "@/components/ui/floating-stats";
import { Montserrat } from "next/font/google";
import { useRouter } from "next/navigation";
import { RocketIcon } from '@/components/ui/rocket-icon';

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "700", "900"] });

export default function LandingPage() {
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = () => {
    setIsLaunching(true);
    // Wait for animation (e.g., 1.5s) before navigating
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <div className={`min-h-screen bg-black relative overflow-hidden flex flex-col items-center justify-center ${montserrat.className}`}>

      {/* Space Background Layer */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050505] to-black opacity-90"></div>

        {/* Stars - White (Updated: Smaller & More Discreet) */}
        <div className="absolute inset-0 animate-[fly_20s_linear_infinite]"
          style={{
            backgroundImage: 'radial-gradient(1px 1px at 10px 10px, white 100%, transparent 100%), radial-gradient(0.8px 0.8px at 150px 150px, rgba(255,255,255,0.5) 100%, transparent 100%)',
            backgroundSize: '300px 300px',
            opacity: 0.6
          }}
        />

        {/* Stars - Yellow Twinkling (Updated: Smaller & More Discreet) */}
        <div className="absolute inset-0 animate-[fly_30s_linear_infinite]"
          style={{
            backgroundImage: 'radial-gradient(1px 1px at 50px 50px, #FFD700 100%, transparent 100%), radial-gradient(1px 1px at 250px 250px, #FFFF00 100%, transparent 100%)',
            backgroundSize: '450px 450px',
            opacity: 0.5
          }}
        />

        {/* Comets / Shooting Stars - Reduced visibility */}
        <div className="absolute -top-20 right-[10%] w-[1px] h-[100px] bg-gradient-to-b from-transparent via-[#25F4EE] to-transparent animate-[comet_4s_infinite_1s] rotate-[25deg] opacity-50"></div>
        <div className="absolute -top-20 left-[20%] w-[1px] h-[120px] bg-gradient-to-b from-transparent via-[#FE2C55] to-transparent animate-[comet_6s_infinite_3s] -rotate-[15deg] opacity-50"></div>

        {/* Floating Stats Layer */}
        <FloatingStats variant="landing" />

      </div>

      <main className="relative z-10 flex flex-col items-center text-center w-full max-w-5xl mx-auto h-full justify-center py-8 px-4 sm:py-12 md:py-0">

        {/* Brand Area */}
        <div className={`flex flex-col items-center space-y-2 mb-6 sm:mb-8 transition-all duration-700 ${isLaunching ? 'scale-90 opacity-0 blur-sm' : ''}`}>
          {/* TikTok Glitch Logo - Layered properly for the effect */}
          <div className="relative">
            <h1 className="text-5xl sm:text-6xl md:text-[8rem] font-black tracking-tighter text-white leading-none select-none relative z-10 mix-blend-screen">
              Organik
            </h1>
            <h1 className="text-5xl sm:text-6xl md:text-[8rem] font-black tracking-tighter text-[#25F4EE] leading-none select-none absolute top-0 left-0 -translate-x-[2px] -translate-y-[2px] z-0 opacity-80 animate-glitch-cyan">
              Organik
            </h1>
            <h1 className="text-5xl sm:text-6xl md:text-[8rem] font-black tracking-tighter text-[#FE2C55] leading-none select-none absolute top-0 left-0 translate-x-[2px] translate-y-[2px] z-0 opacity-80 animate-glitch-red">
              Organik
            </h1>
          </div>

          <p className="text-sm md:text-xl text-gray-400 font-bold tracking-[0.3em] uppercase max-w-xl leading-relaxed mt-4">
            Ne suis pas la tendance. <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">Crée-la.</span>
          </p>
        </div>

        {/* UNIFIED ROCKET ICON - Interactive */}
        <div className="mt-8 sm:mt-12 mb-6 sm:mb-8 cursor-pointer scale-100 sm:scale-150 md:scale-[2]">
          <RocketIcon
            className={`w-24 h-24 md:w-32 md:h-32 transition-transform duration-700 ${isLaunching ? 'scale-110 translate-y-[-50px]' : 'hover:scale-105'}`}
            isLaunching={isLaunching}
          />
        </div>

        {/* CTA Section - Disappears on launch */}
        <div className={`relative group scale-100 z-30 mt-6 sm:mt-8 transition-all duration-500 ${isLaunching ? 'opacity-0 scale-50' : ''}`}>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#25F4EE] to-[#FE2C55] rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500 animate-tilt"></div>

          <Button
            onClick={handleLaunch}
            disabled={isLaunching}
            size="lg"
            className="relative text-base md:text-lg font-bold px-8 py-6 rounded-full bg-black text-white hover:bg-black border border-white/10 transition-all active:scale-95 uppercase tracking-[0.15em] shadow-xl"
          >
            {isLaunching ? "Décollage..." : "C'est parti !"}
          </Button>

        </div>

      </main>

      <footer className="absolute bottom-4 pb-[env(safe-area-inset-bottom)] text-[9px] md:text-[10px] font-bold tracking-[0.3em] sm:tracking-[0.5em] text-white/20 uppercase z-10 px-4 text-center">
        Organik Program © 2025
      </footer>
    </div>
  );
}
