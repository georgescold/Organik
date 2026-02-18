'use client';

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, Minus } from 'lucide-react';
import { getCompetitorBenchmark } from '@/server/actions/analytics-actions';

interface BenchmarkData {
    userEngagementRate: number;
    competitorEngagementRate: number;
    difference: number;
    direction: 'above' | 'below' | 'equal';
    userPostCount: number;
    competitorPostCount: number;
    competitorCount: number;
}

export function CompetitorBenchmark() {
    const [data, setData] = useState<BenchmarkData | null>(null);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        startTransition(async () => {
            const res = await getCompetitorBenchmark();
            if ('benchmark' in res && res.benchmark) {
                setData(res.benchmark);
            }
        });
    }, []);

    if (isLoading) {
        return (
            <Card className="bg-card/50 border-border/50 animate-pulse">
                <CardContent className="p-4 h-24" />
            </Card>
        );
    }

    if (!data || data.competitorCount === 0) {
        return (
            <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                    Ajoutez des concurrents pour comparer votre engagement.
                </CardContent>
            </Card>
        );
    }

    const isAbove = data.direction === 'above';
    const isBelow = data.direction === 'below';

    return (
        <Card className={`bg-card/50 border-border/50 ${isAbove ? 'ring-1 ring-emerald-500/20' : isBelow ? 'ring-1 ring-red-500/20' : ''}`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${isAbove ? 'bg-emerald-500/10' : isBelow ? 'bg-red-500/10' : 'bg-muted/50'}`}>
                        {isAbove ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : isBelow ? <TrendingDown className="w-5 h-5 text-red-400" /> : <Minus className="w-5 h-5 text-muted-foreground" />}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Votre engagement vs concurrents</p>
                        <div className="flex items-baseline gap-3 mt-0.5">
                            <span className="text-lg font-black">{data.userEngagementRate}%</span>
                            <span className="text-xs text-muted-foreground">vs</span>
                            <span className="text-sm font-semibold text-muted-foreground">{data.competitorEngagementRate}%</span>
                            <span className={`text-xs font-bold ${isAbove ? 'text-emerald-400' : isBelow ? 'text-red-400' : 'text-muted-foreground'}`}>
                                ({data.difference > 0 ? '+' : ''}{data.difference}%)
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Basé sur {data.userPostCount} de vos posts vs {data.competitorPostCount} posts de {data.competitorCount} concurrent{data.competitorCount > 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
