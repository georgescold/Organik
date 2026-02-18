import { prisma } from "@/lib/prisma";

export interface ApiRequestLog {
  apiKeyId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

/**
 * Logs an API request to the database for audit and analytics
 * This runs asynchronously and doesn't block the response
 */
export async function logApiRequest(data: ApiRequestLog): Promise<void> {
  try {
    await prisma.apiRequest.create({
      data: {
        apiKeyId: data.apiKeyId,
        method: data.method,
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        durationMs: data.durationMs,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        errorMessage: data.errorMessage,
      },
    });
  } catch (error) {
    // Don't let logging errors break the API
    console.error("[API Logger] Failed to log request:", error);
  }
}

/**
 * Updates the lastUsedAt timestamp for an API key
 * This runs asynchronously and doesn't block the response
 */
export async function updateApiKeyLastUsed(apiKeyId: string): Promise<void> {
  try {
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsedAt: new Date() },
    });
  } catch (error) {
    console.error("[API Logger] Failed to update lastUsedAt:", error);
  }
}
