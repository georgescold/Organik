'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { analyzeImage, analyzeImageQualityOnly, ImageAnalysisResult } from '@/lib/ai/claude';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_BUCKET = 'images';

// Upload Limit: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function uploadImage(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // [CRITICAL] Check API Key FIRST
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { anthropicApiKey: true }
    });

    if (!user?.anthropicApiKey) {
        return { error: "Clé API manquante. Veuillez configurer votre clé dans les réglages." };
    }
    const apiKey = user.anthropicApiKey;

    const userId = session.user.id;
    const collectionId = formData.get('collectionId') as string | null;

    const files = formData.getAll('file') as File[];
    if (!files || files.length === 0) return { error: 'No files provided' };

    // Function to process a single file
    const processFile = async (file: File) => {
        if (file.size > MAX_FILE_SIZE) return { error: `File ${file.name} too large (max 5MB)` };

        try {
            const buffer = Buffer.from(await file.arrayBuffer());

            // [Checks] Calculate Hash & Check for duplicate
            const hash = createHash('sha256').update(buffer).digest('hex');
            const existingImage = await prisma.image.findFirst({
                where: {
                    userId: userId,
                    OR: [
                        { hash: hash },
                        { filename: file.name }
                    ]
                }
            });

            if (existingImage) {
                // If in a collection context, ensure it's linked
                if (collectionId) {
                    await prisma.collection.update({
                        where: { id: collectionId },
                        data: { images: { connect: { id: existingImage.id } } }
                    }).catch(() => { });
                }
                return { success: true, file: file.name, duplicate: true };
            }

            // 1. Save to Supabase Storage
            const ext = file.name.split('.').pop();
            const uuid = uuidv4();
            const filename = `${uuid}.${ext}`;
            const storagePath = `${userId}/${filename}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from(SUPABASE_BUCKET)
                .upload(storagePath, buffer, {
                    contentType: file.type,
                    upsert: false
                });

            if (uploadError) {
                console.error("Supabase upload error:", uploadError);
                return { error: `Failed to upload ${file.name}: ${uploadError.message}` };
            }

            // Get public URL from Supabase
            const { data: urlData } = supabaseAdmin.storage
                .from(SUPABASE_BUCKET)
                .getPublicUrl(storagePath);

            const publicUrl = urlData.publicUrl;

            // 2. DB Prep
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const humanId = `IMG-${timestamp}-${random}`;

            // 3. Analyze
            let analysis: ImageAnalysisResult;
            try {
                const base64 = buffer.toString('base64');
                analysis = await analyzeImage(base64, file.type, apiKey);
            } catch (e) {
                console.error(`Analysis failed for ${file.name}:`, e);
                analysis = {
                    description_long: (e as any)?.message?.includes('401') ? "Analysis Failed: Invalid API Key" : "Analysis failed",
                    keywords: [],
                    colors: [],
                    mood: "Unknown",
                    style: "Unknown",
                    composition: "Unknown",
                    facial_expression: "Unknown",
                    text_content: "Unknown",
                    quality_score: 5
                };
            }

            await prisma.image.create({
                data: {
                    user: { connect: { id: session.user!.id } },
                    humanId,
                    storageUrl: publicUrl,
                    hash,
                    filename: file.name,
                    descriptionLong: analysis.description_long || "No description",
                    keywords: JSON.stringify(analysis.keywords || []),
                    mood: analysis.mood,
                    style: analysis.style,
                    colors: JSON.stringify(analysis.colors || []),
                    qualityScore: analysis.quality_score ?? 5,
                    collections: collectionId ? { connect: { id: collectionId } } : undefined
                },
            });

            return { success: true, file: file.name };
        } catch (e) {
            console.error(`Error processing ${file.name}:`, e);
            return { error: `Failed to process ${file.name}` };
        }
    };

    // Process all files in parallel
    const results = await Promise.all(files.map(processFile));
    const successCount = results.filter(r => r.success).length;

    revalidatePath('/dashboard', 'page');

    // Return the first error if strictly everything failed due to a blocking error, or generic message
    if (successCount === 0) {
        const firstError = results.find(r => r.error)?.error;
        return { error: firstError || 'Failed to upload images' };
    }

    return { success: true, count: successCount, total: files.length, results };
}

export async function getUserImages(collectionId?: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const whereClause = collectionId
            ? { collections: { some: { id: collectionId } } }
            : {}; // Shared Collection: Fetch all images regardless of user if no collection specified

        const imagesRaw = await prisma.image.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                humanId: true,
                userId: true,
                filename: true,
                storageUrl: true,
                descriptionLong: true,
                keywords: true,
                mood: true,
                style: true,
                colors: true,
                qualityScore: true,
                createdAt: true,
                collections: { select: { id: true, name: true } }
            }
        });

        // Parse JSON strings to arrays for keywords and colors
        const images = imagesRaw.map(img => ({
            ...img,
            keywords: JSON.parse(img.keywords || '[]') as string[],
            colors: JSON.parse(img.colors || '[]') as string[],
        }));

        return { success: true, images };
    } catch (e) {
        return { error: 'Failed to fetch images' };
    }
}

export async function deleteImage(imageId: string, storageUrl: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Single query: delete directly (will throw P2025 if not found)
        await prisma.image.delete({
            where: { id: imageId, userId: session.user.id }
        });

        // Delete from Supabase Storage in background (non-blocking)
        try {
            const url = new URL(storageUrl);
            const pathParts = url.pathname.split('/storage/v1/object/public/images/');
            if (pathParts.length > 1) {
                supabaseAdmin.storage.from(SUPABASE_BUCKET).remove([pathParts[1]]);
            }
        } catch (e) {
            console.error("Failed to delete from Supabase Storage:", e);
        }

        revalidatePath('/dashboard', 'page');
        return { success: true };
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return { error: 'Access denied' };
        }
        return { error: 'Failed to delete image' };
    }
}

export async function deleteImages(imageIds: string[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Fetch only storageUrl for owned images (lightweight query)
        const images = await prisma.image.findMany({
            where: { id: { in: imageIds }, userId: session.user.id },
            select: { id: true, storageUrl: true }
        });

        if (images.length !== imageIds.length) {
            return { error: "Access denied for some images" };
        }

        // Delete from DB in single batch
        await prisma.image.deleteMany({
            where: { id: { in: imageIds }, userId: session.user.id }
        });

        // Delete from Supabase Storage (non-blocking)
        const storagePaths: string[] = [];
        for (const img of images) {
            try {
                const url = new URL(img.storageUrl);
                const pathParts = url.pathname.split('/storage/v1/object/public/images/');
                if (pathParts.length > 1) storagePaths.push(pathParts[1]);
            } catch {}
        }
        if (storagePaths.length > 0) {
            supabaseAdmin.storage.from(SUPABASE_BUCKET).remove(storagePaths);
        }

        revalidatePath('/dashboard', 'page');
        return { success: true };
    } catch (e) {
        return { error: "Failed to delete images" };
    }
}

export async function retryFailedAnalyses() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Find failed images + fetch API key in parallel
        const [failedImages, user] = await Promise.all([
            prisma.image.findMany({
                where: {
                    userId: session.user.id,
                    OR: [
                        { descriptionLong: { contains: "Analysis failed" } },
                        { descriptionLong: "" },
                        { descriptionLong: "Unknown" },
                    ]
                },
                select: { id: true, storageUrl: true }
            }),
            prisma.user.findUnique({
                where: { id: session.user.id },
                select: { anthropicApiKey: true }
            })
        ]);

        if (failedImages.length === 0) return { success: true, count: 0, message: "No failed analysis found" };

        const apiKey = user?.anthropicApiKey;
        if (!apiKey) return { error: "Clé API manquante pour relancer l'analyse." };

        let successCount = 0;

        // Process in parallel batches of 3
        for (let i = 0; i < failedImages.length; i += 3) {
            const batch = failedImages.slice(i, i + 3);

            await Promise.all(batch.map(async (img) => {
                try {
                    const response = await fetch(img.storageUrl);
                    if (!response.ok) return;

                    const arrayBuffer = await response.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    const mimeType = response.headers.get('content-type') || 'image/jpeg';

                    const analysis = await analyzeImage(base64, mimeType, apiKey);

                    await prisma.image.update({
                        where: { id: img.id },
                        data: {
                            descriptionLong: analysis.description_long || "No description",
                            keywords: JSON.stringify(analysis.keywords || []),
                            mood: analysis.mood,
                            style: analysis.style,
                            colors: JSON.stringify(analysis.colors || []),
                            qualityScore: analysis.quality_score ?? 5,
                        }
                    });

                    successCount++;
                } catch (e) {
                    console.error(`Retry failed for image ${img.id}:`, e);
                }
            }));
        }

        revalidatePath('/dashboard', 'page');
        return { success: true, count: successCount, total: failedImages.length };

    } catch (e) {
        console.error("Critical error in retry", e);
        return { error: 'Retry process failed' };
    }
}

export async function rescoreImageQuality() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { anthropicApiKey: true }
        });
        const apiKey = user?.anthropicApiKey;
        if (!apiKey) return { error: "Clé API manquante. Configurez-la dans les réglages." };

        // Find all images without a quality score (shared pool — no userId filter, same as "Toutes les images")
        const images = await prisma.image.findMany({
            where: {
                OR: [
                    { qualityScore: null },
                    { qualityScore: { equals: 0 } },
                ],
            },
            select: { id: true, storageUrl: true }
        });

        if (images.length === 0) {
            const totalImages = await prisma.image.count();
            return { success: true, count: 0, message: `Toutes les ${totalImages} images ont déjà un score qualité.` };
        }

        // Limit to 30 images per run to avoid server action timeout
        const toProcess = images.slice(0, 30);
        const remaining = images.length - toProcess.length;
        let successCount = 0;

        // Process in batches of 5 in parallel
        for (let i = 0; i < toProcess.length; i += 5) {
            const batch = toProcess.slice(i, i + 5);

            await Promise.all(batch.map(async (img) => {
                try {
                    const response = await fetch(img.storageUrl);
                    if (!response.ok) return;

                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const base64 = buffer.toString('base64');
                    const mimeType = response.headers.get('content-type') || 'image/jpeg';

                    const score = await analyzeImageQualityOnly(base64, mimeType, apiKey);

                    await prisma.image.update({
                        where: { id: img.id },
                        data: { qualityScore: score }
                    });

                    successCount++;
                } catch (e) {
                    console.error(`Quality scoring failed for image ${img.id}:`, e);
                }
            }));
        }

        revalidatePath('/dashboard', 'page');
        return { success: true, count: successCount, total: toProcess.length, remaining };

    } catch (e) {
        console.error("Critical error in quality rescore", e);
        return { error: 'Échec du rescoring qualité' };
    }
}
