import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

/**
 * Generates a new API key with format: sk_live_[32 random characters]
 * @returns The full API key (plaintext - only shown once)
 */
export function generateApiKey(): string {
  const randomString = randomBytes(24).toString("base64url"); // 32 chars after encoding
  return `sk_live_${randomString}`;
}

/**
 * Hashes an API key using bcrypt
 * @param key The plaintext API key
 * @returns The bcrypt hash
 */
export async function hashApiKey(key: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(key, salt);
}

/**
 * Verifies an API key against its hash
 * @param key The plaintext API key
 * @param hash The bcrypt hash
 * @returns True if the key matches the hash
 */
export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

/**
 * Extracts the prefix from an API key for display purposes
 * @param key The full API key
 * @returns The first 12 characters (e.g., "sk_live_abc")
 */
export function getKeyPrefix(key: string): string {
  return key.substring(0, 12);
}
