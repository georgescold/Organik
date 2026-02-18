'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { PostDetailsModal } from './post-details-modal';
import { cn } from '@/lib/utils';

interface TopPostsCardProps {
    topPosts: any[];
}

export function TopPostsCard({ topPosts }: TopPostsCardProps) {
    const [expanded, setExpanded] = useState(false);

    const displayedPosts = expanded ? topPosts : topPosts.slice(0, 5);

    return (
        <Card
            className={cn("bg-card/50 backdrop-blur border-border/50 row-span-2 transition-all duration-300", expanded ? "row-span-3" : "")}
        >
            <CardHeader
                className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer hover:bg-primary/5 transition-colors rounded-t-xl"
                onClick={() => setExpanded(!expanded)}
            >
                <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    Top Posts {expanded ? '(10)' : '(5)'}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-primary" />
                    {topPosts.length > 5 && (
                        expanded
                            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-4">
                <div className="space-y-1">
                    {displayedPosts.map((post: any, index: number) => (
                        <PostDetailsModal key={post.id} postId={post.id} initialTitle={post.title || post.hookText}>
                            <div className="flex items-center gap-2.5 sm:gap-3 organik-interactive p-2 rounded-lg -ml-1 cursor-pointer w-full">
                                <span className={cn(
                                    "flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                                    index < 3
                                        ? "bg-primary/15 text-primary"
                                        : "bg-muted/50 text-muted-foreground"
                                )}>
                                    {index + 1}
                                </span>
                                <div className="space-y-0.5 flex-1 overflow-hidden min-w-0">
                                    <p className="text-xs sm:text-sm font-medium leading-none truncate" title={post.title || post.hookText}>
                                        {post.title || post.hookText}
                                    </p>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                                        {post.metrics?.views?.toLocaleString()} vues
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <span className={cn(
                                        "text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full",
                                        post.platform === 'tiktok' ? 'text-primary bg-primary/10' : 'text-pink-500 bg-pink-500/10'
                                    )}>
                                        {post.platform}
                                    </span>
                                </div>
                            </div>
                        </PostDetailsModal>
                    ))}
                    {topPosts.length === 0 && (
                        <p className="text-xs sm:text-sm text-muted-foreground py-2">Pas encore de top posts.</p>
                    )}

                    {!expanded && topPosts.length > 5 && (
                        <div
                            className="text-xs text-center text-muted-foreground cursor-pointer hover:text-primary transition-colors pt-2 font-medium"
                            onClick={() => setExpanded(true)}
                        >
                            Voir plus...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
