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

// Validation schema for account updates
const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
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

    // 3. Fetch user account information
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        anthropicApiKey: true,
        apifyApiKey: true,
        _count: {
          select: {
            posts: true,
            images: true,
            collections: true,
            profiles: true,
            apiKeys: true,
          },
        },
      },
    });

    if (!user) {
      statusCode = 404;
      errorMessage = "User not found";
      return errors.notFound("User not found");
    }

    // 4. Aggregate metrics from all user posts
    const metricsAggregation = await prisma.metrics.aggregate({
      where: {
        post: {
          userId: auth.userId,
        },
      },
      _sum: {
        views: true,
        likes: true,
        saves: true,
        comments: true,
        shares: true,
      },
      _avg: {
        views: true,
        likes: true,
        saves: true,
        comments: true,
        shares: true,
      },
    });

    // 5. Format response
    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      hasAnthropicKey: !!user.anthropicApiKey,
      hasApifyKey: !!user.apifyApiKey,
      stats: {
        carousels: user._count.posts,
        images: user._count.images,
        collections: user._count.collections,
        profiles: user._count.profiles,
        apiKeys: user._count.apiKeys,
      },
      metrics: {
        total: {
          views: metricsAggregation._sum.views || 0,
          likes: metricsAggregation._sum.likes || 0,
          saves: metricsAggregation._sum.saves || 0,
          comments: metricsAggregation._sum.comments || 0,
          shares: metricsAggregation._sum.shares || 0,
        },
        average: {
          views: Math.round(metricsAggregation._avg.views || 0),
          likes: Math.round(metricsAggregation._avg.likes || 0),
          saves: Math.round(metricsAggregation._avg.saves || 0),
          comments: Math.round(metricsAggregation._avg.comments || 0),
          shares: Math.round(metricsAggregation._avg.shares || 0),
        },
      },
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
        endpoint: "/api/v1/account",
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
    const validated = updateAccountSchema.parse(body);

    // 4. Build update object (only update provided fields)
    const updateData: any = {};
    if (validated.name !== undefined) {
      updateData.name = validated.name;
    }
    if (validated.email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { email: validated.email },
      });

      if (existingUser && existingUser.id !== auth.userId) {
        statusCode = 400;
        errorMessage = "Email already in use";
        return errors.badRequest("Email already in use by another account");
      }

      updateData.email = validated.email;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      statusCode = 400;
      errorMessage = "No fields provided";
      return errors.badRequest("At least one field must be provided");
    }

    // 5. Update user account
    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        updatedAt: true,
      },
    });

    // 6. Return updated account info
    const response = {
      message: "Account updated successfully",
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      updatedAt: user.updatedAt.toISOString(),
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
        endpoint: "/api/v1/account",
        statusCode,
        durationMs,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        errorMessage,
      }).catch(console.error);
    }
  }
}
