'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateUserApiKey(apiKey: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { anthropicApiKey: apiKey }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error("Failed to update API key:", e);
        return { error: 'Failed to update API key' };
    }
}

export async function getUserApiKey() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { anthropicApiKey: true }
        });

        const key = user?.anthropicApiKey;
        return { success: true, apiKey: key ? `${'•'.repeat(Math.max(0, key.length - 4))}${key.slice(-4)}` : null, hasKey: !!key };
    } catch (e) {
        return { error: 'Failed to fetch API key' };
    }
}

export async function updateUserApifyKey(apiKey: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { apifyApiKey: apiKey }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (e) {
        console.error("Failed to update Apify API key:", e);
        return { error: 'Failed to update Apify API key' };
    }
}

export async function getUserApifyKey() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { apifyApiKey: true }
        });

        const key = user?.apifyApiKey;
        return { success: true, apiKey: key ? `${'•'.repeat(Math.max(0, key.length - 4))}${key.slice(-4)}` : null, hasKey: !!key };
    } catch (e) {
        return { error: 'Failed to fetch Apify API key' };
    }
}

export async function getAllUserApiKeys() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { anthropicApiKey: true, apifyApiKey: true }
        });

        const maskKey = (key: string | null | undefined) => key ? `${'•'.repeat(Math.max(0, key.length - 4))}${key.slice(-4)}` : null;
        return {
            success: true,
            anthropicApiKey: maskKey(user?.anthropicApiKey),
            apifyApiKey: maskKey(user?.apifyApiKey),
            hasAnthropicKey: !!user?.anthropicApiKey,
            hasApifyKey: !!user?.apifyApiKey
        };
    } catch (e) {
        return { error: 'Failed to fetch API keys' };
    }
}
