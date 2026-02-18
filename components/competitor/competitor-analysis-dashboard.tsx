'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Users,
    Plus,
    RefreshCw,
    TrendingUp,
    Eye,
    Heart,
    BarChart3,
    Trash2,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    getCompetitors,
    addCompetitor,
    removeCompetitor,
    syncCompetitor,
    compareWithCompetitors,
} from '@/server/actions/competitor-actions';
import { CompetitorPostsGallery } from './competitor-posts-gallery';
import { CompetitorBenchmark } from '@/components/analytics/competitor-benchmark';

interface CompetitorAnalysisDashboardProps {
    userId: string;
}

export function CompetitorAnalysisDashboard({ userId }: CompetitorAnalysisDashboardProps) {
    const [competitors, setCompetitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newUsername, setNewUsername] = useState('');
    const [adding, setAdding] = useState(false);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [selectedCompetitor, setSelectedCompetitor] = useState<any>(null);
    const [comparison, setComparison] = useState<any>(null);
    const [profileId, setProfileId] = useState<string>('');

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch profile and competitors
            const response = await fetch(`/api/profile?userId=${userId}`);
            const data = await response.json();

            if (data.profile?.id) {
                setProfileId(data.profile.id);
                const result = await getCompetitors(data.profile.id);
                if (result.success) {
                    setCompetitors(result.competitors || []);
                }
                // Load comparison
                const comp = await compareWithCompetitors(userId);
                setComparison(comp);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCompetitor = async () => {
        console.log('Adding competitor:', newUsername, 'ProfileId:', profileId);
        if (!newUsername.trim() || !profileId) {
            console.error('Missing username or profileId');
            return;
        }

        setAdding(true);
        try {
            const result = await addCompetitor(profileId, newUsername);
            console.log('Add result:', result);
            if (result.success) {
                setNewUsername('');
                await loadData();
            } else {
                console.error('Failed to add:', result.error);
            }
        } catch (error) {
            console.error('Error adding competitor:', error);
        } finally {
            setAdding(false);
        }
    };

    const handleSync = async (competitorId: string) => {
        setSyncing(competitorId);
        try {
            await syncCompetitor(competitorId);
            await loadData();
        } catch (error) {
            console.error('Error syncing:', error);
        } finally {
            setSyncing(null);
        }
    };

    const handleRemove = async (competitorId: string) => {
        try {
            await removeCompetitor(competitorId);
            await loadData();
        } catch (error) {
            console.error('Error removing:', error);
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

    if (selectedCompetitor) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => setSelectedCompetitor(null)}
                    className="text-muted-foreground hover:text-foreground"
                >
                    ← Retour aux concurrents
                </Button>
                <CompetitorPostsGallery
                    competitor={selectedCompetitor}
                    onBack={() => setSelectedCompetitor(null)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                    Analyse Concurrentielle
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Suivez et analysez vos concurrents TikTok
                </p>
            </div>

            {/* Engagement Benchmark */}
            <CompetitorBenchmark />

            {/* Add Competitor */}
            <Card className="bg-card/60 backdrop-blur border-border/50">
                <CardHeader>
                    <CardTitle className="text-foreground">Ajouter un Concurrent</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Input
                            placeholder="@username TikTok"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="bg-background border-border text-foreground placeholder:text-muted-foreground flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCompetitor()}
                        />
                        <Button
                            onClick={handleAddCompetitor}
                            disabled={adding || !newUsername.trim()}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto shrink-0"
                        >
                            {adding ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Ajouter
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Comparison Card */}
            {comparison && (
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/15 nebula-glow">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Comparaison Globale
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                            <ComparisonMetric
                                label="Quality Score"
                                userValue={comparison.user.qualityScore}
                                competitorValue={comparison.competitors.qualityScore}
                                gap={comparison.gaps.qualityScore}
                            />
                            <ComparisonMetric
                                label="Performance"
                                userValue={comparison.user.performanceScore}
                                competitorValue={comparison.competitors.performanceScore}
                                gap={comparison.gaps.performanceScore}
                            />
                            <ComparisonMetric
                                label="Score IFS"
                                userValue={comparison.user.intelligentScore}
                                competitorValue={comparison.competitors.intelligentScore}
                                gap={comparison.gaps.intelligentScore}
                            />
                            <ComparisonMetric
                                label="Hook Score"
                                userValue={comparison.user.hookScore}
                                competitorValue={comparison.competitors.hookScore}
                                gap={comparison.gaps.hookScore}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Competitors List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitors.map((competitor) => (
                    <Card
                        key={competitor.id}
                        className="bg-card/60 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer organik-interactive"
                        onClick={() => setSelectedCompetitor(competitor)}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {competitor.avatarUrl ? (
                                        <img
                                            src={competitor.avatarUrl}
                                            alt={competitor.displayName}
                                            className="w-12 h-12 rounded-full border border-border"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="h-6 w-6 text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-foreground">
                                            {competitor.displayName || competitor.tiktokUsername}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">@{competitor.tiktokUsername}</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="text-center p-2.5 bg-primary/5 rounded-xl border border-primary/10">
                                    <Users className="h-4 w-4 text-primary mx-auto mb-1" />
                                    <p className="text-lg font-bold text-foreground">
                                        {formatNumber(competitor.followersCount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Followers</p>
                                </div>
                                <div className="text-center p-2.5 bg-primary/5 rounded-xl border border-primary/10">
                                    <Heart className="h-4 w-4 text-primary mx-auto mb-1" />
                                    <p className="text-lg font-bold text-foreground">
                                        {formatNumber(competitor.likesCount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Likes</p>
                                </div>
                                <div className="text-center p-2.5 bg-primary/5 rounded-xl border border-primary/10">
                                    <Eye className="h-4 w-4 text-primary mx-auto mb-1" />
                                    <p className="text-lg font-bold text-foreground">
                                        {competitor._count?.posts || 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Posts</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 border-border text-foreground hover:bg-muted"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSync(competitor.id);
                                    }}
                                    disabled={syncing === competitor.id}
                                >
                                    {syncing === competitor.id ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Sync
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(competitor.id);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {competitors.length === 0 && (
                    <Card className="bg-card/40 border-border border-dashed col-span-full">
                        <CardContent className="p-12 text-center">
                            <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                                Aucun concurrent suivi
                            </h3>
                            <p className="text-muted-foreground">
                                Ajoutez des concurrents TikTok pour commencer l'analyse
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

// Helper Components

function ComparisonMetric({
    label,
    userValue,
    competitorValue,
    gap,
}: {
    label: string;
    userValue: number;
    competitorValue: number;
    gap: number;
}) {
    return (
        <div className="p-3 sm:p-4 bg-card/80 rounded-xl border border-border/30 hover:border-primary/20 transition-all duration-300">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1.5 sm:mb-2">{label}</p>
            <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xl font-bold text-primary">{userValue.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="text-lg font-semibold text-foreground/70">{competitorValue.toFixed(1)}</span>
            </div>
            <div className={cn(
                "text-sm font-semibold flex items-center gap-1",
                gap > 0 ? "text-emerald-600" : gap < 0 ? "text-red-500" : "text-muted-foreground"
            )}>
                {gap > 0 ? "+" : ""}{gap.toFixed(1)} pts
            </div>
        </div>
    );
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
