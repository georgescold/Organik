
'use server';

import { auth } from '@/lib/auth';
import { prisma } from "@/lib/prisma";
import { runTikTokScraper, fetchTikTokDataset } from "@/lib/apify";
import { revalidatePath } from "next/cache";
import stringSimilarity from 'string-similarity';
import { uploadExternalImagesToStorage, uploadExternalImageToStorage } from '@/lib/storage';

// Define types for Apify output
interface TikTokProfile {
    authorMeta: {
        name: string;
        fans: number;
        avatar: string;
        signature: string;
        heart: number;
        video: number;
    };
    text: string;
    playCount: number;
    diggCount: number;
    shareCount: number;
    commentCount: number;
    collectCount: number;
    createTime?: number; // Unix timestamp in seconds
    createTimeISO?: string;
}

export async function scrapeAndSyncTikTokData() {


    try {
        // [STEP 0] Get authenticated user
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Non authentifié" };
        }

        // Get current user with active profile
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, activeProfileId: true, apifyApiKey: true }
        });
        if (!currentUser) throw new Error("No user found.");

        // Validate user's Apify API key
        const userApifyKey = currentUser.apifyApiKey;
        if (!userApifyKey) {
            return { success: false, error: "Clé API Apify non configurée. Ajoutez votre clé dans l'onglet \"Clé API\"." };
        }

        // [STEP 1] Cleanup disabled to fix "Updated" vs "New" count issue
        // We want to KEEP existing posts to update their metrics, not delete/recreate them.
        /*
        // Get IDs of posts that have analysis
        const analyzedPostIds = await prisma.contentAnalysis.findMany({
            where: {
                post: {
                    userId: currentUser.id,
                    origin: "scraped"
                }
            },
            select: { postId: true }
        }).then(analyses => analyses.map(a => a.postId));

        console.log(`🔒 Preserving ${analyzedPostIds.length} analyzed scraped posts`);

        // Delete only scraped posts WITHOUT analysis
        const deleteResult = await prisma.post.deleteMany({
            where: {
                userId: currentUser.id,
                origin: "scraped",
                id: { notIn: analyzedPostIds }  // ✅ Don't delete analyzed posts
            }
        });

        console.log(`🗑️ Deleted ${deleteResult.count} unanalyzed scraped posts`);
        */

        const activeProfile = await prisma.profile.findFirst({
            where: { id: currentUser.activeProfileId || undefined }
        });

        // Get sync limit from profile (default 50 to save Apify credits)
        const syncPostLimit = activeProfile?.syncPostLimit || 50;
        console.log(`📊 Sync post limit: ${syncPostLimit} (keeps top posts by views)`);

        // Determine which profile to scrape
        // ✅ FIX: Prioritize username over displayName — Apify needs the TikTok @username, not the display name
        const profileName = activeProfile?.username || activeProfile?.displayName;
        if (!profileName) {
            return { success: false, error: "Aucun nom de profil TikTok configuré. Va dans Paramètres pour l'ajouter." };
        }

        // 1. Run & Fetch (using user's Apify key with limit)
        const datasetId = await runTikTokScraper([profileName], true, userApifyKey, syncPostLimit);
        if (!datasetId) {
            return { success: false, error: "Sync skipped - no configuration." };
        }
        let items = (await fetchTikTokDataset(datasetId, userApifyKey)) as unknown as TikTokProfile[];

        if (!items || items.length === 0) {
            return { success: false, error: "No items returned." };
        }

        console.log(`📦 Received ${items.length} items from Apify`);

        // ✅ SORT by views (playCount) descending - keep best performers only
        items = items.sort((a: any, b: any) => {
            const aViews = a.playCount || 0;
            const bViews = b.playCount || 0;
            return bViews - aViews;  // Descending order (highest views first)
        });

        // ✅ Enforce limit (in case Apify returned more)
        items = items.slice(0, syncPostLimit);

        if (items.length > 0) {
            console.log(`   🏆 Top post: ${items[0].playCount?.toLocaleString()} views`);
            if (items.length > 1) {
                console.log(`   📊 Last post: ${items[items.length - 1].playCount?.toLocaleString()} views`);
            }
        }

        // 2. Profile Update
        // Find the first item that contains author metadata
        const validItem = items.find(item => item.authorMeta && item.authorMeta.name);

        if (!validItem) {
            console.error("❌ No authorMeta found in items");
            console.log("First item keys:", Object.keys(items[0]));
            return { success: false, error: "Scraped data is missing profile information." };
        }

        const profileData = validItem.authorMeta;
        console.log("👤 Profile data found:", {
            name: profileData.name,
            fans: profileData.fans,
            avatar: profileData.avatar?.slice(0, 50) + "...",
        });

        console.log("👤 User ID:", currentUser.id);
        console.log("👤 Active Profile ID:", currentUser.activeProfileId);

        // ✅ FIX: Upload avatar to Supabase Storage instead of storing TikTok's temporary signed URL
        // TikTok CDN URLs expire after a few weeks (x-expires parameter), causing broken images
        let permanentAvatarUrl: string | null = null;
        if (profileData.avatar) {
            console.log("🖼️ Uploading avatar to permanent storage...");
            const avatarFolder = `avatars/${currentUser.id}`;
            permanentAvatarUrl = await uploadExternalImageToStorage(profileData.avatar, avatarFolder);
            if (permanentAvatarUrl) {
            } else {
            }
        }

        const profile = await prisma.profile.upsert({
            where: { id: currentUser.activeProfileId || "placeholder" },
            update: {
                followersCount: profileData.fans, // RE-ENABLED for sync
                likesCount: profileData.heart || 0,
                displayName: profileData.name,
                ...(permanentAvatarUrl ? { avatarUrl: permanentAvatarUrl } : {}),
            },
            create: {
                userId: currentUser.id,
                displayName: profileData.name,
                followersCount: profileData.fans,
                avatarUrl: permanentAvatarUrl || profileData.avatar,
            }
        });

        // 3. Process Videos
        let updatedPosts = 0;
        let newPosts = 0;

        // ✅ PERF: Fetch ALL user posts in one query (manual + scraped) to avoid N+1 queries in the loop
        const [candidatePosts, allUserPosts] = await Promise.all([
            prisma.post.findMany({
                where: {
                    profileId: profile.id,
                    origin: { not: "scraped" }  // Only match manual/generated posts
                }
            }),
            prisma.post.findMany({
                where: { userId: currentUser.id },
                select: { id: true, tiktokId: true }  // Lightweight — only for dedup check
            })
        ]);

        // Build a lookup map for fast tiktokId dedup (replaces individual findFirst in loop)
        const existingTiktokIds = new Map(
            allUserPosts.filter(p => p.tiktokId).map(p => [p.tiktokId!, p.id])
        );


        // Debug: Show candidate posts details
        if (candidatePosts.length > 0) {
            console.log(`   Candidate posts:`);
            candidatePosts.forEach((p, idx) => {
                console.log(`   ${idx + 1}. ID: ${p.id.substring(0, 8)}, Origin: ${p.origin}, TikTokId: ${p.tiktokId || 'NONE'}, Slides: ${p.slides ? 'YES' : 'NO'}, Desc: "${(p.description || '').substring(0, 30)}..."`);
            });
        }

        for (const item of items) {
            const data = item as any;
            const scrapedText = (data.text || "").toLowerCase();
            const tiktokDate = data.createTime ? new Date(data.createTime * 1000) : null;

            // ✅ FIX: Skip items without a valid ID to avoid creating posts with tiktokId="undefined"
            if (!data.id) {
                continue;
            }
            const tiktokId = String(data.id);

            let matchedPost = null;
            let matchReason = "";

            // --- STRATEGY 0: ID MATCH (Exact) ---
            matchedPost = candidatePosts.find(p => p.tiktokId === tiktokId);
            if (matchedPost) matchReason = "TikTok ID Match";

            // --- STRATEGY A: RECENT POSTS (Date Window + Content Verification) ---
            if (!matchedPost && tiktokDate) {
                const recentCandidates = candidatePosts.filter(p => {
                    const dbDate = new Date(p.createdAt);
                    const diffHours = Math.abs(tiktokDate.getTime() - dbDate.getTime()) / (1000 * 60 * 60);
                    return diffHours < 48; // 48h Window
                });

                if (recentCandidates.length > 0) {
                    let bestScore = 0;
                    let bestCand = null;

                    for (const cand of recentCandidates) {
                        const dbDesc = (cand.description || "").toLowerCase();

                        // 1. Strict Description Inclusion
                        if (dbDesc.length > 5 && scrapedText.includes(dbDesc)) {
                            bestScore = 1.0;
                            bestCand = cand;
                            break;
                        }

                        // 2. Similarity
                        const score = dbDesc ? stringSimilarity.compareTwoStrings(scrapedText, dbDesc) : 0;
                        if (score > bestScore) {
                            bestScore = score;
                            bestCand = cand;
                        }
                    }

                    if (bestCand && bestScore > 0.6) {
                        matchedPost = bestCand;
                        matchReason = `Date + verified Description (Score ${bestScore.toFixed(2)})`;
                    }
                }
            }

            // --- STRATEGY B: FALLBACK ---
            if (!matchedPost) {
                for (const post of candidatePosts) {
                    const dbDesc = (post.description || "").toLowerCase();
                    if (dbDesc.length < 5) continue;
                    if (scrapedText.includes(dbDesc)) {
                        matchedPost = post;
                        matchReason = "Strict Description Match (Old Post)";
                        break;
                    }
                }
            }

            if (matchedPost) {
                // UPDATE EXISTING - PRESERVE MANUAL CONTENT
                console.log(`🔄 Matched post: ${matchedPost.id} (${matchReason})`);
                console.log(`   Origin: ${matchedPost.origin}, Has slides: ${matchedPost.slides ? 'YES' : 'NO'}, SlideCount: ${matchedPost.slideCount}`);

                // Update tiktokId if missing (for tracking only)
                if (!matchedPost.tiktokId) {
                    await prisma.post.update({
                        where: { id: matchedPost.id },
                        data: {
                            tiktokId  // ✅ ONLY update tiktokId - NEVER touch slides, description, or other content
                        }
                    });
                }

                // Update metrics only - NEVER touch content fields (slides, description, etc.)
                await prisma.metrics.upsert({
                    where: { postId: matchedPost.id },
                    update: {
                        views: data.playCount || 0,
                        likes: data.diggCount || 0,
                        shares: data.shareCount || 0,
                        comments: data.commentCount || 0,
                        saves: data.collectCount || 0
                    },
                    create: {
                        postId: matchedPost.id,
                        views: data.playCount || 0,
                        likes: data.diggCount || 0,
                        shares: data.shareCount || 0,
                        comments: data.commentCount || 0,
                        saves: data.collectCount || 0
                    }
                });

                updatedPosts++;
            } else {
                // CREATE NEW POST - No manual post matched
                console.log(`📝 Creating new scraped post for TikTok ID: ${tiktokId}`);
                console.log(`   ℹ️ This post will NOT have slides (origin: "scraped")`);

                // ✅ PERF: Use pre-built Map for O(1) dedup check (replaces individual findFirst per loop iteration)
                // Important: The Map was built from allUserPosts which is scoped to currentUser.id
                const existingPostIdByTiktokId = existingTiktokIds.get(tiktokId);
                const existingPostByTiktokId = existingPostIdByTiktokId ? { id: existingPostIdByTiktokId } : null;

                if (existingPostByTiktokId) {
                    // Post existe déjà avec ce tiktokId, juste mettre à jour les métriques
                    console.log(`   ℹ️  Post with this tiktokId already exists (ID: ${existingPostByTiktokId.id}), updating metrics only`);
                    await prisma.metrics.upsert({
                        where: { postId: existingPostByTiktokId.id },
                        update: {
                            views: data.playCount || 0,
                            likes: data.diggCount || 0,
                            shares: data.shareCount || 0,
                            comments: data.commentCount || 0,
                            saves: data.collectCount || 0
                        },
                        create: {
                            postId: existingPostByTiktokId.id,
                            views: data.playCount || 0,
                            likes: data.diggCount || 0,
                            shares: data.shareCount || 0,
                            comments: data.commentCount || 0,
                            saves: data.collectCount || 0
                        }
                    });
                    updatedPosts++;
                } else {
                    // Créer un nouveau post
                    // Extract title: first line of TikTok text (before hashtags or newlines)
                    const fullText = data.text || "";
                    const firstLine = fullText.split(/[\n#]/)[0].trim();
                    const postTitle = firstLine.length > 3 ? firstLine.slice(0, 100) : null;

                    // ✅ FIX: Upload cover image to Supabase Storage (TikTok CDN URLs expire)
                    const rawCoverUrl = data.covers?.[0] || data.videoMeta?.coverUrl;
                    let permanentCoverUrl: string | null = null;
                    if (rawCoverUrl) {
                        const coverFolder = `covers/${currentUser.id}/${profile.id}`;
                        permanentCoverUrl = await uploadExternalImageToStorage(rawCoverUrl, coverFolder);
                    }

                    await prisma.post.create({
                        data: {
                            userId: currentUser.id,
                            profileId: profile.id,
                            origin: "scraped",  // ⚠️ Marked as scraped - will be cleaned on next sync
                            status: "published",
                            tiktokId: tiktokId,
                            title: postTitle,
                            hookText: (data.text || "New Scraped Post").slice(0, 50),
                            description: fullText,
                            publishedAt: tiktokDate || new Date(),
                            coverUrl: permanentCoverUrl || rawCoverUrl,
                            videoUrl: data.webVideoUrl,
                            // ❌ NO slides - this is a scraped-only post
                            // To have slides: create the post manually BEFORE syncing
                            metrics: {
                                create: {
                                    views: data.playCount || 0,
                                    likes: data.diggCount || 0,
                                    shares: data.shareCount || 0,
                                    comments: data.commentCount || 0,
                                    saves: data.collectCount || 0,
                                }
                            }
                        }
                    });
                    // ✅ PERF: Update the Map so future loop iterations won't try to create duplicates
                    existingTiktokIds.set(tiktokId, 'new');
                    newPosts++;
                }
            }
        }


        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await prisma.analyticsSnapshot.upsert({
            where: {
                profileId_date_metric: {
                    profileId: profile.id,
                    date: today,
                    metric: "followers"
                }
            },
            update: { value: profile.followersCount || 0 },
            create: {
                profileId: profile.id,
                metric: "followers",
                value: profile.followersCount || 0,
                date: today
            }
        });

        // Track last sync timestamp on the profile
        await prisma.profile.update({
            where: { id: profile.id },
            data: { lastSyncAt: new Date() }
        });

        revalidatePath("/dashboard");
        return { success: true, newPosts, updatedPosts };

    } catch (error: any) {
        console.error("Scrape sync failed:", error);
        return { success: false, error: error.message };
    }
}

