/**
 * API Configuration
 * Adapts automatically to the deployment environment
 */

/**
 * Gets the base URL for API calls
 * Automatically detects Vercel, production, or local environment
 */
export function getApiBaseUrl(): string {
  // Server-side: use environment variable or construct from host
  if (typeof window === 'undefined') {
    // Check for explicit API URL
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    // Vercel automatically sets VERCEL_URL
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/v1`;
    }

    // Production domain
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return `${process.env.NEXT_PUBLIC_SITE_URL}/api/v1`;
    }

    // Fallback to localhost for development
    return 'http://localhost:3000/api/v1';
  }

  // Client-side: use window.location
  return `${window.location.origin}/api/v1`;
}

/**
 * Gets the full site URL
 */
export function getSiteUrl(): string {
  if (typeof window === 'undefined') {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL;
    }

    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }

    return 'http://localhost:3000';
  }

  return window.location.origin;
}

/**
 * API Configuration
 */
export const apiConfig = {
  baseUrl: getApiBaseUrl(),
  siteUrl: getSiteUrl(),
  version: 'v1',
  timeout: 60000, // 60 seconds for AI generation
};
