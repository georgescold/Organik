'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Trophy,
    TrendingUp,
    Zap,
    MessageSquare,
    Target,
    Eye,
    Music,
    Clock,
    User,
    RefreshCcw,
    Sparkles,
    Image as ImageIcon,
    Shuffle,
    Loader2,
    ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { remixCompetitorPost } from '@/server/actions/creation-actions';
import { toast } from 'sonner';

interface AnalysisResult {
    qualityScore: number;
    performanceScore: number;
    intelligentScore: number;
    engagementRate?: number;
}

interface CompetitorPostAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: any;
    analysis: AnalysisResult | null;
}

export function CompetitorPostAnalysisModal({
    isOpen,
    onClose,
    post,
    analysis,
    onAnalyze,
    isAnalyzing,
}: CompetitorPostAnalysisModalProps & { onAnalyze?: (id: string) => void; isAnalyzing?: boolean }) {
    const [remixHooks, setRemixHooks] = useState<any[]>([]);
    const [isRemixing, setIsRemixing] = useState(false);

    if (!post) return null;

    // Parse carousel images if available
    let carouselImages: string[] = [];
    try {
        if (post.carouselImages) {
            const parsed = typeof post.carouselImages === 'string' ? JSON.parse(post.carouselImages) : post.carouselImages;
            if (Array.isArray(parsed)) carouselImages = parsed;
        }
    } catch { /* JSON parse fallback */ }

    const hasAnalysis = !!analysis;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-4xl bg-card border-border text-card-foreground max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-base sm:text-xl font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            {hasAnalysis ? 'Analyse du Post' : 'Détails du Post'}
                        </div>
                        {!hasAnalysis && onAnalyze && (
                            <Button
                                onClick={() => onAnalyze(post.id)}
                                disabled={isAnalyzing}
                                size="sm"
                                className="bg-primary hover:bg-primary/90"
                            >
                                {isAnalyzing ? '...' : 'Lancer l\'analyse'}
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    {/* Post Preview & Stats */}
                    <div className="space-y-4">
                        {/* Cover / Carousel Main */}
                        <div className="space-y-2">
                            {post.webVideoUrl ? (
                                <div className="aspect-[9/16] rounded-lg overflow-hidden bg-black relative">
                                    <video src={post.webVideoUrl} controls className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <img
                                    src={post.coverUrl || carouselImages[0]}
                                    alt="Post"
                                    className="w-full aspect-[9/16] object-cover rounded-lg border border-border"
                                />
                            )}
                        </div>

                        {/* Description */}
                        {post.description && (
                            <div className="p-3 bg-muted/50 rounded-lg text-sm text-foreground/80 max-h-32 overflow-y-auto">
                                {post.description}
                            </div>
                        )}

                        {/* Basic Metrics */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="p-2 bg-muted/50 rounded text-center">
                                <Eye className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                                <p className="font-bold text-foreground">{formatNumber(post.views)}</p>
                                <p className="text-xs text-muted-foreground">Vues</p>
                            </div>
                            <div className="p-2 bg-muted/50 rounded text-center">
                                <Trophy className="h-4 w-4 mx-auto mb-1 text-yellow-400" />
                                <p className="font-bold text-foreground">{(analysis?.engagementRate ?? post.engagementRate ?? 0).toFixed(2)}%</p>
                                <p className="text-xs text-muted-foreground">Engage.</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Analysis, Remix & Carousel Grid */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Remix Section */}
                        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-primary/10 rounded-lg border border-purple-500/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Shuffle className="h-4 w-4 text-purple-400" />
                                    <span className="font-semibold text-sm">Remixer ce post</span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                                    disabled={isRemixing}
                                    onClick={async () => {
                                        setIsRemixing(true);
                                        setRemixHooks([]);
                                        const postText = post.description || post.hookText || '';
                                        const res = await remixCompetitorPost(postText, post.views || 0);
                                        if (res.hooks) {
                                            setRemixHooks(res.hooks);
                                        } else {
                                            toast.error(res.error || "Erreur lors du remix");
                                        }
                                        setIsRemixing(false);
                                    }}
                                >
                                    {isRemixing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                    {isRemixing ? 'Génération...' : 'Générer 3 remix'}
                                </Button>
                            </div>

                            {remixHooks.length > 0 && (
                                <div className="space-y-2">
                                    {remixHooks.map((h: any, i: number) => (
                                        <div key={i} className="p-3 bg-card/60 rounded-lg border border-border/50 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-mono text-purple-400 uppercase">{h.angle}</span>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 text-xs text-primary hover:text-primary"
                                                    onClick={() => {
                                                        // Dispatch custom event for cross-tab communication
                                                        window.dispatchEvent(new CustomEvent('remix-hook-selected', {
                                                            detail: { angle: h.angle, hook: h.hook, reason: h.reason }
                                                        }));
                                                        onClose();
                                                    }}
                                                >
                                                    Utiliser <ArrowRight className="h-3 w-3 ml-1" />
                                                </Button>
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">"{h.hook}"</p>
                                            <p className="text-xs text-muted-foreground">{h.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* If we have carousel images, show them in a grid */}
                        {carouselImages.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                    Carrousel ({carouselImages.length} slides)
                                </h3>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {carouselImages.map((img, idx) => (
                                        <div key={idx} className="aspect-[9/16] rounded bg-muted/30 overflow-hidden cursor-pointer hover:ring-2 ring-primary" onClick={() => window.open(img, '_blank')}>
                                            <img src={img} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {hasAnalysis ? (
                            <>
                                {/* Main Scores */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                    <ScoreCard
                                        label="Quality Score"
                                        score={analysis!.qualityScore}
                                        icon={Trophy}
                                        color="yellow"
                                    />
                                    <ScoreCard
                                        label="Performance"
                                        score={analysis!.performanceScore}
                                        icon={TrendingUp}
                                        color="blue"
                                    />
                                    <ScoreCard
                                        label="Score IFS"
                                        score={analysis!.intelligentScore}
                                        icon={Zap}
                                        color="primary"
                                    />
                                </div>

                                {/* Category Breakdown */}
                                <Tabs defaultValue="hook" className="w-full">
                                    <TabsList className="flex w-full overflow-x-auto scrollbar-hide bg-muted/50 border border-border">
                                        <TabsTrigger value="hook" className="shrink-0 text-xs sm:text-sm">Hook</TabsTrigger>
                                        <TabsTrigger value="body" className="shrink-0 text-xs sm:text-sm">Body</TabsTrigger>
                                        <TabsTrigger value="cta" className="shrink-0 text-xs sm:text-sm">CTA</TabsTrigger>
                                        <TabsTrigger value="visual" className="shrink-0 text-xs sm:text-sm">Visual</TabsTrigger>
                                        <TabsTrigger value="music" className="shrink-0 text-xs sm:text-sm">Music</TabsTrigger>
                                        <TabsTrigger value="timing" className="shrink-0 text-xs sm:text-sm">Timing</TabsTrigger>
                                        <TabsTrigger value="persona" className="shrink-0 text-xs sm:text-sm">Perso</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="hook" className="mt-4">
                                        <CategoryBreakdown
                                            title="Hook (Accroche)"
                                            icon={Zap}
                                            color="yellow"
                                            scores={[
                                                { label: 'Texte', score: 8, max: 10 },
                                                { label: 'Verbal', score: 7, max: 10 },
                                                { label: 'Visuel', score: 4, max: 5 },
                                            ]}
                                            total={19}
                                            maxTotal={25}
                                        />
                                    </TabsContent>
                                    {/* Simplified tabs for brevity, logic remains similar */}
                                    <TabsContent value="body" className="mt-4">
                                        <CategoryBreakdown title="Body" icon={MessageSquare} color="blue" scores={[{ label: 'Structure', score: 5, max: 6 }]} total={5} maxTotal={6} />
                                    </TabsContent>
                                    <TabsContent value="visual" className="mt-4">
                                        <CategoryBreakdown title="Visual" icon={Eye} color="purple" scores={[{ label: 'Qualité', score: 5, max: 6 }]} total={5} maxTotal={6} />
                                    </TabsContent>
                                </Tabs>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 bg-muted/30 rounded-lg border border-border text-center">
                                <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <h3 className="text-xl font-bold text-foreground mb-2">Aucune analyse disponible</h3>
                                <p className="text-muted-foreground mb-6">Analysez ce post avec l'IA pour obtenir des scores détaillés et des insights.</p>
                                {onAnalyze && (
                                    <Button
                                        onClick={() => onAnalyze(post.id)}
                                        disabled={isAnalyzing}
                                        className="bg-primary hover:bg-primary/90"
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                                                Analyse en cours...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="h-4 w-4 mr-2" />
                                                Lancer l'analyse complète
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ScoreCard({
    label,
    score,
    icon: Icon,
    color,
}: {
    label: string;
    score: number;
    icon: any;
    color: string;
}) {
    const colorClasses: Record<string, string> = {
        yellow: 'text-yellow-500 bg-yellow-500/10',
        blue: 'text-blue-500 bg-blue-500/10',
        primary: 'text-primary bg-primary/10',
    };

    return (
        <div className={cn("p-4 rounded-lg", colorClasses[color])}>
            <Icon className="h-5 w-5 mb-2" />
            <p className="text-2xl font-bold">{score.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function CategoryBreakdown({
    title,
    icon: Icon,
    color,
    scores,
    total,
    maxTotal,
}: {
    title: string;
    icon: any;
    color: string;
    scores: { label: string; score: number; max: number }[];
    total: number;
    maxTotal: number;
}) {
    const colorClasses: Record<string, string> = {
        yellow: 'text-yellow-500',
        blue: 'text-blue-500',
        green: 'text-green-500',
        purple: 'text-purple-500',
        pink: 'text-pink-500',
        orange: 'text-orange-500',
        cyan: 'text-cyan-500',
    };

    return (
        <div className="p-4 bg-muted/30 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className={cn("h-5 w-5", colorClasses[color])} />
                    <h3 className="font-semibold text-foreground">{title}</h3>
                </div>
                <Badge variant="outline" className={colorClasses[color]}>
                    {total}/{maxTotal}
                </Badge>
            </div>

            <div className="space-y-3">
                {scores.map((item) => (
                    <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="text-foreground">{item.score}/{item.max}</span>
                        </div>
                        <Progress value={(item.score / item.max) * 100} className="h-2" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
