'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { generateApiKey, hashApiKey, getKeyPrefix } from '@/lib/api/key-generator';

/**
 * Creates a new API key for the authenticated user
 * @param name User-friendly name for the key
 * @param expiresInDays Optional expiration in days (null = no expiration)
 * @returns The full API key (only shown once) or error
 */
export async function createApiKey(name: string, expiresInDays?: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    // Generate new API key
    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey);
    const keyPrefix = getKeyPrefix(apiKey);

    // Calculate expiration date if provided
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Save to database
    await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name,
        keyHash,
        keyPrefix,
        status: 'active',
        expiresAt,
      },
    });

    revalidatePath('/dashboard/api-keys');

    // Return the full key (only time it's visible)
    return { success: true, apiKey };
  } catch (e: any) {
    console.error('[API Key Creation Error]', e);
    return { error: 'Failed to create API key' };
  }
}

/**
 * Gets all API keys for the authenticated user
 */
export async function getUserApiKeys() {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
        requestCount: true,
        dailyLimit: true,
        lastResetAt: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return { success: true, apiKeys };
  } catch (e) {
    console.error('[API Key Fetch Error]', e);
    return { error: 'Failed to fetch API keys' };
  }
}

/**
 * Revokes an API key (sets status to 'revoked')
 */
export async function revokeApiKey(keyId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    // Verify ownership before revoking
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
      select: { userId: true },
    });

    if (!apiKey) {
      return { error: 'API key not found' };
    }

    if (apiKey.userId !== session.user.id) {
      return { error: 'Unauthorized: You do not own this API key' };
    }

    // Revoke the key
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { status: 'revoked' },
    });

    revalidatePath('/dashboard/api-keys');
    return { success: true };
  } catch (e) {
    console.error('[API Key Revoke Error]', e);
    return { error: 'Failed to revoke API key' };
  }
}

/**
 * Deletes an API key permanently (cascade deletes ApiRequest records)
 */
export async function deleteApiKey(keyId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    // Verify ownership before deleting
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
      select: { userId: true },
    });

    if (!apiKey) {
      return { error: 'API key not found' };
    }

    if (apiKey.userId !== session.user.id) {
      return { error: 'Unauthorized: You do not own this API key' };
    }

    // Delete the key (cascade will delete ApiRequest records)
    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    revalidatePath('/dashboard/api-keys');
    return { success: true };
  } catch (e) {
    console.error('[API Key Delete Error]', e);
    return { error: 'Failed to delete API key' };
  }
}

/**
 * Updates the name of an API key
 */
export async function updateApiKeyName(keyId: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    // Verify ownership before updating
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
      select: { userId: true },
    });

    if (!apiKey) {
      return { error: 'API key not found' };
    }

    if (apiKey.userId !== session.user.id) {
      return { error: 'Unauthorized: You do not own this API key' };
    }

    // Update the name
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { name },
    });

    revalidatePath('/dashboard/api-keys');
    return { success: true };
  } catch (e) {
    console.error('[API Key Update Error]', e);
    return { error: 'Failed to update API key name' };
  }
}

/**
 * Gets API request logs for a specific API key
 */
export async function getApiKeyRequests(keyId: string, limit = 50) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  try {
    // Verify ownership
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
      select: { userId: true },
    });

    if (!apiKey) {
      return { error: 'API key not found' };
    }

    if (apiKey.userId !== session.user.id) {
      return { error: 'Unauthorized: You do not own this API key' };
    }

    // Fetch request logs
    const requests = await prisma.apiRequest.findMany({
      where: { apiKeyId: keyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        method: true,
        endpoint: true,
        statusCode: true,
        durationMs: true,
        ipAddress: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    return { success: true, requests };
  } catch (e) {
    console.error('[API Key Requests Fetch Error]', e);
    return { error: 'Failed to fetch API key requests' };
  }
}
