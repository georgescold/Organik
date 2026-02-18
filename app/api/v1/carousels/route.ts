import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { listCarouselsSchema } from "@/lib/api/validation";
import { handleApiError } from "@/lib/api/error-handler";
import { logApiRequest } from "@/lib/api/logger";
import { prisma } from "@/lib/prisma";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      limit: parseInt(searchParams.get("limit") || "20"),
      offset: parseInt(searchParams.get("offset") || "0"),
      status: searchParams.get("status") || "all",
    };

    const validated = listCarouselsSchema.parse(queryParams);

    // 4. Fetch carousels
    const where: any = {
      userId: auth.userId,
      origin: "generated",
    };

    if (validated.status !== "all") {
      where.status = validated.status;
    }

    const [carousels, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: validated.limit,
        skip: validated.offset,
        select: {
          id: true,
          hookText: true,
          description: true,
          slides: true,
          slideCount: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.post.count({ where }),
    ]);

    // 5. Collect all image IDs from all carousels
    const allImageIds = new Set<string>();
    const carouselSlides = carousels.map((carousel) => {
      let slides = [];
      try {
        slides = JSON.parse(carousel.slides || "[]");
        // Collect image IDs
        slides.forEach((slide: any) => {
          if (slide.image_id) {
            allImageIds.add(slide.image_id);
          }
        });
      } catch (e) {
        console.error("Failed to parse slides:", e);
      }
      return { carousel, slides };
    });

    // 6. Fetch all images in one query
    const images = await prisma.image.findMany({
      where: {
        humanId: {
          in: Array.from(allImageIds),
        },
      },
      select: {
        humanId: true,
        storageUrl: true,
        descriptionLong: true,
        keywords: true,
        mood: true,
        style: true,
        colors: true,
        filename: true,
      },
    });

    // Create a map for quick lookup
    const imageMap = new Map(images.map((img) => [img.humanId, img]));

    // 7. Format response with enriched image data
    const formattedCarousels = carouselSlides.map(({ carousel, slides }) => {
      return {
        id: carousel.id,
        topic: carousel.hookText,
        status: carousel.status,
        slideCount: carousel.slideCount,
        description: carousel.description,
        slides: slides.map((slide: any) => {
          const imageDetails = slide.image_id ? imageMap.get(slide.image_id) : null;

          return {
            index: slide.slide_number,
            content: slide.text,
            imageUrl: slide.image_url,
            imageHumanId: slide.image_id,
            image: imageDetails ? {
              humanId: imageDetails.humanId,
              url: imageDetails.storageUrl,
              description: imageDetails.descriptionLong,
              keywords: imageDetails.keywords,
              mood: imageDetails.mood,
              style: imageDetails.style,
              colors: imageDetails.colors,
              filename: imageDetails.filename,
            } : null,
          };
        }),
        createdAt: carousel.createdAt.toISOString(),
        updatedAt: carousel.updatedAt.toISOString(),
      };
    });

    return NextResponse.json(
      {
        data: formattedCarousels,
        pagination: {
          total,
          limit: validated.limit,
          offset: validated.offset,
          hasMore: validated.offset + validated.limit < total,
        },
      },
      { headers: corsHeaders }
    );
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
        endpoint: "/api/v1/carousels",
        statusCode,
        durationMs,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        errorMessage,
      }).catch(console.error);
    }
  }
}
