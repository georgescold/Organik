'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ============= FOLDER CRUD =============

export async function getFolders(userId: string) {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== userId) return { success: false, error: 'Unauthorized' };

    try {
        const folders = await prisma.folder.findMany({
            where: { userId },
            include: {
                profiles: {
                    select: {
                        id: true,
                        displayName: true,
                        username: true,
                        platform: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { order: 'asc' },
        });
        return { success: true, folders };
    } catch (error) {
        console.error('Error fetching folders:', error);
        return { success: false, error: 'Failed to fetch folders' };
    }
}

export async function createFolder(userId: string, name: string, color?: string) {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== userId) return { success: false, error: 'Unauthorized' };

    try {
        // Get max order
        const maxOrder = await prisma.folder.findFirst({
            where: { userId },
            orderBy: { order: 'desc' },
            select: { order: true },
        });

        const folder = await prisma.folder.create({
            data: {
                userId,
                name,
                color: color || '#6366f1',
                order: (maxOrder?.order || 0) + 1,
            },
        });

        revalidatePath('/dashboard');
        return { success: true, folder };
    } catch (error) {
        console.error('Error creating folder:', error);
        return { success: false, error: 'Failed to create folder' };
    }
}

export async function updateFolder(folderId: string, data: { name?: string; color?: string; order?: number }) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const existing = await prisma.folder.findUnique({ where: { id: folderId } });
        if (!existing || existing.userId !== session.user.id) return { success: false, error: 'Not found' };

        const folder = await prisma.folder.update({
            where: { id: folderId },
            data,
        });

        revalidatePath('/dashboard');
        return { success: true, folder };
    } catch (error) {
        console.error('Error updating folder:', error);
        return { success: false, error: 'Failed to update folder' };
    }
}

export async function deleteFolder(folderId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const existing = await prisma.folder.findUnique({ where: { id: folderId } });
        if (!existing || existing.userId !== session.user.id) return { success: false, error: 'Not found' };

        // Move profiles to no folder
        await prisma.profile.updateMany({
            where: { folderId },
            data: { folderId: null },
        });

        await prisma.folder.delete({
            where: { id: folderId },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting folder:', error);
        return { success: false, error: 'Failed to delete folder' };
    }
}

export async function moveProfileToFolder(profileId: string, folderId: string | null) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const profile = await prisma.profile.findUnique({ where: { id: profileId } });
        if (!profile || profile.userId !== session.user.id) return { success: false, error: 'Not found' };

        await prisma.profile.update({
            where: { id: profileId },
            data: { folderId },
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error moving profile:', error);
        return { success: false, error: 'Failed to move profile' };
    }
}

export async function reorderFolders(userId: string, folderIds: string[]) {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== userId) return { success: false, error: 'Unauthorized' };

    try {
        for (let i = 0; i < folderIds.length; i++) {
            await prisma.folder.update({
                where: { id: folderIds[i] },
                data: { order: i },
            });
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error reordering folders:', error);
        return { success: false, error: 'Failed to reorder folders' };
    }
}
