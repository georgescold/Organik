'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, Loader2, Wand2, Images, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditPostDialog } from './edit-post-dialog';
import { updatePost, deletePost, analyzePost } from '@/server/actions/analytics-actions';
import { scrapePostCarouselImages } from '@/server/actions/scrape-actions';
import { toast } from 'sonner';
import Link from 'next/link';
import { PostDetailsModal } from './post-details-modal';
import { ScoringCriteriaModal } from './scoring-criteria-modal';

export function PostsTable({ posts }: { posts: any[] }) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const sortedPosts = [...posts].sort((a, b) => {
        if (!sortConfig) return 0;

        let aValue, bValue;

        switch (sortConfig.key) {
            case 'views':
                aValue = a.metrics?.views || 0;
                bValue = b.metrics?.views || 0;
                break;
            case 'likes':
                aValue = a.metrics?.likes || 0;
                bValue = b.metrics?.likes || 0;
                break;
            case 'comments':
                aValue = a.metrics?.comments || 0;
                bValue = b.metrics?.comments || 0;
                break;
            case 'saves':
                aValue = a.metrics?.saves || 0;
                bValue = b.metrics?.saves || 0;
                break;
            case 'date':
                aValue = new Date(a.publishedAt || a.createdAt).getTime();
                bValue = new Date(b.publishedAt || b.createdAt).getTime();
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <span className="ml-1 text-muted-foreground/30">⇅</span>;
        return <span className="ml-1 text-primary">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <Card className="bg-card/30">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Derniers Posts</CardTitle>
                        <CardDescription>Analyse automatique de tes hooks.</CardDescription>
                    </div>
                    <ScoringCriteriaModal />
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[100px] cursor-pointer hover:text-foreground" onClick={() => handleSort('date')}>
                                    Date <SortIcon column="date" />
                                </th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground max-w-[300px]">Hook / Titre</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground hidden md:table-cell">Plateforme</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort('views')}>
                                    Vues <SortIcon column="views" />
                                </th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('likes')}>
                                    Likes <SortIcon column="likes" />
                                </th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right cursor-pointer hover:text-foreground hidden sm:table-cell" onClick={() => handleSort('comments')}>
                                    Com. <SortIcon column="comments" />
                                </th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right cursor-pointer hover:text-foreground hidden sm:table-cell" onClick={() => handleSort('saves')}>
                                    Saves <SortIcon column="saves" />
                                </th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right hidden lg:table-cell">Note</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground"></th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {sortedPosts.map((post) => (
                                <PostRow key={post.id} post={post} />
                            ))}
                            {posts.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                                        Aucune donnée. Ajoute ton premier post !
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

function PostRow({ post }: { post: any }) {
    const [editOpen, setEditOpen] = useState(false);
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isScraping, setIsScraping] = useState(false);

    const handleDelete = () => {
        if (!confirm('Es-tu sûr de vouloir supprimer ce post ?')) return;
        startDeleteTransition(async () => {
            const res = await deletePost(post.id);
            if (res.success) toast.success('Post supprimé');
            else toast.error('Erreur lors de la suppression');
        });
    };

    const handleAnalyze = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAnalyzing(true);
        try {
            const res = await analyzePost(post.id);
            if (res.success) toast.success('Analyse terminée !');
            else toast.error(res.error || "Erreur d'analyse");
        } catch {
            toast.error("Erreur système");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleScrape = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsScraping(true);
        try {
            const res = await scrapePostCarouselImages(post.id);
            if (res.success) toast.success('Images récupérées !');
            else toast.error(res.error || "Erreur de scraping");
        } catch {
            toast.error("Erreur système");
        } finally {
            setIsScraping(false);
        }
    };

    return (
        <PostDetailsModal postId={post.id} initialTitle={post.title || post.hookText}>
            <tr className="border-b border-border/10 transition-colors hover:bg-muted/50 cursor-pointer">
                <td className=" p-2 sm:p-4 align-middle text-xs sm:text-sm text-muted-foreground">
                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </td>
                <td className="p-2 sm:p-4 align-middle font-medium text-xs sm:text-sm max-w-[300px]">
                    <div className="flex flex-col">
                        <span className="font-bold truncate max-w-[150px] sm:max-w-[280px]" title={post.title || post.hookText}>{post.title || post.hookText}</span>
                        {post.title && post.hookText && post.title !== post.hookText && (
                            <span className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[280px] hidden sm:inline" title={post.hookText}>{post.hookText}</span>
                        )}
                    </div>
                </td>
                <td className="p-2 sm:p-4 align-middle hidden md:table-cell">
                    <Badge variant="outline" className={`text-xs ${post.platform === 'tiktok' ? 'border-primary/50 text-primary' : 'border-pink-500/50 text-pink-500'}`}>
                        {post.platform}
                    </Badge>
                </td>
                <td className="p-2 sm:p-4 align-middle text-xs sm:text-sm">{post.metrics?.views?.toLocaleString()}</td>
                <td className="p-2 sm:p-4 align-middle text-right text-xs sm:text-sm">{post.metrics?.likes?.toLocaleString()}</td>
                <td className="p-2 sm:p-4 align-middle text-right hidden sm:table-cell text-xs sm:text-sm">{post.metrics?.comments}</td>
                <td className="p-2 sm:p-4 align-middle text-right hidden sm:table-cell text-xs sm:text-sm">{post.metrics?.saves}</td>
                <td className="p-2 sm:p-4 align-middle text-right hidden lg:table-cell">
                    {(post.metrics?.views || 0) >= 100000 ? (
                        <Badge className="bg-secondary text-secondary-foreground border-0 font-bold shadow-[0_0_10px_rgba(0,0,0,0.2)] text-xs">Ultra Viral</Badge>
                    ) : (post.metrics?.views || 0) >= 10000 ? (
                        <Badge className="bg-secondary text-secondary-foreground text-xs">Viral</Badge>
                    ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                    )}
                </td>
                <td className="p-4 align-middle text-right">
                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <Link href={`/dashboard/editor/${post.id}`}>
                                    <DropdownMenuItem>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Éditer dans Canvas
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem onClick={handleAnalyze} disabled={isAnalyzing}>
                                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                    Analyser
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleScrape} disabled={isScraping}>
                                    {isScraping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Images className="mr-2 h-4 w-4" />}
                                    Scraper Images
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </td>
            </tr>
        </PostDetailsModal>
    );
}
