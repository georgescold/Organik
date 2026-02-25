'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

const SlideSchema = z.object({
    imageId: z.string(),
    imageHumanId: z.string(),
    description: z.string(),
    text: z.string(),
});

const AddPostSchema = z.object({
    platform: z.enum(['tiktok', 'instagram']),
    title: z.string().optional(),
    description: z.string().optional(),
    date: z.string().optional(), // ISO date string
    slides: z.array(SlideSchema).min(1, "Au moins une slide est requise"),
    views: z.coerce.number().default(0),
    likes: z.coerce.number().default(0),
    comments: z.coerce.number().default(0),
    saves: z.coerce.number().default(0),
});

import { getActiveProfileId } from './profile-actions';

// ... (imports remain)

export async function addPost(formData: z.infer<typeof AddPostSchema>) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile found' };

    try {
        // ✅ PERF: Only validate the specific image IDs from slides (not ALL user images)
        const slideImageIds = formData.slides.map(s => s.imageId).filter(Boolean);
        const validImages = await prisma.image.findMany({
            where: { userId: session.user.id, id: { in: slideImageIds } },
            select: { id: true }
        });

        const validImageIds = new Set(validImages.map(img => img.id));

        for (const slide of formData.slides) {
            if (!validImageIds.has(slide.imageId)) {
                return { error: `Image ${slide.imageHumanId} n'existe pas dans votre collection` };
            }
        }

        const post = await prisma.post.create({
            data: {
                userId: session.user.id,
                profileId: activeProfileId, // Link to active profile
                platform: formData.platform,
                title: formData.title || null,
                description: formData.description || null,
                hookText: formData.slides[0]?.text || "Untitled Post",
                slideCount: formData.slides.length,
                slides: JSON.stringify(formData.slides),
                origin: "imported",
                status: "published",
                createdAt: formData.date ? new Date(formData.date) : undefined, // Use provided date or default to now
                metrics: {
                    create: {
                        views: formData.views,
                        likes: formData.likes,
                        comments: formData.comments,
                        saves: formData.saves
                    }
                }
            }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: 'Failed to add post' };
    }
}

