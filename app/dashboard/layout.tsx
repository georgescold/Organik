import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries";
import Link from "next/link";
import { ProfileThemeAdapter } from "@/components/profile/profile-theme-adapter";
import { Montserrat } from "next/font/google";
import { ForceSignOut } from "@/components/auth/force-signout";
import { RocketIcon } from '@/components/ui/rocket-icon';

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "700", "900"] });

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const profiles = user?.profiles || [];

    // Clean Header
    const Header = () => (
        <header className={`sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b border-white/10 bg-black/95 backdrop-blur-sm px-3 sm:px-4 md:px-8 ${montserrat.className}`}>

            <Link href="/dashboard" className="relative z-10 flex items-center gap-2 md:gap-3 group">
                <RocketIcon
                    className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 group-hover:scale-105 transition-transform duration-300"
                />
                <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white leading-none select-none">
                    Organik
                </span>
            </Link>

            {/* Icons moved to DashboardTabs in page.tsx */}
        </header>
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
