import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // 1. Fetch all images
        const images = await prisma.image.findMany();

        if (images.length === 0) {
            return new NextResponse('No images to backup', { status: 404 });
        }

        // 2. Prepare Archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        // 3. Create a Transform Stream to pipe archive data to response
        // In Next.js App Router, we can return a ReadableStream

        const stream = new ReadableStream({
            start(controller) {
                archive.on('data', (chunk) => {
                    controller.enqueue(chunk);
                });

                archive.on('end', () => {
                    controller.close();
                });

                archive.on('error', (err) => {
                    controller.error(err);
                });

                // Iterate images and append to archive
                for (const img of images) {
                    try {
                        const filename = path.basename(img.storageUrl);
                        // storageUrl usually starts with /api/uploads/...
                        // The actual file is in public/uploads/...
                        // Let's handle both relative URL /uploads and direct paths

                        let filePath = '';
                        if (img.storageUrl.startsWith('/api/uploads/')) {
                            const relativePath = img.storageUrl.replace('/api/', '');
                            filePath = path.join(process.cwd(), 'public', relativePath);
                        } else if (img.storageUrl.startsWith('/uploads/')) {
                            filePath = path.join(process.cwd(), 'public', img.storageUrl);
                        } else {
                            // Fallback if full URL or other scheme (not expected given current logic)
                            continue;
                        }

                        if (fs.existsSync(filePath)) {
                            archive.file(filePath, { name: filename });
                        } else {
                            // console.warn(`Backup: File not found ${filePath}`);
                            // Add a placeholder text file for missing images?
                            archive.append(`File missing on server: ${img.storageUrl}`, { name: `ERROR_${filename}.txt` });
                        }
                    } catch (e) {
                        // ignore specific file errors
                    }
                }

                archive.finalize();
            }
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="organik-collection-backup-${timestamp}.zip"`,
            },
        });

    } catch (e) {
        console.error("Backup failed", e);
        return new NextResponse('Backup failed', { status: 500 });
    }
}
