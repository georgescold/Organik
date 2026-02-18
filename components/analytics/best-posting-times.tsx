'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp, Calendar } from 'lucide-react';
import { getBestPostingTimes } from '@/server/actions/analytics-actions';

export function BestPostingTimes() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getBestPostingTimes().then(res => {
            if (res.success) setData(res);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                        </div>
                        Meilleurs moments pour poster
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-24 bg-muted/20 rounded-xl animate-pulse" />
                </CardContent>
            </Card>
        );
    }

    if (!data?.recommendation) {
        return (
            <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                        </div>
                        Meilleurs moments pour poster
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {data?.message || "Pas assez de posts pour analyser (minimum 5)"}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { bestDays, bestHours } = data.recommendation;

    return (
        <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                    </div>
                    Meilleurs moments pour poster
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5">
                {/* Best Days */}
                {bestDays?.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            <Calendar className="h-3 w-3" />
                            Meilleurs jours
                        </div>
                        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
                            {bestDays.map((d: any, i: number) => (
                                <div
                                    key={d.day}
                                    className={`flex-1 min-w-[72px] sm:min-w-[80px] text-center p-2 sm:p-2.5 rounded-xl border transition-all snap-start ${
                                        i === 0
                                            ? 'bg-primary/10 border-primary/20 shadow-sm'
                                            : 'bg-muted/20 border-border/30'
                                    }`}
                                >
                                    <div className={`text-xs sm:text-sm font-bold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>
                                        {d.day}
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
                                        <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                                        <span className="truncate">{formatViews(d.avgViews)}</span>
                                    </div>
                                    <div className="text-[9px] sm:text-[10px] text-muted-foreground/50">
                                        {d.postCount} posts
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Best Hours */}
                {bestHours?.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            <Clock className="h-3 w-3" />
                            Meilleurs créneaux
                        </div>
                        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
                            {bestHours.map((h: any, i: number) => (
                                <div
                                    key={h.hour}
                                    className={`flex-1 min-w-[72px] sm:min-w-[80px] text-center p-2 sm:p-2.5 rounded-xl border transition-all snap-start ${
                                        i === 0
                                            ? 'bg-primary/10 border-primary/20 shadow-sm'
                                            : 'bg-muted/20 border-border/30'
                                    }`}
                                >
                                    <div className={`text-xs sm:text-sm font-bold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>
                                        {h.hour}
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
                                        <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                                        <span className="truncate">{formatViews(h.avgViews)}</span>
                                    </div>
                                    <div className="text-[9px] sm:text-[10px] text-muted-foreground/50">
                                        {h.postCount} posts
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function formatViews(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
