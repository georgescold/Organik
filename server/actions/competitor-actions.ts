'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { ApifyClient } from 'apify-client';
import { analyzePostContent } from '@/lib/ai/claude';
import { uploadExternalImagesToStorage, uploadExternalImageToStorage } from '@/lib/storage';

// ============= TYPES =============

interface CompetitorWithPosts {
    id: string;
    tiktokUsername: string;
    displayName: string | null;
    avatarUrl: string | null;
    followersCount: number;
    likesCount: number;
    videoCount: number;
    lastSyncAt: Date | null;
    posts: {
        id: string;
        views: number;
        likes: number;
        comments: number;
        description: string | null;
        coverUrl: string | null;
        publishedAt: Date;
    }[];
}

// ============= COMPETITOR CRUD =============

export async function getCompetitors(profileId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    // Verify profile ownership
    const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { userId: true } });
    if (!profile || profile.userId !== session.user.id) return { success: false, error: 'Not found' };

    try {
        const competitors = await prisma.competitor.findMany({
            where: { profileId, isActive: true },
            include: {
                posts: {
                    orderBy: { views: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        views: true,
                        likes: true,
                        comments: true,
                        description: true,
                        coverUrl: true,
                        publishedAt: true,
                    },
                },
                _count: {
                    select: { posts: true, analyses: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return { success: true, competitors };
    } catch (error) {
        console.error('Error fetching competitors:', error);
        return { success: false, error: 'Failed to fetch competitors' };
    }
}

export async function addCompetitor(profileId: string, tiktokUsername: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { userId: true } });
    if (!profile || profile.userId !== session.user.id) return { success: false, error: 'Not found' };

    try {
        // Clean username
        const cleanUsername = tiktokUsername.replace('@', '').trim().toLowerCase();

        // Check if already exists
        const existing = await prisma.competitor.findUnique({
            where: {
                profileId_tiktokUsername: {
                    profileId,
                    tiktokUsername: cleanUsername,
                },
            },
        });

        if (existing) {
            if (existing.isActive) {
                return { success: false, error: 'Ce concurrent est déjà suivi' };
            }

            // Reactivate existing competitor
            const updated = await prisma.competitor.update({
                where: { id: existing.id },
                data: { isActive: true },
            });

            // Trigger sync even for reactivated competitor to ensure fresh data
            try {
                const syncResult = await syncCompetitor(updated.id);
                console.log('Reactivation sync result:', syncResult);
                if (!syncResult.success) {
                    console.error('Reactivation sync failed with error:', syncResult.error);
                }
            } catch (syncError) {
                console.error('Reactivation sync failed:', syncError);
            }

            return { success: true, competitor: updated };
        }

        const competitor = await prisma.competitor.create({
            data: {
                profileId,
                tiktokUsername: cleanUsername,
                displayName: cleanUsername,
            },
        });

        // Auto-sync immediately after creation
        try {
            const syncResult = await syncCompetitor(competitor.id);
            console.log('Initial sync result:', syncResult);
            if (!syncResult.success) {
                console.error('Initial sync failed with error:', syncResult.error);
            }
        } catch (syncError) {
            console.error('Initial sync failed:', syncError);
            // We still return success as the competitor was created
        }

        return { success: true, competitor };
    } catch (error) {
        console.error('Error adding competitor:', error);
        return { success: false, error: 'Failed to add competitor' };
    }
}

export async function removeCompetitor(competitorId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    // Verify ownership through competitor -> profile -> user chain
    const competitor = await prisma.competitor.findUnique({
        where: { id: competitorId },
        include: { profile: { select: { userId: true } } }
    });
    if (!competitor || competitor.profile.userId !== session.user.id) return { success: false, error: 'Not found' };

    try {
        await prisma.competitor.update({
            where: { id: competitorId },
            data: { isActive: false },
        });
        return { success: true };
    } catch (error) {
        console.error('Error removing competitor:', error);
        return { success: false, error: 'Failed to remove competitor' };
    }
}

// ============= SYNC WITH APIFY =============

export async function syncCompetitor(competitorId: string) {
    try {
        const competitor = await prisma.competitor.findUnique({
            where: { id: competitorId },
            include: {
                profile: {
                    include: {
                        user: {
                            select: { apifyApiKey: true }
                        }
                    }
                }
            }
        });

        if (!competitor) {
            return { success: false, error: 'Competitor not found' };
        }

        // Initialize Apify client - user's key ONLY (no fallback)
        const apifyToken = competitor.profile.user.apifyApiKey;
        if (!apifyToken) {
            return { success: false, error: 'Clé API Apify non configurée. Ajoutez votre clé dans l\'onglet "Clé API".' };
        }

        const client = new ApifyClient({ token: apifyToken });

        // Run TikTok scraper
        const run = await client.actor('clockworks/tiktok-scraper').call({
            profiles: [competitor.tiktokUsername],
            resultsPerPage: 200,
            shouldDownloadVideos: false,
            shouldDownloadCovers: false,
            shouldDownloadSlideshowImages: true,
        });

        // Get results
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        let postsCreated = 0;
        let postsUpdated = 0;

        for (const item of items) {
            const data = item as any;
            if (data.type && data.type !== 'video' && data.type !== 'slideshow') continue; // Support slideshows, allow undefined type if it looks like a post
            if (!data.id) continue; // Basic sanity check

            // Extract carousel images from TikTok
            let rawCarouselImages: string[] = [];
            if (data.slideshowImageLinks && Array.isArray(data.slideshowImageLinks)) {
                rawCarouselImages = data.slideshowImageLinks.map((img: any) =>
                    typeof img === 'string' ? img : (img.downloadLink || img.tiktokLink)
                ).filter(Boolean);
            } else if (data.covers && Array.isArray(data.covers) && data.covers.length > 1) {
                // Fallback for some scrapers
                rawCarouselImages = data.covers;
            }

            // Upload carousel images to Supabase Storage
            let carouselImages: string[] = [];
            if (rawCarouselImages.length > 0) {
                const folder = `competitors/${competitor.profileId}/${competitor.id}`;
                const uploadedUrls = await uploadExternalImagesToStorage(rawCarouselImages, folder);
                carouselImages = uploadedUrls.filter((url): url is string => url !== null);
            }

            // Upload cover image to Supabase Storage
            let coverUrl: string | null = null;
            const rawCoverUrl = data.covers?.[0] || data.videoMeta?.coverUrl || null;
            if (rawCoverUrl) {
                const folder = `competitors/${competitor.profileId}/${competitor.id}/covers`;
                coverUrl = await uploadExternalImageToStorage(rawCoverUrl, folder);
            }

            const postData = {
                competitorId: competitor.id,
                tiktokId: String(data.id),
                webVideoUrl: data.webVideoUrl || null,
                coverUrl: coverUrl,
                description: data.text || null,
                hashtags: data.hashtags ? JSON.stringify(data.hashtags) : null,
                musicName: data.musicMeta?.musicName || null,
                musicAuthor: data.musicMeta?.musicAuthor || null,
                duration: data.videoMeta?.duration || null,
                slideCount: carouselImages.length > 0 ? carouselImages.length : null,
                carouselImages: carouselImages.length > 0 ? JSON.stringify(carouselImages) : null,
                views: data.playCount || 0,
                likes: data.diggCount || 0,
                comments: data.commentCount || 0,
                shares: data.shareCount || 0,
                saves: data.collectCount || 0,
                engagementRate: data.playCount > 0
                    ? ((data.diggCount + data.commentCount + data.shareCount) / data.playCount) * 100
                    : 0,
                publishedAt: new Date(data.createTime * 1000),
            };

            try {
                await prisma.competitorPost.upsert({
                    where: { tiktokId: String(item.id) },
                    create: postData,
                    update: {
                        views: postData.views,
                        likes: postData.likes,
                        comments: postData.comments,
                        shares: postData.shares,
                        saves: postData.saves,
                        engagementRate: postData.engagementRate,
                        carouselImages: postData.carouselImages, // Update images if changed
                        slideCount: postData.slideCount,
                    },
                });
                postsCreated++;
            } catch (e) {
                postsUpdated++;
            }
        }

        // Update competitor metrics
        const authorInfo = items.find((i: any) => i.authorMeta) as any;
        if (authorInfo?.authorMeta) {
            const meta = authorInfo.authorMeta as any;

            // ✅ FIX: Upload competitor avatar to Supabase Storage (TikTok CDN URLs expire)
            let permanentAvatarUrl: string | null = null;
            if (meta.avatar) {
                const avatarFolder = `avatars/competitors/${competitorId}`;
                permanentAvatarUrl = await uploadExternalImageToStorage(meta.avatar, avatarFolder);
            }

            await prisma.competitor.update({
                where: { id: competitorId },
                data: {
                    displayName: meta.name || competitor.tiktokUsername,
                    ...(permanentAvatarUrl ? { avatarUrl: permanentAvatarUrl } : {}),
                    followersCount: meta.fans || 0,
                    likesCount: meta.heart || 0,
                    videoCount: meta.video || 0,
                    lastSyncAt: new Date(),
                },
            });
        }

        return {
            success: true,
            message: `Synced ${postsCreated} new posts, updated ${postsUpdated}`
        };
    } catch (error: any) {
        console.error('Error syncing competitor:', error);

        // Handle specific Apify errors
        if (error.statusCode === 402 || error.type === 'not-enough-usage-to-run-paid-actor') {
            return {
                success: false,
                error: 'Crédits Apify épuisés. Veuillez recharger votre compte Apify pour continuer le scraping.'
            };
        }

        return { success: false, error: 'Failed to sync competitor' };
    }
}

// ============= GET POSTS =============

export async function getCompetitorPosts(
    competitorId: string,
    options: {
        page?: number;
        limit?: number;
        sortBy?: 'views' | 'likes' | 'publishedAt' | 'engagementRate';
        sortOrder?: 'asc' | 'desc';
    } = {}
) {
    const { page = 1, limit = 20, sortBy = 'views', sortOrder = 'desc' } = options;

    try {
        const [posts, total] = await Promise.all([
            prisma.competitorPost.findMany({
                where: { competitorId },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    analysis: {
                        select: {
                            qualityScore: true,
                            performanceScore: true,
                            intelligentScore: true,
                        },
                    },
                },
            }),
            prisma.competitorPost.count({ where: { competitorId } }),
        ]);

        return {
            success: true,
            posts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error('Error fetching competitor posts:', error);
        return { success: false, error: 'Failed to fetch posts' };
    }
}

// ============= ANALYZE POST =============

export async function analyzeCompetitorPost(postId: string) {
    try {
        const post = await prisma.competitorPost.findUnique({
            where: { id: postId },
            include: {
                competitor: {
                    include: {
                        profile: {
                            include: {
                                user: true // Need user for API Key
                            }
                        }
                    }
                },
            },
        });

        if (!post) {
            return { success: false, error: 'Post not found' };
        }

        const apiKey = post.competitor.profile.user.anthropicApiKey;
        if (!apiKey) {
            return { success: false, error: 'Clé API manquante. Configurez votre clé dans les paramètres.' };
        }

        // Prepare context
        const contextText = `
        Description: ${post.description || ''}
        Sujet/Niche: ${post.competitor.niche || 'Général'}
        Statistiques: ${post.views} vues, ${post.likes} likes, ${post.comments} commentaires.
        `;

        // Prepare images
        let imagesToAnalyze: string[] = [];
        if (post.carouselImages) {
            try {
                const parsed = JSON.parse(post.carouselImages);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    imagesToAnalyze = parsed;
                }
            } catch { /* JSON parse fallback */ }
        }

        // If no carousel images, try cover
        if (imagesToAnalyze.length === 0 && post.coverUrl) {
            imagesToAnalyze = [post.coverUrl];
        }

        if (imagesToAnalyze.length === 0) {
            return { success: false, error: 'Aucune image trouvée à analyser.' };
        }

        // Call Claude AI
        const analysisResult = await analyzePostContent(imagesToAnalyze, contextText, apiKey);

        // Calculate performance score from metrics (Keep existing logic or verify?)
        // Existing logic seems valid for relative performance within scraped data? 
        // Or should we let Claude judge? Claude returns "performanceScore" based on content potential?
        // Actually, the previous implementation calculated PS from metrics. The NEW `analyzePostContent` returns a JSON with `performanceScore`?
        // Let's check `analyzePostContent` return type in `claude.ts`.
        // It returns `JSON.parse(cleanJson)`. The PROMPT `IFS_ANALYSIS_SYSTEM` defines the structure.
        // It returns: qualityScore, performanceScore, intelligentScore, critique, recommendations, etc.
        // BUT for *competitor* posts, we *have* real metrics!
        // We should probably mix them? 
        // The Prompt actually asks Claude to predict performance. 
        // But for a competitor post with 1M views, the performance IS 100.
        // Let's use the Real Performance Score if available, otherwise AI prediction?
        // The user wants "analyser avec les scores". 
        // Let's trust the AI's *content* scoring (Quality, Hook, Body...) 
        // and override Performance Score with *real* metrics if we have enough data?
        // Actually, let's just stick to the AI's return for now to be consistent with the User Post analysis,
        // UNLESS the prompt specifically handles "Actual Performance".
        // The previous code had a manual calculation for PS.
        // Let's keep the manual calculation for `performanceScore` based on *actual* engagement, 
        // and use AI for Quality & Details.
        // And then re-calculate IFS.

        // Manual Performance Calculation (Real Data)
        const totalEngagement = post.likes + post.comments + post.shares;
        const engagementRate = post.views > 0 ? (totalEngagement / post.views) * 100 : 0;
        let realPerformanceScore = 0;
        if (engagementRate >= 10) realPerformanceScore = 100;
        else if (engagementRate >= 5) realPerformanceScore = 80 + (engagementRate - 5) * 4;
        else if (engagementRate >= 2) realPerformanceScore = 50 + (engagementRate - 2) * 10;
        else realPerformanceScore = engagementRate * 25;

        // Use AI result for details
        const aiScore = analysisResult;

        // Merge Scores
        // We use AI's Quality Score.
        // We use Real Performance Score (since it's a past post).
        // we Recalculate IFS.
        const qualityScore = aiScore.qualityScore || 0;
        const performanceScore = realPerformanceScore; // Override AI's prediction with reality
        const intelligentScore = (qualityScore * 0.6) + (performanceScore * 0.4);

        // Save Analysis
        await prisma.competitorAnalysis.upsert({
            where: { postId: post.id },
            create: {
                postId: post.id,
                competitorId: post.competitorId,

                // Detailed Breakdown
                qsHookTotal: aiScore.hookScore || 0,
                qsBodyTotal: aiScore.bodyScore || 0,
                qsCtaTotal: aiScore.ctaScore || 0,
                qsVisualTotal: aiScore.visualScore || 0,
                qsMusicTotal: aiScore.musicScore || 0,
                qsTimingTotal: aiScore.timingScore || 0,
                qsPersonaTotal: aiScore.personaScore || 0,

                qualityScore,
                performanceScore,
                intelligentScore,
            },
            update: {
                qsHookTotal: aiScore.hookScore || 0,
                qsBodyTotal: aiScore.bodyScore || 0,
                qsCtaTotal: aiScore.ctaScore || 0,
                qsVisualTotal: aiScore.visualScore || 0,
                qsMusicTotal: aiScore.musicScore || 0,
                qsTimingTotal: aiScore.timingScore || 0,
                qsPersonaTotal: aiScore.personaScore || 0,

                qualityScore,
                performanceScore,
                intelligentScore,
            },
        });

        return {
            success: true,
            analysis: {
                qualityScore,
                performanceScore,
                intelligentScore,
                engagementRate,
                critique: aiScore.critique // Pass this back if UI wants it
            },
        };
    } catch (error) {
        console.error('Error analyzing post:', error);
        return { success: false, error: 'Failed to analyze post' };
    }
}

// ============= COMPARE WITH COMPETITORS =============

export async function compareWithCompetitors(userId: string) {
    try {
        // Get user's active profile
        // Get user and all profiles to select the correct active one
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profiles: {
                    where: { platform: 'tiktok' },
                },
            },
        });

        if (!user || user.profiles.length === 0) {
            console.log('Compare: No user or profiles found');
            return null;
        }

        // Prioritize active profile, fallback to first
        const profile = user.activeProfileId
            ? user.profiles.find(p => p.id === user.activeProfileId)
            : user.profiles[0];

        if (!profile) {
            console.log('Compare: Active profile not found in fetched profiles');
            return null;
        }

        console.log(`Compare: Using Profile ID ${profile.id}`);

        // Get user's analyses
        const userAnalyses = await prisma.contentAnalysis.findMany({
            where: { profileId: profile.id },
        });
        console.log(`Compare: User Analyses count: ${userAnalyses.length}`);

        // Get competitor analyses
        const competitors = await prisma.competitor.findMany({
            where: { profileId: profile.id, isActive: true },
            select: { id: true },
        });

        const competitorIds = competitors.map(c => c.id);
        const competitorAnalyses = await prisma.competitorAnalysis.findMany({
            where: { competitorId: { in: competitorIds } },
        });
        console.log(`Compare: Competitor Analyses count: ${competitorAnalyses.length}`);

        // Allow rendering if AT LEAST ONE side has data (Partial Comparison)
        // If both are empty, then return null
        if (userAnalyses.length === 0 && competitorAnalyses.length === 0) {
            console.log('Compare: BOTH arrays are empty. Returning null.');
            return null;
        }

        // Calculate averages
        const avgUser = {
            qualityScore: userAnalyses.reduce((a, b) => a + b.qualityScore, 0) / userAnalyses.length,
            performanceScore: userAnalyses.reduce((a, b) => a + b.performanceScore, 0) / userAnalyses.length,
            intelligentScore: userAnalyses.reduce((a, b) => a + b.intelligentScore, 0) / userAnalyses.length,
            hookScore: userAnalyses.reduce((a, b) => a + b.qsHookTotal, 0) / userAnalyses.length,
            bodyScore: userAnalyses.reduce((a, b) => a + b.qsBodyTotal, 0) / userAnalyses.length,
            ctaScore: userAnalyses.reduce((a, b) => a + b.qsCtaTotal, 0) / userAnalyses.length,
            visualScore: userAnalyses.reduce((a, b) => a + b.qsVisualTotal, 0) / userAnalyses.length,
            musicScore: userAnalyses.reduce((a, b) => a + b.qsMusicTotal, 0) / userAnalyses.length,
            timingScore: userAnalyses.reduce((a, b) => a + b.qsTimingTotal, 0) / userAnalyses.length,
            personaScore: userAnalyses.reduce((a, b) => a + b.qsPersonaTotal, 0) / userAnalyses.length,
            analyzedCount: userAnalyses.length,
        };

        const avgComp = {
            qualityScore: competitorAnalyses.reduce((a, b) => a + b.qualityScore, 0) / competitorAnalyses.length,
            performanceScore: competitorAnalyses.reduce((a, b) => a + b.performanceScore, 0) / competitorAnalyses.length,
            intelligentScore: competitorAnalyses.reduce((a, b) => a + b.intelligentScore, 0) / competitorAnalyses.length,
            hookScore: competitorAnalyses.reduce((a, b) => a + b.qsHookTotal, 0) / competitorAnalyses.length,
            bodyScore: competitorAnalyses.reduce((a, b) => a + b.qsBodyTotal, 0) / competitorAnalyses.length,
            ctaScore: competitorAnalyses.reduce((a, b) => a + b.qsCtaTotal, 0) / competitorAnalyses.length,
            visualScore: competitorAnalyses.reduce((a, b) => a + b.qsVisualTotal, 0) / competitorAnalyses.length,
            musicScore: competitorAnalyses.reduce((a, b) => a + b.qsMusicTotal, 0) / competitorAnalyses.length,
            timingScore: competitorAnalyses.reduce((a, b) => a + b.qsTimingTotal, 0) / competitorAnalyses.length,
            personaScore: competitorAnalyses.reduce((a, b) => a + b.qsPersonaTotal, 0) / competitorAnalyses.length,
            analyzedCount: competitorAnalyses.length,
        };

        return {
            user: avgUser,
            competitors: avgComp,
            gaps: {
                qualityScore: avgUser.qualityScore - avgComp.qualityScore,
                performanceScore: avgUser.performanceScore - avgComp.performanceScore,
                intelligentScore: avgUser.intelligentScore - avgComp.intelligentScore,
                hookScore: avgUser.hookScore - avgComp.hookScore,
                bodyScore: avgUser.bodyScore - avgComp.bodyScore,
                ctaScore: avgUser.ctaScore - avgComp.ctaScore,
                visualScore: avgUser.visualScore - avgComp.visualScore,
                musicScore: avgUser.musicScore - avgComp.musicScore,
                timingScore: avgUser.timingScore - avgComp.timingScore,
                personaScore: avgUser.personaScore - avgComp.personaScore,
            },
        };
    } catch (error) {
        console.error('Error comparing with competitors:', error);
        return null;
    }
}

