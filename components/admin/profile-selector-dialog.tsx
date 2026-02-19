'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Check, Loader2, UserCircle, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { getAllProfiles, addProfilesToPanel } from '@/server/actions/admin-panel-actions';
import { toast } from 'sonner';

interface Profile {
    id: string;
    displayName: string | null;
    username: string | null;
    platform: string;
    avatarUrl: string | null;
    niche: string | null;
    followersCount: number;
    likesCount: number;
    videoCount: number;
    lastSyncAt: string | null;
    user: { email: string | null };
}

interface ProfileSelectorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    panelId: string;
    existingProfileIds: string[];
    onProfilesAdded: (newProfiles: any[]) => void;
}

function formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
}

export function ProfileSelectorDialog({
    open,
    onOpenChange,
    panelId,
    existingProfileIds,
    onProfilesAdded,
}: ProfileSelectorDialogProps) {
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const cacheRef = useRef<Profile[] | null>(null);

    useEffect(() => {
        if (!open) return;
        if (cacheRef.current) {
            setAllProfiles(cacheRef.current);
            return;
        }
        setIsLoading(true);
        getAllProfiles().then(result => {
            if (result.success && result.profiles) {
                setAllProfiles(result.profiles as Profile[]);
                cacheRef.current = result.profiles as Profile[];
            }
            setIsLoading(false);
        });
    }, [open]);

    // Reset selection when opening
    useEffect(() => {
        if (open) setSelectedIds(new Set());
    }, [open]);

    const toggleProfile = (id: string) => {
        if (existingProfileIds.includes(id)) return;
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleAdd = async () => {
        if (selectedIds.size === 0) return;
        setIsSaving(true);
        const result = await addProfilesToPanel(panelId, Array.from(selectedIds));
        if (result.success) {
            // Build profile links for the parent
            const addedProfiles = allProfiles
                .filter(p => selectedIds.has(p.id))
                .map(p => ({
                    id: `temp-${p.id}`,
                    groupLabel: null,
                    sortOrder: 0,
                    profile: p,
                }));
            onProfilesAdded(addedProfiles);
            toast.success(`${selectedIds.size} profil(s) ajouté(s)`);
            cacheRef.current = null; // Invalidate cache
            onOpenChange(false);
        } else {
            toast.error('Erreur lors de l\'ajout');
        }
        setIsSaving(false);
    };

    // Filter and group by email
    const filtered = allProfiles.filter(p => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            (p.displayName || '').toLowerCase().includes(q) ||
            (p.username || '').toLowerCase().includes(q) ||
            (p.user?.email || '').toLowerCase().includes(q) ||
            (p.niche || '').toLowerCase().includes(q)
        );
    });

    const grouped = filtered.reduce((acc, profile) => {
        const email = profile.user?.email || 'Inconnu';
        if (!acc[email]) acc[email] = [];
        acc[email].push(profile);
        return acc;
    }, {} as Record<string, Profile[]>);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black">Sélectionner des comptes</DialogTitle>
                    <DialogDescription>
                        Tous les comptes enregistrés dans le logiciel
                    </DialogDescription>
                </DialogHeader>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par nom, @username, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11"
                    />
                </div>

                {/* Profile list */}
                <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : Object.entries(grouped).length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-muted-foreground">
                            <Users className="h-10 w-10 mb-2 opacity-40" />
                            <p className="text-sm">Aucun profil trouvé</p>
                        </div>
                    ) : (
                        Object.entries(grouped).map(([email, profiles]) => (
                            <div key={email}>
                                {/* Email group header */}
                                <div className="flex items-center gap-2 py-2 sticky top-0 bg-background z-10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                    <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider truncate">
                                        {email}
                                    </span>
                                    <div className="flex-1 h-px bg-border" />
                                </div>

                                <div className="space-y-0.5">
                                    {profiles.map(profile => {
                                        const isExisting = existingProfileIds.includes(profile.id);
                                        const isSelected = selectedIds.has(profile.id);

                                        return (
                                            <button
                                                key={profile.id}
                                                onClick={() => toggleProfile(profile.id)}
                                                disabled={isExisting}
                                                className={`
                                                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left
                                                    ${isExisting
                                                        ? 'opacity-50 cursor-not-allowed bg-muted/30'
                                                        : isSelected
                                                            ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                                                            : 'hover:bg-muted/50 border border-transparent'
                                                    }
                                                `}
                                            >
                                                {/* Checkbox */}
                                                <div className={`
                                                    w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors
                                                    ${isExisting ? 'border-muted-foreground/30 bg-muted' : isSelected ? 'border-primary bg-primary' : 'border-border'}
                                                `}>
                                                    {(isExisting || isSelected) && <Check className="h-3 w-3 text-primary-foreground" />}
                                                </div>

                                                {/* Avatar */}
                                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                                                    {profile.avatarUrl ? (
                                                        <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                                            <UserCircle className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold truncate">
                                                            {profile.displayName || profile.username || 'Sans nom'}
                                                        </span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono uppercase">
                                                            {profile.platform}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        {profile.username && (
                                                            <span className="text-xs text-muted-foreground">@{profile.username}</span>
                                                        )}
                                                        <span className="text-xs text-muted-foreground tabular-nums">
                                                            {formatNumber(profile.followersCount)} followers
                                                        </span>
                                                    </div>
                                                </div>

                                                {isExisting && (
                                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">DÉJÀ AJOUTÉ</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleAdd}
                        disabled={selectedIds.size === 0 || isSaving}
                        className="font-bold gap-2"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Ajouter {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