export async function updateFollowers(count: number) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile found' };

    try {
        // 1. Update Profile
        await prisma.profile.update({
            where: { id: activeProfileId },
            data: { followersCount: count }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 2. Update/Create Snapshot for today
        // const today = new Date(); // Already declared
        // today.setHours(0, 0, 0, 0); // Already set
        // const tomorrow = new Date(today); // Already declared
        // tomorrow.setDate(tomorrow.getDate() + 1); // Already set

        // Upsert for Today (Midnight)


        await prisma.analyticsSnapshot.upsert({
            where: {
                profileId_date_metric: {
                    profileId: activeProfileId,
                    date: today,
                    metric: 'followers'
                }
            },
            update: { value: count },
            create: {
                profileId: activeProfileId,
                metric: 'followers',
                value: count,
                date: today
            }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: 'Failed to update followers' };
    }
}

export async function getDashboardStats() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { posts: [], stats: { views: 0, totalViews: 0, likes: 0, saves: 0, engagement: 0, engagementTrend: 'neutral', followers: 0, followersTrend: 0, followersTrendDirection: 'neutral' }, topPosts: [], history: { views: [], followers: [], likes: [], saves: [] } };

    // ✅ PERF: Limit to 200 most recent posts (sufficient for stats calculation)
    const posts = await prisma.post.findMany({
        where: {
            userId: session.user.id,
            profileId: activeProfileId,
            status: { notIn: ['draft', 'idea'] }
        },
        include: {
            metrics: true,
            analysis: true
        },
        orderBy: { createdAt: 'desc' },
        take: 200
    });

    // --- Stats Calculation ---
    // Last 7 posts logic for Engagement
    const last7Posts = posts.slice(0, 7);
    const previous7Posts = posts.slice(7, 14);

    const viewsLast7 = last7Posts.reduce((sum, p) => sum + (p.metrics?.views || 0), 0);

    // Engagement = Views + Saves + Comments (simplified interactions)
    // Or just (Likes + Saves + Comments) / Views? Users usually mean Total Interactions here unless specified.
    // Based on previous code: sum of views+saves+comments (?) 
    // Wait, previous code was: sum + views + saves + comments. That's weird. "Engagement" usually excludes views. 
    // But I will stick to previous logic to avoid regression unless requested.
    // actually, let's look at previous code: `sum + (m?.views || 0) + ...`
    // User requested "Engagement ... +100%". 
    // I'll keep the same calc.

    const calcEngagement = (pList: any[]) => pList.reduce((sum, p) => sum + (p.metrics?.likes || 0) + (p.metrics?.saves || 0) + (p.metrics?.comments || 0), 0);

    const engagementLast7 = calcEngagement(last7Posts);
    const engagementPrevious7 = calcEngagement(previous7Posts);

    let engagementTrend: 'up' | 'down' | 'neutral' = 'neutral';
    let engagementChange = 0;
    if (engagementPrevious7 > 0) {
        engagementChange = ((engagementLast7 - engagementPrevious7) / engagementPrevious7) * 100;
        engagementTrend = engagementChange > 0 ? 'up' : engagementChange < 0 ? 'down' : 'neutral';
    } else if (engagementLast7 > 0) {
        engagementChange = 100;
        engagementTrend = 'up';
    }

    // Top Posts
    const topPosts = [...posts]
        .sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))
        .slice(0, 10);

    const totalLikes = posts.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0);
    const totalSaves = posts.reduce((sum, p) => sum + (p.metrics?.saves || 0), 0);

    // --- History & Snapshots ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Ensure "Views" snapshot for today exists (Lazy Capture)
    const totalViewsAllTime = posts.reduce((sum, p) => sum + (p.metrics?.views || 0), 0);

    // We want "Views" history. 
    // If we only store "Total Views" in snapshot, the graph will show cumulative growth.
    // If we want "Daily Views", we need diffs. 
    // User asked "Graphique qui évolue au fil du temps". Total views growing is a fine graph.
    // Or daily views? Usually "Performance" implies daily activity.
    // BUT capturing daily activity requires knowing what happened *today*.
    // Using simple "Total Views" snapshot is easier and robust.

    // Upsert Snapshots
    const upsertSnapshot = async (metric: string, value: number) => {
        await prisma.analyticsSnapshot.upsert({
            where: {
                profileId_date_metric: {
                    profileId: activeProfileId,
                    metric,
                    date: today
                }
            },
            update: { value },
            create: {
                profileId: activeProfileId,
                metric,
                value,
                date: today
            }
        });
    };

    // ✅ PERF: Run snapshot upserts, history fetch, and profile query in parallel
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 180);

    const [, , , snapshots, profile] = await Promise.all([
        upsertSnapshot('views', totalViewsAllTime),
        upsertSnapshot('likes', totalLikes),
        upsertSnapshot('saves', totalSaves),
        prisma.analyticsSnapshot.findMany({
            where: {
                profileId: activeProfileId,
                date: { gte: thirtyDaysAgo }
            },
            orderBy: { date: 'asc' }
        }),
        prisma.profile.findUnique({ where: { id: activeProfileId } })
    ]);

    // Format for Recharts [{ date: 'DD/MM', value: 123 }]
    const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

    const viewsHistory = snapshots.filter(s => s.metric === 'views').map(s => ({
        date: formatDate(s.date),
        value: s.value,
        originalDate: s.date
    }));

    const followersHistory = snapshots.filter(s => s.metric === 'followers').map(s => ({
        date: formatDate(s.date),
        value: s.value,
        originalDate: s.date
    }));

    const likesHistory = snapshots.filter(s => s.metric === 'likes').map(s => ({
        date: formatDate(s.date),
        value: s.value,
        originalDate: s.date
    }));

    const savesHistory = snapshots.filter(s => s.metric === 'saves').map(s => ({
        date: formatDate(s.date),
        value: s.value,
        originalDate: s.date
    }));

    const currentFollowers = profile?.followersCount || 0;

    // Calc Followers Trend (vs yesterday or last snapshot)
    let followersTrend = 0;
    let followersTrendDirection: 'up' | 'down' | 'neutral' = 'neutral';

    // Get last 2 followers snapshots
    const fSnaps = snapshots.filter(s => s.metric === 'followers');
    if (fSnaps.length >= 2) {
        const last = fSnaps[fSnaps.length - 1].value;
        const prev = fSnaps[fSnaps.length - 2].value;
        if (prev > 0) {
            followersTrend = ((last - prev) / prev) * 100;
            followersTrendDirection = followersTrend > 0 ? 'up' : followersTrend < 0 ? 'down' : 'neutral';
        }
    }

    // --- Engagement Rate & Save Rate ---
    const totalViews = totalViewsAllTime;
    const totalComments = posts.reduce((sum, p) => sum + (p.metrics?.comments || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.metrics?.shares || 0), 0);
    const totalInteractions = totalLikes + totalComments + totalShares + totalSaves;
    const engagementRate = totalViews > 0 ? ((totalInteractions / totalViews) * 100) : 0;
    const saveRate = totalViews > 0 ? ((totalSaves / totalViews) * 100) : 0;

    // Per-post engagement rates for trend calculation
    const postEngagementRates = posts
        .filter(p => (p.metrics?.views || 0) > 0)
        .map(p => {
            const v = p.metrics?.views || 1;
            const interactions = (p.metrics?.likes || 0) + (p.metrics?.comments || 0) + (p.metrics?.shares || 0) + (p.metrics?.saves || 0);
            return interactions / v * 100;
        });

    const avgEngagementLast7 = postEngagementRates.slice(0, 7).length > 0
        ? postEngagementRates.slice(0, 7).reduce((a, b) => a + b, 0) / postEngagementRates.slice(0, 7).length
        : 0;
    const avgEngagementPrev7 = postEngagementRates.slice(7, 14).length > 0
        ? postEngagementRates.slice(7, 14).reduce((a, b) => a + b, 0) / postEngagementRates.slice(7, 14).length
        : 0;

    let engagementRateTrend: 'up' | 'down' | 'neutral' = 'neutral';
    let engagementRateChange = 0;
    if (avgEngagementPrev7 > 0) {
        engagementRateChange = ((avgEngagementLast7 - avgEngagementPrev7) / avgEngagementPrev7) * 100;
        engagementRateTrend = engagementRateChange > 0 ? 'up' : engagementRateChange < 0 ? 'down' : 'neutral';
    }

    // --- Follower Growth Rate (followers gained per week) ---
    const fSnapsForGrowth = snapshots.filter(s => s.metric === 'followers').sort((a, b) => a.date.getTime() - b.date.getTime());
    let followerGrowthRate = 0;
    let followerGrowthDirection: 'up' | 'down' | 'neutral' = 'neutral';
    if (fSnapsForGrowth.length >= 2) {
        const newest = fSnapsForGrowth[fSnapsForGrowth.length - 1];
        // Find snapshot from ~7 days ago
        const weekAgo = new Date(newest.date);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoSnap = fSnapsForGrowth.reduce((closest, snap) =>
            Math.abs(snap.date.getTime() - weekAgo.getTime()) < Math.abs(closest.date.getTime() - weekAgo.getTime()) ? snap : closest
        );
        if (weekAgoSnap.value > 0 && weekAgoSnap !== newest) {
            followerGrowthRate = newest.value - weekAgoSnap.value;
            followerGrowthDirection = followerGrowthRate > 0 ? 'up' : followerGrowthRate < 0 ? 'down' : 'neutral';
        }
    }

    return {
        posts,
        lastSyncAt: profile?.lastSyncAt ?? null,
        stats: {
            views: viewsLast7,
            totalViews: totalViewsAllTime,
            likes: totalLikes,
            saves: totalSaves,
            comments: totalComments,
            shares: totalShares,
            engagement: Math.round(engagementChange),
            engagementTrend,
            engagementRate: Math.round(engagementRate * 100) / 100,
            engagementRateTrend,
            engagementRateChange: Math.round(engagementRateChange),
            saveRate: Math.round(saveRate * 100) / 100,
            followers: currentFollowers,
            followersTrend: Math.round(followersTrend),
            followersTrendDirection,
            followerGrowthRate,
            followerGrowthDirection,
        },
        topPosts,
        history: {
            views: viewsHistory,
            followers: followersHistory,
            likes: likesHistory,
            saves: savesHistory
        }
    };
}

