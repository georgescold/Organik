/**
 * Duplicate Image Cleanup Script
 *
 * Finds duplicate images (same userId + hash) and:
 * 1. Reports all duplicates found
 * 2. Keeps the oldest image per (userId, hash) group
 * 3. Transfers collection associations from duplicates to the kept image
 * 4. Deletes duplicate records from the database
 *
 * Usage: npx tsx scripts/dedup-images.ts [--dry-run]
 *   --dry-run  Only report duplicates, don't delete anything
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function main() {
    console.log(`\n=== Image Duplicate Review ${isDryRun ? '(DRY RUN)' : '(LIVE)'} ===\n`);

    // 1. Find all duplicate groups: same userId + hash (non-null hash only)
    const duplicateGroups = await prisma.$queryRaw<
        { userId: string; hash: string; count: bigint }[]
    >`
        SELECT "userId", "hash", COUNT(*) as count
        FROM "Image"
        WHERE "hash" IS NOT NULL
        GROUP BY "userId", "hash"
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
    `;

    if (duplicateGroups.length === 0) {
        console.log('No duplicates found! Database is clean.');
        return;
    }

    const totalDuplicateGroups = duplicateGroups.length;
    const totalExtraImages = duplicateGroups.reduce((sum, g) => sum + (Number(g.count) - 1), 0);
    console.log(`Found ${totalDuplicateGroups} duplicate groups (${totalExtraImages} extra images to remove)\n`);

    let removedCount = 0;
    let collectionsTransferred = 0;

    for (const group of duplicateGroups) {
        // Get all images in this duplicate group, oldest first
        const images = await prisma.image.findMany({
            where: {
                userId: group.userId,
                hash: group.hash,
            },
            orderBy: { createdAt: 'asc' },
            include: {
                collections: { select: { id: true, name: true } },
            },
        });

        const keep = images[0]; // Keep the oldest
        const duplicates = images.slice(1);

        // Get user info for display
        const user = await prisma.user.findUnique({
            where: { id: group.userId },
            select: { email: true },
        });

        console.log(`--- Duplicate group: hash=${group.hash?.slice(0, 12)}... (user: ${user?.email || group.userId})`);
        console.log(`    Keeping: ${keep.id} (created ${keep.createdAt.toISOString().slice(0, 10)}, ${keep.collections.length} collections)`);

        for (const dup of duplicates) {
            console.log(`    Removing: ${dup.id} (created ${dup.createdAt.toISOString().slice(0, 10)}, ${dup.collections.length} collections)`);

            if (!isDryRun) {
                // Transfer collection associations from duplicate to the kept image
                for (const col of dup.collections) {
                    // Check if keep is already in this collection
                    const alreadyIn = keep.collections.some(c => c.id === col.id);
                    if (!alreadyIn) {
                        await prisma.collection.update({
                            where: { id: col.id },
                            data: {
                                images: { connect: { id: keep.id } },
                            },
                        });
                        collectionsTransferred++;
                        console.log(`      -> Transferred collection "${col.name}" to kept image`);
                    }
                }

                // Disconnect duplicate from all collections first (many-to-many)
                await prisma.image.update({
                    where: { id: dup.id },
                    data: {
                        collections: { set: [] },
                    },
                });

                // Delete the duplicate image record
                await prisma.image.delete({ where: { id: dup.id } });
                removedCount++;
            }
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Duplicate groups found: ${totalDuplicateGroups}`);
    console.log(`Extra images: ${totalExtraImages}`);
    if (isDryRun) {
        console.log(`Mode: DRY RUN - no changes made`);
        console.log(`\nRun without --dry-run to clean up duplicates.`);
    } else {
        console.log(`Images removed: ${removedCount}`);
        console.log(`Collection associations transferred: ${collectionsTransferred}`);
        console.log(`\nDatabase is now ready for @@unique([userId, hash]) migration.`);
    }
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