// ============================================
// Auto-Sync: check if sync is needed and run it
// ============================================

const AUTO_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 heures

export async function checkAndAutoSync(): Promise<{
    synced: boolean;
    skipped: boolean;
    reason?: string;
    newPosts?: number;
    updatedPosts?: number;
}> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { synced: false, skipped: true, reason: 'not-authenticated' };

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { activeProfileId: true, apifyApiKey: true, profiles: { select: { id: true }, take: 1 } }
        });
        if (!user) return { synced: false, skipped: true, reason: 'no-user' };

        // Check if Apify key is configured
        if (!user.apifyApiKey) return { synced: false, skipped: true, reason: 'no-apify-key' };

        const activeProfileId = user.activeProfileId || user.profiles[0]?.id;
        if (!activeProfileId) return { synced: false, skipped: true, reason: 'no-profile' };

        // Check lastSyncAt
        const profile = await prisma.profile.findUnique({
            where: { id: activeProfileId },
            select: { lastSyncAt: true, username: true, displayName: true }
        });
        if (!profile) return { synced: false, skipped: true, reason: 'no-profile' };

        // Check if TikTok username is configured
        const tiktokName = profile.username || profile.displayName;
        if (!tiktokName) return { synced: false, skipped: true, reason: 'no-tiktok-name' };

        // Skip if synced recently (within AUTO_SYNC_INTERVAL_MS)
        if (profile.lastSyncAt) {
            const timeSinceSync = Date.now() - profile.lastSyncAt.getTime();
            if (timeSinceSync < AUTO_SYNC_INTERVAL_MS) {
                const minutesAgo = Math.round(timeSinceSync / 60000);
                return { synced: false, skipped: true, reason: `synced-${minutesAgo}min-ago` };
            }
        }

        // Run sync
        console.log(`[AUTO-SYNC] Triggering auto-sync for profile "${tiktokName}" (last sync: ${profile.lastSyncAt?.toISOString() || 'never'})`);
        const result = await scrapeAndSyncTikTokData();

        if (result.success) {
            return { synced: true, skipped: false, newPosts: result.newPosts, updatedPosts: result.updatedPosts };
        } else {
            return { synced: false, skipped: true, reason: result.error };
        }
    } catch (error: any) {
        console.error('[AUTO-SYNC] Error:', error);
        return { synced: false, skipped: true, reason: error.message };
    }
}

