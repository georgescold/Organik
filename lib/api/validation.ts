import { z } from "zod";

// ============= REQUEST SCHEMAS =============

export const generateCarouselSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(500, "Topic too long"),
  slideCount: z.number().int().min(5).max(10).optional().default(7),
  collectionId: z.string().optional(),
  profileId: z.string().optional(),
});

export const listCarouselsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  status: z.enum(["draft", "published", "all"]).optional().default("all"),
});

export const carouselIdSchema = z.object({
  id: z.string().cuid(),
});

export const updateCarouselSchema = z.object({
  topic: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["draft", "published"]).optional(),
  slides: z.array(z.object({
    index: z.number().int().min(1),
    content: z.string().min(1),
    imageUrl: z.string().url().optional(),
    imageHumanId: z.string().optional(),
  })).min(1).optional(),
});

// ============= RESPONSE SCHEMAS =============

export const slideSchema = z.object({
  index: z.number(),
  content: z.string(),
  imageUrl: z.string().url().optional(),
  imageHumanId: z.string().optional(),
});

export const carouselResponseSchema = z.object({
  id: z.string(),
  topic: z.string(),
  status: z.string(),
  slides: z.array(slideSchema),
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

export const rateLimitErrorSchema = z.object({
  error: z.string(),
  code: z.literal("RATE_LIMIT_EXCEEDED"),
  limit: z.number(),
  current: z.number(),
  resetAt: z.date(),
});

// ============= TYPE EXPORTS =============

export type GenerateCarouselRequest = z.infer<typeof generateCarouselSchema>;
export type ListCarouselsRequest = z.infer<typeof listCarouselsSchema>;
export type CarouselIdRequest = z.infer<typeof carouselIdSchema>;
export type UpdateCarouselRequest = z.infer<typeof updateCarouselSchema>;
export type CarouselResponse = z.infer<typeof carouselResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type RateLimitError = z.infer<typeof rateLimitErrorSchema>;
