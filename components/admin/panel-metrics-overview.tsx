'use client';

import { useState, useEffect } from 'react';
import { Users, Heart, Video, Eye, FileText, Loader2, TrendingUp, UserCircle } from 'lucide-react';
import { getPanelMetrics } from '@/server/actions/admin-panel-actions';

interface PanelMetricsOverviewProps {
    panelId: string;
}

function formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
}

export function PanelMetricsOverview({ panelId }: PanelMetricsOverviewProps) {
    const [metrics, setMetrics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getPanelMetrics(panelId).then(result => {
            if (result.success) {
                setMetrics(result.metrics);
            }
            setIsLoading(false);
        });
    }, [panelId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                Impossible de charger les métriques
            </div>
        );
    }

    const statCards = [
        { label: 'Total Followers', value: formatNumber(metrics.totalFollowers), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Total Likes', value: formatNumber(metrics.totalLikes), icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { label: 'Total Vidéos', value: formatNumber(metrics.totalVideos), icon: Video, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Posts Analysés', value: formatNumber(metrics.totalPosts), icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    ];

    // Find max followers for bar chart scaling
    const maxFollowers = Math.max(...(metrics.profiles || []).map((p: any) => p.followersCount), 1);

    return (
        <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {statCards.map((stat) => (
                    <div key={stat.label} className="bg-card border-2 border-border rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight">{stat.value}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Profile comparison - horizontal bars */}
            {metrics.profiles && metrics.profiles.length > 0 && (
                <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                    <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <TrendingUp className="h-4.5 w-4.5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg">Comparaison des comptes</h3>
                                <p className="text-xs text-muted-foreground">Répartition des followers par compte</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {metrics.profiles
                                .sort((a: any, b: any) => b.followersCount - a.followersCount)
                                .map((profile: any) => {
                                    const percentage = (profile.followersCount / maxFollowers) * 100;
                                    return (
                                        <div key={profile.id} className="flex items-center gap-3">
                                            {/* Avatar */}
                                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-1 ring-border">
                                                {profile.avatarUrl ? (
                                                    <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Name */}
                                            <div className="w-24 sm:w-32 shrink-0">
                                                <p className="text-sm font-bold truncate">{profile.displayName || profile.username || 'N/A'}</p>
                                            </div>

                                            {/* Bar */}
                                            <div className="flex-1 h-6 bg-muted rounded-lg overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                                                    style={{ width: `${Math.max(percentage, 3)}%` }}
                                                >
                                                    {percentage > 20 && (
                                                        <span className="text-[10px] font-mono font-bold text-primary-foreground tabular-nums">
                                                            {formatNumber(profile.followersCount)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {percentage <= 20 && (
                                                <span className="text-xs font-mono font-bold text-muted-foreground tabular-nums shrink-0">
                                                    {formatNumber(profile.followersCount)}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* Top posts table */}
            {metrics.topPosts && metrics.topPosts.length > 0 && (
                <div className="bg-card border-2 border-border rounded-xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                    <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Eye className="h-4.5 w-4.5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg">Top Posts</h3>
                                <p className="text-xs text-muted-foreground">Les posts les plus performants de vos comptes</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-2 font-bold text-muted-foreground text-xs uppercase tracking-wider">Compte</th>
                                        <th className="text-left py-2 font-bold text-muted-foreground text-xs uppercase tracking-wider">Contenu</th>
                                        <th className="text-right py-2 font-bold text-muted-foreground text-xs uppercase tracking-wider">Vues</th>
                                        <th className="text-right py-2 font-bold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Likes</th>
                                        <th className="text-right py-2 font-bold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Commentaires</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.topPosts.map((post: any, index: number) => (
                                        <tr key={post.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                                            <td className="py-2.5 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-muted-foreground w-4">{index + 1}</span>
                                                    <div className="w-6 h-6 rounded overflow-hidden shrink-0">
                                                        {post.profile?.avatarUrl ? (
                                                            <img src={post.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-muted" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium truncate text-xs max-w-[80px] sm:max-w-[120px]">
                                                        {post.profile?.displayName || post.profile?.username || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 pr-3">
                                                <p className="truncate max-w-[120px] sm:max-w-[200px] text-muted-foreground text-xs">
                                                    {post.hookText || post.description || '—'}
                                                </p>
                                            </td>
                                            <td className="py-2.5 text-right tabular-nums font-bold text-xs">
                                                {formatNumber(post.metrics?.views || 0)}
                                            </td>
                                            <td className="py-2.5 text-right tabular-nums text-xs hidden sm:table-cell text-muted-foreground">
                                                {formatNumber(post.metrics?.likes || 0)}
                                            </td>
                                            <td className="py-2.5 text-right tabular-nums text-xs hidden md:table-cell text-muted-foreground">
                                                {formatNumber(post.metrics?.comments || 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
