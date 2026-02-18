'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
        revalidatePath('/dashboard');
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
        const collections = await prisma.collection.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { images: true } } }
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
        // Verify ownership
        const collection = await prisma.collection.findUnique({
            where: { id: collectionId }
        });
        if (!collection || collection.userId !== session.user.id) {
            return { error: 'Collection not found or access denied' };
        }

        await prisma.collection.update({
            where: { id: collectionId },
            data: {
                images: {
                    connect: { id: imageId }
                }
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error("Add to collection error:", e);
        // Prisma might throw if already connected, we can return success or specific error
        return { error: 'Failed to add image to collection' };
    }
}

export async function removeImageFromCollection(collectionId: string, imageId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const collection = await prisma.collection.findUnique({
            where: { id: collectionId }
        });
        if (!collection || collection.userId !== session.user.id) {
            return { error: 'Access denied' };
        }

        await prisma.collection.update({
            where: { id: collectionId },
            data: {
                images: {
                    disconnect: { id: imageId }
                }
            }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error("Remove from collection error:", e);
        return { error: 'Failed to remove image' };
    }
}

export async function deleteCollection(collectionId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const collection = await prisma.collection.findUnique({
            where: { id: collectionId }
        });
        if (!collection || collection.userId !== session.user.id) {
            return { error: 'Access denied' };
        }

        await prisma.collection.delete({
            where: { id: collectionId }
        });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        return { error: 'Failed to delete collection' };
    }
}

export async function addImagesToCollection(collectionId: string, imageIds: string[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const collection = await prisma.collection.findUnique({
            where: { id: collectionId }
        });
        if (!collection || collection.userId !== session.user.id) {
            return { error: 'Access denied' };
        }

        // Connect all images
        const connectQuery = imageIds.map(id => ({ id }));

        await prisma.collection.update({
            where: { id: collectionId },
            data: {
                images: {
                    connect: connectQuery
                }
            }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error("Batch add to collection error:", e);
        return { error: 'Failed to add images' };
    }
}

export async function removeImagesFromCollection(collectionId: string, imageIds: string[]) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const collection = await prisma.collection.findUnique({
            where: { id: collectionId }
        });
        if (!collection || collection.userId !== session.user.id) {
            return { error: 'Access denied' };
        }

        const disconnectQuery = imageIds.map(id => ({ id }));

        await prisma.collection.update({
            where: { id: collectionId },
            data: {
                images: {
                    disconnect: disconnectQuery
                }
            }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error("Batch remove from collection error:", e);
        return { error: 'Failed to remove images' };
    }
}
