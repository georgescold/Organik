import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import archiver from 'archiver';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Support ?collectionId=xxx and ?ids=id1,id2,id3
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get('collectionId');
    const idsParam = searchParams.get('ids');

    try {
        let images: { id: string; storageUrl: string; humanId: string; filename: string | null }[];

        if (idsParam) {
            // Download specific images by IDs
            const ids = idsParam.split(',').filter(Boolean);
            images = await prisma.image.findMany({
                where: { id: { in: ids }, userId: session.user.id },
                select: { id: true, storageUrl: true, humanId: true, filename: true },
            });
        } else if (collectionId) {
            // Download all images in a collection
            images = await prisma.image.findMany({
                where: {
                    userId: session.user.id,
                    collections: { some: { id: collectionId } },
                },
                select: { id: true, storageUrl: true, humanId: true, filename: true },
            });
        } else {
            // Download ALL user images
            images = await prisma.image.findMany({
                where: { userId: session.user.id },
                select: { id: true, storageUrl: true, humanId: true, filename: true },
            });
        }

        if (images.length === 0) {
            return new NextResponse('No images to download', { status: 404 });
        }

        // Pre-fetch all images in parallel (max 10 concurrent)
        const fetchImage = async (img: typeof images[0]): Promise<{ img: typeof images[0]; buffer: Buffer } | null> => {
            try {
                const res = await fetch(img.storageUrl, { signal: AbortSignal.timeout(15000) });
                if (!res.ok) return null;
                const arrayBuffer = await res.arrayBuffer();
                return { img, buffer: Buffer.from(arrayBuffer) };
            } catch {
                return null;
            }
        };

        // Fetch in batches of 10
        const results: ({ img: typeof images[0]; buffer: Buffer } | null)[] = [];
        for (let i = 0; i < images.length; i += 10) {
            const batch = images.slice(i, i + 10).map(fetchImage);
            const batchResults = await Promise.all(batch);
            results.push(...batchResults);
        }

        const fetched = results.filter((r): r is NonNullable<typeof r> => r !== null);

        if (fetched.length === 0) {
            return new NextResponse('Failed to fetch any images', { status: 500 });
        }

        // Build ZIP archive
        const archive = archiver('zip', { zlib: { level: 6 } });

        const stream = new ReadableStream({
            start(controller) {
                archive.on('data', (chunk) => controller.enqueue(chunk));
                archive.on('end', () => controller.close());
                archive.on('error', (err) => controller.error(err));

                const usedNames = new Set<string>();
                for (const { img, buffer } of fetched) {
                    // Determine filename: use original filename, or humanId, or id
                    let name = img.filename || img.humanId || img.id;
                    // Ensure it has an extension
                    if (!/\.\w{2,5}$/.test(name)) name += '.png';
                    // Deduplicate filenames
                    let finalName = name;
                    let counter = 1;
                    while (usedNames.has(finalName)) {
                        const dot = name.lastIndexOf('.');
                        finalName = dot > 0
                            ? `${name.slice(0, dot)}_${counter}${name.slice(dot)}`
                            : `${name}_${counter}`;
                        counter++;
                    }
                    usedNames.add(finalName);

                    archive.append(buffer, { name: finalName });
                }

                archive.finalize();
            },
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const label = collectionId ? 'collection' : idsParam ? 'selection' : 'all-images';

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="organik-${label}-${timestamp}.zip"`,
            },
        });
    } catch (e) {
        console.error('Download failed', e);
        return new NextResponse('Download failed', { status: 500 });
    }
}
