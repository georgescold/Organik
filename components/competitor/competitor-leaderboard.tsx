'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface AnalysisResult {
    qualityScore: number;
    performanceScore: number;
    intelligentScore: number;
    engagementRate?: number;
}

interface AnalyzedPost {
    post: any;
    analysis: AnalysisResult;
}

interface CompetitorLeaderboardProps {
    analyzedPosts: AnalyzedPost[];
    onPostClick: (post: any, analysis: AnalysisResult) => void;
}

type ScoreCategory = 'global' | 'hook' | 'body' | 'cta' | 'visual' | 'music' | 'timing' | 'persona';

const categoryLabels: Record<ScoreCategory, string> = {
    global: 'Global',
    hook: 'Hook',
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

export function CompetitorLeaderboard({ analyzedPosts, onPostClick }: CompetitorLeaderboardProps) {
    const [activeCategory, setActiveCategory] = useState<ScoreCategory>('global');

    const getSortedPosts = (category: ScoreCategory) => {
        return [...analyzedPosts].sort((a, b) => {
            switch (category) {
                case 'global':
                    return b.analysis.intelligentScore - a.analysis.intelligentScore;
                case 'hook':
                    return b.analysis.qualityScore - a.analysis.qualityScore;
                default:
                    return b.analysis.intelligentScore - a.analysis.intelligentScore;
            }
        });
    };

    const getRankIcon = (rank: number) => {
        if (rank === 0) return <span className="text-lg sm:text-2xl">🥇</span>;
        if (rank === 1) return <span className="text-lg sm:text-2xl">🥈</span>;
        if (rank === 2) return <span className="text-lg sm:text-2xl">🥉</span>;
        return <span className="text-sm sm:text-lg text-muted-foreground font-bold">{rank + 1}</span>;
    };

    if (analyzedPosts.length === 0) return null;

    const ActiveIcon = categoryIcons[activeCategory];
    const sortedPosts = getSortedPosts(activeCategory);

    return (
        <Card className="bg-card/60 border-border nebula-glow">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <CardTitle className="text-foreground flex items-center gap-2 text-base sm:text-lg">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                    Classement des Posts Analysés
                </CardTitle>

                {/* Select dropdown instead of 8 tabs */}
                <Select value={activeCategory} onValueChange={(v) => setActiveCategory(v as ScoreCategory)}>
                    <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm bg-muted/50 border-border/50">
                        <div className="flex items-center gap-2">
                            <ActiveIcon className="h-3.5 w-3.5 text-primary" />
                            <SelectValue />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(categoryLabels) as ScoreCategory[]).map((cat) => {
                            const Icon = categoryIcons[cat];
                            return (
                                <SelectItem key={cat} value={cat}>
                                    <span className="flex items-center gap-2">
                                        <Icon className="h-3.5 w-3.5 text-primary" />
                                        {categoryLabels[cat]}
                                    </span>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <div className="space-y-1.5 sm:space-y-2">
                    {sortedPosts.slice(0, 10).map((item, index) => {
                        const Icon = categoryIcons[activeCategory];
                        const score = activeCategory === 'global'
                            ? item.analysis.intelligentScore
                            : item.analysis.qualityScore;

                        return (
                            <div
                                key={item.post.id}
                                className={cn(
                                    "flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg cursor-pointer transition-all organik-interactive",
                                    index < 3
                                        ? "bg-gradient-to-r from-primary/5 to-transparent border border-primary/10"
                                        : "bg-muted/20"
                                )}
                                onClick={() => onPostClick(item.post, item.analysis)}
                            >
                                <div className="w-8 sm:w-10 flex justify-center shrink-0">
                                    {getRankIcon(index)}
                                </div>

                                {item.post.coverUrl && (
                                    <img
                                        src={item.post.coverUrl}
                                        alt="Post"
                                        className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded shrink-0"
                                    />
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm text-foreground truncate">
                                        {item.post.description?.slice(0, 50) || 'Sans description'}
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                                        {formatNumber(item.post.views)} vues
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                    <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                                    <span className="text-sm sm:text-lg font-bold text-foreground">
                                        {score.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
