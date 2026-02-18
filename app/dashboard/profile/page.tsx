import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { activeProfileId: true, profiles: { take: 1 } }
    });

    const activeProfileId = user?.activeProfileId || user?.profiles[0]?.id;

    if (!activeProfileId) {
        // Handle case where user has no profile (though onboarding should catch this)
        return <div>Aucun profil actif.</div>;
    }

    const profile = await prisma.profile.findUnique({
        where: { id: activeProfileId }
    });

    if (!profile) redirect("/dashboard");

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4">
            <Link href="/dashboard" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-8 group">
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Retour au tableau de bord
            </Link>

            <div className="flex flex-col items-center mb-16 space-y-4">
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter hover:scale-105 transition-transform cursor-default select-none py-2 text-foreground">
                    Mon Profil
                </h1>
                <p className="text-muted-foreground font-medium text-lg pt-2">Gère ton identité et tes objectifs</p>
            </div>

            <div className="bg-card border-2 border-border p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow duration-300">
                <ProfileForm
                    initialData={{
                        tiktokName: profile.displayName || profile.username || "",
                        tiktokBio: profile.bio || "",
                        persona: profile.persona || "",
                        targetAudience: profile.targetAudience || "",
                        niche: profile.niche || "",
                        leadMagnet: profile.leadMagnet || "",
                        avatarUrl: profile.avatarUrl || undefined,
                        followersCount: profile.followersCount || 0,
                        hashtags: profile.hashtags || "",
                        syncPostLimit: profile.syncPostLimit || 50
                    }}
                />
            </div>
        </div>
    );
}
