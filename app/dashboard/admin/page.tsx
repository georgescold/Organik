import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAdminPanels } from "@/server/actions/admin-panel-actions";
import { AdminPanelList } from "@/components/admin/admin-panel-list";

export default async function AdminPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const result = await getAdminPanels();
    const panels = result.success ? result.panels || [] : [];

    return (
        <div className="container max-w-6xl mx-auto py-6 sm:py-8 px-3 sm:px-4">
            <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6 sm:mb-8 group">
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Retour au tableau de bord
            </Link>

            <div className="flex flex-col items-center mb-10 sm:mb-16 space-y-3 sm:space-y-4">
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter hover:scale-105 transition-transform cursor-default select-none py-2 text-foreground text-center">
                    Admin
                </h1>
                <p className="text-muted-foreground font-medium text-base sm:text-lg pt-1 sm:pt-2 text-center px-4">
                    Pilotez vos niches et analysez vos comptes de manière macroscopique
                </p>
            </div>

            <AdminPanelList initialPanels={panels} />
        </div>
    );
}
