import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey, getKeyPrefix } from "./key-generator";
import { errors } from "./error-handler";
import { updateApiKeyLastUsed } from "./logger";

export interface AuthResult {
  userId: string;
  apiKeyId: string;
}

/**
 * Authenticates an API request using the X-API-Key header
 * @throws ApiError if authentication fails
 */
export async function authenticateApiKey(request: NextRequest): Promise<AuthResult> {
  // Extract API key from header
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    throw errors.unauthorized("Missing X-API-Key header");
  }

  // Validate format
  if (!apiKey.startsWith("sk_live_") || apiKey.length < 20) {
    throw errors.unauthorized("Invalid API key format");
  }

  // Get key prefix for lookup optimization
  const keyPrefix = getKeyPrefix(apiKey);

  // Find matching API keys by prefix
  const apiKeys = await prisma.apiKey.findMany({
    where: {
      keyPrefix,
      status: "active",
    },
    select: {
      id: true,
      keyHash: true,
      userId: true,
      status: true,
      expiresAt: true,
    },
  });

  if (apiKeys.length === 0) {
    throw errors.unauthorized("Invalid or expired API key");
  }

  // Verify hash (check all keys with matching prefix)
  let matchedKey: typeof apiKeys[0] | null = null;
  for (const key of apiKeys) {
    const isValid = await verifyApiKey(apiKey, key.keyHash);
    if (isValid) {
      matchedKey = key;
      break;
    }
  }

  if (!matchedKey) {
    throw errors.unauthorized("Invalid or expired API key");
  }

  // Check if key is expired
  if (matchedKey.expiresAt && matchedKey.expiresAt < new Date()) {
    throw errors.unauthorized("API key has expired");
  }

  // Check if key is revoked
  if (matchedKey.status !== "active") {
    throw errors.unauthorized("API key has been revoked");
  }

  // Update lastUsedAt asynchronously (don't await)
  updateApiKeyLastUsed(matchedKey.id).catch(console.error);

  return {
    userId: matchedKey.userId,
    apiKeyId: matchedKey.id,
  };
}
