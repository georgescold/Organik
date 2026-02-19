'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

export async function createCollection(name: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const collection = await prisma.collection.create({
            data: {
                name,
                userId: session.user.id
            }
        });
        revalidatePath('/dashboard', 'page');
        return { success: true, collection };
    } catch (e) {
        console.error("Create collection error:", e);
        return { error: 'Failed to create collection' };
    }
}

export async function getUserCollections() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Collections are shared across all users — no userId filter
        const collections = await prisma.collection.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                createdAt: true,
                _count: { select: { images: true } }
            }
        });
        return { success: true, collections };
    } catch (e) {
        console.error("Fetch collections error:", e);
        return { error: 'Failed to fetch collections' };
    }
}

export async function addImageToCollection(collectionId: string, imageId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        // Single query — update will throw P2025 if collection not found
        await prisma.collection.update({
            where: { id: collectionId },
            data: { images: { connect: { id: imageId } } }
        });
        revalidatePath('/dashboard', 'page');
        return { success: true };
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return { error: 'Collection not found' };
        }
        console.error("Add to collection error:", e);
        return { error: 'Failed to add image to collection' };
    }
}

export async function removeImageFromCollection(collectionId: string, imageId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.collection.update({
            where: { id: collectionId },
            data: { images: { disconnect: { id: imageId } } }
        });
        revalidatePath('/dashboard', 'page');
        return { success: true };
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return { error: 'Collection not found' };
        }
        console.error("Remove from collection error:", e);
        return { error: 'Failed to remove image' };
    }
}

export async function deleteCollection(collectionId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.collection.delete({
            where: { id: collectionId }
        });
        revalidatePath('/dashboard', 'page');
        return { success: true };
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return { error: 'Collection not found' };
        }
        return { error: 'Failed to delete collection' };
    }
}

export async function addImagesToCollection(collectionId: string, imageIds: string[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.collection.update({
            where: { id: collectionId },
            data: {
                images: { connect: imageIds.map(id => ({ id })) }
            }
        });
        revalidatePath('/dashboard', 'page');
        return { success: true };
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return { error: 'Collection not found' };
        }
        console.error("Batch add to collection error:", e);
        return { error: 'Failed to add images' };
    }
}

export async function removeImagesFromCollection(collectionId: string, imageIds: string[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.collection.update({
            where: { id: collectionId },
            data: {
                images: { disconnect: imageIds.map(id => ({ id })) }
            }
        });
        revalidatePath('/dashboard', 'page');
        return { success: true };
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return { error: 'Collection not found' };
        }
        console.error("Batch remove from collection error:", e);
        return { error: 'Failed to remove images' };
    }
}
