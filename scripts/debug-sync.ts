
import { PrismaClient } from '@prisma/client';
import { ApifyClient } from 'apify-client';

// We need to bypass the server action to debug internal logic step-by-step
// or just copy the logic here. Let's copy the logic to see exactly where it fails.

const prisma = new PrismaClient();

async function main() {
    console.log('Finding competitor goodcal.fr...');
    const competitor = await prisma.competitor.findFirst({
        where: { tiktokUsername: 'goodcal.fr' }
    });

    if (!competitor) {
        console.error('Competitor not found');
        return;
    }

    console.log('Found competitor:', competitor.id);

    // Use proper Env Var
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
        console.error('APIFY_API_TOKEN is missing');
        return;
    }

    const client = new ApifyClient({ token: apifyToken });

    console.log('Starting scraper run...');
    const run = await client.actor('clockworks/tiktok-scraper').call({
        profiles: [competitor.tiktokUsername],
        resultsPerPage: 200,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSlideshowImages: true,
    });

    console.log('Run finished. Fetching items from dataset:', run.defaultDatasetId);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`Received ${items.length} items`);

    if (items.length > 0) {
        console.log('First item sample:', JSON.stringify(items[0], null, 2).slice(0, 500));
        const distinctTypes = [...new Set(items.map((i: any) => i.type))];
        console.log('Distinct item types in dataset:', distinctTypes);
    }

    let postsCreated = 0;
    let postsUpdated = 0;

    for (const item of items) {
        const data = item as any;

        // Debug filtering
        if (data.type && data.type !== 'video' && data.type !== 'slideshow') {
            // console.log(`Skipping item ${data.id} with type ${data.type}`);
            continue;
        }
        if (!data.id) continue;

        // Processing
        let carouselImages: string[] = [];
        if (data.slideshowImageLinks && Array.isArray(data.slideshowImageLinks)) {
            carouselImages = data.slideshowImageLinks;
        } else if (data.covers && Array.isArray(data.covers) && data.covers.length > 1) {
            carouselImages = data.covers;
        }

        const postData = {
            competitorId: competitor.id,
            tiktokId: String(data.id),
            webVideoUrl: data.webVideoUrl || null,
            coverUrl: data.covers?.[0] || data.videoMeta?.coverUrl || null,
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
                    carouselImages: postData.carouselImages,
                    slideCount: postData.slideCount,
                },
            });
            postsCreated++;
        } catch (e) {
            console.error(`Failed to upsert post ${data.id}:`, e);
            postsUpdated++;
        }
    }

    console.log(`Sync complete. Created: ${postsCreated}, Errors/Updated: ${postsUpdated}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
