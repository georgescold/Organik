'use client';

import { useState, useEffect, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, User, Globe, Calendar, Eye, Heart, Copy } from 'lucide-react';
import { getUserPublishedPosts } from '@/server/actions/creation-actions';
import { getAllCompetitorsPosts } from '@/server/actions/competitor-actions';
import { toast } from 'sonner';

interface PostCopyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPost: (post: any, isCompetitor: boolean) => void;
}

export function PostCopyModal({ isOpen, onClose, onSelectPost }: PostCopyModalProps) {
    const [activeTab, setActiveTab] = useState<'user' | 'competitor'>('user');
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [competitorPosts, setCompetitorPosts] = useState<any[]>([]);
    const [isLoading, startTransition] = useTransition();

    useEffect(() => {
        if (isOpen) {
            loadPosts();
        }
    }, [isOpen, activeTab]);

    const loadPosts = () => {
        startTransition(async () => {
            if (activeTab === 'user') {
                if (userPosts.length > 0) return; // Already loaded
                const res = await getUserPublishedPosts();
                if (res.success && res.posts) {
                    setUserPosts(res.posts);
                } else {
                    toast.error("Impossible de charger vos posts");
                }
            } else {
                if (competitorPosts.length > 0) return; // Already loaded
                const res = await getAllCompetitorsPosts();
                if (res.success && res.posts) {
                    setCompetitorPosts(res.posts);
                } else {
                    toast.error("Impossible de charger les posts concurrents");
                }
            }
        });
    };

    const handleSelect = (post: any) => {
        onSelectPost(post, activeTab === 'competitor');
        onClose();
    };

    const renderPostCard = (post: any, isCompetitor: boolean) => {
        // Normalize fields
        const hook = isCompetitor ? post.title : post.hookText; // Competitor posts store title/desc, we assume title is catchier or description
        const desc = post.description || "";
        const date = new Date(post.createdAt || post.publishedAt).toLocaleDateString();
        const views = isCompetitor ? post.views : post.metrics?.views;
        const likes = isCompetitor ? post.likes : post.metrics?.likes;

        let imageUrl = "";
        if (isCompetitor) {
            imageUrl = post.coverUrl;
            // Try to find better image from carousel if available
            try {
                if (post.carouselImages) {
                    const imgs = JSON.parse(post.carouselImages);
                    if (imgs.length > 0) imageUrl = imgs[0];
                }
            } catch { /* JSON parse fallback */ }
        } else {
            // User post: parse slides or use cover if exists (Post model doesn't have coverUrl usually, checks slides)
            try {
                const slides = JSON.parse(post.slides || '[]');
                if (slides.length > 0 && (slides[0].image_url || slides[0].imageUrl)) {
                    imageUrl = slides[0].image_url || slides[0].imageUrl;
                }
            } catch { /* JSON parse fallback */ }
        }

        return (
            <Card key={post.id} className="cursor-pointer hover:border-primary transition-all group overflow-hidden" onClick={() => handleSelect(post)}>
                <div className="aspect-video bg-muted relative">
                    {imageUrl ? (
                        <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            Pas d'image
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="secondary" size="sm" className="gap-2">
                            <Copy className="w-4 h-4" /> Copier ce concept
                        </Button>
                    </div>
                </div>
                <CardContent className="p-3 space-y-2">
                    <p className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5em]" title={hook || desc}>
                        {hook || desc || "Sans titre"}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {views || 0}</span>
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {likes || 0}</span>
                        </div>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {date}</span>
                    </div>

                    {isCompetitor && post.competitor && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/50 mt-2">
                            <User className="w-3 h-3" /> @{post.competitor.tiktokUsername}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-4xl max-h-[85vh] sm:max-h-[80vh] flex flex-col p-3 sm:p-6">
                <DialogHeader>
                    <DialogTitle>Copier un concept</DialogTitle>
                    <DialogDescription>
                        Choisissez un post existant pour le cloner et le modifier.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="user" className="gap-2"><User className="w-4 h-4" /> Mes Posts</TabsTrigger>
                        <TabsTrigger value="competitor" className="gap-2"><Globe className="w-4 h-4" /> Concurrents</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 pb-4">
                                {activeTab === 'user' ? (
                                    userPosts.length > 0 ? userPosts.map(p => renderPostCard(p, false)) : (
                                        <div className="col-span-full text-center py-10 text-muted-foreground">Aucun post trouvé.</div>
                                    )
                                ) : (
                                    competitorPosts.length > 0 ? competitorPosts.map(p => renderPostCard(p, true)) : (
                                        <div className="col-span-full text-center py-10 text-muted-foreground">Aucun post concurrent trouvé.</div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
