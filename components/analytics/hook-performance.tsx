'use client';

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { getHookPerformanceStats } from '@/server/actions/analytics-actions';

interface HookStat {
    type: string;
    label: string;
    count: number;
    avgViews: number;
    avgEngagement: number;
    bestHook: string;
    bestViews: number;
}

export function HookPerformance() {
    const [data, setData] = useState<{ hookStats: HookStat[]; totalPosts: number } | null>(null);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const res = await getHookPerformanceStats();
            if ('stats' in res && res.stats) {
                setData({ hookStats: res.stats.hookStats, totalPosts: res.stats.totalPosts });
            }
        });
    }, []);

    if (isLoading || !data) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                    <Card key={i} className="bg-card/50 border-border/50 animate-pulse">
                        <CardContent className="p-4 h-32" />
                    </Card>
                ))}
            </div>
        );
    }

    if (data.hookStats.length === 0) {
        return (
            <Card className="bg-card/50 border-border/50">
                <CardContent className="p-6 text-center text-muted-foreground">
                    Pas assez de données pour analyser les hooks.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.hookStats.map((stat, i) => (
                <Card key={stat.type} className={`bg-card/50 border-border/50 transition-all hover:border-primary/20 ${i === 0 ? 'ring-1 ring-primary/20' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className={`w-4 h-4 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="font-bold text-sm">{stat.label}</span>
                            </div>
                            <Badge variant={i === 0 ? 'default' : 'outline'} className="text-[10px]">
                                {stat.count} posts
                            </Badge>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <div>
                                <p className="text-lg font-black">{formatNumber(stat.avgViews)}</p>
                                <p className="text-[10px] text-muted-foreground">vues moy.</p>
                            </div>
                            <div>
                                <p className="text-lg font-black text-emerald-400">{stat.avgEngagement}%</p>
                                <p className="text-[10px] text-muted-foreground">engagement</p>
                            </div>
                        </div>
                        {stat.bestHook && (
                            <p className="text-[11px] text-muted-foreground/80 line-clamp-2 italic">
                                &ldquo;{stat.bestHook}&rdquo;
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}