export async function scrapePostCarouselImages(postId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Non authentifié" };

    try {
        // Get the post with tiktokId
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                profile: {
                    include: {
                        user: {
                            select: { apifyApiKey: true, anthropicApiKey: true, id: true }
                        }
                    }
                }
            }
        });

        if (!post) {
            return { success: false, error: "Post introuvable" };
        }

        // Verify ownership
        if (post.userId !== session.user.id) {
            return { success: false, error: "Non autorisé" };
        }

        if (!post.tiktokId) {
            return { success: false, error: "Ce post n'a pas d'ID TikTok associé" };
        }

        console.log(`🖼️ Scraping carousel images for TikTok ID: ${post.tiktokId}`);

        // Validate user's Apify API key
        const userApifyKey = post.profile?.user?.apifyApiKey;
        if (!userApifyKey) {
            return { success: false, error: "Clé API Apify non configurée. Ajoutez votre clé dans l'onglet \"Clé API\"." };
        }

        // Use Apify to scrape the specific post
        // ✅ FIX: Prioritize username over displayName — Apify needs the TikTok @username
        const profileName = post.profile?.username || post.profile?.displayName;
        if (!profileName) {
            return { success: false, error: "Nom de profil manquant" };
        }

        // ✅ FIX: Use profile's syncPostLimit to ensure the target post is in the scraped results
        const syncPostLimit = post.profile?.syncPostLimit || 50;

        // Run scraper for this specific profile (using user's Apify key)
        const datasetId = await runTikTokScraper([profileName], true, userApifyKey, syncPostLimit);
        if (!datasetId) {
            return { success: false, error: "Échec du scraping Apify" };
        }

        const items = await fetchTikTokDataset(datasetId, userApifyKey);

        // Find the specific post by tiktokId
        const scrapedPost = items.find((item: any) => String(item.id) === post.tiktokId);

        if (!scrapedPost) {
            return { success: false, error: "Post TikTok introuvable dans les données scrapées" };
        }

        // Check if it's a slideshow post
        if (!scrapedPost.isSlideshow) {
            return { success: false, error: "Ce post n'est pas un carrousel/slideshow TikTok" };
        }

        // Extract carousel/slideshow images from the correct field
        let rawCarouselImages: string[] = [];

        // The correct field is slideshowImageLinks
        if (scrapedPost.slideshowImageLinks && Array.isArray(scrapedPost.slideshowImageLinks)) {
            // Extract downloadLink from each object
            rawCarouselImages = scrapedPost.slideshowImageLinks
                .map((item: any) => item.downloadLink || item.tiktokLink)
                .filter(Boolean);
        }

        // Fallback/Check: Sometimes covers contains all images (including missing ones)
        if (scrapedPost.covers && Array.isArray(scrapedPost.covers)) {
            if (scrapedPost.covers.length > rawCarouselImages.length) {
                rawCarouselImages = scrapedPost.covers;
            } else if (rawCarouselImages.length === 0 && scrapedPost.covers.length > 0) {
                // Fallback if slideshowImageLinks was empty but covers exists
                rawCarouselImages = scrapedPost.covers;
            }
        }

        if (rawCarouselImages.length === 0) {
            return { success: false, error: "Aucune image de carrousel trouvée. Assure-toi que shouldDownloadSlideshowImages est activé dans Apify." };
        }


        // Upload images to Supabase Storage
        const folder = `posts/${post.userId}/${post.profileId || 'default'}`;
        const uploadedUrls = await uploadExternalImagesToStorage(rawCarouselImages, folder);
        const carouselImages = uploadedUrls.filter((url): url is string => url !== null);

        if (carouselImages.length === 0) {
            return { success: false, error: "Échec de l'upload des images vers le stockage." };
        }


        // ✨ NEW: Extract text from each image using Claude Vision (max 10 to control costs)
        const maxOcrImages = Math.min(carouselImages.length, 10);
        console.log(`🔍 Extracting text from ${maxOcrImages}/${carouselImages.length} carousel images using Claude Vision...`);
        const { extractTextFromImage } = await import('@/lib/ai/vision-ocr');

        // ✅ FIX: Use user's Anthropic API key (per-user) instead of env variable
        const userAnthropicKey = post.profile?.user?.anthropicApiKey;
        if (!userAnthropicKey) {
        }

        const slides = [];
        for (let i = 0; i < maxOcrImages; i++) {
            const imageUrl = carouselImages[i];
            console.log(`   Processing slide ${i + 1}/${carouselImages.length}...`);

            // Extract text from image using Claude Vision API (with user's key)
            const extractedText = userAnthropicKey
                ? await extractTextFromImage(imageUrl, userAnthropicKey)
                : "";

            slides.push({
                slide_number: i + 1,
                image_url: imageUrl,
                image_id: null, // Can be filled later if we also save to Images table
                text: extractedText,
                intention: "Scraped from TikTok carousel"
            });
        }

        // Add remaining images (beyond OCR limit) as slides without text extraction
        for (let i = maxOcrImages; i < carouselImages.length; i++) {
            slides.push({
                slide_number: i + 1,
                image_url: carouselImages[i],
                image_id: null,
                text: "",
                intention: "Scraped from TikTok carousel (OCR skipped - limit reached)"
            });
        }


        // Save slides with images AND extracted text to database
        // Also update hookText and title with the first slide's actual text (the real hook)
        const firstSlideText = slides[0]?.text?.trim();

        // ✅ FIX: Always update hookText/title from first slide OCR text when available.
        // This also fixes posts with corrupted hookText from previous OCR errors (e.g. "[Erreur API: 429...]")
        const hookUpdate: Record<string, string> = {};
        if (firstSlideText && !firstSlideText.startsWith('[Erreur')) {
            hookUpdate.hookText = firstSlideText.slice(0, 200);
            hookUpdate.title = firstSlideText.slice(0, 100);
        }

        await prisma.post.update({
            where: { id: postId },
            data: {
                slides: JSON.stringify(slides),
                slideCount: slides.length,
                carouselImages: JSON.stringify(carouselImages), // Keep for backup
                ...hookUpdate
            }
        });

        return {
            success: true,
            slides: slides,
            count: slides.length
        };

    } catch (error: any) {
        console.error("Carousel scraping failed:", error);
        return { success: false, error: error.message };
    }
}
