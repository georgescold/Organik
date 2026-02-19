'use client';

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { switchProfile } from "@/server/actions/profile-actions";
import { toast } from "sonner";
import { useState } from "react";

interface Profile {
    id: string;
    displayName: string | null;
    username: string | null;
    platform: string;
    avatarUrl: string | null;
}

interface MobileUserMenuProps {
    profiles: Profile[];
    activeProfileId: string | null;
    logoutAction: () => Promise<void>;
}

export function MobileUserMenu({ profiles, activeProfileId, logoutAction }: MobileUserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

    const handleSwitchProfile = async (profileId: string) => {
        const result = await switchProfile(profileId);
        if (result.success) {
            toast.success("Profil changé");
            window.location.reload(); // Refresh to update UI
        } else {
            toast.error("Erreur lors du changement de profil");
        }
        setIsOpen(false);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full border border-border"
                >
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-w-[90vw]">
                {/* Profile Selection - Only on mobile */}
                <div className="sm:hidden">
                    <DropdownMenuLabel>Profils</DropdownMenuLabel>
                    {profiles.map((profile) => (
                        <DropdownMenuItem
                            key={profile.id}
                            onClick={() => handleSwitchProfile(profile.id)}
                            className={`cursor-pointer ${profile.id === activeProfileId ? 'bg-muted' : ''}`}
                        >
                            <div className="flex items-center gap-2 w-full">
                                {profile.avatarUrl ? (
                                    <img
                                        src={profile.avatarUrl}
                                        alt={profile.displayName || profile.username || 'Profile'}
                                        className="w-6 h-6 rounded-full"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                                        {(profile.displayName || profile.username || 'P')[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">
                                        {profile.displayName || profile.username || 'Sans nom'}
                                    </div>
                                    <div className="text-xs text-muted-foreground capitalize">
                                        {profile.platform}
                                    </div>
                                </div>
                                {profile.id === activeProfileId && (
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                )}
                            </div>
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                </div>

                {/* Settings */}
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

                {/* Logout */}
                <DropdownMenuItem
                    onClick={async () => {
                        await logoutAction();
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive"
                >
                    <span>Se déconnecter</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