// Basic ML: Simple Linear Regression (Slide Count vs Views)
export async function getInsights() {
    const session = await auth();
    if (!session?.user?.id) return null;

    // ✅ PERF: Limit to 100 most recent posts for regression analysis
    const posts = await prisma.post.findMany({
        where: {
            userId: session.user.id,
            NOT: { metrics: null },
            status: { notIn: ['draft', 'idea'] }
        },
        include: { metrics: true },
        orderBy: { createdAt: 'desc' },
        take: 100
    });

    if (posts.length < 3) return ["Pas assez de données pour l'apprentissage."];

    // Data points: [SlideCount, Views]
    const data = posts.map(p => ({ x: p.slideCount || 0, y: p.metrics?.views || 0 }));

    // Calculate mean
    const xMean = data.reduce((a, b) => a + b.x, 0) / data.length;
    const yMean = data.reduce((a, b) => a + b.y, 0) / data.length;

    // Calculate slope (m) and intercept (b)
    const numerator = data.reduce((acc, point) => acc + (point.x - xMean) * (point.y - yMean), 0);
    const denominator = data.reduce((acc, point) => acc + Math.pow(point.x - xMean, 2), 0);

    const slope = denominator !== 0 ? numerator / denominator : 0;

    const insights = [];
    if (slope > 50) {
        insights.push(`Tendance : Chaque slide supplémentaire ajoute environ ${Math.round(slope)} vues.`);
    } else if (slope < -50) {
        insights.push(`Attention : Les carrousels trop longs semblent réduire les vues (${Math.round(slope)} vues par slide).`);
    } else {
        insights.push("Impact neutre de la longueur du carrousel pour l'instant.");
    }

    // Engagement analysis
    const bestPost = posts.sort((a, b) => (b.metrics?.likes || 0) - (a.metrics?.likes || 0))[0];
    if (bestPost) {
        insights.push(`Ton champion : "${bestPost.hookText}" avec ${bestPost.metrics?.likes} likes.`);
    }

    return insights;
}

export async function getPostDetails(postId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId, userId: session.user.id },
            include: {
                metrics: true,
                analysis: true // Include ContentAnalysis
            }
        });

        if (!post) return { error: 'Post not found' };

        // Parse slides safely
        let slides = [];
        const rawPost = post as any;
        try {
            slides = rawPost.slides ? JSON.parse(rawPost.slides) : [];
        } catch (e) {
            console.error("Failed to parse slides JSON:", e);
            slides = [];
        }

        // --- NEW LOGIC FOR SCRAPED IMAGES ---
        // If post has carouselImages (from scraping), use them as slides if slides are empty OR always?
        // Usually scraped images are better than default empty slides.
        // Let's merge or prioritize.

        let finalSlides = [...slides];

        if (rawPost.carouselImages) {
            try {
                const scrapedImages = JSON.parse(rawPost.carouselImages);
                if (Array.isArray(scrapedImages) && scrapedImages.length > 0) {
                    // If we have scraped images, let's create "virtual" slides for them
                    finalSlides = scrapedImages.map((url, i) => ({
                        id: `scraped-${i}`,
                        text: slides[i]?.text || (i === 0 ? rawPost.description || "" : ""), // Preserve text if mapped, else empty
                        imageUrl: url,
                        slide_number: i + 1
                    }));
                }
            } catch (e) {
                console.error("Failed to parse carouselImages:", e);
            }
        }

        const imageIds = finalSlides.map((s: any) => s.imageId || s.image_id).filter(Boolean);

        // Fetch user images (internal) to get URLs
        const images = await prisma.image.findMany({
            where: { id: { in: imageIds } },
            select: { id: true, storageUrl: true }
        });

        const imageMap = new Map(images.map(img => [img.id, img.storageUrl]));

        // Enrich slides with URLs
        const resolvedSlides = finalSlides.map((slide: any) => ({
            ...slide,
            imageUrl: imageMap.get(slide.imageId || slide.image_id) || slide.imageUrl || slide.image_url || null
        }));

        // Convert Dates to strings to avoid serialization issues if any
        const safePost = {
            ...post,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            metrics: post.metrics ? {
                ...post.metrics,
                updatedAt: post.metrics.updatedAt.toISOString()
            } : null,
            slides: resolvedSlides,
            // Pass raw fields too if needed
            videoUrl: (post as any).videoUrl,
            carouselImages: (post as any).carouselImages
        };

        return {
            success: true,
            post: safePost
        };

    } catch (e) {
        console.error("Error fetching post details:", e);
        return { error: 'Failed to fetch details' };
    }
}

