import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { generateCarouselSchema } from "@/lib/api/validation";
import { handleApiError, errors } from "@/lib/api/error-handler";
import { logApiRequest } from "@/lib/api/logger";
import { generateCarousel, saveCarousel } from "@/server/actions/creation-actions";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Configure per environment
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
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
    const validated = generateCarouselSchema.parse(body);

    // 4. Generate carousel (reuse server action with userId)
    const result = await generateCarousel(
      validated.topic,
      validated.collectionId,
      auth.userId
    );

    if (result.error) {
      statusCode = 400;
      errorMessage = result.error;
      return errors.badRequest(result.error);
    }

    if (!result.slides || result.slides.length === 0) {
      statusCode = 500;
      errorMessage = "No slides generated";
      return errors.internal("Failed to generate carousel slides");
    }

    // 5. Save carousel
    const saved = await saveCarousel(
      validated.topic,
      result.slides,
      result.description || "",
      "created",
      auth.userId
    );

    if (saved.error) {
      statusCode = 500;
      errorMessage = saved.error;
      return errors.internal(saved.error);
    }

    // 6. Return formatted response
    const response = {
      id: saved.postId,
      topic: validated.topic,
      status: "completed",
      slides: result.slides.map((slide: any) => ({
        index: slide.slide_number,
        content: slide.text,
        imageUrl: slide.image_url,
        imageHumanId: slide.image_id,
      })),
      description: result.description,
      warning: result.warning,
      createdAt: new Date().toISOString(),
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
        method: "POST",
        endpoint: "/api/v1/carousels/generate",
        statusCode,
        durationMs,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        errorMessage,
      }).catch(console.error);
    }
  }
}
