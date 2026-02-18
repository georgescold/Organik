import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { handleApiError, errors } from "@/lib/api/error-handler";
import { logApiRequest } from "@/lib/api/logger";
import { prisma } from "@/lib/prisma";
import { updateCarouselSchema } from "@/lib/api/validation";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let apiKeyId: string | undefined;
  let statusCode = 200;
  let errorMessage: string | undefined;

  // Await params (Next.js 15 requirement)
  const { id } = await params;

  try {

    // 1. Authenticate
    const auth = await authenticateApiKey(request);
    apiKeyId = auth.apiKeyId;

    // 2. Rate limit check
    await checkRateLimit(auth.apiKeyId);

    // 3. Fetch carousel with images
    const carousel = await prisma.post.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        userId: true,
        hookText: true,
        description: true,
        slides: true,
        slideCount: true,
        status: true,
        origin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!carousel) {
      statusCode = 404;
      errorMessage = "Carousel not found";
      return errors.notFound("Carousel not found");
    }

    // Check ownership
    if (carousel.userId !== auth.userId) {
      statusCode = 403;
      errorMessage = "Access forbidden";
      return errors.forbidden("You don't have access to this carousel");
    }

    // Parse slides
    let slides = [];
    try {
      slides = JSON.parse(carousel.slides || "[]");
    } catch (e) {
      console.error("Failed to parse slides:", e);
    }

    // 4. Fetch image details for all slides
    const imageHumanIds = slides
      .map((slide: any) => slide.image_id)
      .filter(Boolean);

    const images = await prisma.image.findMany({
      where: {
        humanId: {
          in: imageHumanIds,
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

    // 5. Format response with enriched image data
    const response = {
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
        endpoint: `/api/v1/carousels/${id}`,
        statusCode,
        durationMs,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        errorMessage,
      }).catch(console.error);
    }
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let apiKeyId: string | undefined;
  let statusCode = 200;
  let errorMessage: string | undefined;

  // Await params (Next.js 15 requirement)
  const { id } = await params;

  try {

    // 1. Authenticate
    const auth = await authenticateApiKey(request);
    apiKeyId = auth.apiKeyId;

    // 2. Rate limit check
    await checkRateLimit(auth.apiKeyId);

    // 3. Fetch carousel to check ownership
    const carousel = await prisma.post.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!carousel) {
      statusCode = 404;
      errorMessage = "Carousel not found";
      return errors.notFound("Carousel not found");
    }

    if (carousel.userId !== auth.userId) {
      statusCode = 403;
      errorMessage = "Access forbidden";
      return errors.forbidden("You don't have access to this carousel");
    }

    // 4. Delete carousel
    await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Carousel deleted successfully" },
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
        method: "DELETE",
        endpoint: `/api/v1/carousels/${id}`,
        statusCode,
        durationMs,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        errorMessage,
      }).catch(console.error);
    }
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let apiKeyId: string | undefined;
  let statusCode = 200;
  let errorMessage: string | undefined;

  // Await params (Next.js 15 requirement)
  const { id } = await params;

  try {
    // 1. Authenticate
    const auth = await authenticateApiKey(request);
    apiKeyId = auth.apiKeyId;

    // 2. Rate limit check
    await checkRateLimit(auth.apiKeyId);

    // 3. Validate request body
    const body = await request.json();
    const validated = updateCarouselSchema.parse(body);

    // 4. Check if there's anything to update
    if (Object.keys(validated).length === 0) {
      statusCode = 400;
      errorMessage = "No fields provided";
      return errors.badRequest("At least one field must be provided");
    }

    // 5. Fetch carousel to check ownership
    const existingCarousel = await prisma.post.findUnique({
      where: { id },
      select: {
        userId: true,
        origin: true,
        slides: true,
        slideCount: true,
      },
    });

    if (!existingCarousel) {
      statusCode = 404;
      errorMessage = "Carousel not found";
      return errors.notFound("Carousel not found");
    }

    if (existingCarousel.userId !== auth.userId) {
      statusCode = 403;
      errorMessage = "Access forbidden";
      return errors.forbidden("You don't have access to this carousel");
    }

    // Only allow updating generated carousels
    if (existingCarousel.origin !== "generated") {
      statusCode = 400;
      errorMessage = "Can only update generated carousels";
      return errors.badRequest("Can only update generated carousels");
    }

    // 6. Build update object
    const updateData: any = {};

    if (validated.topic !== undefined) {
      updateData.hookText = validated.topic;
    }

    if (validated.description !== undefined) {
      updateData.description = validated.description;
    }

    if (validated.status !== undefined) {
      updateData.status = validated.status;
      // Set publishedAt when status changes to published
      if (validated.status === "published") {
        updateData.publishedAt = new Date();
      }
    }

    if (validated.slides !== undefined) {
      // Format slides to match storage format
      const formattedSlides = validated.slides.map((slide) => ({
        slide_number: slide.index,
        text: slide.content,
        image_url: slide.imageUrl || null,
        image_id: slide.imageHumanId || null,
      }));

      updateData.slides = JSON.stringify(formattedSlides);
      updateData.slideCount = formattedSlides.length;
    }

    // 7. Update carousel
    const updatedCarousel = await prisma.post.update({
      where: { id },
      data: updateData,
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
    });

    // 8. Parse slides for response
    let slides = [];
    try {
      slides = JSON.parse(updatedCarousel.slides || "[]");
    } catch (e) {
      console.error("Failed to parse slides:", e);
    }

    // 9. Fetch image details if slides have image_ids
    const imageHumanIds = slides
      .map((slide: any) => slide.image_id)
      .filter(Boolean);

    const images = await prisma.image.findMany({
      where: {
        humanId: {
          in: imageHumanIds,
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

    const imageMap = new Map(images.map((img) => [img.humanId, img]));

    // 10. Format response
    const response = {
      message: "Carousel updated successfully",
      id: updatedCarousel.id,
      topic: updatedCarousel.hookText,
      status: updatedCarousel.status,
      slideCount: updatedCarousel.slideCount,
      description: updatedCarousel.description,
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
      updatedAt: updatedCarousel.updatedAt.toISOString(),
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
        endpoint: `/api/v1/carousels/${id}`,
        statusCode,
        durationMs,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        errorMessage,
      }).catch(console.error);
    }
  }
}
