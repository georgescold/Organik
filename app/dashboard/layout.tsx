import { FloatingStats } from "@/components/ui/floating-stats";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings } from "lucide-react";
import { ProfileSwitcher } from "@/components/profile/profile-switcher";
import { ProfileThemeAdapter } from "@/components/profile/profile-theme-adapter";
import { signOut } from "@/lib/auth";
import { Montserrat } from "next/font/google";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RocketIcon } from '@/components/ui/rocket-icon';

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "700", "900"] });

async function SignOutButton() {
    'use server';
    await signOut();
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const profiles = user?.profiles || [];

    // Mobile-optimized Header with Space Theme
    const Header = () => (
        <header className={`sticky top-0 z-30 flex h-14 md:h-20 items-center justify-between border-b border-white/10 bg-black px-2 sm:px-3 md:px-8 overflow-hidden ${montserrat.className}`}>

            {/* Space Background Layer (Masked to Header) — Simplified */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Subtle noise texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 mix-blend-overlay"></div>
                {/* Stars - White (single layer, reduced density) */}
                <div className="absolute inset-0 animate-[fly_25s_linear_infinite] hidden md:block"
                    style={{
                        backgroundImage: 'radial-gradient(1px 1px at 5px 5px, white 100%, transparent 100%), radial-gradient(0.5px 0.5px at 80px 40px, rgba(255,255,255,0.3) 100%, transparent 100%)',
                        backgroundSize: '200px 200px'
                    }}
                />
                {/* Floating Stats Layer */}
                <FloatingStats />

                {/* Single subtle comet — less visual noise */}
                <div className="absolute top-0 right-[-10%] w-[80px] h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-[comet-depth_14s_linear_infinite] hidden md:block" />
            </div>

            <Link href="/dashboard" className="relative z-10 flex items-center space-x-2 md:space-x-4 group">
                {/* Mini Rocket - Now using the unified animated icon */}
                {/* "Violent" Fire (isLaunching=true) but NO Smoke (showSmoke=false) as requested */}
                <RocketIcon
                    isLaunching={true}
                    showSmoke={false}
                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-20 md:h-20 mt-2 md:mt-4 group-hover:scale-105 transition-transform duration-300"
                />

                {/* Glitch Logo */}
                <div className="relative">
                    <span className="block text-lg sm:text-xl md:text-3xl font-black tracking-tighter text-white leading-none select-none relative z-10 mix-blend-screen">Organik</span>
                    <span className="absolute top-0 left-0 text-lg sm:text-xl md:text-3xl font-black tracking-tighter text-[#25F4EE] leading-none select-none -translate-x-[1px] -translate-y-[1px] z-0 opacity-80 animate-glitch-cyan hidden sm:block">Organik</span>
                    <span className="absolute top-0 left-0 text-lg sm:text-xl md:text-3xl font-black tracking-tighter text-[#FE2C55] leading-none select-none translate-x-[1px] translate-y-[1px] z-0 opacity-80 animate-glitch-red hidden sm:block">Organik</span>
                </div>
            </Link>

            {/* Icons moved to DashboardTabs in page.tsx */}
        </header >
    );

    if (profiles.length === 0) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1">
                    {children}
                </main>
                <OnboardingModal />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
            {/* Background Ambience - Clean White/Black with Red accents */}
            <div className="fixed top-[-10%] left-[-10%] w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-primary/10 rounded-full blur-[80px] md:blur-[100px] pointer-events-none mix-blend-multiply z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-secondary/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none mix-blend-multiply z-0" />

            <div className="relative z-10 w-full flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 overflow-hidden flex flex-col">
                    {children}
                </main>
            </div>
        </div>
    );
}
