'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcryptjs from 'bcryptjs';

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

// ============= USER SETTINGS =============

export async function getUserSettings() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { email: true, password: true, name: true }
        });

        return {
            success: true,
            email: user?.email || '',
            name: user?.name || '',
            hasPassword: !!user?.password
        };
    } catch (e) {
        return { error: 'Failed to fetch user settings' };
    }
}

export async function changePassword(currentPassword: string, newPassword: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    if (newPassword.length < 6) return { error: 'Le mot de passe doit contenir au moins 6 caractères' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true }
        });

        if (!user) return { error: 'Utilisateur introuvable' };

        // If user has a password, verify current one
        if (user.password) {
            const isValid = await bcryptjs.compare(currentPassword, user.password);
            if (!isValid) return { error: 'Mot de passe actuel incorrect' };
        }

        const hashedPassword = await bcryptjs.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword }
        });

        return { success: true };
    } catch (e) {
        console.error("Change password error:", e);
        return { error: 'Erreur lors du changement de mot de passe' };
    }
}

// ============= DEFAULT FONT SETTINGS =============

export interface DefaultFontSettings {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: 'normal' | 'italic';
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    outlineColor?: string;
    outlineWidth?: number;
    lineHeight?: number;
    letterSpacing?: number;
    textMode?: string;
    textDecoration?: 'none' | 'underline' | 'line-through';
    backgroundColor?: string;
    maxWidth?: number;
}

export async function getDefaultFontSettings(): Promise<{ success?: boolean; error?: string; settings?: DefaultFontSettings | null }> {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { defaultFontSettings: true }
        });

        const settings = user?.defaultFontSettings
            ? JSON.parse(user.defaultFontSettings) as DefaultFontSettings
            : null;

        return { success: true, settings };
    } catch (e) {
        return { error: 'Failed to fetch font settings' };
    }
}

export async function saveDefaultFontSettings(settings: DefaultFontSettings) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { defaultFontSettings: JSON.stringify(settings) }
        });

        return { success: true };
    } catch (e) {
        console.error("Failed to save font settings:", e);
        return { error: 'Failed to save font settings' };
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
