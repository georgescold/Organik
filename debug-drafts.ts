import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDrafts() {
    console.log('🔍 Checking drafts in database...\n');

    const drafts = await prisma.post.findMany({
        where: {
            status: 'draft'
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 5
    });

    console.log(`Found ${drafts.length} draft(s)\n`);

    drafts.forEach((draft, index) => {
        console.log(`=== Draft ${index + 1} ===`);
        console.log(`ID: ${draft.id}`);
        console.log(`Hook: ${draft.hookText}`);
        console.log(`Description: ${draft.description || 'N/A'}`);
        console.log(`Slide Count: ${draft.slideCount || 'N/A'}`);
        console.log(`Slides field type: ${typeof draft.slides}`);
        console.log(`Slides field value: ${draft.slides ? draft.slides.substring(0, 100) + '...' : 'NULL'}`);

        if (draft.slides) {
            try {
                const parsed = JSON.parse(draft.slides);
                console.log(`✅ Slides can be parsed: ${Array.isArray(parsed) ? parsed.length : 'Not an array'} slides`);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`First slide preview:`, parsed[0]);
                }
            } catch (e) {
                console.log(`❌ Error parsing slides: ${e}`);
            }
        } else {
            console.log(`⚠️  Slides field is NULL`);
        }
        console.log('');
    });

    await prisma.$disconnect();
}

checkDrafts().catch(console.error);