export async function updatePost(postId: string, data: { title?: string; description?: string; date?: string; slides?: any[]; metrics?: { views: number; likes: number; saves: number; comments: number } }) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.date !== undefined) updateData.publishedAt = new Date(data.date);  // ✅ Fix: Use publishedAt not createdAt
        if (data.slides !== undefined) {
            // Update to support new CreationView Slide structure while maintaining backward compatibility where possible
            // We want to persist: slide_number, text, intention, image_id (or imageId)
            const sanitizedSlides = data.slides.map(s => {
                return {
                    slide_number: s.slide_number,
                    text: s.text,
                    intention: s.intention,
                    image_id: s.image_id || s.imageId, // Standardize on image_id? Or keep both? Let's keep data as passed mostly but ensure image ID is saved
                    imageId: s.imageId || s.image_id, // Keep redundant for now if other systems use it, or clean up later.
                    description: s.description || s.intention, // Map intention to description if missing
                    imageHumanId: s.imageHumanId
                };
            });
            updateData.slides = JSON.stringify(sanitizedSlides);
        }

        if (data.metrics) {
            updateData.metrics = {
                update: {
                    views: data.metrics.views,
                    likes: data.metrics.likes,
                    comments: data.metrics.comments,
                    saves: data.metrics.saves
                }
            };
        }

        await prisma.$transaction(async (tx) => {
            await tx.post.update({
                where: { id: postId, userId: session.user!.id },
                data: updateData
            });
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to update post' };
    }
}

