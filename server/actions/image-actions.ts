'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { analyzeImage, ImageAnalysisResult } from '@/lib/ai/claude';
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
                    text_content: "Unknown"
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

    revalidatePath('/dashboard');

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
            include: { collections: { select: { id: true, name: true } } } // Include to know which are added
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
        const image = await prisma.image.findUnique({
            where: { id: imageId }
        });

        if (!image || image.userId !== session.user.id) {
            return { error: 'Access denied' };
        }

        // Delete from DB first
        await prisma.image.delete({
            where: { id: imageId }
        });

        // Delete from Supabase Storage
        // Extract path from full URL: https://xxx.supabase.co/storage/v1/object/public/images/userId/filename.ext
        try {
            const url = new URL(storageUrl);
            const pathParts = url.pathname.split('/storage/v1/object/public/images/');
            if (pathParts.length > 1) {
                const storagePath = pathParts[1]; // userId/filename.ext
                await supabaseAdmin.storage.from(SUPABASE_BUCKET).remove([storagePath]);
            }
        } catch (e) {
            console.error("Failed to delete from Supabase Storage:", e);
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete image' };
    }
}

export async function deleteImages(imageIds: string[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Verify ownership for all
        const images = await prisma.image.findMany({
            where: {
                id: { in: imageIds },
                userId: session.user.id
            }
        });

        if (images.length !== imageIds.length) {
            return { error: "Access denied for some images" };
        }

        // Delete from DB
        await prisma.image.deleteMany({
            where: { id: { in: imageIds } }
        });

        // Delete from Supabase Storage
        const storagePaths: string[] = [];
        for (const img of images) {
            try {
                const url = new URL(img.storageUrl);
                const pathParts = url.pathname.split('/storage/v1/object/public/images/');
                if (pathParts.length > 1) {
                    storagePaths.push(pathParts[1]);
                }
            } catch (e) {
                console.error("Failed to parse storage URL:", img.storageUrl);
            }
        }

        if (storagePaths.length > 0) {
            await supabaseAdmin.storage.from(SUPABASE_BUCKET).remove(storagePaths);
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: "Failed to delete images" };
    }
}

export async function retryFailedAnalyses() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // 1. Find failed images - Expanded Criteria
        const failedImages = await prisma.image.findMany({
            where: {
                userId: session.user.id,
                OR: [
                    { descriptionLong: { contains: "Analysis failed" } },
                    { descriptionLong: "" },
                    { descriptionLong: "Unknown" },
                ]
            }
        });

        if (failedImages.length === 0) return { success: true, count: 0, message: "No failed analysis found" };

        let successCount = 0;

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { anthropicApiKey: true }
        });
        const apiKey = user?.anthropicApiKey;
        if (!apiKey) return { error: "Clé API manquante pour relancer l'analyse." };

        for (const img of failedImages) {
            try {
                // Download from Supabase Storage or fetch from URL
                let base64: string;
                let mimeType: string;

                try {
                    // Fetch image from URL (works for both Supabase and legacy local URLs)
                    const response = await fetch(img.storageUrl);
                    if (!response.ok) {
                        console.error(`Failed to fetch image ${img.id}: ${response.status}`);
                        continue;
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    base64 = buffer.toString('base64');

                    const contentType = response.headers.get('content-type');
                    mimeType = contentType || 'image/jpeg';
                } catch (fetchError) {
                    console.error(`Failed to download image ${img.id}:`, fetchError);
                    continue;
                }

                // Analyze
                const analysis = await analyzeImage(base64, mimeType, apiKey);

                // Update
                await prisma.image.update({
                    where: { id: img.id },
                    data: {
                        descriptionLong: analysis.description_long || "No description",
                        keywords: JSON.stringify(analysis.keywords || []),
                        mood: analysis.mood,
                        style: analysis.style,
                        colors: JSON.stringify(analysis.colors || []),
                    }
                });

                successCount++;
            } catch (e) {
                console.error(`Retry failed for image ${img.id}:`, e);
                // Continue
            }
        }

        revalidatePath('/dashboard');
        return { success: true, count: successCount, total: failedImages.length };

    } catch (e) {
        console.error("Critical error in retry", e);
        return { error: 'Retry process failed' };
    }
}
