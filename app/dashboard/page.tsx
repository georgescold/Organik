import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, ChevronDown } from "lucide-react";
import { ProfileSwitcher } from "@/components/profile/profile-switcher";
import { signOut } from "@/lib/auth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { AnalyticsView } from '@/components/analytics/analytics-view';
import { CollectionsView } from '@/components/collections/collections-view';
import { CreationView } from '@/components/creation/creation-view';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';
import { LogoutItem } from '@/components/dashboard/logout-item';
import { UnifiedApiSettings } from '@/components/dashboard/unified-api-settings';
import { CompetitorAnalysisDashboard } from '@/components/competitor/competitor-analysis-dashboard';
import { GlobalComparisonDashboard } from '@/components/comparison/global-comparison-dashboard';
import { MobileUserMenu } from '@/components/dashboard/mobile-user-menu';
import { AutoSync } from '@/components/dashboard/auto-sync';

async function SignOutButton() {
    'use server';
    await signOut({ redirectTo: '/login' });
}

// Next.js 15+ Page Props are Promises
interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const activeProfileId = user?.activeProfileId || user?.profiles[0]?.id || null;
    const profiles = user?.profiles || [];
    const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

    const UserNav = (
        <>
            {/* Desktop: ProfileSwitcher + Settings Menu */}
            <div className="hidden sm:flex items-center gap-2">
                <ProfileSwitcher profiles={profiles} activeProfileId={activeProfileId} />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-border">
                            <Settings className="h-5 w-5" />
                            <span className="sr-only">Paramètres</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/profile" className="cursor-pointer">
                                <span>Mon Profil</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/admin" className="cursor-pointer">
                                <span>Admin</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <LogoutItem logoutAction={SignOutButton} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Mobile: Combined Menu with profile switcher inside */}
            <div className="sm:hidden">
                <MobileUserMenu
                    profiles={profiles}
                    activeProfileId={activeProfileId}
                    logoutAction={SignOutButton}
                />
            </div>
        </>
    );

    return (
        <>
            {/* Auto-sync TikTok data on login & profile switch */}
            <AutoSync key={`sync-${activeProfileId}`} />
            <DashboardTabs
                analyticsContent={<AnalyticsView key={activeProfileId} />}
                competitorsContent={<CompetitorAnalysisDashboard userId={user.id} key={`comp-${activeProfileId}`} />}
                comparisonContent={<GlobalComparisonDashboard userId={user.id} key={`cmp-${activeProfileId}`} />}
                collectionsContent={<CollectionsView collectionId={searchParams.collection as string} key={`col-${activeProfileId}`} />}
                creationContent={<CreationView key={`crea-${activeProfileId}`} />}
                apiKeyContent={<UnifiedApiSettings />}
                userNav={UserNav}
                activeProfile={activeProfile}
            />
        </>
    );
}
