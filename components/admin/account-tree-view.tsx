'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Users, Eye, Heart, Video, Clock, Search, X, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { removeProfileFromPanel } from '@/server/actions/admin-panel-actions';
import { toast } from 'sonner';
import { ProfileSelectorDialog } from './profile-selector-dialog';

interface ProfileLink {
    id: string;
    groupLabel: string | null;
    sortOrder: number;
    profile: {
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
        userId: string;
        user: { email: string | null };
    };
}

interface AccountTreeViewProps {
    panel: {
        id: string;
        selectedProfiles: ProfileLink[];
    };
}

function formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
}

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return 'jamais';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'il y a < 1h';
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days}j`;
    return `il y a ${Math.floor(days / 7)}sem`;
}

export function AccountTreeView({ panel }: AccountTreeViewProps) {
    const [profiles, setProfiles] = useState<ProfileLink[]>(panel.selectedProfiles);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Group profiles by groupLabel
    const groups = profiles.reduce((acc, link) => {
        const label = link.groupLabel || 'Non classé';
        if (!acc[label]) acc[label] = [];
        acc[label].push(link);
        return acc;
    }, {} as Record<string, ProfileLink[]>);

    const toggleNode = (id: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRemove = async (profileId: string) => {
        setRemovingId(profileId);
        const result = await removeProfileFromPanel(panel.id, profileId);
        if (result.success) {
            setProfiles(prev => prev.filter(p => p.profile.id !== profileId));
            toast.success('Profil retiré');
        } else {
            toast.error('Erreur');
        }
        setRemovingId(null);
    };

    const handleProfilesAdded = (newProfiles: ProfileLink[]) => {
        setProfiles(prev => [...prev, ...newProfiles]);
    };

    const existingProfileIds = profiles.map(p => p.profile.id);

    return (
        <div className="space-y-4">
            {/* Header actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-mono text-muted-foreground">
                        {profiles.length} compte{profiles.length !== 1 ? 's' : ''} connecté{profiles.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <Button
                    onClick={() => setSelectorOpen(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2 font-bold"
                >
                    <Plus className="h-4 w-4" />
                    Ajouter des comptes
                </Button>
            </div>

            {/* Tree container - dark tech style */}
            <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden">
                {/* Header bar */}
                <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs font-mono text-white/30 hidden sm:block">niche-intelligence://tree-view</span>
                </div>

                {profiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-3">
                        <Users className="h-12 w-12 text-white/10" />
                        <p className="text-white/30 text-sm font-mono">Aucun compte sélectionné</p>
                        <Button
                            onClick={() => setSelectorOpen(true)}
                            variant="outline"
                            size="sm"
                            className="gap-2 border-white/20 text-white/60 hover:text-white hover:border-white/40 bg-transparent"
                        >
                            <Plus className="h-4 w-4" />
                            Ajouter
                        </Button>
                    </div>
                ) : (
                    <div className="p-3 sm:p-4 space-y-1">
                        {Object.entries(groups).map(([groupName, groupProfiles], groupIndex) => (
                            <div key={groupName} className="space-y-0.5">
                                {/* Group header */}
                                <button
                                    onClick={() => toggleNode(`group-${groupName}`)}
                                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                                >
                                    {expandedNodes.has(`group-${groupName}`) || true ? (
                                        <ChevronDown className="h-4 w-4 text-primary/70 shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
                                    )}
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                                    <span className="text-xs font-mono font-bold text-white/50 uppercase tracking-wider">
                                        {groupName}
                                    </span>
                                    <span className="text-[10px] font-mono text-white/20 ml-1">
                                        ({groupProfiles.length})
                                    </span>
                                </button>

                                {/* Profile nodes */}
                                <div className="ml-3 sm:ml-5 border-l border-white/[0.06] pl-3 sm:pl-4 space-y-0.5">
                                    {groupProfiles.map((link, index) => (
                                        <ProfileNode
                                            key={link.profile.id}
                                            link={link}
                                            isLast={index === groupProfiles.length - 1}
                                            isExpanded={expandedNodes.has(link.profile.id)}
                                            onToggle={() => toggleNode(link.profile.id)}
                                            onRemove={() => handleRemove(link.profile.id)}
                                            isRemoving={removingId === link.profile.id}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bottom status bar */}
                {profiles.length > 0 && (
                    <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-t border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-mono text-white/20">
                                TOTAL: {formatNumber(profiles.reduce((s, p) => s + p.profile.followersCount, 0))} followers
                            </span>
                            <span className="text-[10px] font-mono text-white/20 hidden sm:block">
                                {formatNumber(profiles.reduce((s, p) => s + p.profile.videoCount, 0))} vidéos
                            </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-500/60">
                            LIVE
                        </span>
                    </div>
                )}
            </div>

            {/* Profile Selector Dialog */}
            <ProfileSelectorDialog
                open={selectorOpen}
                onOpenChange={setSelectorOpen}
                panelId={panel.id}
                existingProfileIds={existingProfileIds}
                onProfilesAdded={handleProfilesAdded}
            />
        </div>
    );
}

// Individual profile node component
function ProfileNode({
    link,
    isLast,
    isExpanded,
    onToggle,
    onRemove,
    isRemoving,
}: {
    link: ProfileLink;
    isLast: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onRemove: () => void;
    isRemoving: boolean;
}) {
    const { profile } = link;

    return (
        <div className="group">
            {/* Main row */}
            <div
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg hover:bg-white/[0.04] transition-all cursor-pointer"
                onClick={onToggle}
            >
                {/* Connection line dot */}
                <div className="relative shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 ring-2 ring-primary/10" />
                    {!isLast && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-px h-6 bg-white/[0.06]" />
                    )}
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/10">
                    {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <UserCircle className="h-5 w-5 text-white/20" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white/90 truncate">
                            {profile.displayName || profile.username || 'Sans nom'}
                        </span>
                        {profile.username && (
                            <span className="text-[10px] font-mono text-white/30 hidden sm:block">
                                @{profile.username}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                        <span className="text-[10px] font-mono text-white/25 truncate">
                            {profile.user?.email || 'N/A'}
                        </span>
                    </div>
                </div>

                {/* Metrics chips */}
                <div className="hidden sm:flex items-center gap-2">
                    <MetricChip icon={<Users className="h-3 w-3" />} value={formatNumber(profile.followersCount)} color="text-blue-400/70" />
                    <MetricChip icon={<Heart className="h-3 w-3" />} value={formatNumber(profile.likesCount)} color="text-rose-400/70" />
                    <MetricChip icon={<Video className="h-3 w-3" />} value={formatNumber(profile.videoCount)} color="text-emerald-400/70" />
                </div>

                {/* Sync status */}
                <div className="hidden md:flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-white/20" />
                    <span className="text-[10px] font-mono text-white/20">{timeAgo(profile.lastSyncAt)}</span>
                </div>

                {/* Remove button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Retirer ce profil du panel ?')) onRemove();
                    }}
                    disabled={isRemoving}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all shrink-0"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Expanded metrics (mobile) */}
            {isExpanded && (
                <div className="ml-6 sm:ml-8 pl-3 sm:pl-4 pb-2 border-l border-white/[0.04]">
                    <div className="flex flex-wrap gap-2 py-2 sm:hidden">
                        <MetricChip icon={<Users className="h-3 w-3" />} value={formatNumber(profile.followersCount)} color="text-blue-400/70" label="followers" />
                        <MetricChip icon={<Heart className="h-3 w-3" />} value={formatNumber(profile.likesCount)} color="text-rose-400/70" label="likes" />
                        <MetricChip icon={<Video className="h-3 w-3" />} value={formatNumber(profile.videoCount)} color="text-emerald-400/70" label="vidéos" />
                        <MetricChip icon={<Clock className="h-3 w-3" />} value={timeAgo(profile.lastSyncAt)} color="text-white/30" label="sync" />
                    </div>
                    {profile.niche && (
                        <div className="flex items-center gap-2 py-1">
                            <span className="text-[10px] font-mono text-white/20">NICHE:</span>
                            <span className="text-xs text-primary/70 font-medium">{profile.niche}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Small metric chip
function MetricChip({ icon, value, color, label }: { icon: React.ReactNode; value: string; color: string; label?: string }) {
    return (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] ${color}`}>
            {icon}
            <span className="text-[10px] font-mono font-bold tabular-nums">{value}</span>
            {label && <span className="text-[9px] font-mono opacity-50">{label}</span>}
        </div>
    );
}