export async function deletePost(postId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.post.delete({
            where: { id: postId, userId: session.user.id }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete post' };
    }
}


import { analyzePostContent } from '@/lib/ai/claude';

export async function analyzePost(postId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // ✅ FIX: Fetch user's Anthropic API key (per-user) instead of using env variable
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { anthropicApiKey: true }
        });
        const userApiKey = currentUser?.anthropicApiKey;
        if (!userApiKey) {
            return { success: false, error: 'Clé API Anthropic non configurée. Ajoutez votre clé dans les paramètres.' };
        }

        const post = await prisma.post.findUnique({
            where: { id: postId, userId: session.user.id },
            include: {
                metrics: true,
                profile: true
            }
        });

        if (!post) return { success: false, error: 'Post not found' };

        // 1. Prepare Data for AI
        const rawPost = post as any;
        let images: string[] = [];

        // Try to get images from carouselImages (scraped)
        if (rawPost.carouselImages) {
            try {
                const scraped = JSON.parse(rawPost.carouselImages);
                if (Array.isArray(scraped)) images = scraped;
            } catch (e) { console.error("Error parsing carouselImages", e); }
        }

        // Fallback or Addition: if slides have images? 
        // Typically scraped images are better. If scraped images are empty, maybe use slides.
        if (images.length === 0 && rawPost.slides) {
            try {
                const slides = JSON.parse(rawPost.slides);
                images = slides.map((s: any) => s.image_url || s.imageUrl).filter(Boolean);
            } catch { /* JSON parse fallback */ }
        }

        // If still no images, fallback to cover
        if (images.length === 0 && rawPost.coverUrl) {
            images.push(rawPost.coverUrl);
        }

        if (images.length === 0) {
            return { success: false, error: 'Aucune image trouvée pour analyse' };
        }

        const textContext = `
            Titre: ${post.title || ""}
            Description: ${post.description || ""}
            Hook: ${post.hookText || ""}
        `.trim();

        // 2. Call Claude AI
        console.log("Analyzing with Claude:", images.length, "images");
        const aiResult = await analyzePostContent(images, textContext, userApiKey);

        // 3. Calculate Performance Score (weighted: 50% engagement + 50% views)

        // 3a. Engagement Score (based on engagement rate)
        const totalEngagement = (post.metrics?.likes || 0) + (post.metrics?.comments || 0) + (post.metrics?.shares || 0);
        const engagementRate = (post.metrics?.views || 0) > 0 ? (totalEngagement / post.metrics!.views) * 100 : 0;

        let engagementScore = 0;
        if (engagementRate >= 10) engagementScore = 100;
        else if (engagementRate >= 5) engagementScore = 80 + (engagementRate - 5) * 4;
        else if (engagementRate >= 2) engagementScore = 50 + (engagementRate - 2) * 10;
        else engagementScore = engagementRate * 25;

        // 3b. Views Score (based on absolute views - rewards viral posts)
        const views = post.metrics?.views || 0;
        let viewsScore = 0;

        if (views >= 500000) viewsScore = 100;
        else if (views >= 100000) viewsScore = 80 + ((views - 100000) / 400000) * 20;  // 80-100
        else if (views >= 50000) viewsScore = 60 + ((views - 50000) / 50000) * 20;     // 60-80
        else if (views >= 10000) viewsScore = 40 + ((views - 10000) / 40000) * 20;     // 40-60
        else if (views >= 1000) viewsScore = 20 + ((views - 1000) / 9000) * 20;        // 20-40
        else viewsScore = (views / 1000) * 20;                                          // 0-20

        console.log(`📊 Post ${postId} Analysis - Views: ${views.toLocaleString()}, ViewsScore: ${viewsScore.toFixed(1)}, EngagementRate: ${engagementRate.toFixed(2)}%, EngagementScore: ${engagementScore.toFixed(1)}`);

        // 3c. Combine: 50% engagement + 50% views (caps at 100)
        const performanceScore = Math.min(100, (engagementScore * 0.5) + (viewsScore * 0.5));

        // 4. Calculate Final Scores from AI Data (with capping to prevent > 10/10)
        const qsHookTotal = Math.min(25, aiResult.qsHookText + aiResult.qsHookVerbal + aiResult.qsHookVisual);
        const qsBodyTotal = Math.min(20, aiResult.qsBodyValue + aiResult.qsBodyStructure + aiResult.qsBodyRhythm + aiResult.qsBodyStory);
        const qsCtaTotal = Math.min(10, aiResult.qsCtaClarity + aiResult.qsCtaTiming + aiResult.qsCtaUrgency + aiResult.qsCtaVisibility);
        const qsVisualTotal = Math.min(15, aiResult.qsVisualQuality + aiResult.qsVisualEngagement + aiResult.qsVisualBrand);
        const qsMusicTotal = Math.min(10, aiResult.qsMusicTrend + aiResult.qsMusicFit + aiResult.qsMusicQuality);
        const qsTimingTotal = Math.min(10, aiResult.qsTimingOptimal + aiResult.qsTimingDay + aiResult.qsTimingContext);
        const qsPersonaTotal = Math.min(10, aiResult.qsPersonaFit + aiResult.qsNicheFit);

        const qualityScore = Math.min(100, qsHookTotal + qsBodyTotal + qsCtaTotal + qsVisualTotal + qsMusicTotal + qsTimingTotal + qsPersonaTotal);

        // Intelligent Score (IFS) - capped at 100 to ensure max 10.0/10
        const intelligentScore = Math.min(100, (qualityScore * 0.6) + (performanceScore * 0.4));

        console.log(`✅ Final Scores - Quality: ${qualityScore.toFixed(1)}/100, Performance: ${performanceScore.toFixed(1)}/100, Intelligent: ${intelligentScore.toFixed(1)}/100 (${(intelligentScore / 10).toFixed(1)}/10)`);

        // 5. Save to DB
        if (post.profileId) {
            await prisma.contentAnalysis.upsert({
                where: { postId: post.id },
                create: {
                    postId: post.id,
                    profileId: post.profileId,
                    qsHookTotal, qsBodyTotal, qsCtaTotal,
                    qsVisualTotal, qsMusicTotal, qsTimingTotal, qsPersonaTotal,

                    // Detailed fields (we need to map JSON fields to schema fields)
                    qsHookText: aiResult.qsHookText, qsHookVerbal: aiResult.qsHookVerbal, qsHookVisual: aiResult.qsHookVisual,
                    qsBodyValue: aiResult.qsBodyValue, qsBodyStructure: aiResult.qsBodyStructure, qsBodyRhythm: aiResult.qsBodyRhythm, qsBodyStory: aiResult.qsBodyStory,
                    qsCtaClarity: aiResult.qsCtaClarity, qsCtaTiming: aiResult.qsCtaTiming, qsCtaUrgency: aiResult.qsCtaUrgency, qsCtaVisibility: aiResult.qsCtaVisibility,
                    qsVisualQuality: aiResult.qsVisualQuality, qsVisualEngagement: aiResult.qsVisualEngagement, qsVisualBrand: aiResult.qsVisualBrand,
                    qsMusicTrend: aiResult.qsMusicTrend, qsMusicFit: aiResult.qsMusicFit, qsMusicQuality: aiResult.qsMusicQuality,
                    qsTimingOptimal: aiResult.qsTimingOptimal, qsTimingDay: aiResult.qsTimingDay, qsTimingContext: aiResult.qsTimingContext,
                    qsPersonaFit: aiResult.qsPersonaFit, qsNicheFit: aiResult.qsNicheFit,

                    qualityScore,
                    performanceScore,
                    intelligentScore
                },
                update: {
                    qsHookTotal, qsBodyTotal, qsCtaTotal, qsVisualTotal, qsMusicTotal, qsTimingTotal, qsPersonaTotal,

                    qsHookText: aiResult.qsHookText, qsHookVerbal: aiResult.qsHookVerbal, qsHookVisual: aiResult.qsHookVisual,
                    qsBodyValue: aiResult.qsBodyValue, qsBodyStructure: aiResult.qsBodyStructure, qsBodyRhythm: aiResult.qsBodyRhythm, qsBodyStory: aiResult.qsBodyStory,
                    qsCtaClarity: aiResult.qsCtaClarity, qsCtaTiming: aiResult.qsCtaTiming, qsCtaUrgency: aiResult.qsCtaUrgency, qsCtaVisibility: aiResult.qsCtaVisibility,
                    qsVisualQuality: aiResult.qsVisualQuality, qsVisualEngagement: aiResult.qsVisualEngagement, qsVisualBrand: aiResult.qsVisualBrand,
                    qsMusicTrend: aiResult.qsMusicTrend, qsMusicFit: aiResult.qsMusicFit, qsMusicQuality: aiResult.qsMusicQuality,
                    qsTimingOptimal: aiResult.qsTimingOptimal, qsTimingDay: aiResult.qsTimingDay, qsTimingContext: aiResult.qsTimingContext,
                    qsPersonaFit: aiResult.qsPersonaFit, qsNicheFit: aiResult.qsNicheFit,

                    qualityScore,
                    performanceScore,
                    intelligentScore
                }
            });
        }

        // ✅ FIX: Update hookText/title from first slide text if current hookText is corrupted or missing
        // This ensures the title always reflects the actual first slide content
        if (rawPost.slides) {
            try {
                const parsedSlides = JSON.parse(rawPost.slides);
                const firstSlideText = parsedSlides[0]?.text?.trim();
                const currentHook = (post.hookText || '').trim();
                const isCorrupted = currentHook.startsWith('[Erreur') || currentHook.startsWith('[Error');
                const isTruncatedDescription = post.description && currentHook === post.description.slice(0, 50);

                if (firstSlideText && !firstSlideText.startsWith('[Erreur') && (isCorrupted || isTruncatedDescription)) {
                    await prisma.post.update({
                        where: { id: post.id },
                        data: {
                            hookText: firstSlideText.slice(0, 200),
                            title: firstSlideText.slice(0, 100),
                        }
                    });
                    console.log(`✅ Updated hookText/title from first slide: "${firstSlideText.slice(0, 50)}..."`);
                }
            } catch (e) { /* ignore parse errors */ }
        }

        revalidatePath('/dashboard');

        // [NEW] Auto-refresh insights cache every 5 new analyses
        if (post.profileId) {
            const totalAnalyses = await prisma.contentAnalysis.count({
                where: { profileId: post.profileId }
            });

            if (totalAnalyses % 5 === 0 && totalAnalyses >= 5) {
                console.log(`🔄 Auto-refreshing insights cache (${totalAnalyses} total analyses)`);
                // Fire and forget - don't wait for completion
                if (userApiKey) {
                    import('@/lib/ai/insights-generator').then(({ generateProfileInsights }) => {
                        generateProfileInsights(post.profileId!, userApiKey).catch(console.error);
                    });
                }
            }
        }

        return {
            success: true,
            analysis: {
                qualityScore,
                performanceScore,
                intelligentScore,
                engagementRate
            }
        };

    } catch (e) {
        console.error("Error analyzing post:", e);
        return { success: false, error: 'Failed to analyze post' };
    }
}

