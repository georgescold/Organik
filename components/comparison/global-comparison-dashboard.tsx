'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    BarChart3,
    Trophy,
    Zap,
    Target,
    MessageSquare,
    Eye,
    Music,
    Clock,
    User,
    TrendingUp,
    TrendingDown,
    Users,
    FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { compareWithCompetitors } from '@/server/actions/competitor-actions';

interface ComparisonData {
    user: {
        qualityScore: number;
        performanceScore: number;
        intelligentScore: number;
        hookScore: number;
        bodyScore: number;
        ctaScore: number;
        visualScore: number;
        musicScore: number;
        timingScore: number;
        personaScore: number;
        analyzedCount: number;
    };
    competitors: {
        qualityScore: number;
        performanceScore: number;
        intelligentScore: number;
        hookScore: number;
        bodyScore: number;
        ctaScore: number;
        visualScore: number;
        musicScore: number;
        timingScore: number;
        personaScore: number;
        analyzedCount: number;
    };
    gaps: Record<string, number>;
}

interface GlobalComparisonDashboardProps {
    userId: string;
}

export function GlobalComparisonDashboard({ userId }: GlobalComparisonDashboardProps) {
    const [comparison, setComparison] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadComparison();
    }, [userId]);

    const loadComparison = async () => {
        setLoading(true);
        try {
            const data = await compareWithCompetitors(userId);
            setComparison(data as ComparisonData);
        } catch (error) {
            console.error('Error loading comparison:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    if (!comparison) {
        return (
            <Card className="bg-card/60 border-border">
                <CardContent className="p-12 text-center">
                    <BarChart3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">Aucune donnée de comparaison</h3>
                    <p className="text-muted-foreground">
                        Analysez d'abord vos posts et ceux de vos concurrents pour voir la comparaison.
                    </p>
                    <div className="flex gap-4 justify-center mt-6 text-sm text-muted-foreground/60">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Vos posts analysés: 0</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Posts concurrents analysés: 0</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const categories = [
        { key: 'hookScore', label: 'Hook', icon: Zap, color: 'yellow' },
        { key: 'bodyScore', label: 'Body', icon: MessageSquare, color: 'blue' },
        { key: 'ctaScore', label: 'CTA', icon: Target, color: 'green' },
        { key: 'visualScore', label: 'Visual', icon: Eye, color: 'purple' },
        { key: 'musicScore', label: 'Music', icon: Music, color: 'pink' },
        { key: 'timingScore', label: 'Timing', icon: Clock, color: 'orange' },
        { key: 'personaScore', label: 'Persona', icon: User, color: 'cyan' },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
                        <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                        Comparaison Globale
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Comparez vos performances avec vos concurrents
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                    <Badge variant="outline" className="px-2 sm:px-4 py-1.5 sm:py-2 text-primary border-primary/30">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                        {comparison.user.analyzedCount} vos posts
                    </Badge>
                    <Badge variant="outline" className="px-2 sm:px-4 py-1.5 sm:py-2">
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                        {comparison.competitors.analyzedCount} concurrents
                    </Badge>
                </div>
            </div>

            {/* Main Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <MainScoreCard
                    label="Score Qualité"
                    userScore={comparison.user.qualityScore}
                    competitorScore={comparison.competitors.qualityScore}
                    gap={comparison.gaps.qualityScore}
                    icon={Trophy}
                    color="yellow"
                />
                <MainScoreCard
                    label="Performance"
                    userScore={comparison.user.performanceScore}
                    competitorScore={comparison.competitors.performanceScore}
                    gap={comparison.gaps.performanceScore}
                    icon={TrendingUp}
                    color="blue"
                />
                <MainScoreCard
                    label="Score IFS"
                    userScore={comparison.user.intelligentScore}
                    competitorScore={comparison.competitors.intelligentScore}
                    gap={comparison.gaps.intelligentScore}
                    icon={Zap}
                    color="primary"
                />
            </div>

            {/* Category Breakdown */}
            <Card className="bg-card/60 border-border/50">
                <CardHeader>
                    <CardTitle className="text-foreground">Détails par Catégorie</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const userScore = (comparison.user as any)[cat.key] || 0;
                            const compScore = (comparison.competitors as any)[cat.key] || 0;
                            const gap = (comparison.gaps as any)[cat.key] || 0;

                            return (
                                <div
                                    key={cat.key}
                                    className="p-3 sm:p-4 bg-card/80 rounded-xl border border-border/30 hover:border-primary/20 transition-all duration-300"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <Icon className={cn("h-4 w-4", getColorClass(cat.color))} />
                                        <span className="text-sm font-medium text-foreground">{cat.label}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className={cn("text-xl font-bold", getColorClass(cat.color))}>
                                            {userScore.toFixed(1)}
                                        </span>
                                        <span className="text-muted-foreground text-xs">vs</span>
                                        <span className="text-lg font-bold text-foreground">{compScore.toFixed(1)}</span>
                                    </div>
                                    <div className={cn(
                                        "text-sm font-semibold flex items-center gap-1",
                                        gap > 0 ? "text-green-500" : gap < 0 ? "text-red-500" : "text-muted-foreground"
                                    )}>
                                        {gap > 0 ? <TrendingUp className="h-3 w-3" /> : gap < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                                        {gap > 0 ? '+' : ''}{gap.toFixed(1)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Insights */}
            <InsightsCard comparison={comparison} categories={categories} />
        </div>
    );
}

function MainScoreCard({
    label,
    userScore,
    competitorScore,
    gap,
    icon: Icon,
    color,
}: {
    label: string;
    userScore: number;
    competitorScore: number;
    gap: number;
    icon: any;
    color: string;
}) {
    return (
        <Card className={cn(
            "border-border/40 overflow-hidden bg-gradient-to-br from-primary/8 via-card to-card"
        )}>
            <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className={cn("h-6 w-6", getColorClass(color))} />
                    </div>
                    <span className="text-foreground/80 font-medium">{label}</span>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Vous</span>
                        <span className={cn("text-2xl font-bold", getColorClass(color))}>
                            {userScore.toFixed(1)}
                        </span>
                    </div>
                    <Progress value={userScore} className="h-2" />

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Concurrents</span>
                        <span className="text-2xl font-bold text-foreground">
                            {competitorScore.toFixed(1)}
                        </span>
                    </div>
                    <Progress value={competitorScore} className="h-2 opacity-60" />

                    <div className={cn(
                        "flex items-center justify-center gap-2 pt-2 border-t border-border/50",
                        gap > 0 ? "text-green-500" : gap < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                        {gap > 0 ? <TrendingUp className="h-5 w-5" /> : gap < 0 ? <TrendingDown className="h-5 w-5" /> : null}
                        <span className="text-lg font-bold">{gap > 0 ? '+' : ''}{gap.toFixed(1)}</span>
                        <span className="text-sm opacity-60">
                            {gap > 0 ? 'en avance' : gap < 0 ? 'en retard' : 'à égalité'}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function InsightsCard({ comparison, categories }: { comparison: ComparisonData; categories: any[] }) {
    const insights: { type: 'positive' | 'negative' | 'neutral'; message: string }[] = [];

    const sortedByGap = [...categories].sort(
        (a, b) => (comparison.gaps[b.key] || 0) - (comparison.gaps[a.key] || 0)
    );

    const strengths = sortedByGap.filter(c => (comparison.gaps[c.key] || 0) > 2).slice(0, 2);
    const weaknesses = sortedByGap.filter(c => (comparison.gaps[c.key] || 0) < -2).slice(-2).reverse();

    strengths.forEach(s => {
        insights.push({
            type: 'positive',
            message: `Vos ${s.label}s sont meilleurs que la concurrence (+${(comparison.gaps[s.key] || 0).toFixed(1)} pts)`
        });
    });

    weaknesses.forEach(w => {
        insights.push({
            type: 'negative',
            message: `Améliorez vos ${w.label}s (${(comparison.gaps[w.key] || 0).toFixed(1)} pts de retard)`
        });
    });

    if (insights.length === 0) {
        insights.push({
            type: 'neutral',
            message: 'Vos performances sont similaires à celles de vos concurrents'
        });
    }

    return (
        <Card className="bg-card/60 border-border/50 nebula-glow">
            <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2 text-base sm:text-lg">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Insights & Recommandations
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {insights.map((insight, index) => (
                    <div
                        key={index}
                        className={cn(
                            "p-4 rounded-lg border flex items-start gap-3",
                            insight.type === 'positive' ? "bg-green-500/10 border-green-500/20" :
                                insight.type === 'negative' ? "bg-red-500/10 border-red-500/20" :
                                    "bg-muted/30 border-border/50"
                        )}
                    >
                        {insight.type === 'positive' ? (
                            <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : insight.type === 'negative' ? (
                            <TrendingDown className="h-5 w-5 text-red-500 mt-0.5" />
                        ) : (
                            <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
                        )}
                        <span className="text-foreground/80">{insight.message}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function getColorClass(color: string): string {
    const colors: Record<string, string> = {
        primary: 'text-primary',
        yellow: 'text-yellow-500',
        blue: 'text-blue-500',
        green: 'text-green-500',
        purple: 'text-purple-500',
        pink: 'text-pink-500',
        orange: 'text-orange-500',
        cyan: 'text-cyan-500',
    };
    return colors[color] || 'text-foreground';
}


