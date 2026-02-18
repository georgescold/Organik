'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Trophy,
    Zap,
    MessageSquare,
    Target,
    Eye,
    Music,
    Clock,
    User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostDetailsModal } from './post-details-modal';

interface AnalysisResult {
    qualityScore: number;
    performanceScore: number;
    intelligentScore: number;
    qsHookTotal?: number;
    qsBodyTotal?: number;
    qsCtaTotal?: number;
    qsVisualTotal?: number;
    qsMusicTotal?: number;
    qsTimingTotal?: number;
    qsPersonaTotal?: number;
}

interface UserPost {
    id: string;
    title: string | null;
    description: string | null;
    hookText?: string | null;
    coverUrl?: string | null;
    slides?: string;
    metrics: {
        views: number;
        likes: number;
        comments: number;
        saves: number;
    } | null;
    analysis: AnalysisResult | null;
}

interface UserLeaderboardProps {
    posts: UserPost[];
}

type ScoreCategory = 'global' | 'hook' | 'body' | 'cta' | 'visual' | 'music' | 'timing' | 'persona';

const categoryLabels: Record<ScoreCategory, string> = {
    global: 'Score Global',
    hook: 'Hooks',
    body: 'Body',
    cta: 'CTA',
    visual: 'Visual',
    music: 'Music',
    timing: 'Timing',
    persona: 'Persona',
};

const categoryIcons: Record<ScoreCategory, any> = {
    global: Trophy,
    hook: Zap,
    body: MessageSquare,
    cta: Target,
    visual: Eye,
    music: Music,
    timing: Clock,
    persona: User,
};

export function UserLeaderboard({ posts }: UserLeaderboardProps) {
    const [activeCategory, setActiveCategory] = useState<ScoreCategory>('global');

    const analyzedPosts = posts.filter(p => p.analysis);

    const getSortedPosts = (category: ScoreCategory) => {
        return [...analyzedPosts].sort((a, b) => {
            const analysisA = a.analysis!;
            const analysisB = b.analysis!;

            switch (category) {
                case 'global': return analysisB.intelligentScore - analysisA.intelligentScore;
                case 'hook': return (analysisB.qsHookTotal || 0) - (analysisA.qsHookTotal || 0);
                case 'body': return (analysisB.qsBodyTotal || 0) - (analysisA.qsBodyTotal || 0);
                case 'cta': return (analysisB.qsCtaTotal || 0) - (analysisA.qsCtaTotal || 0);
                case 'visual': return (analysisB.qsVisualTotal || 0) - (analysisA.qsVisualTotal || 0);
                case 'music': return (analysisB.qsMusicTotal || 0) - (analysisA.qsMusicTotal || 0);
                case 'timing': return (analysisB.qsTimingTotal || 0) - (analysisA.qsTimingTotal || 0);
                case 'persona': return (analysisB.qsPersonaTotal || 0) - (analysisA.qsPersonaTotal || 0);
                default: return analysisB.intelligentScore - analysisA.intelligentScore;
            }
        });
    };

    const getRankIcon = (rank: number) => {
        if (rank === 0) return <span className="text-xl sm:text-2xl">🥇</span>;
        if (rank === 1) return <span className="text-xl sm:text-2xl">🥈</span>;
        if (rank === 2) return <span className="text-xl sm:text-2xl">🥉</span>;
        return <span className="text-sm sm:text-lg text-muted-foreground font-bold">{rank + 1}</span>;
    };

    if (analyzedPosts.length === 0) return null;

    const ActiveIcon = categoryIcons[activeCategory];
    const sortedPosts = getSortedPosts(activeCategory);

    return (
        <Card className="bg-card/50 backdrop-blur border-border/50 nebula-glow overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Trophy className="h-5 w-5 text-primary" />
                        Classements
                    </CardTitle>

                    {/* Category Select — replaces 8-tab overflow */}
                    <Select value={activeCategory} onValueChange={(v) => setActiveCategory(v as ScoreCategory)}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs sm:text-sm bg-muted/50 border-border/50">
                            <div className="flex items-center gap-2">
                                <ActiveIcon className="w-3.5 h-3.5 text-primary" />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.entries(categoryLabels) as [ScoreCategory, string][]).map(([key, label]) => {
                                const Icon = categoryIcons[key];
                                return (
                                    <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-3.5 h-3.5" />
                                            {label}
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2 sm:space-y-3">
                    {sortedPosts.slice(0, 10).map((post, index) => {
                        let score = 0;
                        let maxScore = 100;

                        if (post.analysis) {
                            switch (activeCategory) {
                                case 'global': score = post.analysis.intelligentScore; break;
                                case 'hook': score = post.analysis.qsHookTotal || 0; maxScore = 25; break;
                                case 'body': score = post.analysis.qsBodyTotal || 0; maxScore = 20; break;
                                case 'cta': score = post.analysis.qsCtaTotal || 0; maxScore = 10; break;
                                case 'visual': score = post.analysis.qsVisualTotal || 0; maxScore = 15; break;
                                case 'music': score = post.analysis.qsMusicTotal || 0; maxScore = 10; break;
                                case 'timing': score = post.analysis.qsTimingTotal || 0; maxScore = 10; break;
                                case 'persona': score = post.analysis.qsPersonaTotal || 0; maxScore = 10; break;
                            }
                        }

                        const normalizedScore = (score / maxScore) * 100;

                        let coverUrl: string | null = null;
                        if (post.slides) {
                            try {
                                const slides = JSON.parse(post.slides);
                                if (slides.length > 0) coverUrl = slides[0].image_url || slides[0].imageUrl || null;
                            } catch { /* JSON parse fallback */ }
                        }
                        if (!coverUrl) coverUrl = post.coverUrl || null;

                        return (
                            <PostDetailsModal key={post.id} postId={post.id}>
                                <div
                                    className={cn(
                                        "relative overflow-hidden flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 border group organik-interactive",
                                        index < 3
                                            ? "bg-gradient-to-r from-primary/5 to-transparent border-primary/10"
                                            : "bg-background/50 border-transparent"
                                    )}
                                >
                                    {/* Rank */}
                                    <div className="w-8 sm:w-12 flex justify-center shrink-0">
                                        {getRankIcon(index)}
                                    </div>

                                    {/* Image */}
                                    <div className="relative w-10 h-14 sm:w-12 sm:h-16 shrink-0 rounded-md overflow-hidden bg-muted">
                                        {coverUrl ? (
                                            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">?</div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 z-10">
                                        <p className="font-medium truncate text-xs sm:text-sm mb-1 group-hover:text-primary transition-colors">
                                            {post.title || post.hookText || "Sans titre"}
                                        </p>
                                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                                            <span>{post.metrics?.views.toLocaleString()} vues</span>
                                            <span>{post.metrics?.likes.toLocaleString()} likes</span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-2 sm:mt-3 h-1 sm:h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                                                style={{ width: `${normalizedScore}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="flex flex-col items-end gap-1 shrink-0 z-10 w-14 sm:w-20">
                                        <div className="flex items-center gap-1">
                                            <span className={cn(
                                                "text-base sm:text-xl font-bold",
                                                index < 3 ? "text-primary" : "text-foreground"
                                            )}>
                                                {score.toFixed(1)}
                                            </span>
                                            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                                                /{maxScore}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </PostDetailsModal>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