// ===== BEST TIME TO POST =====
// Analyzes historical performance by day-of-week and hour to recommend optimal posting times
export async function getBestPostingTimes() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile' };

    try {
        const posts = await prisma.post.findMany({
            where: {
                profileId: activeProfileId,
                status: { in: ['created', 'published'] },
                publishedAt: { not: null }
            },
            include: { metrics: true },
            orderBy: { publishedAt: 'desc' },
            take: 100
        });

        if (posts.length < 5) {
            return { success: true, recommendation: null, message: "Pas assez de posts pour analyser (minimum 5)" };
        }

        // Analyze performance by day of week and hour
        const dayPerformance: Record<number, { totalViews: number; count: number }> = {};
        const hourPerformance: Record<number, { totalViews: number; count: number }> = {};

        for (const post of posts) {
            if (!post.publishedAt || !post.metrics) continue;
            const date = new Date(post.publishedAt);
            const day = date.getDay(); // 0=Sun, 6=Sat
            const hour = date.getHours();
            const views = post.metrics.views || 0;

            if (!dayPerformance[day]) dayPerformance[day] = { totalViews: 0, count: 0 };
            dayPerformance[day].totalViews += views;
            dayPerformance[day].count++;

            if (!hourPerformance[hour]) hourPerformance[hour] = { totalViews: 0, count: 0 };
            hourPerformance[hour].totalViews += views;
            hourPerformance[hour].count++;
        }

        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

        // Find best days (sorted by avg views)
        const bestDays = Object.entries(dayPerformance)
            .map(([day, data]) => ({
                day: dayNames[parseInt(day)],
                avgViews: Math.round(data.totalViews / data.count),
                postCount: data.count
            }))
            .sort((a, b) => b.avgViews - a.avgViews);

        // Find best hours (sorted by avg views, only hours with 2+ posts)
        const bestHours = Object.entries(hourPerformance)
            .filter(([_, data]) => data.count >= 2)
            .map(([hour, data]) => ({
                hour: `${hour}h`,
                avgViews: Math.round(data.totalViews / data.count),
                postCount: data.count
            }))
            .sort((a, b) => b.avgViews - a.avgViews);

        return {
            success: true,
            recommendation: {
                bestDays: bestDays.slice(0, 3),
                bestHours: bestHours.slice(0, 3),
                totalPostsAnalyzed: posts.length,
                topDay: bestDays[0] || null,
                topHour: bestHours[0] || null
            }
        };
    } catch (e) {
        console.error("Error analyzing posting times:", e);
        return { error: 'Failed to analyze posting times' };
    }
}

