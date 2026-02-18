'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';
import { addProfileToApify, removeProfileFromApify, runTikTokScraper } from '@/lib/apify';

const ProfileSchema = z.object({
    tiktokName: z.string().min(1, "Le nom TikTok est requis"),
    tiktokBio: z.string().optional(),
    persona: z.string().optional(),
    targetAudience: z.string().optional(),
});

// Helper to get active profile
export async function getActiveProfileId(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeProfileId: true, profiles: { select: { id: true }, take: 1 } }
    });
    return user?.activeProfileId || user?.profiles[0]?.id;
}

export async function switchProfile(profileId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    try {
        // Verify ownership
        const profile = await prisma.profile.findUnique({
            where: { id: profileId, userId: session.user.id }
        });

        if (!profile) return { error: 'Profile not found' };

        await prisma.user.update({
            where: { id: session.user.id },
            data: { activeProfileId: profileId }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to switch profile' };
    }
}

export async function createProfile(formData: z.infer<typeof ProfileSchema>) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    const { tiktokName, tiktokBio, persona, targetAudience } = formData;

    try {
        // Get user's Apify key
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { apifyApiKey: true }
        });

        const profile = await prisma.profile.create({
            data: {
                userId: session.user.id,
                displayName: tiktokName,
                bio: tiktokBio,
                persona,
                targetAudience,
            },
        });

        // Set as active if it's the first one or requested? 
        // Let's set as active automatically for better UX
        await prisma.user.update({
            where: { id: session.user.id },
            data: { activeProfileId: profile.id }
        });

        revalidatePath('/dashboard');

        // Sync with Apify (only if user has Apify key configured)
        const userApifyKey = user?.apifyApiKey;
        if (tiktokName && userApifyKey) {
            // Fire and forget catch, scrape ONLY this new profile immediately
            addProfileToApify(tiktokName, userApifyKey)
                .then(() => runTikTokScraper([tiktokName], false, userApifyKey))
                .catch(e => console.error("Apify sync (create) failed:", e));
        }

        return { success: true, profileId: profile.id };
    } catch (error) {
        return { error: 'Failed to create profile' };
    }
}

// Helper to save file securely
async function saveAvatar(file: File): Promise<string | null> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
        await fs.mkdir(uploadDir, { recursive: true });

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        const filePath = path.join(uploadDir, fileName);

        await fs.writeFile(filePath, buffer);
        return `/uploads/avatars/${fileName}`;
    } catch (e) {
        console.error('Error saving avatar:', e);
        return null;
    }
}

export async function updateProfile(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    const tiktokName = formData.get('tiktokName') as string;
    const tiktokBio = formData.get('tiktokBio') as string;
    const persona = formData.get('persona') as string;
    const targetAudience = formData.get('targetAudience') as string;
    const niche = formData.get('niche') as string; // [NEW] Niche
    const leadMagnet = formData.get('leadMagnet') as string; // [NEW]
    const hashtags = formData.get('hashtags') as string; // [NEW]
    const followersCountRaw = formData.get('followersCount');
    const followersCount = followersCountRaw ? parseInt(followersCountRaw as string) : undefined;
    const syncPostLimitRaw = formData.get('syncPostLimit');
    const syncPostLimit = syncPostLimitRaw ? parseInt(syncPostLimitRaw as string) : 50;  // [NEW] Sync limit
    const avatarFile = formData.get('avatar') as File | null;

    // Validate syncPostLimit
    if (syncPostLimit < 10 || syncPostLimit > 200) {
        return { error: 'La limite doit être entre 10 et 200 posts' };
    }

    try {
        let avatarUrl: string | undefined;
        if (avatarFile && avatarFile.size > 0) {
            const savedUrl = await saveAvatar(avatarFile);
            if (savedUrl) avatarUrl = savedUrl;
        }

        const activeProfileId = await getActiveProfileId(session.user.id);
        if (!activeProfileId) return { error: 'No active profile' };

        // Get current profile and user's Apify key
        const currentProfile = await prisma.profile.findUnique({
            where: { id: activeProfileId },
            include: {
                user: { select: { apifyApiKey: true } }
            }
        });

        if (!currentProfile) return { error: 'Profile not found' };

        const userApifyKey = currentProfile.user?.apifyApiKey;

        // Update profile
        await prisma.profile.update({
            where: { id: activeProfileId },
            data: {
                displayName: tiktokName,
                bio: tiktokBio,
                persona,
                targetAudience,
                niche, // [NEW] Save niche
                leadMagnet, // [NEW]
                hashtags, // [NEW]
                syncPostLimit,  // [NEW] Save sync limit
                ...(followersCount !== undefined ? { followersCount } : {}),
                ...(avatarUrl ? { avatarUrl } : {}),
            },
        });

        // Snapshot if changed or new
        if (followersCount !== undefined && currentProfile.followersCount !== followersCount) {
            await prisma.followerSnapshot.create({
                data: {
                    userId: session.user.id,
                    profileId: activeProfileId,
                    count: followersCount
                }
            });
        }

        revalidatePath('/dashboard');

        // Sync with Apify if name changed (only if user has Apify key configured)
        if (currentProfile.displayName !== tiktokName && userApifyKey) {
            const syncPromises = [];

            if (currentProfile.displayName) {
                syncPromises.push(removeProfileFromApify(currentProfile.displayName, userApifyKey));
            }

            if (tiktokName) {
                syncPromises.push(
                    addProfileToApify(tiktokName, userApifyKey).then(() => runTikTokScraper([tiktokName], false, userApifyKey))
                );
            }

            Promise.all(syncPromises).catch(e => console.error("Apify sync (update) failed:", e));
        }

        return { success: true };
    } catch (error: any) {
        console.error('Failed to update profile:', error);
        return { error: `Failed to update profile: ${error.message}` };
    }
}

export async function deleteProfile() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    const activeProfileId = await getActiveProfileId(session.user.id);
    if (!activeProfileId) return { error: 'No active profile to delete' };

    try {
        // Fetch profile to get name for Apify sync before deleting
        const profileToDelete = await prisma.profile.findUnique({
            where: { id: activeProfileId },
            select: {
                displayName: true,
                user: { select: { apifyApiKey: true } }
            }
        });

        // Count profiles to prevent deleting the last one (optional, but safer)
        const profileCount = await prisma.profile.count({
            where: { userId: session.user.id }
        });

        if (profileCount <= 1) {
            return { error: 'Impossible de supprimer votre dernier profil.' };
        }

        // Delete the active profile
        await prisma.profile.delete({
            where: { id: activeProfileId }
        });

        // Find another profile to make active
        const remainingProfile = await prisma.profile.findFirst({
            where: { userId: session.user.id }
        });

        if (remainingProfile) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { activeProfileId: remainingProfile.id }
            });
        } else {
            await prisma.user.update({
                where: { id: session.user.id },
                data: { activeProfileId: null }
            });
        }

        revalidatePath('/dashboard');

        // Sync with Apify (only if user has Apify key configured)
        if (profileToDelete?.displayName && profileToDelete.user?.apifyApiKey) {
            removeProfileFromApify(profileToDelete.displayName, profileToDelete.user.apifyApiKey)
                .catch(e => console.error("Apify sync (delete) failed:", e));
        }

        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete profile' };
    }
}
