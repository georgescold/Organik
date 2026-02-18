'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Eye,
    Heart,
    MessageSquare,
    Share2,
    Sparkles,
    Image as ImageIcon,
    ChevronLeft,
    ChevronRight,
    Trophy,
    RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    getCompetitorPosts,
    analyzeCompetitorPost,
    getCompetitorPostImages,
    scrapeCompetitorPostCarouselImages,
} from '@/server/actions/competitor-actions';
import { CompetitorPostAnalysisModal } from './competitor-post-analysis-modal';
import { CompetitorLeaderboard } from './competitor-leaderboard';

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

interface CompetitorPostsGalleryProps {
    competitor: any;
    onBack: () => void;
}

export function CompetitorPostsGallery({ competitor, onBack }: CompetitorPostsGalleryProps) {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState<'views' | 'likes' | 'publishedAt'>('views');
    const [analyzingPost, setAnalyzingPost] = useState<string | null>(null);
    const [scrapingPost, setScrapingPost] = useState<string | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);

    // Leaderboard state
    const [analyzedPosts, setAnalyzedPosts] = useState<AnalyzedPost[]>([]);

    useEffect(() => {
        loadPosts();
    }, [competitor.id, page, sortBy]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const result = await getCompetitorPosts(competitor.id, {
                page,
                limit: 20,
                sortBy,
                sortOrder: 'desc',
            });
            if (result.success) {
                setPosts(result.posts || []);
                setTotalPages(result.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async (postId: string) => {
        setAnalyzingPost(postId);
        try {
            const result = await analyzeCompetitorPost(postId);
            if (result.success && result.analysis) {
                const post = posts.find(p => p.id === postId);
                if (post) {
                    // Add to analyzed posts for leaderboard
                    setAnalyzedPosts(prev => {
                        const exists = prev.find(p => p.post.id === postId);
                        if (exists) {
                            return prev.map(p => p.post.id === postId ? { post, analysis: result.analysis! } : p);
                        }
                        return [...prev, { post, analysis: result.analysis! }];
                    });

                    // Open modal
                    setSelectedPost(post);
                    setSelectedAnalysis(result.analysis);
                    setIsModalOpen(true);
                    toast.success('Analyse terminée avec succès');
                }
            } else {
                toast.error(result.error || "Erreur lors de l'analyse");
            }
        } catch (error) {
            console.error('Error analyzing post:', error);
            toast.error("Erreur inattendue");
        } finally {
            setAnalyzingPost(null);
        }
    };

    const handleGetImages = async (postId: string) => {
        try {
            const result = await getCompetitorPostImages(postId);
            if (result.success && result.images) {
                // Open images in new tabs
                result.images.forEach((url: string) => window.open(url, '_blank'));
            } else {
                toast.error("Aucune image trouvée. Essayez de scraper.");
            }
        } catch (error) {
            console.error('Error getting images:', error);
        }
    };

    const handleScrapeImages = async (postId: string) => {
        setScrapingPost(postId);
        try {
            const result = await scrapeCompetitorPostCarouselImages(postId);
            if (result.success && result.images) {
                toast.success(`${result.count} images récupérées !`);
                // Optionally refresh posts or update local state to reflect new slideCount
                // Ideally update the specific post in 'posts' state
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, slideCount: result.count } : p));
            } else {
                toast.error(result.error || "Erreur lors de la récupération");
            }
        } catch (error: any) {
            toast.error("Erreur serveur: " + error.message);
        } finally {
            setScrapingPost(null);
        }
    };

    const handleLeaderboardClick = (post: any, analysis: AnalysisResult) => {
        setSelectedPost(post);
        setSelectedAnalysis(analysis);
        setIsModalOpen(true);
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    if (loading && posts.length === 0) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="aspect-[9/16] rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {competitor.avatarUrl && (
                        <img
                            src={competitor.avatarUrl}
                            alt={competitor.displayName}
                            className="w-16 h-16 rounded-full border-2 border-primary"
                        />
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                            {competitor.displayName || competitor.tiktokUsername}
                        </h2>
                        <p className="text-muted-foreground">@{competitor.tiktokUsername}</p>
                    </div>
                </div>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-40 bg-muted/50 border-border text-foreground">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="views">Vues</SelectItem>
                        <SelectItem value="likes">Likes</SelectItem>
                        <SelectItem value="publishedAt">Date</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Leaderboard */}
            {analyzedPosts.length > 0 && (
                <CompetitorLeaderboard
                    analyzedPosts={analyzedPosts}
                    onPostClick={handleLeaderboardClick}
                />
            )}

            {/* Posts Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {posts.map((post) => (
                    <Card
                        key={post.id}
                        className="bg-card/60 border-border overflow-hidden hover:border-primary/30 transition-all group cursor-pointer"
                        onClick={() => handleLeaderboardClick(post, post.analysis)}
                    >
                        <div className="relative aspect-[9/16]">
                            {post.coverUrl ? (
                                <img
                                    src={post.coverUrl}
                                    alt="Post cover"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                                </div>
                            )}

                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                <div className="space-y-2">
                                    <Button
                                        size="sm"
                                        className="w-full bg-primary hover:bg-primary/90"
                                        onClick={() => handleAnalyze(post.id)}
                                        disabled={analyzingPost === post.id}
                                    >
                                        {analyzingPost === post.id ? (
                                            'Analyse...'
                                        ) : (
                                            <>
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                Analyser
                                            </>
                                        )}
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 border-white/30 text-white hover:bg-white/20"
                                            onClick={() => handleGetImages(post.id)}
                                        >
                                            <ImageIcon className="h-3 w-3 mr-1" />
                                            Voir
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-10 px-0 border-white/30 text-white hover:bg-white/20"
                                            onClick={() => handleScrapeImages(post.id)}
                                            disabled={scrapingPost === post.id}
                                        >
                                            <RefreshCcw className={cn("h-3 w-3", scrapingPost === post.id && "animate-spin")} />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Analysis badge */}
                            {post.analysis && (
                                <Badge className="absolute top-2 right-2 bg-primary/80">
                                    IFS: {post.analysis.intelligentScore.toFixed(0)}
                                </Badge>
                            )}
                        </div>

                        {/* Metrics */}
                        <CardContent className="p-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Eye className="h-3 w-3" />
                                    {formatNumber(post.views)}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Heart className="h-3 w-3" />
                                    {formatNumber(post.likes)}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <MessageSquare className="h-3 w-3" />
                                    {formatNumber(post.comments)}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Share2 className="h-3 w-3" />
                                    {formatNumber(post.shares)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="border-border text-foreground"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center px-4 text-muted-foreground">
                        Page {page} sur {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="border-border text-foreground"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Analysis Modal */}
            <CompetitorPostAnalysisModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                post={selectedPost}
                analysis={selectedAnalysis}
                onAnalyze={handleAnalyze}
                isAnalyzing={!!analyzingPost && analyzingPost === selectedPost?.id}
            />
        </div>
    );
}