// ===== HOOK PERFORMANCE STATS =====
// Analyzes hook patterns across published posts to identify what works best
export async function getHookPerformanceStats() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile' };

    try {
        const posts = await prisma.post.findMany({
            where: {
                profileId: activeProfileId,
                status: { notIn: ['draft', 'idea', 'rejected'] },
                hookText: { not: '' },
            },
            include: { metrics: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        if (posts.length < 3) {
            return { success: true, stats: null, message: "Pas assez de posts pour analyser (minimum 3)" };
        }

        // Classify hooks by dominant pattern (scoring system — a hook can match multiple traits, the strongest wins)
        type HookCategory = 'question' | 'statement' | 'suspense' | 'direct' | 'list';
        const categories: Record<HookCategory, { posts: typeof posts; totalViews: number; totalEngagement: number }> = {
            question: { posts: [], totalViews: 0, totalEngagement: 0 },
            statement: { posts: [], totalViews: 0, totalEngagement: 0 },
            suspense: { posts: [], totalViews: 0, totalEngagement: 0 },
            direct: { posts: [], totalViews: 0, totalEngagement: 0 },
            list: { posts: [], totalViews: 0, totalEngagement: 0 },
        };

        const categoryLabels: Record<HookCategory, string> = {
            question: 'Question',
            statement: 'Affirmation forte',
            suspense: 'Suspense / Curiosité',
            direct: 'Interpellation directe',
            list: 'Liste / Classement',
        };

        // Score-based classification: each hook gets points per category, highest wins
        const classifyHook = (hook: string): HookCategory => {
            const h = hook.toLowerCase().trim();
            const scores: Record<HookCategory, number> = { question: 0, statement: 0, suspense: 0, direct: 0, list: 0 };

            // Question signals
            if (h.includes('?')) scores.question += 3;
            if (/^(pourquoi|comment|est-ce|quand|où|qui |quel|savais|sais-tu)/.test(h)) scores.question += 2;

            // Suspense / curiosity signals
            if (h.includes('...')) scores.suspense += 3;
            if (/secret|personne ne|jamais|découvr|caché|interdit|choquant|incroyable|vérité/.test(h)) scores.suspense += 2;
            if (/\(.*\.\.\.\)|\(.*dernier.*\)/.test(h)) scores.suspense += 2; // parenthetical tease like "(le dernier...)"

            // Direct address signals
            if (/\btu\b|\bt'|\btoi\b/.test(h)) scores.direct += 2;
            if (/^(arrête|imagine|oublie|regarde|écoute|fais|ne |stop)/.test(h)) scores.direct += 2;

            // List / number signals — only pure list formats
            if (/^(top |\d+ (choses|raisons|erreurs|façons|astuces|signes|conseils|étapes|règles|secrets))/.test(h)) scores.list += 3;
            if (/^\d+[\s.:)\-]/.test(h)) scores.list += 1; // starts with number but could be anything

            // Find highest scoring category
            let best: HookCategory = 'statement';
            let bestScore = 0;
            for (const [cat, score] of Object.entries(scores)) {
                if (score > bestScore) {
                    bestScore = score;
                    best = cat as HookCategory;
                }
            }
            return best;
        };

        for (const post of posts) {
            const hook = post.hookText || '';
            const views = post.metrics?.views || 0;
            const engagement = (post.metrics?.likes || 0) + (post.metrics?.comments || 0) + (post.metrics?.saves || 0);

            const cat = classifyHook(hook);

            categories[cat].posts.push(post);
            categories[cat].totalViews += views;
            categories[cat].totalEngagement += engagement;
        }

        // Build stats per category
        const hookStats = (Object.keys(categories) as HookCategory[])
            .filter(key => categories[key].posts.length > 0)
            .map(key => {
                const cat = categories[key];
                const count = cat.posts.length;
                const avgViews = Math.round(cat.totalViews / count);
                const avgEngagement = count > 0 && cat.totalViews > 0
                    ? Math.round((cat.totalEngagement / cat.totalViews) * 10000) / 100
                    : 0;
                const bestPost = cat.posts.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))[0];

                return {
                    type: key,
                    label: categoryLabels[key],
                    count,
                    avgViews,
                    avgEngagement,
                    bestHook: bestPost?.hookText?.slice(0, 80) || '',
                    bestViews: bestPost?.metrics?.views || 0,
                };
            })
            .sort((a, b) => b.avgViews - a.avgViews);

        // Top 5 hooks overall
        const topHooks = [...posts]
            .sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))
            .slice(0, 5)
            .map(p => ({
                hook: p.hookText?.slice(0, 80) || '',
                views: p.metrics?.views || 0,
                likes: p.metrics?.likes || 0,
                engagement: (p.metrics?.views || 0) > 0
                    ? Math.round(((p.metrics?.likes || 0) + (p.metrics?.comments || 0) + (p.metrics?.saves || 0)) / (p.metrics?.views || 1) * 10000) / 100
                    : 0,
            }));

        return {
            success: true,
            stats: {
                hookStats,
                topHooks,
                totalPosts: posts.length,
            }
        };
    } catch (e) {
        console.error("Error analyzing hook performance:", e);
        return { error: 'Failed to analyze hook performance' };
    }
}