// ============= GET IMAGES FROM CAROUSEL =============

export async function getCompetitorPostImages(postId: string) {
    try {
        const post = await prisma.competitorPost.findUnique({
            where: { id: postId },
            include: {
                competitor: {
                    select: { displayName: true, tiktokUsername: true },
                },
            },
        });

        if (!post) {
            return { success: false, error: 'Post not found' };
        }

        let images: string[] = [];
        if (post.carouselImages) {
            try {
                const parsed = JSON.parse(post.carouselImages);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    images = parsed;
                }
            } catch { /* JSON parse fallback */ }
        }

        if (images.length === 0 && post.coverUrl) {
            images = [post.coverUrl];
        }

        return {
            success: true,
            images,
            competitorName: post.competitor.displayName || post.competitor.tiktokUsername,
        };
    } catch (error) {
        console.error('Error getting post images:', error);
        return { success: false, error: 'Failed to get images' };
    }
}

// ============= SCRAPE CAROUSEL IMAGES (COMPETITOR) =============

export async function scrapeCompetitorPostCarouselImages(postId: string) {
    try {
        const post = await prisma.competitorPost.findUnique({
            where: { id: postId },
            include: {
                competitor: {
                    include: {
                        profile: {
                            include: {
                                user: {
                                    select: { apifyApiKey: true }
                                }
                            }
                        }
                    }
                },
            },
        });

        if (!post) {
            return { success: false, error: 'Post not found' };
        }

        if (!post.tiktokId) {
            return { success: false, error: "Ce post n'a pas d'ID TikTok associé" };
        }

        console.log(`🖼️ Scraping carousel images for Competitor Post: ${post.tiktokId}`);

        // Initialize Apify client - user's key ONLY (no fallback)
        const apifyToken = post.competitor.profile.user.apifyApiKey;
        if (!apifyToken) {
            return { success: false, error: 'Clé API Apify non configurée. Ajoutez votre clé dans l\'onglet "Clé API".' };
        }

        const client = new ApifyClient({ token: apifyToken });

        // Run TikTok scraper for this specific profile
        const run = await client.actor('clockworks/tiktok-scraper').call({
            profiles: [post.competitor.tiktokUsername],
            resultsPerPage: 50,
            shouldDownloadVideos: false,
            shouldDownloadCovers: false,
            shouldDownloadSlideshowImages: true,
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        const scrapedPost = items.find((item: any) => String(item.id) === post.tiktokId);

        if (!scrapedPost) {
            return { success: false, error: "Post TikTok introuvable dans les données scrapées (peut-être trop ancien ?)" };
        }

        // Extract carousel images from TikTok
        let rawCarouselImages: string[] = [];
        const data = scrapedPost as any;

        if (data.slideshowImageLinks && Array.isArray(data.slideshowImageLinks)) {
            rawCarouselImages = data.slideshowImageLinks.map((item: any) => item.downloadLink || item.tiktokLink).filter(Boolean);
        } else if (data.covers && Array.isArray(data.covers) && data.covers.length > 1) {
            rawCarouselImages = data.covers;
        }

        if (rawCarouselImages.length === 0) {
            return { success: false, error: "Aucune image de carrousel trouvée pour ce post." };
        }

        console.log(`✅ Found ${rawCarouselImages.length} carousel images, uploading to Supabase...`);

        // Upload images to Supabase Storage
        const folder = `competitors/${post.competitor.profileId}/${post.competitorId}`;
        const uploadedUrls = await uploadExternalImagesToStorage(rawCarouselImages, folder);
        const carouselImages = uploadedUrls.filter((url): url is string => url !== null);

        if (carouselImages.length === 0) {
            return { success: false, error: "Échec de l'upload des images vers le stockage." };
        }

        console.log(`✅ Uploaded ${carouselImages.length} images to Supabase Storage`);

        // Save to database
        await prisma.competitorPost.update({
            where: { id: postId },
            data: {
                carouselImages: JSON.stringify(carouselImages),
                slideCount: carouselImages.length
            }
        });

        return {
            success: true,
            images: carouselImages,
            count: carouselImages.length
        };

    } catch (error: any) {
        console.error('Error scraping competitor post images:', error);
        return { success: false, error: error.message };
    }
}

export async function getAllCompetitorsPosts() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Get user and active profile
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                profiles: {
                    where: { platform: 'tiktok' },
                },
            },
        });

        if (!user) return { error: 'User not found' };

        // Determine active profile
        const profile = user.activeProfileId
            ? user.profiles.find(p => p.id === user.activeProfileId)
            : user.profiles[0];

        if (!profile) return { error: 'No profile found' };

        const posts = await prisma.competitorPost.findMany({
            where: {
                competitor: {
                    profileId: profile.id
                }
            },
            orderBy: { publishedAt: 'desc' },
            take: 50,
            include: {
                competitor: true
            }
        });
        return { success: true, posts };
    } catch (e) {
        console.error('Error fetching competitor posts:', e);
        return { error: 'Failed to fetch competitor posts' };
    }
}

