"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Montserrat } from "next/font/google";
import { useRouter } from "next/navigation";
import { RocketIcon } from '@/components/ui/rocket-icon';

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "700", "900"] });

export default function LandingPage() {
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = () => {
    setIsLaunching(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <div className={`min-h-screen bg-black relative overflow-hidden flex flex-col items-center justify-center ${montserrat.className}`}>

      {/* Subtle background texture */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050505] to-black" />
        {/* Minimal star field — desktop only */}
        <div className="hidden md:block absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(1px 1px at 10px 10px, rgba(255,255,255,0.4) 100%, transparent 100%), radial-gradient(0.5px 0.5px at 150px 150px, rgba(255,255,255,0.2) 100%, transparent 100%)',
            backgroundSize: '300px 300px',
          }}
        />
        {/* Subtle primary glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      </div>

      <main className="relative z-10 flex flex-col items-center text-center w-full max-w-5xl mx-auto h-full justify-center py-8 px-4 sm:py-12 md:py-0">

        {/* Brand Area */}
        <div className={`flex flex-col items-center space-y-4 mb-8 sm:mb-10 transition-all duration-700 ${isLaunching ? 'scale-90 opacity-0 blur-sm' : ''}`}>
          <h1 className="text-5xl sm:text-6xl md:text-[8rem] font-black tracking-tighter text-white leading-none select-none">
            Organik
          </h1>
          <p className="text-sm md:text-lg text-gray-500 font-bold tracking-[0.3em] uppercase max-w-xl leading-relaxed">
            Ne suis pas la tendance. <span className="text-white">Crée-la.</span>
          </p>
        </div>

        {/* Rocket Icon */}
        <div className={`mb-8 sm:mb-10 scale-100 sm:scale-125 md:scale-150 transition-all duration-700 ${isLaunching ? 'scale-110 -translate-y-[100px] opacity-0' : ''}`}>
          <RocketIcon
            className="w-20 h-20 md:w-28 md:h-28"
            isLaunching={isLaunching}
          />
        </div>

        {/* CTA */}
        <div className={`relative group z-30 transition-all duration-500 ${isLaunching ? 'opacity-0 scale-50' : ''}`}>
          <div className="absolute -inset-0.5 bg-primary/50 rounded-full blur opacity-0 group-hover:opacity-60 transition duration-500" />
          <Button
            onClick={handleLaunch}
            disabled={isLaunching}
            size="lg"
            className="relative text-base md:text-lg font-bold px-8 py-6 rounded-full bg-white text-black hover:bg-white/90 transition-all active:scale-95 uppercase tracking-[0.15em]"
          >
            {isLaunching ? "Décollage..." : "C'est parti !"}
          </Button>
        </div>

      </main>

      <footer className="absolute bottom-4 pb-[env(safe-area-inset-bottom)] text-[9px] md:text-[10px] font-bold tracking-[0.3em] sm:tracking-[0.5em] text-white/15 uppercase z-10 px-4 text-center">
        Organik Program © 2025
      </footer>
    </div>
  );
}