// ===== COMPETITOR ENGAGEMENT BENCHMARK =====
// Compares user's engagement rate vs competitors average
export async function getCompetitorBenchmark() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile' };

    try {
        // User's engagement
        const userPosts = await prisma.post.findMany({
            where: {
                profileId: activeProfileId,
                status: { notIn: ['draft', 'idea', 'rejected'] },
            },
            include: { metrics: true },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const userViews = userPosts.reduce((s, p) => s + (p.metrics?.views || 0), 0);
        const userInteractions = userPosts.reduce((s, p) => s + (p.metrics?.likes || 0) + (p.metrics?.comments || 0) + (p.metrics?.saves || 0), 0);
        const userEngRate = userViews > 0 ? (userInteractions / userViews) * 100 : 0;

        // Competitors' average engagement
        const competitors = await prisma.competitor.findMany({
            where: { profileId: activeProfileId, isActive: true },
            include: {
                posts: {
                    orderBy: { publishedAt: 'desc' },
                    take: 20,
                }
            }
        });

        let compTotalViews = 0;
        let compTotalInteractions = 0;
        let compCount = 0;

        for (const comp of competitors) {
            for (const post of comp.posts) {
                compTotalViews += post.views || 0;
                compTotalInteractions += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
                compCount++;
            }
        }

        const compEngRate = compTotalViews > 0 ? (compTotalInteractions / compTotalViews) * 100 : 0;
        const diff = userEngRate - compEngRate;

        return {
            success: true,
            benchmark: {
                userEngagementRate: Math.round(userEngRate * 100) / 100,
                competitorEngagementRate: Math.round(compEngRate * 100) / 100,
                difference: Math.round(diff * 100) / 100,
                direction: diff > 0 ? 'above' as const : diff < 0 ? 'below' as const : 'equal' as const,
                userPostCount: userPosts.length,
                competitorPostCount: compCount,
                competitorCount: competitors.length,
            }
        };
    } catch (e) {
        console.error("Error fetching competitor benchmark:", e);
        return { error: 'Failed to fetch competitor benchmark' };
    }
}

// ===== AI WEEKLY ACTION PLAN =====
// Generates weekly actionable recommendations based on analytics
export async function generateWeeklyPlan() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile' };

    try {
        // Get user's API key
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { anthropicApiKey: true }
        });
        if (!user?.anthropicApiKey) {
            return { error: 'Clé API Anthropic non configurée.' };
        }

        // Gather data for AI
        const [profile, posts, hookStats, benchmark, bestTimes] = await Promise.all([
            prisma.profile.findUnique({ where: { id: activeProfileId } }),
            prisma.post.findMany({
                where: { profileId: activeProfileId, status: { notIn: ['draft', 'idea', 'rejected'] } },
                include: { metrics: true },
                orderBy: { createdAt: 'desc' },
                take: 30,
            }),
            getHookPerformanceStats(),
            getCompetitorBenchmark(),
            getBestPostingTimes(),
        ]);

        const totalViews = posts.reduce((s, p) => s + (p.metrics?.views || 0), 0);
        const totalLikes = posts.reduce((s, p) => s + (p.metrics?.likes || 0), 0);
        const totalSaves = posts.reduce((s, p) => s + (p.metrics?.saves || 0), 0);
        const avgViews = posts.length > 0 ? Math.round(totalViews / posts.length) : 0;

        const topPost = posts.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))[0];
        const recentPosts = posts.slice(0, 7);
        const recentAvgViews = recentPosts.length > 0
            ? Math.round(recentPosts.reduce((s, p) => s + (p.metrics?.views || 0), 0) / recentPosts.length)
            : 0;

        const hookPerf = 'stats' in hookStats && hookStats.stats ? hookStats.stats : null;
        const bench = 'benchmark' in benchmark && benchmark.benchmark ? benchmark.benchmark : null;
        const times = 'recommendation' in bestTimes && bestTimes.recommendation ? bestTimes.recommendation : null;

        const prompt = `Tu es un stratège de contenu TikTok expert. Analyse les données suivantes et génère un plan d'action hebdomadaire concret (en français).

PROFIL:
- Niche: ${profile?.niche || 'Non définie'}
- Persona: ${profile?.persona || 'Non défini'}
- Audience cible: ${profile?.targetAudience || 'Non définie'}
- Abonnés: ${profile?.followersCount || 0}

PERFORMANCE (30 derniers posts):
- Posts total: ${posts.length}
- Vues moyennes: ${avgViews}
- Vues moyennes 7 derniers posts: ${recentAvgViews}
- Total likes: ${totalLikes}
- Total saves: ${totalSaves}
- Meilleur post: "${topPost?.hookText?.slice(0, 80)}" (${topPost?.metrics?.views || 0} vues)

${hookPerf ? `HOOKS QUI PERFORMENT:
${hookPerf.hookStats.map((h: any) => `- ${h.label}: ${h.count} posts, ${h.avgViews} vues moy., ${h.avgEngagement}% engagement`).join('\n')}
Top hooks: ${hookPerf.topHooks.map((h: any) => `"${h.hook}" (${h.views} vues)`).join(', ')}` : ''}

${bench ? `BENCHMARK CONCURRENCE:
- Mon taux d'engagement: ${bench.userEngagementRate}%
- Concurrents (moy.): ${bench.competitorEngagementRate}%
- Position: ${bench.direction === 'above' ? 'Au-dessus' : 'En-dessous'} (${bench.difference > 0 ? '+' : ''}${bench.difference}%)` : ''}

${times ? `MEILLEURS HORAIRES:
- Jours: ${times.bestDays?.map((d: any) => d.day).join(', ') || 'Pas assez de données'}
- Heures: ${times.bestHours?.map((h: any) => h.hour).join(', ') || 'Pas assez de données'}` : ''}

Génère un plan JSON avec cette structure exacte:
{
  "summary": "Résumé de la semaine en 1-2 phrases",
  "score": <1-10 note de santé du compte>,
  "actions": [
    { "priority": "high|medium|low", "action": "Action concrète", "reason": "Pourquoi", "metric": "KPI à surveiller" }
  ],
  "contentIdeas": [
    { "idea": "Idée de contenu", "hookSuggestion": "Suggestion de hook", "bestTime": "Jour + heure" }
  ],
  "warnings": ["Alerte si quelque chose va mal"]
}

Retourne UNIQUEMENT le JSON, rien d'autre. 5 actions max, 3 idées max, 2 warnings max.`;

        const client = new Anthropic({ apiKey: user.anthropicApiKey });
        const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';

        // Parse JSON response
        let plan;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            plan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
            plan = null;
        }

        if (!plan) {
            return { error: 'Impossible de générer le plan. Réessayez.' };
        }

        return { success: true, plan };
    } catch (e) {
        console.error("Error generating weekly plan:", e);
        return { error: 'Erreur lors de la génération du plan' };
    }
}

