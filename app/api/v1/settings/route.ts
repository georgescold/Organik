import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { handleApiError, errors } from "@/lib/api/error-handler";
import { logApiRequest } from "@/lib/api/logger";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Validation schema
const updateSettingsSchema = z.object({
  anthropicApiKey: z.string().optional(),
  apifyApiKey: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let apiKeyId: string | undefined;
  let statusCode = 200;
  let errorMessage: string | undefined;

  try {
    // 1. Authenticate
    const auth = await authenticateApiKey(request);
    apiKeyId = auth.apiKeyId;

    // 2. Rate limit check
    await checkRateLimit(auth.apiKeyId);

    // 3. Fetch user settings
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        anthropicApiKey: true,
        apifyApiKey: true,
      },
    });

    if (!user) {
      statusCode = 404;
      errorMessage = "User not found";
      return errors.notFound("User not found");
    }

    // 4. Return masked keys for security
    const response = {
      anthropicApiKey: user.anthropicApiKey
        ? `${user.anthropicApiKey.substring(0, 8)}...${user.anthropicApiKey.substring(user.anthropicApiKey.length - 4)}`
        : null,
      apifyApiKey: user.apifyApiKey
        ? `${user.apifyApiKey.substring(0, 8)}...${user.apifyApiKey.substring(user.apifyApiKey.length - 4)}`
        : null,
      hasAnthropicKey: !!user.anthropicApiKey,
      hasApifyKey: !!user.apifyApiKey,
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error: any) {
    statusCode = error.statusCode || 500;
    errorMessage = error.message;
    return handleApiError(error);
  } finally {
    // Log the request
    if (apiKeyId) {
      const durationMs = Date.now() - startTime;
      logApiRequest({
        apiKeyId,
        method: "GET",
        endpoint: "/api/v1/settings",
        statusCode,
        durationMs,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        errorMessage,
      }).catch(console.error);
    }
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  let apiKeyId: string | undefined;
  let statusCode = 200;
  let errorMessage: string | undefined;

  try {
    // 1. Authenticate
    const auth = await authenticateApiKey(request);
    apiKeyId = auth.apiKeyId;

    // 2. Rate limit check
    await checkRateLimit(auth.apiKeyId);

    // 3. Validate request body
    const body = await request.json();
    const validated = updateSettingsSchema.parse(body);

    // 4. Build update object (only update provided fields)
    const updateData: any = {};
    if (validated.anthropicApiKey !== undefined) {
      updateData.anthropicApiKey = validated.anthropicApiKey || null;
    }
    if (validated.apifyApiKey !== undefined) {
      updateData.apifyApiKey = validated.apifyApiKey || null;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      statusCode = 400;
      errorMessage = "No settings provided";
      return errors.badRequest("At least one setting must be provided");
    }

    // 5. Update user settings
    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        anthropicApiKey: true,
        apifyApiKey: true,
      },
    });

    // 6. Return masked keys for security
    const response = {
      message: "Settings updated successfully",
      anthropicApiKey: user.anthropicApiKey
        ? `${user.anthropicApiKey.substring(0, 8)}...${user.anthropicApiKey.substring(user.anthropicApiKey.length - 4)}`
        : null,
      apifyApiKey: user.apifyApiKey
        ? `${user.apifyApiKey.substring(0, 8)}...${user.apifyApiKey.substring(user.apifyApiKey.length - 4)}`
        : null,
      hasAnthropicKey: !!user.anthropicApiKey,
      hasApifyKey: !!user.apifyApiKey,
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error: any) {
    statusCode = error.statusCode || 500;
    errorMessage = error.message;
    return handleApiError(error);
  } finally {
    // Log the request
    if (apiKeyId) {
      const durationMs = Date.now() - startTime;
      logApiRequest({
        apiKeyId,
        method: "PUT",
        endpoint: "/api/v1/settings",
        statusCode,
        durationMs,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        errorMessage,
      }).catch(console.error);
    }
  }
}
