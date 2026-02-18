'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_BUCKET = 'images';

/**
 * Download an image from an external URL and upload it to Supabase Storage
 * @param imageUrl - The external URL of the image
 * @param folder - The folder path in the bucket (e.g., 'competitors/userId' or 'posts/userId')
 * @returns The public URL of the uploaded image, or null if failed
 */
export async function uploadExternalImageToStorage(
    imageUrl: string,
    folder: string
): Promise<string | null> {
    try {
        // Skip if already a Supabase URL
        if (imageUrl.includes('supabase.co')) {
            return imageUrl;
        }

        // Download the image
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ImageDownloader/1.0)',
            },
        });

        if (!response.ok) {
            console.error(`Failed to download image: ${response.status} - ${imageUrl}`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine content type and extension
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('gif')) ext = 'gif';

        // Generate unique filename
        const filename = `${uuidv4()}.${ext}`;
        const storagePath = `${folder}/${filename}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from(SUPABASE_BUCKET)
            .upload(storagePath, buffer, {
                contentType,
                upsert: false,
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return null;
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(storagePath);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading external image:', error);
        return null;
    }
}

/**
 * Upload multiple external images to Supabase Storage
 * @param imageUrls - Array of external image URLs
 * @param folder - The folder path in the bucket
 * @returns Array of public URLs (null for failed uploads)
 */
export async function uploadExternalImagesToStorage(
    imageUrls: string[],
    folder: string
): Promise<(string | null)[]> {
    // Process in parallel with a limit to avoid overwhelming the server
    const BATCH_SIZE = 5;
    const results: (string | null)[] = [];

    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
        const batch = imageUrls.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(url => uploadExternalImageToStorage(url, folder))
        );
        results.push(...batchResults);
    }

    return results;
}

/**
 * Delete an image from Supabase Storage by its public URL
 * @param publicUrl - The public URL of the image
 */
export async function deleteImageFromStorage(publicUrl: string): Promise<boolean> {
    try {
        const url = new URL(publicUrl);
        const pathParts = url.pathname.split(`/storage/v1/object/public/${SUPABASE_BUCKET}/`);

        if (pathParts.length > 1) {
            const storagePath = pathParts[1];
            const { error } = await supabaseAdmin.storage
                .from(SUPABASE_BUCKET)
                .remove([storagePath]);

            if (error) {
                console.error('Failed to delete image:', error);
                return false;
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
}
