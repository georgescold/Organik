import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Handles errors and returns a standardized JSON response
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.issues,
      },
      { status: 400 }
    );
  }

  // Custom API errors
  if (error instanceof ApiError) {
    const body: any = {
      error: error.message,
      code: error.code,
    };

    // Add details if present
    if (error.details) {
      if (error.code === "RATE_LIMIT_EXCEEDED") {
        body.limit = error.details.limit;
        body.resetAt = error.details.resetAt;
      } else {
        body.details = error.details;
      }
    }

    return NextResponse.json(body, { status: error.statusCode });
  }

  // Generic errors (don't expose internal details)
  return NextResponse.json(
    {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}

/**
 * Creates a standardized error response
 */
export function apiError(
  statusCode: number,
  code: string,
  message: string,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code,
      details,
    },
    { status: statusCode }
  );
}

// Common error factories - throw these instead of returning
export const errors = {
  unauthorized: (message = "Invalid or expired API key") => {
    throw new ApiError(401, "UNAUTHORIZED", message);
  },

  forbidden: (message = "Access forbidden") => {
    throw new ApiError(403, "FORBIDDEN", message);
  },

  notFound: (message = "Resource not found") => {
    throw new ApiError(404, "NOT_FOUND", message);
  },

  badRequest: (message: string, details?: any) => {
    throw new ApiError(400, "BAD_REQUEST", message, details);
  },

  rateLimitExceeded: (limit: number, resetAt: Date) => {
    throw new ApiError(429, "RATE_LIMIT_EXCEEDED", "Rate limit exceeded", {
      limit,
      resetAt: resetAt.toISOString(),
    });
  },

  internal: (message = "Internal server error") => {
    throw new ApiError(500, "INTERNAL_ERROR", message);
  },
};
