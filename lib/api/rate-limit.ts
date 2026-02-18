import { prisma } from "@/lib/prisma";
import { errors } from "./error-handler";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  current: number;
  resetAt: Date;
}

/**
 * Checks and enforces rate limiting for an API key
 * Returns an error response if limit is exceeded
 */
export async function checkRateLimit(apiKeyId: string): Promise<void> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: {
      requestCount: true,
      dailyLimit: true,
      lastResetAt: true,
    },
  });

  if (!apiKey) {
    throw errors.unauthorized("API key not found");
  }

  const now = new Date();
  const lastReset = apiKey.lastResetAt;
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  // Reset counter if more than 24 hours have passed
  if (hoursSinceReset >= 24) {
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        requestCount: 1,
        lastResetAt: now,
      },
    });
    return;
  }

  // Check if limit exceeded
  if (apiKey.requestCount >= apiKey.dailyLimit) {
    const resetAt = new Date(lastReset.getTime() + 24 * 60 * 60 * 1000);
    throw errors.rateLimitExceeded(apiKey.dailyLimit, resetAt);
  }

  // Increment counter
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      requestCount: { increment: 1 },
    },
  });
}

/**
 * Gets current rate limit status for an API key
 */
export async function getRateLimitStatus(apiKeyId: string): Promise<RateLimitResult> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId },
    select: {
      requestCount: true,
      dailyLimit: true,
      lastResetAt: true,
    },
  });

  if (!apiKey) {
    throw new Error("API key not found");
  }

  const resetAt = new Date(apiKey.lastResetAt.getTime() + 24 * 60 * 60 * 1000);

  return {
    allowed: apiKey.requestCount < apiKey.dailyLimit,
    limit: apiKey.dailyLimit,
    current: apiKey.requestCount,
    resetAt,
  };
}
